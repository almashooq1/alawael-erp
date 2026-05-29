'use strict';

/**
 * check-wave-collision-script.test.js — exit-code + helper-contract
 * coverage for scripts/check-wave-collision.js.
 *
 * Two layers per the gate-4 reference (check-mongoose-hook-style-script):
 *   1. Pure-helper assertions on the WAVE_RE regex, parseOneline,
 *      buildWaveIndex, detectCollisions, nextFreeWave — these guard
 *      the detector logic from silent regression.
 *   2. CLI exit-code contract via spawnSync against a temp git repo
 *      so we exercise the real git-log invocation without depending
 *      on the surrounding monorepo state.
 *
 * Why this matters: a wave-collision gate whose regex silently
 * loosens (e.g. matches GROW123) is worse than no gate — false
 * positives erode trust + devs `CHECK_WAVE_SKIP=1` everything.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-wave-collision.js');
const {
  extractWaves,
  expandWaveRanges,
  extractClaimWaves,
  parseOneline,
  buildWaveIndex,
  detectCollisions,
  nextFreeWave,
  resolveOtherRepoPath,
  WAVE_RE,
  RANGE_EXPANSION_CAP,
  DEFAULT_OTHER_REPO,
} = require('../scripts/check-wave-collision');

describe('check-wave-collision — extractWaves (regex)', () => {
  it('extracts a single Wave number from a typical subject', () => {
    expect(extractWaves('feat(rights): W518 — self-advocacy REST surface')).toEqual(['518']);
  });

  it('extracts MULTIPLE waves from a subject that cross-references', () => {
    expect(extractWaves('feat(rights): W518 — based on W462 SelfAdvocacy')).toEqual(['518', '462']);
  });

  it('dedupes when same Wave appears twice in one subject', () => {
    expect(extractWaves('chore: W400 fixup W400 again')).toEqual(['400']);
  });

  it('handles 2-digit, 3-digit, and 4-digit waves', () => {
    expect(extractWaves('W18 wave-18 invariants ship W325c W1234')).toEqual(['18', '325', '1234']);
  });

  it('normalizes sub-wave letter suffixes (W325c → 325, W269d → 269)', () => {
    expect(extractWaves('refactor: W325c phantom-ref ratchet')).toEqual(['325']);
    expect(extractWaves('feat: W269d caseload + W269g sweep')).toEqual(['269']);
  });

  it('rejects suffix longer than 2 chars (W325cTest is mid-word)', () => {
    expect(extractWaves('W325cTest invalid')).toEqual([]);
  });

  it('does NOT match mid-word "WNNN" (avoids GROW123, AWS123 etc.)', () => {
    expect(extractWaves('feat: GROW123 fix')).toEqual([]);
    expect(extractWaves('feat: AWS123 update')).toEqual([]);
    expect(extractWaves('feat: foo123W456 bar')).toEqual([]);
  });

  it('returns empty array for subject with no wave numbers', () => {
    expect(extractWaves('chore: bump deps')).toEqual([]);
    expect(extractWaves('')).toEqual([]);
  });

  it('matches W at start of string', () => {
    expect(extractWaves('W001 origin commit')).toEqual(['001']);
  });

  it('matches W at end of string', () => {
    expect(extractWaves('finalize phase A W520')).toEqual(['520']);
  });

  it('does NOT match single-digit W (W1 is below the historical floor)', () => {
    // Regex requires {2,4} digits so W1 is intentionally ignored.
    expect(extractWaves('feat: W1 demo')).toEqual([]);
  });

  it('regex is exported as a global flag (so callers can reuse with lastIndex semantics)', () => {
    expect(WAVE_RE.global).toBe(true);
  });
});

describe('check-wave-collision — extractClaimWaves (claim vs cross-reference)', () => {
  it('claims only the wave before the em-dash; treats post-dash waves as references', () => {
    // The W524 false-positive that exposed this: "W524 — wire W458" must
    // claim W524 only, NOT collide on the W458 it cross-references.
    expect(
      extractClaimWaves('feat(crisis): W524 — wire W458 crisisOrchestrator (ADR-033 boundary)')
    ).toEqual(['524']);
  });

  it('ignores all post-em-dash references (multi-ref commit subject)', () => {
    expect(
      extractClaimWaves('feat(rights): W518 — self-advocacy REST surface for W462 + W516')
    ).toEqual(['518']);
  });

  it('treats the scope-embedded wave before em-dash as the claim', () => {
    expect(
      extractClaimWaves('test(W521): Phase B routes E2E smoke — covers W513/W515/W518')
    ).toEqual(['521']);
  });

  it('claims a contiguous multi-wave run when there is no em-dash separator', () => {
    expect(
      extractClaimWaves('feat: W512+W514 apply-move + reassigned event chain COMPLETE')
    ).toEqual(['512', '514']);
  });

  it('falls back to whole-subject when no separator present', () => {
    expect(extractClaimWaves('chore: W400 ratchet')).toEqual(['400']);
  });

  it('handles the ASCII " - " separator as well as the em-dash', () => {
    expect(extractClaimWaves('feat: W600 - builds on W123')).toEqual(['600']);
  });

  it('expands a bundle RANGE in the claim zone so interior waves are claimed (the W561 miss)', () => {
    // The exact 2026-05-29 case: a "W553-W565" bundle must claim every
    // wave it spans, so a sibling minting W561 is caught as a collision.
    const claimed = extractClaimWaves('feat(measures): W553-W565 — digital assessment engine');
    expect(claimed).toContain('553');
    expect(claimed).toContain('561'); // interior wave — the whole point
    expect(claimed).toContain('565');
    expect(claimed).toHaveLength(13); // 553..565 inclusive
  });

  it('does NOT treat the spaced " - " separator as a range', () => {
    // "W600 - builds on W123": the " - " is the claim/reference separator,
    // so the claim is W600 only — must not expand into a 600..??? range.
    expect(extractClaimWaves('feat: W600 - builds on W123')).toEqual(['600']);
  });
});

describe('check-wave-collision — expandWaveRanges (bundle ranges)', () => {
  it('expands an inclusive ASCII-hyphen range', () => {
    expect(expandWaveRanges('W100-W103')).toEqual(['100', '101', '102', '103']);
  });

  it('expands an en-dash range too', () => {
    expect(expandWaveRanges('W100–W102')).toEqual(['100', '101', '102']);
  });

  it('expands ranges whose endpoints carry sub-wave letter suffixes', () => {
    expect(expandWaveRanges('W325c-W327')).toEqual(['325', '326', '327']);
  });

  it('returns [] when there is no range (single token / plus-joined run)', () => {
    expect(expandWaveRanges('W512')).toEqual([]);
    expect(expandWaveRanges('W512+W514')).toEqual([]);
  });

  it('ignores a reversed range (end < start)', () => {
    expect(expandWaveRanges('W565-W553')).toEqual([]);
  });

  it('keeps only endpoints (skips interior) when range exceeds the cap', () => {
    // A typo like "W10-W9999" must NOT balloon the index; WAVE_RE still
    // captures the endpoints, so expandWaveRanges contributes nothing here.
    const wide = `W10-W${10 + RANGE_EXPANSION_CAP + 5}`;
    expect(expandWaveRanges(wide)).toEqual([]);
  });

  it('does NOT match a mid-word range (avoids GROW100-W200)', () => {
    expect(expandWaveRanges('GROW100-W200')).toEqual([]);
  });

  it('does NOT match a date-like hyphen string', () => {
    expect(expandWaveRanges('2026-05-29 release')).toEqual([]);
  });
});

describe('check-wave-collision — parseOneline', () => {
  it('splits sha + subject correctly', () => {
    expect(parseOneline('33937681c chore: remove stale W518 email test file')).toEqual({
      sha: '33937681c',
      subject: 'chore: remove stale W518 email test file',
    });
  });

  it('handles subject with only the SHA (rare merge commits)', () => {
    expect(parseOneline('abc123')).toEqual({ sha: 'abc123', subject: '' });
  });

  it('preserves spaces inside subject', () => {
    const r = parseOneline('deadbeef feat: W100 — multi  space  subject');
    expect(r.sha).toBe('deadbeef');
    expect(r.subject).toBe('feat: W100 — multi  space  subject');
  });
});

describe('check-wave-collision — buildWaveIndex', () => {
  it('builds a wave→commits map across multiple lines', () => {
    const lines = ['aaa11 feat: W100 thing', 'bbb22 feat: W101 other', 'ccc33 fixup W100 again'];
    const idx = buildWaveIndex(lines);
    expect(Object.keys(idx).sort()).toEqual(['100', '101']);
    expect(idx['100'].map(c => c.sha)).toEqual(['aaa11', 'ccc33']);
    expect(idx['101'].map(c => c.sha)).toEqual(['bbb22']);
  });

  it('handles empty input', () => {
    expect(buildWaveIndex([])).toEqual({});
  });

  it('skips commits with no wave reference', () => {
    expect(buildWaveIndex(['aaa chore: bump deps', 'bbb refactor: cleanup'])).toEqual({});
  });

  it('indexes CLAIM waves only — a post-em-dash cross-ref is NOT indexed', () => {
    const idx = buildWaveIndex(['aaa feat: W524 — wire W458 orchestrator']);
    expect(Object.keys(idx)).toEqual(['524']);
    expect(idx['458']).toBeUndefined();
  });
});

describe('check-wave-collision — detectCollisions (pure)', () => {
  it('returns empty when no waves overlap', () => {
    const pushing = { 100: [{ sha: 'aaa', subject: 'feat: W100' }] };
    const ownPrior = { 200: [{ sha: 'bbb', subject: 'feat: W200' }] };
    const other = { 300: [{ sha: 'ccc', subject: 'feat: W300' }] };
    expect(detectCollisions(pushing, ownPrior, other)).toEqual([]);
  });

  it('detects own-repo collision (wave was already claimed in our history)', () => {
    const pushing = { 100: [{ sha: 'aaa', subject: 'feat: W100 v2' }] };
    const ownPrior = { 100: [{ sha: 'xxx', subject: 'feat: W100 original' }] };
    const other = {};
    const c = detectCollisions(pushing, ownPrior, other);
    expect(c).toHaveLength(1);
    expect(c[0].wave).toBe('100');
    expect(c[0].ownPriorCommits[0].sha).toBe('xxx');
    expect(c[0].otherRepoCommits).toEqual([]);
  });

  it('detects other-repo collision (wave was claimed in sibling repo)', () => {
    const pushing = { 500: [{ sha: 'aaa', subject: 'feat: W500 new' }] };
    const other = { 500: [{ sha: 'sibling123', subject: 'feat: W500 sibling claim' }] };
    const c = detectCollisions(pushing, {}, other);
    expect(c).toHaveLength(1);
    expect(c[0].wave).toBe('500');
    expect(c[0].otherRepoCommits[0].sha).toBe('sibling123');
  });

  it('reports BOTH ownPrior and other repos when both have the same wave', () => {
    const pushing = { 300: [{ sha: 'aaa', subject: 'feat: W300' }] };
    const ownPrior = { 300: [{ sha: 'own1', subject: 'feat: W300 own' }] };
    const other = { 300: [{ sha: 'other1', subject: 'feat: W300 other' }] };
    const c = detectCollisions(pushing, ownPrior, other);
    expect(c).toHaveLength(1);
    expect(c[0].ownPriorCommits).toHaveLength(1);
    expect(c[0].otherRepoCommits).toHaveLength(1);
  });

  it('sorts collisions by numeric wave value (stable, grep-friendly output)', () => {
    const pushing = {
      500: [{ sha: 'a', subject: 'a' }],
      100: [{ sha: 'b', subject: 'b' }],
      250: [{ sha: 'c', subject: 'c' }],
    };
    const ownPrior = {
      100: [{ sha: 'x', subject: 'x' }],
      250: [{ sha: 'y', subject: 'y' }],
      500: [{ sha: 'z', subject: 'z' }],
    };
    const c = detectCollisions(pushing, ownPrior, {});
    expect(c.map(x => x.wave)).toEqual(['100', '250', '500']);
  });
});

describe('check-wave-collision — nextFreeWave (suggestion)', () => {
  it('returns max+1 over a small claimed set', () => {
    expect(nextFreeWave(new Set(['100', '200', '300']))).toBe('301');
  });

  it('returns "1" on empty set', () => {
    expect(nextFreeWave(new Set())).toBe('1');
  });

  it('handles 4-digit wave numbers without overflow', () => {
    expect(nextFreeWave(new Set(['9998']))).toBe('9999');
  });

  it('ignores non-numeric entries gracefully', () => {
    expect(nextFreeWave(new Set(['100', 'NaN', '50']))).toBe('101');
  });
});

describe('check-wave-collision — resolveOtherRepoPath', () => {
  const ORIG_ENV = process.env.CHECK_WAVE_OTHER_REPO_PATH;
  afterEach(() => {
    if (ORIG_ENV === undefined) delete process.env.CHECK_WAVE_OTHER_REPO_PATH;
    else process.env.CHECK_WAVE_OTHER_REPO_PATH = ORIG_ENV;
  });

  it('returns env override when set', () => {
    process.env.CHECK_WAVE_OTHER_REPO_PATH = '/tmp/some/path';
    expect(resolveOtherRepoPath()).toBe(path.resolve('/tmp/some/path'));
  });

  it('returns CLAUDE.md default when no env override', () => {
    delete process.env.CHECK_WAVE_OTHER_REPO_PATH;
    expect(resolveOtherRepoPath()).toBe(path.resolve(DEFAULT_OTHER_REPO));
  });
});

describe('check-wave-collision — CLI exit-code contract', () => {
  let tmpDir;
  let otherRepoDir;

  function runGit(cwd, args) {
    const r = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 't@t',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 't@t',
      },
    });
    if (r.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
    }
    return r.stdout;
  }

  function initRepo(dir, commits) {
    fs.mkdirSync(dir, { recursive: true });
    runGit(dir, ['init', '-q', '-b', 'main']);
    runGit(dir, ['config', 'user.email', 't@t']);
    runGit(dir, ['config', 'user.name', 'test']);
    runGit(dir, ['commit', '--allow-empty', '-m', 'init']);
    for (const msg of commits) {
      runGit(dir, ['commit', '--allow-empty', '-m', msg]);
    }
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-collision-own-'));
    otherRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-collision-other-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(otherRepoDir, { recursive: true, force: true });
  });

  function runScript(cwd, extraArgs = []) {
    return spawnSync('node', [SCRIPT, ...extraArgs], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        CHECK_WAVE_OTHER_REPO_PATH: otherRepoDir,
      },
    });
  }

  it('exits 0 when push range has no waves at all', () => {
    initRepo(tmpDir, ['chore: bump deps', 'refactor: cleanup']);
    initRepo(otherRepoDir, ['feat: W500 sibling']);
    const r = runScript(tmpDir);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/No wave-number collisions detected/);
  });

  it('exits 0 when pushed waves do NOT collide with own-prior or other repo', () => {
    initRepo(tmpDir, ['feat: W999 something fresh']);
    initRepo(otherRepoDir, ['feat: W500 sibling']);
    const r = runScript(tmpDir);
    expect(r.status).toBe(0);
  });

  it('exits 1 when a pushed wave collides with OTHER repo', () => {
    initRepo(tmpDir, ['feat: W500 same wave']);
    initRepo(otherRepoDir, ['feat: W500 sibling already used']);
    const r = runScript(tmpDir);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/collision/);
    expect(r.stdout).toMatch(/W500/);
  });

  it('exits 1 when a pushed INTERIOR wave collides with a sibling bundle RANGE (W561 case)', () => {
    // Sibling repo shipped the "W553-W565" bundle; pushing a fresh W561
    // here must now be flagged because the interior is claimed by the range.
    initRepo(tmpDir, ['feat: W561 standalone interior wave']);
    initRepo(otherRepoDir, ['feat(measures): W553-W565 — digital assessment engine']);
    const r = runScript(tmpDir, ['--json']);
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.collisions.map(c => c.wave)).toContain('561');
  });

  it('respects CHECK_WAVE_SKIP=1 (emergency bypass) → exit 0', () => {
    initRepo(tmpDir, ['feat: W500 collide']);
    initRepo(otherRepoDir, ['feat: W500 sibling']);
    const r = spawnSync('node', [SCRIPT], {
      cwd: tmpDir,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        CHECK_WAVE_OTHER_REPO_PATH: otherRepoDir,
        CHECK_WAVE_SKIP: '1',
      },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/SKIPPED/);
  });

  it('--json mode emits valid JSON with collisions field', () => {
    initRepo(tmpDir, ['feat: W500 collide']);
    initRepo(otherRepoDir, ['feat: W500 sibling']);
    const r = runScript(tmpDir, ['--json']);
    const parsed = JSON.parse(r.stdout);
    expect(Array.isArray(parsed.collisions)).toBe(true);
    expect(parsed.collisions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.collisions[0].wave).toBe('500');
    expect(parsed.suggestedNextWave).toBeTruthy();
  });

  it('--json suggestedNextWave is null when no collision', () => {
    initRepo(tmpDir, ['feat: W999 fresh']);
    initRepo(otherRepoDir, ['feat: W500 sibling']);
    const r = runScript(tmpDir, ['--json']);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.collisions).toEqual([]);
    expect(parsed.suggestedNextWave).toBeNull();
  });

  it('does NOT flag a cross-reference: pushing "W999 — wire W500" when W500 is prior history (the W524 fix)', () => {
    // Prior history claims W500; the new commit references it after the
    // em-dash while claiming a fresh W999. Must be collision-free.
    initRepo(tmpDir, ['feat: W500 original feature']);
    runGit(tmpDir, [
      'commit',
      '--allow-empty',
      '-m',
      'feat: W999 — wire W500 into the new surface',
    ]);
    initRepo(otherRepoDir, ['feat: W123 sibling']);
    const r = runScript(tmpDir, ['--json']);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.collisions).toEqual([]);
  });

  it('soft-skips when other repo path does not exist', () => {
    initRepo(tmpDir, ['feat: W123 fresh']);
    const r = spawnSync('node', [SCRIPT, '--json'], {
      cwd: tmpDir,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        CHECK_WAVE_OTHER_REPO_PATH: path.join(
          os.tmpdir(),
          'definitely-does-not-exist-' + Date.now()
        ),
      },
    });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.otherStatus).toMatch(/not-found/);
  });
});
