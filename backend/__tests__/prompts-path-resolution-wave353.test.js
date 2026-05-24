'use strict';

/**
 * W353 — prompts-path-resolution drift guard.
 *
 * Doctrine prompts at `.github/prompts/*.prompt.md` name specific repository
 * paths (READ FIRST sections, canonical-entity tables, drift-guard listings,
 * event-bus references, etc.). Today's audit session (16 commits, 10 distinct
 * drift categories caught) revealed that prose drift accumulates silently —
 * paths get renamed/moved/deleted in code without anyone updating the prompts.
 *
 * Examples caught manually 2026-05-24:
 *   - `backend/services/event-bus/` referenced but never existed (actual:
 *     `backend/integration/systemIntegrationBus.js` + 3 ddd-prefixed siblings)
 *   - `backend/models/CapaItem.js` referenced but actual lives at
 *     `backend/models/quality/CapaItem.model.js`
 *   - `domains/episodes/models/EpisodeOfCare.js` missing `backend/` prefix
 *
 * This guard automates the path-resolution audit so the same drift class
 * cannot reappear silently — any prompt that names a non-existent backend
 * path fails CI.
 *
 * Pattern scanned: backticked paths matching `backend/...` inside .prompt.md
 * files. Non-backticked paths are skipped (they're often illustrative rather
 * than canonical). The W325c stale-baseline ratchet pattern is used so future
 * stale entries surface immediately.
 *
 * Static analysis only — no runtime require. Safe under jest.setup.js
 * mongoose mock.
 *
 * Re-verify recipe (for ad-hoc audit):
 *   npx jest --config=jest.config.js __tests__/prompts-path-resolution-wave353.test.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const PROMPTS_DIR = path.join(REPO_ROOT, '.github', 'prompts');

// Match backticked `backend/path/segment.ext` references in markdown. The
// backtick boundary protects against false positives from prose. The path
// must look like a real backend path (at least one slash after `backend/`).
// Trailing punctuation (e.g. ',', '.', ')') is stripped by the captured group
// shape (no trailing punctuation chars allowed).
const BACKEND_PATH_RE = /`(backend\/[A-Za-z0-9_\-./]+)`/g;

// Paths that are intentionally referenced but don't (and shouldn't) exist
// on disk. Empty for now; add entries with a one-line justification if a
// genuinely path-shaped string in a prompt is illustrative.
const PATH_ALLOWLIST = new Set([
  // (empty — extend with explicit justification when needed)
]);

// Paths known to be referenced in prompts that exist but only as a directory
// rather than a file. We accept directory-shape references because doctrine
// prompts commonly point at directories (e.g., `backend/intelligence/canonical/`).
function pathExists(rel) {
  const abs = path.join(REPO_ROOT, rel.replace(/\/$/, ''));
  return fs.existsSync(abs);
}

function collectPromptPaths() {
  const out = []; // { promptFile, line, pathStr }
  const files = fs
    .readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.prompt.md'))
    .map(e => path.join(PROMPTS_DIR, e.name));

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const promptRel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const m of line.matchAll(BACKEND_PATH_RE)) {
        out.push({ promptFile: promptRel, line: i + 1, pathStr: m[1] });
      }
    }
  }
  return out;
}

describe('W353 prompts-path-resolution drift guard', () => {
  it('every `backend/...` path referenced in .github/prompts/*.prompt.md resolves on disk', () => {
    const refs = collectPromptPaths();
    expect(refs.length).toBeGreaterThan(20); // sanity — prompts collectively mention dozens of paths

    const broken = [];
    for (const r of refs) {
      if (PATH_ALLOWLIST.has(r.pathStr)) continue;
      if (!pathExists(r.pathStr)) {
        broken.push(r);
      }
    }

    if (broken.length > 0) {
      const lines = broken
        .map(r => `  - ${r.promptFile}:${r.line} — \`${r.pathStr}\` does not exist on disk`)
        .join('\n');
      throw new Error(
        `Found ${broken.length} broken backend/* path reference(s) in doctrine prompts:\n${lines}\n\n` +
          `Fix options:\n` +
          `  (a) Update the prompt to point at the correct path (the typical case — code moved/renamed)\n` +
          `  (b) Add the path to PATH_ALLOWLIST with a one-line justification (only if illustrative, not canonical)\n\n` +
          `Background: this guard exists because today's audit session (2026-05-24) caught 10 distinct ` +
          `prose-drift categories manually. Without this guard, the same drift class re-appears silently ` +
          `every time a backend file gets moved/renamed.`
      );
    }
  });

  it('PATH_ALLOWLIST entries (if any) are still actually missing from disk (stale-allowlist check)', () => {
    const stale = [];
    for (const allowed of PATH_ALLOWLIST) {
      if (pathExists(allowed)) {
        stale.push(allowed);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `${stale.length} entry/entries in PATH_ALLOWLIST now resolve on disk. Remove them ` +
          `from the allowlist in the same commit that created the file:\n` +
          stale.map(s => `  - "${s}"`).join('\n')
      );
    }
  });
});
