/**
 * permissions.test.js — Tests for RBAC permission constants and helpers.
 * テスト: صلاحيات RBAC
 */
import {
  ACTIONS,
  RESOURCES,
  buildPermission,
  ROLE_HIERARCHY,
  hasHigherRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from '../constants/permissions';

/* ====================================================================
 * ACTIONS & RESOURCES
 * ==================================================================== */
describe('ACTIONS constant', () => {
  test('has all 8 expected actions', () => {
    const expected = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT', 'PRINT', 'MANAGE'];
    expect(Object.keys(ACTIONS)).toEqual(expected);
  });

  test('all values are lowercase strings', () => {
    Object.values(ACTIONS).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v).toBe(v.toLowerCase());
    });
  });
});

describe('RESOURCES constant', () => {
  test('has at least 20 resource areas', () => {
    expect(Object.keys(RESOURCES).length).toBeGreaterThanOrEqual(20);
  });

  test('all values are lowercase strings', () => {
    Object.values(RESOURCES).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v).toBe(v.toLowerCase());
    });
  });

  test('includes critical resources', () => {
    ['DASHBOARD', 'USERS', 'EMPLOYEES', 'FINANCE', 'SETTINGS', 'ADMIN'].forEach(key => {
      expect(RESOURCES).toHaveProperty(key);
    });
  });
});

/* ====================================================================
 * buildPermission
 * ==================================================================== */
describe('buildPermission', () => {
  test('combines resource and action with colon', () => {
    expect(buildPermission('employees', 'view')).toBe('employees:view');
  });

  test('works with RESOURCES and ACTIONS enums', () => {
    expect(buildPermission(RESOURCES.FINANCE, ACTIONS.APPROVE)).toBe('finance:approve');
  });

  test('handles wildcard action', () => {
    expect(buildPermission(RESOURCES.DASHBOARD, '*')).toBe('dashboard:*');
  });

  test('handles empty strings gracefully', () => {
    expect(buildPermission('', '')).toBe(':');
  });
});

/* ====================================================================
 * ROLE_HIERARCHY
 * ==================================================================== */
describe('ROLE_HIERARCHY', () => {
  test('super_admin has highest value (9)', () => {
    const maxVal = Math.max(...Object.values(ROLE_HIERARCHY));
    expect(ROLE_HIERARCHY.super_admin).toBe(maxVal);
    expect(ROLE_HIERARCHY.super_admin).toBe(9);
  });

  test('staff has lowest value (0)', () => {
    expect(ROLE_HIERARCHY.staff).toBe(0);
  });

  test('admin < super_admin', () => {
    expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.super_admin);
  });

  test('manager < admin', () => {
    expect(ROLE_HIERARCHY.manager).toBeLessThan(ROLE_HIERARCHY.admin);
  });

  test('doctor, therapist, teacher are all level 3-4', () => {
    [ROLE_HIERARCHY.doctor, ROLE_HIERARCHY.therapist, ROLE_HIERARCHY.teacher].forEach(v => {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(4);
    });
  });

  test('all hierarchy values are non-negative integers', () => {
    Object.values(ROLE_HIERARCHY).forEach(v => {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });
});

/* ====================================================================
 * hasHigherRole
 * ==================================================================== */
describe('hasHigherRole', () => {
  test('super_admin >= admin', () => {
    expect(hasHigherRole('super_admin', 'admin')).toBe(true);
  });

  test('admin >= manager', () => {
    expect(hasHigherRole('admin', 'manager')).toBe(true);
  });

  test('staff is NOT >= admin', () => {
    expect(hasHigherRole('staff', 'admin')).toBe(false);
  });

  test('same role returns true (equal)', () => {
    expect(hasHigherRole('manager', 'manager')).toBe(true);
  });

  test('unknown role defaults to 0', () => {
    // unknown vs staff(0) → 0 >= 0 → true
    expect(hasHigherRole('unknown_role', 'staff')).toBe(true);
  });

  test('unknown role cannot beat admin', () => {
    expect(hasHigherRole('unknown_role', 'admin')).toBe(false);
  });

  test('supervisor >= doctor (6 >= 4)', () => {
    expect(hasHigherRole('supervisor', 'doctor')).toBe(true);
  });

  test('receptionist(2) is NOT >= nurse(3)', () => {
    expect(hasHigherRole('receptionist', 'nurse')).toBe(false);
  });
});

/* ====================================================================
 * ROLE_PERMISSIONS
 * ==================================================================== */
describe('ROLE_PERMISSIONS', () => {
  test('super_admin has wildcard "*"', () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain('*');
  });

  test('admin has dashboard:* and users:*', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('dashboard:*');
    expect(ROLE_PERMISSIONS.admin).toContain('users:*');
  });

  test('staff only has dashboard:view', () => {
    expect(ROLE_PERMISSIONS.staff).toEqual(['dashboard:view']);
  });

  test('all roles in ROLE_HIERARCHY have permissions defined', () => {
    // At least the common roles should have entries
    ['super_admin', 'admin', 'manager', 'doctor', 'staff'].forEach(role => {
      expect(ROLE_PERMISSIONS).toHaveProperty(role);
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    });
  });

  test('accountant has finance:* permission', () => {
    expect(ROLE_PERMISSIONS.accountant).toContain('finance:*');
  });

  test('hr has employees:* and leaves:*', () => {
    expect(ROLE_PERMISSIONS.hr).toContain('employees:*');
    expect(ROLE_PERMISSIONS.hr).toContain('leaves:*');
  });

  test('all permission strings contain ":"', () => {
    Object.values(ROLE_PERMISSIONS).forEach(perms => {
      perms.forEach(p => {
        if (p !== '*') {
          expect(p).toContain(':');
        }
      });
    });
  });
});

/* ====================================================================
 * roleHasPermission
 * ==================================================================== */
describe('roleHasPermission', () => {
  test('super_admin has any permission (wildcard)', () => {
    expect(roleHasPermission('super_admin', 'anything:whatsoever')).toBe(true);
  });

  test('admin has dashboard:view (via dashboard:*)', () => {
    expect(roleHasPermission('admin', 'dashboard:view')).toBe(true);
  });

  test('admin has dashboard:delete (via dashboard:*)', () => {
    expect(roleHasPermission('admin', 'dashboard:delete')).toBe(true);
  });

  test('staff has dashboard:view', () => {
    expect(roleHasPermission('staff', 'dashboard:view')).toBe(true);
  });

  test('staff does NOT have dashboard:edit', () => {
    expect(roleHasPermission('staff', 'dashboard:edit')).toBe(false);
  });

  test('doctor has beneficiaries:view (via beneficiaries:*)', () => {
    expect(roleHasPermission('doctor', 'beneficiaries:view')).toBe(true);
  });

  test('receptionist does NOT have finance:view', () => {
    expect(roleHasPermission('receptionist', 'finance:view')).toBe(false);
  });

  test('unknown role returns false', () => {
    expect(roleHasPermission('alien', 'dashboard:view')).toBe(false);
  });

  test('accountant has accounting:edit (via accounting:*)', () => {
    expect(roleHasPermission('accountant', 'accounting:edit')).toBe(true);
  });

  test('teacher has attendance:create', () => {
    expect(roleHasPermission('teacher', 'attendance:create')).toBe(true);
  });

  test('teacher does NOT have attendance:delete', () => {
    expect(roleHasPermission('teacher', 'attendance:delete')).toBe(false);
  });
});
