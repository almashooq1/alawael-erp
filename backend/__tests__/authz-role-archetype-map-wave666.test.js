'use strict';
/**
 * W666 — drift guard for the live role → archetype map (ADR-036 D4).
 *
 * STATIC: every value in config/rbac.config.js ROLES appears EXACTLY ONCE in
 * backend/authorization/role-archetype.map.json (a new live role with no
 * archetype fails CI); the backend copy does not drift from the docs source;
 * every archetype used is a declared one.
 * BEHAVIORAL: can.js resolves live role → archetype → grant/deny.
 *
 * NOTE (deliberately out of scope): config/constants/roles.constants.js carries
 * ~9 roles not present in rbac.config.js ROLES (nurse, dpo, independent_advocate,
 * cultural_officer, …). ADR-036 D4 scopes this guard to rbac.config.js ROLES;
 * reconciling the two ROLES registries is the deferred Phase-1 collapse.
 */

const fs = require('fs');
const path = require('path');

const { ROLES } = require('../config/rbac.config');
const backendMap = require('../authorization/role-archetype.map.json');
const { can, archetypeOf } = require('../authorization/can');

const DOCS_MAP = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'docs', 'architecture', 'role-archetype-map.json'),
    'utf8'
  )
);

const LIVE_ROLE_VALUES = Object.values(ROLES).map(String);
const MAPPED_LIVE = backendMap.map.map(e => String(e.live));

describe('W666 role-archetype map — coverage (static, ADR-036 D4)', () => {
  it('every rbac.config ROLES value is mapped exactly once', () => {
    const counts = MAPPED_LIVE.reduce((acc, r) => ((acc[r] = (acc[r] || 0) + 1), acc), {});
    const missing = LIVE_ROLE_VALUES.filter(r => !counts[r]);
    const duplicated = LIVE_ROLE_VALUES.filter(r => counts[r] > 1);
    expect({ missing, duplicated }).toEqual({ missing: [], duplicated: [] });
  });

  it('the map contains no live role absent from rbac.config ROLES', () => {
    const liveSet = new Set(LIVE_ROLE_VALUES);
    const phantom = MAPPED_LIVE.filter(r => !liveSet.has(r));
    expect(phantom).toEqual([]);
  });

  it('every entry uses a declared archetype', () => {
    const declared = new Set(backendMap.archetypes);
    for (const e of backendMap.map) expect(declared.has(e.archetype)).toBe(true);
  });

  it('backend copy is identical to the docs source (no drift)', () => {
    expect(backendMap).toEqual(DOCS_MAP);
  });
});

describe('W666 role-archetype map — resolution (behavioral)', () => {
  it('resolves a therapist to the THERAPIST/THR archetype', () => {
    const a = archetypeOf('therapist');
    expect(a).toMatchObject({ name: 'THERAPIST', code: 'THR' });
  });

  it('marks external roles NON_MATRIX (no registry code)', () => {
    const a = archetypeOf('parent');
    expect(a).toMatchObject({ name: 'NON_MATRIX', code: null });
  });

  it('can() honors the archetype bridge: therapist allow, receptionist deny', () => {
    expect(can({ role: 'therapist' }, 'beneficiary:clinical:read').allow).toBe(true);
    expect(can({ role: 'receptionist' }, 'beneficiary:clinical:read').allow).toBe(false);
  });

  it('can() rejects a NON_MATRIX role from the staff matrix', () => {
    const v = can('parent', 'beneficiary:demographics:read');
    expect(v.allow).toBe(false);
    expect(v.reason).toBe('non-matrix');
  });

  it('can() reports unmapped-role for an unknown role', () => {
    expect(can('not_a_real_role', 'beneficiary:demographics:read').reason).toBe('unmapped-role');
  });

  it('approver gate: a non-approver archetype cannot use *:approve it would otherwise hold', () => {
    // hr_officer → HRO, approver:false. If HRO holds an :approve grant, the gate denies it.
    const v = can('hr_officer', 'hr:leave:approve');
    if (v.reason !== 'ungranted' && v.reason !== 'unknown-permission') {
      expect(v.allow).toBe(false);
      expect(v.reason).toBe('not-approver');
    }
  });
});
