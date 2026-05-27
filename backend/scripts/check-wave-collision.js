#!/usr/bin/env node
/**
 * check-wave-collision.js — detect Wave-number collisions across the
 * project's TWO git repositories before a push lands them on a remote.
 *
 * WHY (the incident class):
 *   This codebase ships features as numbered "Waves" (W001 … W520+).
 *   Wave numbers are assigned at commit time and serve as the primary
 *   cross-reference in commit messages, docs, drift-guard names, and
 *   memory entries. The repo split — alawael-erp (this dir) +
 *   alawael-rehab-platform — means two parallel-running agents/devs
 *   regularly mint the same WNNN simultaneously. Documented collisions
 *   in CLAUDE.md include W381 / W383 / W384 (clinical-services vs
 *   event-bus bridge series), W442 (3× collisions), W443-W445 (3
 *   collisions on adjacent commits), and W503-W508 (6 collisions in
 *   one security sweep). Each collision wastes ~30 minutes after-the-
 *   fact untangling: re-numbering memory, fixing cross-refs, deciding
 *   which content the wave "really" was.
 *
 * HOW THIS GATE WORKS:
 *   1. Scan commits being pushed (`git log @{u}..HEAD --oneline`) and
 *      extract every WNNN reference from each subject line.
 *   2. For each Wave number, search:
 *        (a) ALL prior commits in THIS repo (older than the push range)
 *        (b) ALL commits in the OTHER repo (located via env var
 *            CHECK_WAVE_OTHER_REPO_PATH, or the CLAUDE.md sibling path
 *            c:/Users/x-be/alawael-rehab-platform).
 *      A Wave number that appears in either context = a collision.
 *   3. Exit 1 with a per-wave report listing the colliding commits +
 *      the one-line fix recipe (re-number to next free slot).
 *
 * EDGE CASES handled:
 *   - No upstream configured for current branch → scan last 20 commits.
 *   - Other repo not present (fresh dev machine) → soft-skip with note.
 *   - Wave number appears MULTIPLE times in the push range itself (your
 *     own series) → that's normal, not a collision.
 *   - Wave number appears in a subject line as a CROSS-REFERENCE rather
 *     than a claim (e.g. "W518 — based on W462 …") → reported anyway;
 *     dev decides if it's a real claim. Conservative-by-design: false
 *     positive (1× per ~20 pushes) is cheaper than a missed collision.
 *
 * USAGE:
 *   node scripts/check-wave-collision.js              # human-readable
 *   node scripts/check-wave-collision.js --json       # machine-readable
 *   node scripts/check-wave-collision.js --limit=50   # widen own-repo scan
 *
 * ENV:
 *   CHECK_WAVE_OTHER_REPO_PATH   path to the sibling repo (overrides
 *                                the CLAUDE.md default)
 *   CHECK_WAVE_SKIP              "1" to disable the gate entirely (use
 *                                only for emergency pushes; document why
 *                                in the commit body)
 *
 * EXIT:
 *   0 = no collisions; 1 = at least one collision detected.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const JSON_MODE = process.argv.includes('--json');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Math.max(20, parseInt(LIMIT_ARG.split('=')[1], 10) || 2000) : 2000;

// Sibling repo discovery — CLAUDE.md documents the canonical pair as
// 66666/ (this dir) ↔ alawael-rehab-platform/ (sibling). The env var
// lets CI runners override when the layout differs.
const DEFAULT_OTHER_REPO = 'c:/Users/x-be/alawael-rehab-platform';

// Match WNNN as a whole token. Two-digit waves (W10) are still in the
// history; cap upper bound at W9999 to leave headroom. An OPTIONAL
// 1-2 letter suffix (W325c, W269d, W477b — sub-wave disambiguation)
// is recognized; the captured group is always the numeric portion so
// sub-waves collide on the parent wave number (W325 and W325c both
// refer to wave 325).
//
// `\b` doesn't treat `W` as a word boundary against a leading letter,
// so we use lookbehind/lookahead to avoid matching mid-word hits like
// "GROW123" or "AWS123".
const WAVE_RE = /(?<![A-Za-z0-9])W(\d{2,4})[a-zA-Z]{0,2}(?![A-Za-z0-9])/g;

function shouldSkip() {
  return process.env.CHECK_WAVE_SKIP === '1';
}

function resolveOtherRepoPath() {
  const fromEnv = process.env.CHECK_WAVE_OTHER_REPO_PATH;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());
  return path.resolve(DEFAULT_OTHER_REPO);
}

function isGitRepo(cwd) {
  if (!fs.existsSync(cwd)) return false;
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function gitLines(cwd, args, opts = {}) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 32 * 1024 * 1024,
    ...opts,
  });
  if (r.status !== 0) return null;
  return r.stdout.split(/\r?\n/).filter(Boolean);
}

// Determine the commit range "about to be pushed". Falls back to the
// last N commits when no upstream exists (fresh branch).
function pushRangeArgs(cwd) {
  // Probe `@{u}..HEAD`. If the upstream isn't set, git exits non-zero;
  // fall back to HEAD~20..HEAD so the gate still does useful work on a
  // freshly-created local branch.
  const probe = spawnSync('git', ['rev-parse', '--abbrev-ref', '@{u}'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (probe.status === 0 && probe.stdout.trim()) {
    return ['log', '@{u}..HEAD', '--oneline', '--no-merges'];
  }
  return ['log', 'HEAD', '-20', '--oneline', '--no-merges'];
}

// Extract Wave numbers from one commit subject. Returns an array of
// numeric strings (deduped, preserving order of first appearance).
function extractWaves(subject) {
  const out = [];
  const seen = new Set();
  let m;
  WAVE_RE.lastIndex = 0;
  while ((m = WAVE_RE.exec(subject)) !== null) {
    const n = m[1];
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

// Parse "abcdef1234 subject line text" → { sha, subject }.
function parseOneline(line) {
  const idx = line.indexOf(' ');
  if (idx < 0) return { sha: line, subject: '' };
  return { sha: line.slice(0, idx), subject: line.slice(idx + 1) };
}

// Build a map { waveNumber: [{sha, subject}, ...] } from a list of
// oneline-format commits.
function buildWaveIndex(lines) {
  const idx = {};
  for (const line of lines) {
    const { sha, subject } = parseOneline(line);
    for (const wave of extractWaves(subject)) {
      (idx[wave] ||= []).push({ sha, subject });
    }
  }
  return idx;
}

// Identify collisions: Waves claimed in `pushing` that ALSO appear in
// `ownPrior` (same repo, older commits) or `other` (sibling repo).
// Pure function — exposed for unit tests.
function detectCollisions(pushing, ownPrior, other) {
  const collisions = [];
  for (const [wave, claimingCommits] of Object.entries(pushing)) {
    const inOwnPrior = ownPrior[wave] || [];
    const inOther = other[wave] || [];
    if (inOwnPrior.length === 0 && inOther.length === 0) continue;
    collisions.push({
      wave,
      claimingCommits,
      ownPriorCommits: inOwnPrior,
      otherRepoCommits: inOther,
    });
  }
  // Sort by numeric wave value so output is stable + grep-friendly.
  collisions.sort((a, b) => parseInt(a.wave, 10) - parseInt(b.wave, 10));
  return collisions;
}

function nextFreeWave(claimedWaves) {
  // claimedWaves: Set<string> of all known taken wave numbers (own +
  // other). Returns the lowest integer > max(claimed) that isn't taken.
  let max = 0;
  for (const w of claimedWaves) {
    const n = parseInt(w, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

function main() {
  if (shouldSkip()) {
    if (JSON_MODE) {
      process.stdout.write(JSON.stringify({ skipped: true, reason: 'CHECK_WAVE_SKIP=1' }) + '\n');
    } else {
      console.log('check:wave-collision — SKIPPED (CHECK_WAVE_SKIP=1).');
    }
    process.exit(0);
  }

  const ownRepoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  if (!isGitRepo(ownRepoRoot)) {
    if (JSON_MODE) process.stdout.write(JSON.stringify({ error: 'not a git repo' }) + '\n');
    else console.log('check:wave-collision — current dir is not a git repo; skipping.');
    process.exit(0);
  }

  // (1) Waves about to be pushed (commits ahead of upstream).
  const pushLines = gitLines(ownRepoRoot, pushRangeArgs(ownRepoRoot));
  const pushing = buildWaveIndex(pushLines || []);

  // (2) Waves already claimed in THIS repo, EXCLUDING the push range.
  //     (Filter by sha so a push-range commit doesn't self-collide.)
  const ownAllLines =
    gitLines(ownRepoRoot, ['log', '--all', '--oneline', '--no-merges', `-${LIMIT}`]) || [];
  const pushingShas = new Set((pushLines || []).map(l => parseOneline(l).sha));
  const ownPriorLines = ownAllLines.filter(l => !pushingShas.has(parseOneline(l).sha));
  const ownPrior = buildWaveIndex(ownPriorLines);

  // (3) Waves claimed in the OTHER repo (sibling).
  const otherRepoPath = resolveOtherRepoPath();
  let other = {};
  let otherStatus = 'scanned';
  if (!isGitRepo(otherRepoPath)) {
    other = {};
    otherStatus = `not-found:${otherRepoPath}`;
  } else {
    const otherLines = gitLines(otherRepoPath, [
      'log',
      '--all',
      '--oneline',
      '--no-merges',
      `-${LIMIT}`,
    ]);
    other = buildWaveIndex(otherLines || []);
  }

  const collisions = detectCollisions(pushing, ownPrior, other);

  // Build the claimed-set for the "next free wave" suggestion at the
  // bottom of the human report (only when there ARE collisions).
  const allClaimed = new Set([
    ...Object.keys(pushing),
    ...Object.keys(ownPrior),
    ...Object.keys(other),
  ]);

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          ownRepo: ownRepoRoot,
          otherRepo: otherRepoPath,
          otherStatus,
          pushRangeCommitCount: (pushLines || []).length,
          wavesInPushRange: Object.keys(pushing).sort(),
          collisions,
          suggestedNextWave: collisions.length > 0 ? nextFreeWave(allClaimed) : null,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(
      `Own repo:   ${path.basename(ownRepoRoot)} (${(pushLines || []).length} commit(s) to push)`
    );
    console.log(
      `Other repo: ${otherStatus === 'scanned' ? path.basename(otherRepoPath) : `[${otherStatus}]`}`
    );
    console.log(
      `Push-range Waves: ${
        Object.keys(pushing)
          .sort()
          .map(w => `W${w}`)
          .join(', ') || '(none)'
      }`
    );

    if (collisions.length === 0) {
      console.log('✓ No wave-number collisions detected.');
    } else {
      console.log(`✗ ${collisions.length} collision(s) detected:`);
      for (const c of collisions) {
        console.log(`  W${c.wave}:`);
        for (const x of c.claimingCommits) {
          console.log(`    pushing → ${x.sha} ${x.subject}`);
        }
        for (const x of c.ownPriorCommits) {
          console.log(`    own prior → ${x.sha} ${x.subject}`);
        }
        for (const x of c.otherRepoCommits) {
          console.log(`    other repo → ${x.sha} ${x.subject}`);
        }
      }
      console.log('');
      console.log(`Suggested next free wave: W${nextFreeWave(allClaimed)}`);
      console.log('');
      console.log('Fix recipes:');
      console.log('  (a) re-number the offending commit(s) via `git commit --amend` or rebase');
      console.log('  (b) if a Wave-cross-reference (e.g. "W518 — based on W462") was');
      console.log("      reported as a collision, that's fine — the reference IS the");
      console.log('      authoritative cross-ref. Skip with CHECK_WAVE_SKIP=1 git push.');
      console.log('  (c) if pushing a coordinated multi-repo wave (rare), document the');
      console.log('      intent in the commit body + skip with CHECK_WAVE_SKIP=1.');
    }
  }

  process.exit(collisions.length === 0 ? 0 : 1);
}

// Pure helpers exported for unit tests (check-wave-collision-script.test.js).
// `main()` runs only as CLI so that `require()` in tests doesn't trigger a
// real `git log` invocation.
module.exports = {
  extractWaves,
  parseOneline,
  buildWaveIndex,
  detectCollisions,
  nextFreeWave,
  resolveOtherRepoPath,
  WAVE_RE,
  DEFAULT_OTHER_REPO,
};

if (require.main === module) {
  main();
}
