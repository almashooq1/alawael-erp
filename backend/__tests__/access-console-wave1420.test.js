'use strict';
/**
 * access-console-wave1420.test.js
 *
 * Drift guard for the READ-ONLY IAM console (W1420). The console MUST be a pure
 * projection of the canonical authority — it adds no second decision path. The
 * headline assertion (§4) proves that lib.simulate() agrees with can.js for the
 * FULL role × permission cross-product: if anyone ever forks the decision here,
 * this fails.
 */

const lib = require('../authorization/access-console/access-console.lib');
const reg = require('../authorization/permissions.registry');
const { can } = require('../authorization/can');
const archetypeMap = require('../authorization/role-archetype.map.json');

const ALL_PERMS = reg.ALL;
const ALL_ROLES = (archetypeMap.map || []).map(e => e.live);

describe('access-console — overview()', () => {
  const ov = lib.overview();
  it('reports dynamic, non-hardcoded counts', () => {
    expect(ov.permissions).toBe(ALL_PERMS.length);
    expect(ov.roles).toBe(ALL_ROLES.length);
    expect(ov.archetypes).toBe(Object.keys(reg.ARCHETYPES).length);
    expect(ov.domains).toBeGreaterThan(0);
  });
  it('points at can.js as THE decision engine', () => {
    expect(ov.decisionEngine).toBe('backend/authorization/can.js');
  });
  it('counts PHI permissions from META (never 0 in this codebase)', () => {
    const phi = ALL_PERMS.filter(k => reg.META[k] && reg.META[k].phi).length;
    expect(ov.phiPermissions).toBe(phi);
    expect(ov.phiPermissions).toBeGreaterThan(0);
  });
});

describe('access-console — listArchetypes()', () => {
  const items = lib.listArchetypes();
  it('lists exactly the 9 registry archetypes', () => {
    expect(items.length).toBe(Object.keys(reg.ARCHETYPES).length);
    items.forEach(a => {
      expect(reg.ARCHETYPES[a.code]).toBe(a.name);
      expect(typeof a.labelAr).toBe('string');
      expect(a.grantCount).toBe(Object.keys(reg.ROLE_GRANTS[a.code] || {}).length);
      expect(a.denyCount).toBe((reg.ROLE_DENY[a.code] || []).length);
    });
  });
});

describe('access-console — listRoles()', () => {
  const roles = lib.listRoles();
  it('covers every live role in the archetype map', () => {
    expect(roles.length).toBe(ALL_ROLES.length);
    const names = roles.map(r => r.role).sort();
    expect(names).toEqual([...ALL_ROLES].sort());
  });
  it('enriches each role with archetype, level, scope and a permission count', () => {
    roles.forEach(r => {
      expect(typeof r.labelAr).toBe('string');
      expect(typeof r.archetype).toBe('string');
      expect(typeof r.level).toBe('number');
      expect(r.permissionCount).toBeGreaterThanOrEqual(0);
      expect(r.permissionCount).toBeLessThanOrEqual(ALL_PERMS.length);
    });
  });
  it('permissionCount equals the can.js-derived effective grant count', () => {
    roles.forEach(r => {
      const expected = ALL_PERMS.reduce((n, k) => (can({ role: r.role }, k).allow ? n + 1 : n), 0);
      expect(r.permissionCount).toBe(expected);
    });
  });
});

describe('access-console — listPermissions() / permissionDetail()', () => {
  const perms = lib.listPermissions();
  it('lists every canonical permission with META', () => {
    expect(perms.length).toBe(ALL_PERMS.length);
    perms.forEach(p => {
      const m = reg.META[p.key];
      expect(m).toBeTruthy();
      expect(p.tier).toBe(m.tier);
      expect(p.phi).toBe(!!m.phi);
      expect(p.domain).toBe(p.key.split(':')[0]);
    });
  });
  it('grantedByArchetypes matches reg.can per archetype', () => {
    perms.forEach(p => {
      const expected = Object.keys(reg.ARCHETYPES).filter(c => reg.can(c, p.key).allow);
      expect(p.grantedByArchetypes.sort()).toEqual(expected.sort());
    });
  });
  it('permissionDetail returns null for an unknown key', () => {
    expect(lib.permissionDetail('totally:fake:permission')).toBeNull();
  });
  it('permissionDetail surfaces granting + denying archetypes for a known key', () => {
    const d = lib.permissionDetail('beneficiary:clinical:read');
    expect(d).toBeTruthy();
    expect(Array.isArray(d.grantingArchetypes)).toBe(true);
    // HQ_ADMIN is explicitly denied clinical read in the registry.
    expect(d.denyingArchetypes.map(a => a.code)).toContain('HQA');
  });
});

describe('access-console — roleDetail()', () => {
  it('groups effective permissions by domain and routes every item through can.js', () => {
    const d = lib.roleDetail('therapist');
    expect(d.mapped).toBe(true);
    expect(d.archetype).toBe('THERAPIST');
    expect(d.summary.total).toBe(ALL_PERMS.length);
    expect(d.summary.granted + d.summary.denied).toBe(ALL_PERMS.length);

    const flat = d.domains.flatMap(g => g.items);
    expect(flat.length).toBe(ALL_PERMS.length);
    flat.forEach(item => {
      const v = can({ role: 'therapist' }, item.key);
      expect(item.allow).toBe(v.allow);
      expect(item.reason).toBe(v.reason);
    });
  });
  it('returns mapped:false for an unmapped role', () => {
    const d = lib.roleDetail('not_a_real_role_xyz');
    expect(d.mapped).toBe(false);
  });
});

describe('access-console — buildMatrix()', () => {
  const m = lib.buildMatrix();
  it('is an archetype × permission grid whose cells equal reg.can', () => {
    expect(m.archetypes.length).toBe(Object.keys(reg.ARCHETYPES).length);
    expect(m.permissions.length).toBe(ALL_PERMS.length);
    m.archetypes.forEach(a => {
      ALL_PERMS.forEach(key => {
        const cell = m.cells[a.code][key];
        const v = reg.can(a.code, key);
        expect(cell.allow).toBe(v.allow);
      });
    });
  });
});

describe('access-console — simulate() PARITY with can.js (the drift guard)', () => {
  it('agrees with can.js for the FULL role × permission cross-product', () => {
    let checked = 0;
    ALL_ROLES.forEach(role => {
      ALL_PERMS.forEach(permission => {
        const sim = lib.simulate(role, permission);
        const truth = can({ role }, permission);
        expect(sim.allow).toBe(truth.allow);
        expect(sim.reason).toBe(truth.reason);
        checked += 1;
      });
    });
    expect(checked).toBe(ALL_ROLES.length * ALL_PERMS.length);
  });

  it('surfaces explicit deny (receptionist cannot read clinical PHI)', () => {
    const sim = lib.simulate('receptionist', 'beneficiary:clinical:read');
    expect(sim.allow).toBe(false);
    expect(sim.reason).toBe('explicit-deny');
  });

  it('honours the approver gate (a non-approver line role cannot approve)', () => {
    // doctor is a THERAPIST-archetype line role (approver:false).
    const sim = lib.simulate('doctor', 'treatment_plan:plan:approve');
    expect(sim.allow).toBe(false);
    expect(['not-approver', 'ungranted', 'explicit-deny']).toContain(sim.reason);
  });

  it('flags an unknown permission rather than silently allowing', () => {
    const sim = lib.simulate('super_admin', 'made:up:permission');
    expect(sim.permissionKnown).toBe(false);
    expect(sim.allow).toBe(false);
  });
});

describe('access-console — routes contract', () => {
  const routesMod = require('../authorization/access-console/access-console.routes');
  it('exports buildRouter + the two role allow-lists', () => {
    expect(typeof routesMod.buildRouter).toBe('function');
    expect(Array.isArray(routesMod.VIEW_ROLES)).toBe(true);
    expect(routesMod.VIEW_ROLES.length).toBeGreaterThan(0);
    expect(Array.isArray(routesMod.USER_INSPECT_ROLES)).toBe(true);
    // user-inspection is a STRICTER subset of view roles.
    routesMod.USER_INSPECT_ROLES.forEach(r => expect(routesMod.VIEW_ROLES).toContain(r));
  });
  it('builds an Express router with a non-empty middleware stack', () => {
    const r = routesMod.buildRouter({});
    expect(r && Array.isArray(r.stack)).toBe(true);
    expect(r.stack.length).toBeGreaterThan(5);
  });
});
