'use strict';

/**
 * check-gitignored-sources-script.test.js — exit-code + diff contract
 * for scripts/check-gitignored-sources.js (Cycle 11 gate 3).
 *
 * Why: gate 3's bug-class catch is "tracked source file matches a
 * .gitignore rule" (the _primitives.js W444 incident — 22 schemas
 * silently broke on CI). The ratchet-DOWN logic must fire in BOTH
 * directions:
 *   - NEW tracked-ignored entry → fail (catch regression)
 *   - STALE baseline entry → fail (force baseline cleanup on fix)
 *
 * If either direction silently weakens, the gate becomes a false sense
 * of security. This test covers both, plus the baseline structure
 * itself (catches if someone empties or mis-types the Set).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-gitignored-sources.js');
const { diffBaseline, BASELINE_TRACKED_IGNORED } = require('../scripts/check-gitignored-sources');

describe('check-gitignored-sources — diffBaseline (pure)', () => {
  it('returns empty added/removed when current matches baseline exactly', () => {
    const baseline = new Set(['a.js', 'b.js']);
    const current = new Set(['a.js', 'b.js']);
    expect(diffBaseline(current, baseline)).toEqual({ added: [], removed: [] });
  });

  it('detects NEW tracked-ignored entry (the W444 regression class)', () => {
    const baseline = new Set(['existing.js']);
    const current = new Set(['existing.js', 'new-silent-break.js']);
    expect(diffBaseline(current, baseline)).toEqual({
      added: ['new-silent-break.js'],
      removed: [],
    });
  });

  it('detects STALE baseline entry (forces ratchet-DOWN per W325c)', () => {
    // Someone fixed the gitignore pattern, removing the file from the
    // tracked-ignored set. Gate must fail until baseline is updated.
    const baseline = new Set(['was-broken.js', 'still-broken.js']);
    const current = new Set(['still-broken.js']);
    expect(diffBaseline(current, baseline)).toEqual({
      added: [],
      removed: ['was-broken.js'],
    });
  });

  it('reports BOTH directions simultaneously', () => {
    const baseline = new Set(['stale.js', 'kept.js']);
    const current = new Set(['kept.js', 'added.js']);
    expect(diffBaseline(current, baseline)).toEqual({
      added: ['added.js'],
      removed: ['stale.js'],
    });
  });

  it('output arrays are sorted (stable diff output)', () => {
    const baseline = new Set(['z.js', 'a.js']);
    const current = new Set(['m.js', 'b.js']);
    const { added, removed } = diffBaseline(current, baseline);
    expect(added).toEqual(['b.js', 'm.js']);
    expect(removed).toEqual(['a.js', 'z.js']);
  });
});

describe('check-gitignored-sources — BASELINE_TRACKED_IGNORED structure', () => {
  it('is a Set instance (not an array — Set membership semantics matter)', () => {
    expect(BASELINE_TRACKED_IGNORED).toBeInstanceOf(Set);
  });

  it('contains at least 25 entries (sanity — catches accidental emptying)', () => {
    // 31 as of cycle 11; allow growth/shrinkage but not collapse to zero.
    expect(BASELINE_TRACKED_IGNORED.size).toBeGreaterThanOrEqual(25);
  });

  it('every entry is a relative POSIX path (no backslashes from Windows)', () => {
    for (const entry of BASELINE_TRACKED_IGNORED) {
      expect(entry).not.toMatch(/\\/);
      expect(entry).not.toMatch(/^[A-Z]:\//); // no Windows drive letter
      expect(entry).not.toMatch(/^\//); // no absolute leading /
    }
  });

  it('contains the W444 historical entries (_archived dead-models)', () => {
    // The dead-model snapshots that originally surfaced this bug class.
    // If these are EVER removed from baseline, the diff catches it.
    expect(BASELINE_TRACKED_IGNORED.has('backend/_archived/dead-models/Training.js')).toBe(true);
    expect(BASELINE_TRACKED_IGNORED.has('backend/routes/_registry.js')).toBe(true);
  });
});

describe('check-gitignored-sources — CLI exit-code contract', () => {
  it('exits 0 against the real repo (baseline must be in sync)', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', timeout: 15000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Baseline matches current state/);
  });

  it('--json mode prints valid JSON with baselineSize + currentSize + added + removed', () => {
    const r = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8', timeout: 15000 });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(typeof parsed.baselineSize).toBe('number');
    expect(typeof parsed.currentSize).toBe('number');
    expect(Array.isArray(parsed.added)).toBe(true);
    expect(Array.isArray(parsed.removed)).toBe(true);
    expect(parsed.added).toEqual([]);
    expect(parsed.removed).toEqual([]);
  });
});
