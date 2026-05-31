'use strict';
/**
 * W669 — drift guard for the seed-key → rbac.config taxonomy map
 * (backend/authorization/permission-taxonomy.map.json).
 *
 * This map is the permission-KEY analog of role-archetype.map.json (which maps
 * ROLES). It is the precondition AUTHZ_MODERNIZATION_PLAN §5.1 needs before any
 * resolver-collapse: the seed keys are 3-segment field-level, rbac.config is
 * 2-segment, and the relationship is a strict many-to-one refinement — so the
 * two resolvers can only be reconciled THROUGH this map.
 *
 * STATIC: every registry permission key is mapped exactly once; no phantom keys;
 * every rbac target resolves in rbac.config RESOURCES/ACTIONS.
 * BEHAVIORAL: the map composes with rbac.hasPermission for a sampled role set
 * (proves the targets are live-callable), and documents the refinement collisions.
 *
 * Pure: no DB, no boot.
 */

const reg = require('../authorization/permissions.registry');
const rc = require('../config/rbac.config');
const taxonomy = require('../authorization/permission-taxonomy.map.json');

const REG_KEYS = reg.ALL.slice().sort();
const MAPPED = taxonomy.map.map(e => e.key);
const RESOURCES = new Set(Object.values(rc.RESOURCES).map(String));
const ACTIONS = new Set(Object.values(rc.ACTIONS).map(String));

describe('W669 taxonomy map — coverage (static, ADR-037 precondition)', () => {
  it('every registry permission key is mapped exactly once', () => {
    const counts = MAPPED.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {});
    const missing = REG_KEYS.filter(k => !counts[k]);
    const duplicated = Object.entries(counts)
      .filter(([, n]) => n > 1)
      .map(([k]) => k);
    expect({ missing, duplicated }).toEqual({ missing: [], duplicated: [] });
  });

  it('the map contains no key absent from the registry', () => {
    const regSet = new Set(REG_KEYS);
    expect(MAPPED.filter(k => !regSet.has(k))).toEqual([]);
  });

  it('every rbac target resolves to a real rbac.config resource + action', () => {
    const badResource = [];
    const badAction = [];
    for (const e of taxonomy.map) {
      if (!e.rbac) continue; // null = no 2-segment equivalent (allowed)
      if (!RESOURCES.has(e.rbac.resource)) badResource.push(`${e.key} -> ${e.rbac.resource}`);
      if (!ACTIONS.has(e.rbac.action)) badAction.push(`${e.key} -> ${e.rbac.action}`);
    }
    expect({ badResource, badAction }).toEqual({ badResource: [], badAction: [] });
  });
});

describe('W669 taxonomy map — refinement shape (behavioral)', () => {
  it('the seed→rbac mapping is many-to-one (more mapped keys than distinct targets)', () => {
    const withTarget = taxonomy.map.filter(e => e.rbac);
    const targets = new Set(withTarget.map(e => `${e.rbac.resource}:${e.rbac.action}`));
    expect(taxonomy.map.length).toBe(75);
    expect(targets.size).toBeLessThan(withTarget.length); // refinement → collisions exist
    expect(targets.size).toBeGreaterThanOrEqual(40);
  });

  it('only a small, documented set of keys has NO live equivalent (null)', () => {
    const nulls = taxonomy.map
      .filter(e => !e.rbac)
      .map(e => e.key)
      .sort();
    // branch CRUD + rbac policy mgmt have no 2-segment rbac resource (genuine gaps)
    expect(nulls).toEqual(
      [
        'branch:org:create',
        'branch:org:delete',
        'branch:org:read',
        'branch:org:update',
        'rbac:policy:manage',
      ].sort()
    );
    // every null entry must carry a note explaining the gap
    for (const e of taxonomy.map.filter(e => !e.rbac)) expect(typeof e.note).toBe('string');
  });

  it('the canonical refinement collision holds: demographics:read & clinical:read → beneficiaries:read', () => {
    const find = k => taxonomy.map.find(e => e.key === k).rbac;
    expect(find('beneficiary:demographics:read')).toEqual({
      resource: 'beneficiaries',
      action: 'read',
    });
    expect(find('beneficiary:clinical:read')).toEqual({
      resource: 'beneficiaries',
      action: 'read',
    });
  });

  it('every rbac target is live-callable via rbac.hasPermission (super_admin sees all)', () => {
    // super_admin holds *:* in rbac.config — every mapped target must return true,
    // proving the (resource,action) pair is a real live capability, not a typo.
    for (const e of taxonomy.map) {
      if (!e.rbac) continue; // null = no live equivalent (asserted separately)
      expect(rc.hasPermission('super_admin', e.rbac.resource, e.rbac.action)).toBe(true);
    }
  });

  it('collision example resolves the field-split that rbac is blind to (via can())', () => {
    // can() (3-seg) distinguishes; rbac (2-seg) cannot — this is WHY the map is needed.
    const { can } = require('../authorization/can');
    expect(can('receptionist', 'beneficiary:demographics:read').allow).toBe(true);
    expect(can('receptionist', 'beneficiary:clinical:read').allow).toBe(false);
    // both collapse to the same rbac key, so rbac alone cannot express the difference:
    const a = taxonomy.map.find(e => e.key === 'beneficiary:demographics:read').rbac;
    const b = taxonomy.map.find(e => e.key === 'beneficiary:clinical:read').rbac;
    expect(a).toEqual(b);
  });
});
