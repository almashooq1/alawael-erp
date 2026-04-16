/**
 * Tests for roles.constants — canonical role hierarchy (ADR-005).
 */
const {
  ROLES,
  ROLE_LEVELS,
  levelOf,
  hasLevel,
  resolveRole,
} = require('../config/constants/roles.constants');

describe('ROLE_LEVELS (ADR-005)', () => {
  test('every canonical role has a level assigned', () => {
    for (const role of Object.values(ROLES)) {
      expect(ROLE_LEVELS[role]).toBeDefined();
      expect(ROLE_LEVELS[role]).toBeGreaterThanOrEqual(1);
      expect(ROLE_LEVELS[role]).toBeLessThanOrEqual(6);
    }
  });

  test('L1 contains only super_admin', () => {
    const l1 = Object.entries(ROLE_LEVELS)
      .filter(([, lvl]) => lvl === 1)
      .map(([r]) => r);
    expect(l1).toEqual([ROLES.SUPER_ADMIN]);
  });

  test('L2 group level includes head_office_admin', () => {
    expect(ROLE_LEVELS[ROLES.HEAD_OFFICE_ADMIN]).toBe(2);
  });

  test('L6 includes parent + student + guest', () => {
    expect(ROLE_LEVELS[ROLES.PARENT]).toBe(6);
    expect(ROLE_LEVELS[ROLES.STUDENT]).toBe(6);
    expect(ROLE_LEVELS[ROLES.GUEST]).toBe(6);
  });
});

describe('levelOf', () => {
  test('returns level for canonical role', () => {
    expect(levelOf(ROLES.SUPER_ADMIN)).toBe(1);
    expect(levelOf(ROLES.HEAD_OFFICE_ADMIN)).toBe(2);
    expect(levelOf(ROLES.MANAGER)).toBe(3);
    expect(levelOf(ROLES.SUPERVISOR)).toBe(4);
    expect(levelOf(ROLES.THERAPIST)).toBe(5);
    expect(levelOf(ROLES.PARENT)).toBe(6);
  });

  test('resolves legacy aliases', () => {
    expect(levelOf('super-admin')).toBe(1);
    expect(levelOf('hq_admin')).toBe(2);
    expect(levelOf('ceo')).toBe(2);
    expect(levelOf('branch-admin')).toBe(3);
  });

  test('unknown role falls back to L6', () => {
    expect(levelOf('nonexistent_role_xyz')).toBe(6);
    expect(levelOf(null)).toBe(6);
    expect(levelOf(undefined)).toBe(6);
  });
});

describe('hasLevel', () => {
  test('user with super_admin has every level', () => {
    expect(hasLevel([ROLES.SUPER_ADMIN], 1)).toBe(true);
    expect(hasLevel([ROLES.SUPER_ADMIN], 3)).toBe(true);
    expect(hasLevel([ROLES.SUPER_ADMIN], 6)).toBe(true);
  });

  test('therapist (L5) does not have branch manager (L3) level', () => {
    expect(hasLevel([ROLES.THERAPIST], 3)).toBe(false);
    expect(hasLevel([ROLES.THERAPIST], 5)).toBe(true);
    expect(hasLevel([ROLES.THERAPIST], 6)).toBe(true);
  });

  test('highest role wins when user has multiple', () => {
    expect(hasLevel([ROLES.THERAPIST, ROLES.MANAGER], 3)).toBe(true);
  });

  test('empty roles returns false', () => {
    expect(hasLevel([], 6)).toBe(false);
    expect(hasLevel(null, 6)).toBe(false);
  });
});

describe('resolveRole (sanity)', () => {
  test('canonical roles resolve to themselves', () => {
    for (const role of Object.values(ROLES)) {
      expect(resolveRole(role)).toBe(role);
    }
  });
});
