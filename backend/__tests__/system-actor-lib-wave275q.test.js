'use strict';

/**
 * system-actor-lib-wave275q.test.js — Wave 275q.
 *
 * Unit tests for `intelligence/system-actor.lib.js` — the synthetic
 * actor used by trusted internal callers (scheduler, workers,
 * replay) to satisfy service-layer MFA tier guards.
 */

const {
  makeSystemActor,
  isSystemActor,
  SYSTEM_USER_IDS,
  SYSTEM_ROLES,
  SYSTEM_MFA_TIER,
} = require('../intelligence/system-actor.lib');

const NOW = () => new Date('2026-05-22T15:00:00Z');

describe('Wave 275q — makeSystemActor', () => {
  test('default returns scheduler actor with tier 3 + fresh assertion', () => {
    const a = makeSystemActor({ now: NOW });
    expect(a.userId).toBe(SYSTEM_USER_IDS.SCHEDULER);
    expect(a.role).toBe(SYSTEM_ROLES.SCHEDULER);
    expect(a.mfaLevel).toBe(SYSTEM_MFA_TIER);
    expect(a.mfaLevel).toBe(3);
    expect(a.mfaAssertedAt).toEqual(new Date('2026-05-22T15:00:00Z'));
    expect(a.ip).toBeNull();
  });

  test('id override applies', () => {
    const a = makeSystemActor({ id: SYSTEM_USER_IDS.WORKER, now: NOW });
    expect(a.userId).toBe('system:worker');
  });

  test('role override applies', () => {
    const a = makeSystemActor({ role: SYSTEM_ROLES.REPLAY, now: NOW });
    expect(a.role).toBe('system-replay');
  });

  test('falsy id falls back to scheduler default', () => {
    const a = makeSystemActor({ id: '', now: NOW });
    expect(a.userId).toBe(SYSTEM_USER_IDS.SCHEDULER);
  });

  test('non-string id falls back', () => {
    const a = makeSystemActor({ id: 12345, now: NOW });
    expect(a.userId).toBe(SYSTEM_USER_IDS.SCHEDULER);
  });

  test('default now uses real Date when omitted', () => {
    const a = makeSystemActor();
    expect(a.mfaAssertedAt).toBeInstanceOf(Date);
    // Within 5 seconds of now (sanity)
    expect(Math.abs(a.mfaAssertedAt.getTime() - Date.now())).toBeLessThan(5000);
  });

  test('fresh assertion timestamp on every call (not memoized)', () => {
    let counter = 0;
    const customNow = () => new Date(2026, 4, 22, 15, 0, counter++);
    const a1 = makeSystemActor({ now: customNow });
    const a2 = makeSystemActor({ now: customNow });
    expect(a2.mfaAssertedAt.getTime()).toBeGreaterThan(a1.mfaAssertedAt.getTime());
  });
});

describe('Wave 275q — isSystemActor', () => {
  test('returns true for actors with system:* userId', () => {
    expect(isSystemActor({ userId: 'system:scheduler' })).toBe(true);
    expect(isSystemActor({ userId: 'system:worker' })).toBe(true);
    expect(isSystemActor({ userId: 'system:custom-tool' })).toBe(true);
  });

  test('returns false for human user IDs', () => {
    expect(isSystemActor({ userId: 'u-12345' })).toBe(false);
    expect(isSystemActor({ userId: 'admin' })).toBe(false);
    expect(isSystemActor({ userId: '64a1b2c3d4e5f6789abc' })).toBe(false);
  });

  test('returns false for null/undefined actor', () => {
    expect(isSystemActor(null)).toBe(false);
    expect(isSystemActor(undefined)).toBe(false);
  });

  test('returns false for actor missing userId', () => {
    expect(isSystemActor({})).toBe(false);
    expect(isSystemActor({ role: 'admin' })).toBe(false);
  });

  test('returns false for non-string userId', () => {
    expect(isSystemActor({ userId: 12345 })).toBe(false);
  });
});

describe('Wave 275q — SYSTEM constants are frozen', () => {
  test('SYSTEM_USER_IDS is frozen + contains 4 canonical IDs', () => {
    expect(Object.isFrozen(SYSTEM_USER_IDS)).toBe(true);
    expect(Object.keys(SYSTEM_USER_IDS).sort()).toEqual(
      ['CLI', 'REPLAY', 'SCHEDULER', 'WORKER'].sort()
    );
    for (const v of Object.values(SYSTEM_USER_IDS)) {
      expect(v.startsWith('system:')).toBe(true);
    }
  });

  test('SYSTEM_ROLES is frozen + contains 4 canonical roles', () => {
    expect(Object.isFrozen(SYSTEM_ROLES)).toBe(true);
    expect(Object.keys(SYSTEM_ROLES).sort()).toEqual(
      ['CLI', 'REPLAY', 'SCHEDULER', 'WORKER'].sort()
    );
    for (const v of Object.values(SYSTEM_ROLES)) {
      expect(v.startsWith('system-')).toBe(true);
    }
  });

  test('SYSTEM_MFA_TIER is the highest tier (3)', () => {
    expect(SYSTEM_MFA_TIER).toBe(3);
  });
});

describe('Wave 275q — round-trip: makeSystemActor → isSystemActor', () => {
  test('produced actor is recognised as system', () => {
    expect(isSystemActor(makeSystemActor())).toBe(true);
    expect(isSystemActor(makeSystemActor({ id: SYSTEM_USER_IDS.WORKER }))).toBe(true);
    expect(isSystemActor(makeSystemActor({ id: SYSTEM_USER_IDS.REPLAY }))).toBe(true);
  });
});
