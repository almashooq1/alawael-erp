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
  parseOneline,
  buildWaveIndex,
  detectCollisions,
  nextFreeWave,
  resolveOtherRepoPath,
  WAVE_RE,
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
