/**
 * can-approver-gate-and-alias-wave934.test.js
 *
 * Pins TWO W666-review items on the can() PDP (AUTHZ_REMEDIATION_BACKLOG D3+D4)
 * that the 2026-06-05 truthing pass found unpinned/unfixed:
 *
 *  D3 — the approver gate (`/:approve$/ && !approver → not-approver`,
 *       authorization/can.js:74). The pre-existing assertion in
 *       authz-role-archetype-map-wave666.test.js was VACUOUS: it used
 *       can('hr_officer','hr:leave:approve'), but HR_OFFICER is not granted
 *       hr:leave:approve, so can() short-circuits on 'ungranted' BEFORE the gate
 *       and the not-approver assertion is skipped — the test passes even if the
 *       gate is deleted. Probing the live registry shows the gate is currently
 *       UNREACHABLE through can() with real data (the registry only grants
 *       :approve perms to approver:true archetypes), so a non-vacuous pin needs
 *       three runnable parts: (a) the gate's PASS branch on real data, (b) the
 *       INVARIANT that keeps it safe (no approver:false archetype is granted any
 *       :approve perm), and (c) the DENY branch genuinely exercised via injected
 *       registry+map — deleting can.js:74 must fail (c).
 *
 *  D4 — role-alias normalization. Pre-fix, normalizeRole() only lowercased+
 *       trimmed, so a legacy alias (kebab `super-admin`, camel `superAdmin`) did
 *       not resolve to the canonical `super_admin` map key → archetypeOf returned
 *       null → can() denied with 'unmapped-role'. The fix routes through
 *       resolveRole() first. These tests would FAIL pre-fix and pass post-fix.
 *
 * Pure: no DB/boot (the modules can() touches are pure). jest.setup mocks
 * mongoose but nothing here needs it.
 */

'use strict';

const reg = require('../authorization/permissions.registry');
const archetypeMap = require('../authorization/role-archetype.map.json');
const { can, archetypeOf } = require('../authorization/can');

const APPROVE_PERMS = Object.keys(reg.META).filter(k => /:approve$/.test(k));
const APPROVER_BY_ARCH = (() => {
  const m = {};
  for (const e of archetypeMap.map || []) if (!(e.archetype in m)) m[e.archetype] = !!e.approver;
  return m;
})();

describe('can() approver gate — D3 (real data, non-vacuous)', () => {
  it('there ARE :approve permissions to gate (guards against empty-set vacuity)', () => {
    expect(APPROVE_PERMS.length).toBeGreaterThan(0);
  });

  it('PASS branch: an approver archetype granted a :approve is allowed (ceo × billing:approve)', () => {
    const v = can('ceo', 'beneficiary:billing:approve');
    expect(v.allow).toBe(true);
    expect(v.archetype).toBe('EXECUTIVE_DIRECTOR');
  });

  it('approver:false archetypes really exist (THERAPIST / AUDITOR) — gate is not moot by construction', () => {
    expect(APPROVER_BY_ARCH.THERAPIST).toBe(false);
    expect(APPROVER_BY_ARCH.AUDITOR).toBe(false);
  });

  it('INVARIANT: no approver:false archetype is granted ANY :approve perm (the property the gate backstops)', () => {
    // If the registry ever grants a :approve to an approver:false archetype, a
    // non-approver could approve unless can()'s gate caught it. Lock the safe
    // state so a future misgrant fails HERE (and the gate is its runtime backstop).
    const violations = [];
    for (const e of archetypeMap.map || []) {
      const a = archetypeOf(e.live);
      if (!a || !a.code) continue;
      for (const p of APPROVE_PERMS) {
        if (reg.can(a.code, p).allow && !a.approver) {
          violations.push(`${e.live}[${a.name}] granted ${p} but approver:false`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('can() approver gate — DENY branch genuinely exercised (injected registry+map)', () => {
  const REG_PATH = '../authorization/permissions.registry';
  const MAP_PATH = '../authorization/role-archetype.map.json';
  const CAN_PATH = '../authorization/can';

  afterEach(() => jest.resetModules());

  function withInjected(approver, fn) {
    jest.isolateModules(() => {
      jest.doMock(REG_PATH, () => ({
        META: { 'x:y:approve': { tier: 2 } },
        ARCHETYPES: { TST: 'TEST_ARCH' },
        can: (code, key) => ({ allow: code === 'TST' && key === 'x:y:approve', reason: 'granted' }),
      }));
      jest.doMock(MAP_PATH, () => ({
        map: [{ live: 'tester', archetype: 'TEST_ARCH', scope: 'branch', approver }],
      }));
      const { can: injectedCan } = require(CAN_PATH);
      fn(injectedCan);
    });
  }

  it('granted :approve + approver:false → not-approver (deleting can.js:74 fails THIS test)', () => {
    withInjected(false, c => {
      const v = c('tester', 'x:y:approve');
      expect(v.allow).toBe(false);
      expect(v.reason).toBe('not-approver');
      expect(v.archetype).toBe('TEST_ARCH');
    });
  });

  it('granted :approve + approver:true → allow (gate passes for an approver)', () => {
    withInjected(true, c => {
      expect(c('tester', 'x:y:approve').allow).toBe(true);
    });
  });

  it('a NON-:approve perm + approver:false → NOT gated (allowed when granted)', () => {
    jest.isolateModules(() => {
      jest.doMock(REG_PATH, () => ({
        META: { 'x:y:read': { tier: 1 } },
        ARCHETYPES: { TST: 'TEST_ARCH' },
        can: () => ({ allow: true, reason: 'granted' }),
      }));
      jest.doMock(MAP_PATH, () => ({
        map: [{ live: 'tester', archetype: 'TEST_ARCH', scope: 'branch', approver: false }],
      }));
      const { can: c } = require(CAN_PATH);
      expect(c('tester', 'x:y:read').allow).toBe(true);
    });
  });
});

describe('can() role-alias normalization — D4', () => {
  it('legacy kebab alias resolves like canonical (super-admin == super_admin)', () => {
    const legacy = can('super-admin', 'user:account:read');
    const canonical = can('super_admin', 'user:account:read');
    expect(legacy.reason).not.toBe('unmapped-role'); // pre-fix this WAS 'unmapped-role'
    expect(legacy.allow).toBe(canonical.allow);
    expect(legacy.archetype).toBe(canonical.archetype);
  });

  it('camelCase alias resolves too (superAdmin)', () => {
    const v = can('superAdmin', 'user:account:read');
    expect(v.reason).not.toBe('unmapped-role');
    expect(v.archetype).toBe(can('super_admin', 'user:account:read').archetype);
  });

  it('archetypeOf resolves the alias to the same entry as canonical', () => {
    expect(archetypeOf('super-admin')).toEqual(archetypeOf('super_admin'));
  });

  it('an unknown role is still unmapped (no false alias resolution)', () => {
    expect(can('totally_made_up_role', 'user:account:read').reason).toBe('unmapped-role');
  });

  it('nullish role is denied and does not crash', () => {
    expect(can(null, 'user:account:read').allow).toBe(false);
    expect(can(undefined, 'user:account:read').allow).toBe(false);
    expect(can('', 'user:account:read').reason).toBe('unmapped-role');
  });
});
