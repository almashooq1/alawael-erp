/**
 * role-levels-coverage-wave932.test.js — H1 drift guard
 *
 * WHY (the incident class — AUTHZ_REMEDIATION_BACKLOG H1):
 *   ADR-037 D2 (W730) added 26 org/exec/clinical roles + `ceo` to
 *   config/constants/roles.constants.js ROLES, but ROLE_LEVELS was NOT updated.
 *   levelOf() falls back to L6 (`?? 6`) for any role absent from ROLE_LEVELS, so
 *   every newly-added manager/director/specialist silently resolved to the
 *   lowest tier and FAILED hasLevel() / requireLevel() gates. No guard covered
 *   this: check-role-registry-divergence.js only checks ROLES ↔ rbac.config,
 *   never the ROLE_LEVELS map. This test closes that blind spot.
 *
 * WHAT IT LOCKS:
 *   1. COVERAGE — every canonical role (ALL_ROLES) has an explicit ROLE_LEVELS
 *      entry; nothing relies on the `?? 6` fallback. Adding a role to ROLES
 *      without a level now fails CI.
 *   2. CROSS-REGISTRY — every role in rbac.config ROLE_HIERARCHY also has a
 *      ROLE_LEVELS entry (catches the inverse drift: a role added to the resolver
 *      registry but not tiered here).
 *   3. RANGE — every level is an integer in [1, 6] (the ADR-005 tier band).
 *   4. SCOPE-CONSISTENCY (the security-critical pins) — HQ/cross-branch roles are
 *      L≤2 (the ABAC "L1/L2 = cross-branch bypass" marker) and region-scoped
 *      roles are L3 (NOT ≤2), so a regional director is never mis-read as an HQ
 *      all-branch principal by a `levelOf(r) <= 2` check.
 *
 * Pure unit test (no DB / no boot). jest.setup.js mocks mongoose; requiring the
 * two config modules is side-effect-free for this assertion set.
 */

'use strict';

const {
  ROLES,
  ALL_ROLES,
  ROLE_LEVELS,
  levelOf,
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
} = require('../config/constants/roles.constants');
const { ROLE_HIERARCHY } = require('../config/rbac.config');

describe('ROLE_LEVELS coverage (H1 / W932)', () => {
  it('every canonical role has an explicit ROLE_LEVELS entry (no ?? 6 fallback)', () => {
    const missing = ALL_ROLES.filter(r => !Object.prototype.hasOwnProperty.call(ROLE_LEVELS, r));
    expect(missing).toEqual([]);
  });

  it('every rbac.config ROLE_HIERARCHY role is also tiered in ROLE_LEVELS', () => {
    const missing = Object.keys(ROLE_HIERARCHY).filter(
      r => !Object.prototype.hasOwnProperty.call(ROLE_LEVELS, r)
    );
    expect(missing).toEqual([]);
  });

  it('every level is an integer in the ADR-005 band [1, 6]', () => {
    for (const [role, lvl] of Object.entries(ROLE_LEVELS)) {
      expect(Number.isInteger(lvl)).toBe(true);
      expect(lvl).toBeGreaterThanOrEqual(1);
      expect(lvl).toBeLessThanOrEqual(6);
      // levelOf must return the explicit value, never the fallback, for a known role
      expect(levelOf(role)).toBe(lvl);
    }
  });

  it('the 26 D2-union roles + ceo resolve to a real tier, not the L6 fallback', () => {
    const unionRoles = [
      'ceo',
      'branch_manager',
      'regional_director',
      'regional_quality',
      'quality_coordinator',
      'clinical_director',
      'group_gm',
      'group_cfo',
      'group_chro',
      'group_quality_officer',
      'compliance_officer',
      'internal_auditor',
      'it_admin',
      'hr_officer',
      'hr_supervisor',
      'finance_supervisor',
      'therapy_supervisor',
      'special_ed_supervisor',
      'therapist_slp',
      'therapist_ot',
      'therapist_pt',
      'therapist_psych',
      'special_ed_teacher',
      'therapy_assistant',
      'driver',
      'bus_assistant',
      'guardian',
    ];
    for (const r of unionRoles) {
      expect(Object.prototype.hasOwnProperty.call(ROLE_LEVELS, r)).toBe(true);
    }
  });
});

describe('ROLE_LEVELS ↔ branch-scope consistency (security pins)', () => {
  it('HQ / cross-branch roles are tier ≤ 2 (the ABAC "L1/L2 = cross-branch" marker)', () => {
    // CROSS_BRANCH_ROLES minus the legacy admin-tier names (admin is L3 by design
    // and tenant-bypass, but it predates the level/scope split); the Phase-7 HQ
    // roles + dpo must all be ≤ 2 so a `levelOf(r) <= 2` check treats them as HQ.
    const hqRoles = CROSS_BRANCH_ROLES.filter(r => r !== 'admin');
    for (const r of hqRoles) {
      expect(levelOf(r)).toBeLessThanOrEqual(2);
    }
  });

  it('region-scoped roles are EXACTLY L3 — never ≤ 2 (would falsely read as HQ all-branch)', () => {
    for (const r of REGION_SCOPED_ROLES) {
      expect(levelOf(r)).toBe(3);
      expect(levelOf(r)).toBeGreaterThan(2); // explicit: not an HQ bypass principal
    }
  });

  it('pins the derived tier of representative roles per the rbac.config hierarchy sections', () => {
    expect(levelOf(ROLES.CEO)).toBe(2); // HQ exec, broader-than-head_office_admin perms
    expect(levelOf(ROLES.IT_ADMIN)).toBe(2); // HQ technical, cross-branch (not L1 platform)
    expect(levelOf(ROLES.GROUP_CFO)).toBe(2);
    expect(levelOf(ROLES.REGIONAL_DIRECTOR)).toBe(3); // region, NOT HQ
    expect(levelOf(ROLES.BRANCH_MANAGER)).toBe(3); // single-branch ops
    expect(levelOf(ROLES.CLINICAL_DIRECTOR)).toBe(3);
    expect(levelOf(ROLES.HR_SUPERVISOR)).toBe(4); // department within branch
    expect(levelOf(ROLES.THERAPY_SUPERVISOR)).toBe(4);
    expect(levelOf(ROLES.THERAPIST_SLP)).toBe(5); // professional caseload
    expect(levelOf(ROLES.THERAPY_ASSISTANT)).toBe(5);
    // NON_MATRIX transport roles are own-records L6, NOT professional L5 (W932
    // adversarial over-grant review): pin so they can't drift up into a
    // hasLevel(5) professional gate.
    expect(levelOf(ROLES.DRIVER)).toBe(6);
    expect(levelOf(ROLES.BUS_ASSISTANT)).toBe(6);
    expect(levelOf(ROLES.GUARDIAN)).toBe(6); // external self-service == parent
    expect(levelOf(ROLES.GUARDIAN)).toBe(levelOf(ROLES.PARENT));
  });
});
