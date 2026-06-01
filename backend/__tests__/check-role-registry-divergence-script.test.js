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

  // ADR-037 FULLY RECONCILED (W730 D2 + W731 D3, 2026-06-01): BOTH sides now 0.
  // D2 added the 26 rbac-only roles to roles.constants; D3 gave the 9 const-only
  // roles real hierarchy + permission maps in rbac.config (they previously
  // resolved to nothing). The two registries now agree exactly.
  it('rbac-only side fully reconciled (ADR-037 D2 — gap 0)', () => {
    expect(div.onlyInRbac).toHaveLength(0);
    expect(div.onlyInRbac).not.toContain('branch_manager');
  });

  it('const-only side fully reconciled (ADR-037 D3 — gap 0)', () => {
    expect(div.onlyInConst).toHaveLength(0);
    expect(div.onlyInConst).not.toContain('independent_advocate');
    expect(div.onlyInConst).not.toContain('dpo');
  });

  it('the formerly-unresolvable 9 const-only roles now resolve to real grants', () => {
    const rbac = require('../config/rbac.config.js');
    for (const role of [
      'nurse',
      'head_nurse',
      'nursing_supervisor',
      'dpo',
      'family_counsellor',
      'independent_advocate',
      'cultural_officer',
      'patient_relations_officer',
      'crm_supervisor',
    ]) {
      const perms = rbac.resolvePermissions(role);
      expect(perms && typeof perms === 'object' && Object.keys(perms).length).toBeGreaterThan(0);
    }
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
