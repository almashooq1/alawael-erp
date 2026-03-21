/**
 * Tests for config/rbac.config.js — RBAC permission system
 *
 * Covers:
 *  - Data-integrity of ROLES, ALL_ROLES, ACTIONS, RESOURCES, ROLE_HIERARCHY, ROLE_PERMISSIONS
 *  - resolvePermissions() with inheritance & caching
 *  - flattenPermissions() with wildcard, custom, denied
 *  - hasPermission() full branch coverage
 *  - getRoleLevel(), isAtLeast(), getRoleLabel(), clearCache()
 */

const {
  ROLES,
  ALL_ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  flattenPermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
  getRoleLabel,
  clearCache,
} = require('../config/rbac.config');

// ── Reset cache between tests ────────────────────────────────────────────────
afterEach(() => clearCache());

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATA INTEGRITY
// ═════════════════════════════════════════════════════════════════════════════

describe('RBAC data integrity', () => {
  test('ROLES has at least 15 entries', () => {
    expect(Object.keys(ROLES).length).toBeGreaterThanOrEqual(15);
  });

  test('ALL_ROLES matches Object.values(ROLES)', () => {
    expect(ALL_ROLES).toEqual(expect.arrayContaining(Object.values(ROLES)));
    expect(ALL_ROLES.length).toBe(Object.keys(ROLES).length);
  });

  test('every ROLES value is a lowercase snake_case string', () => {
    Object.values(ROLES).forEach(v => {
      expect(v).toMatch(/^[a-z][a-z_]*$/);
    });
  });

  test('ACTIONS contains standard CRUD + extras', () => {
    expect(ACTIONS.CREATE).toBe('create');
    expect(ACTIONS.READ).toBe('read');
    expect(ACTIONS.UPDATE).toBe('update');
    expect(ACTIONS.DELETE).toBe('delete');
    expect(ACTIONS.EXPORT).toBe('export');
    expect(ACTIONS.MANAGE).toBe('manage');
  });

  test('RESOURCES contains expected keys', () => {
    const expected = ['USERS', 'EMPLOYEES', 'STUDENTS', 'PATIENTS', 'FINANCE', 'PAYROLL'];
    expected.forEach(k => expect(RESOURCES).toHaveProperty(k));
  });

  test('every ROLE has an entry in ROLE_HIERARCHY', () => {
    Object.values(ROLES).forEach(role => {
      expect(ROLE_HIERARCHY).toHaveProperty(role);
    });
  });

  test('every ROLE_HIERARCHY entry has level, inherits, label, labelEn', () => {
    Object.entries(ROLE_HIERARCHY).forEach(([role, meta]) => {
      expect(typeof meta.level).toBe('number');
      expect(Array.isArray(meta.inherits)).toBe(true);
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.labelEn).toBe('string');
    });
  });

  test('inherits arrays reference valid roles only', () => {
    const validRoles = new Set(Object.values(ROLES));
    Object.entries(ROLE_HIERARCHY).forEach(([, meta]) => {
      meta.inherits.forEach(parent => {
        expect(validRoles.has(parent)).toBe(true);
      });
    });
  });

  test('every ROLE has an entry in ROLE_PERMISSIONS', () => {
    Object.values(ROLES).forEach(role => {
      expect(ROLE_PERMISSIONS).toHaveProperty(role);
    });
  });

  test('no circular inheritance (walk all paths)', () => {
    const validRoles = Object.values(ROLES);
    validRoles.forEach(role => {
      const visited = new Set();
      const stack = [role];
      while (stack.length) {
        const r = stack.pop();
        expect(visited.has(r)).toBe(false); // would indicate cycle
        visited.add(r);
        const parents = ROLE_HIERARCHY[r]?.inherits || [];
        stack.push(...parents);
      }
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. resolvePermissions
// ═════════════════════════════════════════════════════════════════════════════

describe('resolvePermissions', () => {
  test('super_admin resolves to wildcard', () => {
    const perms = resolvePermissions(ROLES.SUPER_ADMIN);
    expect(perms['*']).toContain('*');
  });

  test('admin inherits manager permissions (reports:read)', () => {
    const perms = resolvePermissions(ROLES.ADMIN);
    // admin directly has reports, but also inherits manager's schedules
    expect(perms[RESOURCES.REPORTS]).toContain(ACTIONS.READ);
    expect(perms[RESOURCES.SCHEDULES]).toContain(ACTIONS.READ);
  });

  test('manager inherits supervisor permissions', () => {
    const perms = resolvePermissions(ROLES.MANAGER);
    // supervisor has dashboard:read via viewer inheritance
    expect(perms[RESOURCES.DASHBOARD]).toContain(ACTIONS.READ);
  });

  test('viewer has only read-level access', () => {
    const perms = resolvePermissions(ROLES.VIEWER);
    Object.values(perms).forEach(actions => {
      actions.forEach(a => expect(a).toBe(ACTIONS.READ));
    });
  });

  test('guest resolves to empty permissions', () => {
    const perms = resolvePermissions(ROLES.GUEST);
    expect(Object.keys(perms).length).toBe(0);
  });

  test('unknown role resolves to empty (no crash)', () => {
    const perms = resolvePermissions('nonexistent_role');
    expect(Object.keys(perms).length).toBe(0);
  });

  test('caching: second call returns same object within TTL', () => {
    const first = resolvePermissions(ROLES.TEACHER);
    const second = resolvePermissions(ROLES.TEACHER);
    expect(first).toBe(second); // reference equality (cached)
  });

  test('clearCache forces re-resolve', () => {
    const first = resolvePermissions(ROLES.TEACHER);
    clearCache();
    const second = resolvePermissions(ROLES.TEACHER);
    expect(first).not.toBe(second); // different reference
    expect(first).toEqual(second); // same content
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. flattenPermissions
// ═════════════════════════════════════════════════════════════════════════════

describe('flattenPermissions', () => {
  test('super_admin returns ["*:*"]', () => {
    const flat = flattenPermissions(ROLES.SUPER_ADMIN);
    expect(flat).toEqual(['*:*']);
  });

  test('viewer returns only resource:read strings', () => {
    const flat = flattenPermissions(ROLES.VIEWER);
    flat.forEach(p => expect(p).toMatch(/^[a-z_]+:read$/));
  });

  test('guest returns empty array', () => {
    const flat = flattenPermissions(ROLES.GUEST);
    expect(flat).toEqual([]);
  });

  test('customPermissions are appended', () => {
    const custom = ['special:launch'];
    const flat = flattenPermissions(ROLES.VIEWER, custom);
    expect(flat).toContain('special:launch');
  });

  test('deniedPermissions are removed', () => {
    const flat = flattenPermissions(ROLES.VIEWER, [], ['reports:read']);
    expect(flat).not.toContain('reports:read');
  });

  test('custom permission can be denied in same call', () => {
    const flat = flattenPermissions(ROLES.GUEST, ['x:y'], ['x:y']);
    expect(flat).not.toContain('x:y');
  });

  test('all strings match "resource:action" format', () => {
    const flat = flattenPermissions(ROLES.HR);
    flat.forEach(p => {
      expect(p).toMatch(/^[a-z_*]+:[a-z_*]+$/);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. hasPermission
// ═════════════════════════════════════════════════════════════════════════════

describe('hasPermission', () => {
  test('super_admin can do anything', () => {
    expect(hasPermission(ROLES.SUPER_ADMIN, 'anything', 'whatever')).toBe(true);
  });

  test('admin can manage users', () => {
    expect(hasPermission(ROLES.ADMIN, RESOURCES.USERS, ACTIONS.MANAGE)).toBe(true);
  });

  test('viewer cannot delete reports', () => {
    expect(hasPermission(ROLES.VIEWER, RESOURCES.REPORTS, ACTIONS.DELETE)).toBe(false);
  });

  test('guest has no permissions', () => {
    expect(hasPermission(ROLES.GUEST, RESOURCES.DASHBOARD, ACTIONS.READ)).toBe(false);
  });

  test('denied permissions take priority', () => {
    const denied = [`${RESOURCES.USERS}:${ACTIONS.READ}`];
    expect(hasPermission(ROLES.ADMIN, RESOURCES.USERS, ACTIONS.READ, [], denied)).toBe(false);
  });

  test('custom permissions grant access', () => {
    const custom = [`${RESOURCES.FINANCE}:${ACTIONS.DELETE}`];
    expect(hasPermission(ROLES.VIEWER, RESOURCES.FINANCE, ACTIONS.DELETE, custom)).toBe(true);
  });

  test('custom wildcard resource grants access', () => {
    expect(hasPermission(ROLES.GUEST, 'anything', 'create', ['anything:*'])).toBe(true);
  });

  test('custom wildcard *:* grants access', () => {
    expect(hasPermission(ROLES.GUEST, 'x', 'y', ['*:*'])).toBe(true);
  });

  test('inherited permission works (admin inherits manager → supervisor → viewer:dashboard:read)', () => {
    expect(hasPermission(ROLES.ADMIN, RESOURCES.DASHBOARD, ACTIONS.READ)).toBe(true);
  });

  test('hr_manager inherits hr permissions', () => {
    expect(hasPermission(ROLES.HR_MANAGER, RESOURCES.EMPLOYEES, ACTIONS.CREATE)).toBe(true);
  });

  test('unknown role returns false', () => {
    expect(hasPermission('bogus', RESOURCES.USERS, ACTIONS.READ)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. getRoleLevel / isAtLeast
// ═════════════════════════════════════════════════════════════════════════════

describe('getRoleLevel', () => {
  test('super_admin is 100', () => {
    expect(getRoleLevel(ROLES.SUPER_ADMIN)).toBe(100);
  });

  test('admin is 90', () => {
    expect(getRoleLevel(ROLES.ADMIN)).toBe(90);
  });

  test('guest is 0', () => {
    expect(getRoleLevel(ROLES.GUEST)).toBe(0);
  });

  test('unknown role returns 0', () => {
    expect(getRoleLevel('nonexistent')).toBe(0);
  });
});

describe('isAtLeast', () => {
  test('admin isAtLeast manager', () => {
    expect(isAtLeast(ROLES.ADMIN, ROLES.MANAGER)).toBe(true);
  });

  test('manager is NOT atLeast admin', () => {
    expect(isAtLeast(ROLES.MANAGER, ROLES.ADMIN)).toBe(false);
  });

  test('viewer isAtLeast viewer (equal)', () => {
    expect(isAtLeast(ROLES.VIEWER, ROLES.VIEWER)).toBe(true);
  });

  test('super_admin isAtLeast guest', () => {
    expect(isAtLeast(ROLES.SUPER_ADMIN, ROLES.GUEST)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. getRoleLabel
// ═════════════════════════════════════════════════════════════════════════════

describe('getRoleLabel', () => {
  test('returns Arabic label by default', () => {
    expect(getRoleLabel(ROLES.ADMIN)).toBe('مسؤول');
  });

  test('returns English label when lang=en', () => {
    expect(getRoleLabel(ROLES.ADMIN, 'en')).toBe('Admin');
  });

  test('super_admin Arabic label', () => {
    expect(getRoleLabel(ROLES.SUPER_ADMIN)).toBe('مدير النظام');
  });

  test('unknown role returns the role string unchanged', () => {
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
  });
});
