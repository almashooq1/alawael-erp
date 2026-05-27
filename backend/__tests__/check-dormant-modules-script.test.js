'use strict';

/**
 * check-dormant-modules-script.test.js — exit-code + helper-contract
 * coverage for scripts/check-dormant-modules.js.
 *
 * Layered per the gate-4 reference (check-mongoose-hook-style-script):
 *   1. Pure-helper tests on buildTokenIndex (the indexing pass) +
 *      isReferenced (the dormancy heuristic) + diffBaseline (ratchet-
 *      DOWN semantics) using in-memory tmpdir fixtures.
 *   2. CLI smoke against the real backend tree (asserts only on shape
 *      + perf, not on a fixed dormant count which is volatile).
 *
 * Why this matters: the W340 cleanup arc burned ~8 waves discovering
 * the original audit had blind spots (W217/W225b false positives, then
 * AF-1/AF-2 connection.model regex gap). This gate locks the inverse
 * heuristic at the token level so any new wire-up pattern is covered
 * for free.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-dormant-modules.js');
const {
  buildTokenIndex,
  isReferenced,
  diffBaseline,
  KNOWN_DORMANT_BASELINE,
  GENERIC_NAMES,
  SKIP_DIR_NAMES,
  TOKEN_RE,
} = require('../scripts/check-dormant-modules');

describe('check-dormant-modules — TOKEN_RE shape', () => {
  it('matches identifier-shaped tokens of ≥3 chars', () => {
    const matches = 'foo bar baz vehicleMaintenance.service'.match(TOKEN_RE);
    expect(matches).toContain('foo');
    expect(matches).toContain('bar');
    expect(matches).toContain('baz');
    expect(matches).toContain('vehicleMaintenance.service');
  });

  it('does NOT match 1-2 char tokens (avoids "a", "is", "if" noise)', () => {
    expect('a b is if'.match(TOKEN_RE)).toBeNull();
  });

  it('matches kebab-case service names', () => {
    expect('biometric-attendance.routes'.match(TOKEN_RE)).toContain('biometric-attendance.routes');
  });
});

describe('check-dormant-modules — buildTokenIndex (pure)', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dormant-index-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(name, body) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, body, 'utf8');
    return p;
  }

  it('indexes a single file: each token → Set containing that file', () => {
    const f = write('alpha.js', "require('./fooService'); const x = barHelper;");
    const idx = buildTokenIndex([f]);
    expect(idx.get('fooService')).toBeInstanceOf(Set);
    expect(idx.get('fooService').has(f)).toBe(true);
    expect(idx.get('barHelper').has(f)).toBe(true);
  });

  it('aggregates: same token from two files → Set with both files', () => {
    const f1 = write('one.js', 'const x = sharedThing;');
    const f2 = write('two.js', 'const y = sharedThing;');
    const idx = buildTokenIndex([f1, f2]);
    expect(idx.get('sharedThing').size).toBe(2);
    expect(idx.get('sharedThing').has(f1)).toBe(true);
    expect(idx.get('sharedThing').has(f2)).toBe(true);
  });

  it('dedupes within a single file (token recorded once per file)', () => {
    const f = write('busy.js', 'repeated repeated repeated repeated');
    const idx = buildTokenIndex([f]);
    expect(idx.get('repeated').size).toBe(1);
  });

  it('returns empty map for empty file list', () => {
    expect(buildTokenIndex([]).size).toBe(0);
  });

  it('tolerates unreadable files silently (continues with the rest)', () => {
    const f = write('readable.js', 'token1');
    const idx = buildTokenIndex([f, path.join(tmpDir, 'nonexistent.js')]);
    expect(idx.get('token1').has(f)).toBe(true);
  });
});

describe('check-dormant-modules — isReferenced (pure)', () => {
  function mkCandidate(abs, rel) {
    return {
      abs,
      rel,
      base: path.basename(abs),
      baseNoExt: path.basename(abs).replace(/\.js$/, ''),
    };
  }

  it('returns false when baseNoExt absent from index', () => {
    const c = mkCandidate('/x/orphan.service.js', 'services/orphan.service.js');
    expect(isReferenced(c, new Map())).toBe(false);
  });

  it('returns false when ONLY the candidate itself contains the token', () => {
    const c = mkCandidate('/x/lonely.service.js', 'services/lonely.service.js');
    const idx = new Map([['lonely.service', new Set([c.abs])]]);
    expect(isReferenced(c, idx)).toBe(false);
  });

  it('returns true when at least one OTHER file references the token', () => {
    const c = mkCandidate('/x/wired.service.js', 'services/wired.service.js');
    const idx = new Map([['wired.service', new Set([c.abs, '/somewhere/route.js'])]]);
    expect(isReferenced(c, idx)).toBe(true);
  });

  it('returns true when MULTIPLE other files reference (typical wired case)', () => {
    const c = mkCandidate('/x/popular.service.js', 'services/popular.service.js');
    const idx = new Map([['popular.service', new Set([c.abs, '/r1.js', '/r2.js', '/boot.js'])]]);
    expect(isReferenced(c, idx)).toBe(true);
  });
});

describe('check-dormant-modules — diffBaseline (ratchet-DOWN)', () => {
  function asCandidates(rels) {
    return rels.map(r => ({
      rel: r,
      base: path.basename(r),
      baseNoExt: path.basename(r).replace(/\.js$/, ''),
    }));
  }

  it('returns empty diff when current dormant == baseline', () => {
    const baseline = new Set(['services/a.js', 'services/b.js']);
    const current = asCandidates(['services/a.js', 'services/b.js']);
    expect(diffBaseline(current, baseline)).toEqual({ added: [], removed: [] });
  });

  it('detects ADDED dormant (new orphan, not in baseline)', () => {
    const baseline = new Set(['services/a.js']);
    const current = asCandidates(['services/a.js', 'services/new-orphan.js']);
    const d = diffBaseline(current, baseline);
    expect(d.added.map(x => x.rel)).toEqual(['services/new-orphan.js']);
    expect(d.removed).toEqual([]);
  });

  it('detects REMOVED stale baseline (file was wired-up or deleted)', () => {
    const baseline = new Set(['services/a.js', 'services/wired-now.js']);
    const current = asCandidates(['services/a.js']);
    const d = diffBaseline(current, baseline);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual(['services/wired-now.js']);
  });

  it('reports both add + remove in single diff (mixed transition)', () => {
    const baseline = new Set(['services/old-orphan.js']);
    const current = asCandidates(['services/new-orphan.js']);
    const d = diffBaseline(current, baseline);
    expect(d.added.map(x => x.rel)).toEqual(['services/new-orphan.js']);
    expect(d.removed).toEqual(['services/old-orphan.js']);
  });

  it('output is sorted (stable for diffs in PRs)', () => {
    const baseline = new Set();
    const current = asCandidates(['services/z.js', 'services/a.js', 'services/m.js']);
    const d = diffBaseline(current, baseline);
    expect(d.added.map(x => x.rel)).toEqual(['services/a.js', 'services/m.js', 'services/z.js']);
  });
});

describe('check-dormant-modules — baseline + skip structures', () => {
  it('KNOWN_DORMANT_BASELINE is a Set', () => {
    expect(KNOWN_DORMANT_BASELINE).toBeInstanceOf(Set);
  });

  it('every baseline entry uses POSIX paths (no backslashes, no absolute paths)', () => {
    for (const entry of KNOWN_DORMANT_BASELINE) {
      expect(entry).not.toMatch(/\\/);
      expect(entry).not.toMatch(/^[A-Z]:\//);
      expect(entry).not.toMatch(/^\//);
    }
  });

  it('GENERIC_NAMES skips obvious false-positive filenames', () => {
    expect(GENERIC_NAMES.has('index.js')).toBe(true);
    expect(GENERIC_NAMES.has('config.js')).toBe(true);
    expect(GENERIC_NAMES.has('server.js')).toBe(true);
  });

  it('SKIP_DIR_NAMES excludes tests and archives from scan', () => {
    expect(SKIP_DIR_NAMES.has('__tests__')).toBe(true);
    expect(SKIP_DIR_NAMES.has('_archived')).toBe(true);
    expect(SKIP_DIR_NAMES.has('node_modules')).toBe(true);
  });
});

describe('check-dormant-modules — CLI exit-code contract', () => {
  it('runs against the real backend tree and produces parseable output', () => {
    const r = spawnSync('node', [SCRIPT], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 90000,
    });
    // Gate is allowed to be RED (new dormant to triage) or GREEN
    // (baseline matches). Either way the summary line must appear.
    expect([0, 1]).toContain(r.status);
    expect(r.stdout).toMatch(/Scanned \d+ candidate/);
    expect(r.stdout).toMatch(/Dormant:/);
  });

  it('--json mode emits valid JSON with the expected fields', () => {
    const r = spawnSync('node', [SCRIPT, '--json'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 90000,
    });
    const parsed = JSON.parse(r.stdout);
    expect(typeof parsed.scannedCandidates).toBe('number');
    expect(typeof parsed.scannedReferrers).toBe('number');
    expect(typeof parsed.tokenIndexSize).toBe('number');
    expect(typeof parsed.dormantCount).toBe('number');
    expect(Array.isArray(parsed.newDormant)).toBe(true);
    expect(Array.isArray(parsed.staleBaseline)).toBe(true);
    expect(typeof parsed.elapsedMs).toBe('number');
    // Sanity: should have scanned a meaningful number of files
    expect(parsed.scannedCandidates).toBeGreaterThan(50);
    expect(parsed.scannedReferrers).toBeGreaterThan(100);
    expect(parsed.tokenIndexSize).toBeGreaterThan(1000);
  });

  it('--bare mode emits raw dormant list with no baseline filter', () => {
    const r = spawnSync('node', [SCRIPT, '--bare', '--json'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 90000,
    });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(Array.isArray(parsed.dormant)).toBe(true);
    expect(typeof parsed.elapsedMs).toBe('number');
  });

  it('completes in under 60 seconds on the real codebase (perf budget)', () => {
    const r = spawnSync('node', [SCRIPT, '--json'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 90000,
    });
    const parsed = JSON.parse(r.stdout);
    // 60s is the agent-loop ceiling for an on-demand audit; typical
    // warm-cache runs are 5-15s on Windows.
    expect(parsed.elapsedMs).toBeLessThan(60000);
  });
});
