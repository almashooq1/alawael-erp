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
 *   - BUNDLE RANGE in the claim zone (e.g. "W553-W565" / "W553–W565") →
 *     expanded to claim EVERY wave it covers (554…564 too), not just the
 *     two endpoints. Closes the 2026-05-29 miss where a "W553-W565" bundle
 *     + a sibling "W561" were not flagged because the interior was invisible.
 *     A spaced " - " is the claim/reference separator (NOT a range), and a
 *     range wider than RANGE_EXPANSION_CAP (50) keeps only its endpoints.
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

// Inclusive wave RANGE, e.g. "W553-W565" or "W553–W565" (ASCII hyphen or
// en-dash, NO surrounding spaces — a spaced " - " is the claim/reference
// separator, handled in extractClaimWaves, and must NOT be read as a range).
// Endpoints carry the same optional 1-2 letter sub-wave suffix as WAVE_RE;
// only the numeric portions are captured. Boundaries mirror WAVE_RE so a
// mid-word "GROW553-W565" never matches.
const WAVE_RANGE_RE =
  /(?<![A-Za-z0-9])W(\d{2,4})[a-zA-Z]{0,2}[-–]W(\d{2,4})[a-zA-Z]{0,2}(?![A-Za-z0-9])/g;

// A bundle commit rarely spans more than a handful of waves. Cap expansion
// so a typo like "W10-W9999" can't balloon the index to ~10k entries; past
// the cap the two endpoints are still captured by WAVE_RE, so nothing is
// silently dropped — only the interior is skipped.
const RANGE_EXPANSION_CAP = 50;

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

// Extract only the CLAIM waves from a subject — the wave(s) the commit
// is actually minting, NOT the ones it cross-references.
//
// Convention in this repo: `type(scope): WNNN — description (… refs
// WXXX …)`. The wave(s) before the first em-dash `—` (or ` - `) are the
// claim; anything after is a cross-reference ("W524 — wire W458" claims
// W524, references W458). Without a separator the whole subject is the
// claim zone (covers short forms like "W512+W514 apply-move").
//
// This is the fix for the false-positive class the gate hit on its
// FIRST real cross-ref commit (W524 wiring W458): the `WNNN — … WXXX`
// shape is near-universal across this repo's feature commits, so
// indexing references-as-claims made the gate cry wolf on essentially
// every wave that builds on a prior one.
// Expand inclusive wave RANGES ("W553-W565") into every wave they cover.
// A bundle commit ("feat: W553-W565 — …") semantically claims all 13 waves,
// but the plain-token WAVE_RE only sees the two endpoints — so a wave INSIDE
// the range (e.g. W561) looks free, and a parallel session can mint it
// undetected. That is the exact 2026-05-29 miss: commit "W553-W565" + a
// sibling "W561" did not register as a collision. Returns numeric strings,
// deduped, order of first appearance. Ranges wider than RANGE_EXPANSION_CAP
// are left to WAVE_RE's endpoint capture (interior skipped).
function expandWaveRanges(text) {
  const out = [];
  const seen = new Set();
  let m;
  WAVE_RANGE_RE.lastIndex = 0;
  while ((m = WAVE_RANGE_RE.exec(text)) !== null) {
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end < start) continue;
    if (end - start > RANGE_EXPANSION_CAP) continue;
    for (let n = start; n <= end; n++) {
      const s = String(n);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return out;
}

function extractClaimWaves(subject) {
  const em = subject.indexOf('—');
  const hy = subject.indexOf(' - ');
  let sepIdx;
  if (em === -1) sepIdx = hy;
  else if (hy === -1) sepIdx = em;
  else sepIdx = Math.min(em, hy);
  const claimZone = sepIdx === -1 ? subject : subject.slice(0, sepIdx);
  // Discrete tokens (W553, W565) PLUS interior waves from any inclusive
  // range bundle (W553-W565 → 554…564). Deduped, discrete-first order.
  const out = [];
  const seen = new Set();
  for (const w of extractWaves(claimZone)) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  for (const w of expandWaveRanges(claimZone)) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
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
// oneline-format commits. Indexes CLAIM waves only (cross-references
// after the em-dash are ignored) so collision detection compares
// "what each commit minted", not "what each commit mentioned".
function buildWaveIndex(lines) {
  const idx = {};
  for (const line of lines) {
    const { sha, subject } = parseOneline(line);
    for (const wave of extractClaimWaves(subject)) {
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
  expandWaveRanges,
  extractClaimWaves,
  parseOneline,
  buildWaveIndex,
  detectCollisions,
  nextFreeWave,
  resolveOtherRepoPath,
  WAVE_RE,
  WAVE_RANGE_RE,
  RANGE_EXPANSION_CAP,
  DEFAULT_OTHER_REPO,
};

if (require.main === module) {
  main();
}
