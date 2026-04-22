/**
 * rbac-aliases.test.js — Phase 10 Commit 10.
 *
 * Locks the contract for `config/rbac.aliases.js`:
 *   - scalar aliases resolve to rbac.config.ROLES values;
 *   - group aliases expand to arrays of rbac values;
 *   - resolveRole(x, {expand:true}) always returns an array.
 */

'use strict';

const {
  ROLE_ALIASES,
  ROLE_GROUPS,
  resolveRole,
  resolveRoles,
  isGroup,
  unresolvedAliases,
} = require('../config/rbac.aliases');
const { ROLES } = require('../config/rbac.config');

const CANONICAL = new Set(Object.values(ROLES || {}));

describe('ROLE_ALIASES shape', () => {
  test('is a frozen object', () => {
    expect(Object.isFrozen(ROLE_ALIASES)).toBe(true);
    expect(Object.isFrozen(ROLE_GROUPS)).toBe(true);
  });

  test('every non-null scalar target exists in rbac.config.ROLES', () => {
    for (const [, target] of Object.entries(ROLE_ALIASES)) {
      if (target == null) continue;
      expect(CANONICAL.has(target)).toBe(true);
    }
  });

  test('every null-mapped alias exists as a key in ROLE_GROUPS', () => {
    for (const [k, v] of Object.entries(ROLE_ALIASES)) {
      if (v == null) {
        expect(Object.prototype.hasOwnProperty.call(ROLE_GROUPS, k)).toBe(true);
      }
    }
  });

  test('every ROLE_GROUPS member resolves to a real rbac role', () => {
    for (const members of Object.values(ROLE_GROUPS)) {
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
      for (const m of members) expect(CANONICAL.has(m)).toBe(true);
    }
  });
});

describe('resolveRole', () => {
  test('canonical role passes through unchanged', () => {
    expect(resolveRole('ceo')).toBe('ceo');
    expect(resolveRole('branch_manager')).toBe('branch_manager');
  });

  test('scalar alias returns canonical string', () => {
    expect(resolveRole('medical_director')).toBe('clinical_director');
    expect(resolveRole('quality_manager')).toBe('quality_coordinator');
    expect(resolveRole('cfo')).toBe('group_cfo');
  });

  test('group alias returns the first member (or an array with expand:true)', () => {
    expect(resolveRole('executive')).toBe(ROLE_GROUPS.executive[0]);
    expect(resolveRole('executive', { expand: true })).toEqual([...ROLE_GROUPS.executive]);
  });

  test('canonical role with expand:true returns a 1-element array', () => {
    expect(resolveRole('ceo', { expand: true })).toEqual(['ceo']);
  });

  test('unknown alias → null', () => {
    expect(resolveRole('martian')).toBeNull();
    expect(resolveRole(null)).toBeNull();
  });
});

describe('resolveRoles (always-array form)', () => {
  test('scalar → [x]', () => {
    expect(resolveRoles('ceo')).toEqual(['ceo']);
    expect(resolveRoles('medical_director')).toEqual(['clinical_director']);
  });
  test('group → full list', () => {
    expect(resolveRoles('executive')).toEqual([...ROLE_GROUPS.executive]);
  });
  test('unknown → []', () => {
    expect(resolveRoles('zork')).toEqual([]);
  });
});

describe('isGroup', () => {
  test('true only for keys that live in ROLE_GROUPS', () => {
    expect(isGroup('executive')).toBe(true);
    expect(isGroup('medical_director')).toBe(false);
    expect(isGroup('ceo')).toBe(false);
    expect(isGroup(null)).toBe(false);
  });
});

describe('unresolvedAliases', () => {
  test('empty when every alias is either scalar OR has a ROLE_GROUPS entry', () => {
    expect(unresolvedAliases()).toEqual([]);
  });
});
