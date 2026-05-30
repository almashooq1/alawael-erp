'use strict';

/**
 * check-role-registry-divergence-script.test.js — self-test for the Phase-0
 * role-registry divergence guard (scripts/check-role-registry-divergence.js).
 * Covers the pure diff + the real-tree computeDivergence + the CLI exit contract.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-role-registry-divergence.js');
const {
  computeDivergence,
  diff,
  ONLY_IN_RBAC_BASELINE,
  ONLY_IN_CONST_BASELINE,
} = require('../scripts/check-role-registry-divergence');

describe('role-registry divergence — diff() ratchet logic', () => {
  const baseR = new Set(['a', 'b']);
  const baseC = new Set(['x']);

  it('ok when divergence === baseline', () => {
    const r = diff({ onlyInRbac: ['a', 'b'], onlyInConst: ['x'] }, baseR, baseC);
    expect(r.ok).toBe(true);
  });

  it('flags a NEW rbac-only role', () => {
    const r = diff({ onlyInRbac: ['a', 'b', 'c'], onlyInConst: ['x'] }, baseR, baseC);
    expect(r.ok).toBe(false);
    expect(r.novelRbac).toEqual(['c']);
  });

  it('flags a NEW const-only role', () => {
    const r = diff({ onlyInRbac: ['a', 'b'], onlyInConst: ['x', 'y'] }, baseR, baseC);
    expect(r.ok).toBe(false);
    expect(r.novelConst).toEqual(['y']);
  });

  it('flags a STALE baseline entry (reconciled into both) to force ratchet-down', () => {
    const r = diff({ onlyInRbac: ['a'], onlyInConst: ['x'] }, baseR, baseC);
    expect(r.ok).toBe(false);
    expect(r.staleRbac).toEqual(['b']);
  });
});

describe('role-registry divergence — real-tree computeDivergence()', () => {
  const div = computeDivergence();

  it('rbac.config has more roles than roles.constants (superset-ish)', () => {
    expect(div.rcCount).toBeGreaterThan(div.conCount);
  });

  it('the known bidirectional divergence is present (rbac-only incl. branch_manager)', () => {
    expect(div.onlyInRbac).toContain('branch_manager');
    expect(div.onlyInRbac).toContain('clinical_director');
  });

  it('const-only side present (incl. the W464 CRPD + DPO roles)', () => {
    expect(div.onlyInConst).toContain('independent_advocate');
    expect(div.onlyInConst).toContain('dpo');
  });

  it('current divergence exactly equals the committed baseline (no pre-existing drift)', () => {
    const d = diff(div, ONLY_IN_RBAC_BASELINE, ONLY_IN_CONST_BASELINE);
    expect(d.ok).toBe(true);
  });
});

describe('role-registry divergence — CLI exit contract', () => {
  it('exits 0 when divergence matches the baseline', () => {
    const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out).toMatch(/divergence intact/);
  });
});
