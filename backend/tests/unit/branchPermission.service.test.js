'use strict';

const {
  ROLES,
  MODULES,
  ACTIONS,
  PERMISSION_MATRIX,
  hasPermission,
  getBranchFilter,
  getUserMenuPermissions,
  createAuditEntry,
} = require('../../services/branchPermission.service');

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('branchPermission.service', () => {
  /* ─── Constants ────────────────────────────────────────────────────────── */
  describe('Constants', () => {
    test('ROLES contains 7 roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(7);
      expect(ROLES.HQ_SUPER_ADMIN).toBe('hq_super_admin');
      expect(ROLES.DRIVER).toBe('driver');
    });

    test('MODULES contains 10 modules', () => {
      expect(Object.keys(MODULES)).toHaveLength(10);
      expect(MODULES.PATIENTS).toBe('patients');
      expect(MODULES.FINANCE).toBe('finance');
    });

    test('ACTIONS contains 5 actions', () => {
      expect(Object.keys(ACTIONS)).toHaveLength(5);
      expect(ACTIONS.READ).toBe('read');
      expect(ACTIONS.OVERRIDE).toBe('override');
    });

    test('PERMISSION_MATRIX has entry for each role', () => {
      for (const role of Object.values(ROLES)) {
        expect(PERMISSION_MATRIX[role]).toBeDefined();
      }
    });
  });

  /* ─── hasPermission ────────────────────────────────────────────────────── */
  describe('hasPermission', () => {
    test('denies when no user', () => {
      const r = hasPermission(null, 'BR01', MODULES.PATIENTS, ACTIONS.READ);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/No user/i);
    });

    test('denies when no role', () => {
      expect(hasPermission({}, 'BR01', MODULES.PATIENTS).allowed).toBe(false);
    });

    test('denies for unknown role', () => {
      const r = hasPermission({ role: 'alien' }, 'BR01', MODULES.PATIENTS, ACTIONS.READ);
      expect(r.allowed).toBe(false);
      expect(r.reason).toContain('Unknown role');
    });

    test('HQ_SUPER_ADMIN bypasses everything on any branch', () => {
      const user = { role: ROLES.HQ_SUPER_ADMIN, branch_code: 'HQ' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.DELETE).allowed).toBe(true);
      expect(hasPermission(user, 'BR99', MODULES.FINANCE, ACTIONS.OVERRIDE).allowed).toBe(true);
      expect(hasPermission(user, 'ANY', MODULES.AUDIT, ACTIONS.EXPORT).allowed).toBe(true);
    });

    test('HQ_ADMIN can read all branches', () => {
      const user = { role: ROLES.HQ_ADMIN, branch_code: 'HQ' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(true);
      expect(hasPermission(user, 'BR05', MODULES.REPORTS, ACTIONS.READ).allowed).toBe(true);
    });

    test('HQ_ADMIN cannot delete patients', () => {
      const user = { role: ROLES.HQ_ADMIN, branch_code: 'HQ' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.DELETE).allowed).toBe(false);
    });

    test('BRANCH_MANAGER can write own branch', () => {
      const user = { role: ROLES.BRANCH_MANAGER, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.WRITE).allowed).toBe(true);
    });

    test('BRANCH_MANAGER can only READ other branches', () => {
      const user = { role: ROLES.BRANCH_MANAGER, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR02', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(true);
      expect(hasPermission(user, 'BR02', MODULES.PATIENTS, ACTIONS.WRITE).allowed).toBe(false);
    });

    test('THERAPIST can only access own branch', () => {
      const user = { role: ROLES.THERAPIST, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(true);
      expect(hasPermission(user, 'BR02', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(false);
    });

    test('DRIVER can only access transport on own branch', () => {
      const user = { role: ROLES.DRIVER, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.TRANSPORT, ACTIONS.READ).allowed).toBe(true);
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(false);
      expect(hasPermission(user, 'BR02', MODULES.TRANSPORT, ACTIONS.READ).allowed).toBe(false);
    });

    test('RECEPTIONIST can read/write patients & schedule on own branch', () => {
      const user = { role: ROLES.RECEPTIONIST, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(true);
      expect(hasPermission(user, 'BR01', MODULES.SCHEDULE, ACTIONS.WRITE).allowed).toBe(true);
      expect(hasPermission(user, 'BR01', MODULES.FINANCE, ACTIONS.READ).allowed).toBe(false);
    });

    test('own_branch scope rejects other branch access', () => {
      const user = { role: ROLES.DRIVER, branch_code: 'BR01' };
      const r = hasPermission(user, 'BR02', MODULES.TRANSPORT, ACTIONS.READ);
      expect(r.allowed).toBe(false);
      expect(r.reason).toContain('own branch');
    });

    test('action defaults to READ', () => {
      const user = { role: ROLES.THERAPIST, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS).allowed).toBe(true);
    });

    test('extra_permissions overrides denial', () => {
      const user = {
        role: ROLES.DRIVER,
        branch_code: 'BR01',
        extra_permissions: { [MODULES.PATIENTS]: { [ACTIONS.READ]: true } },
      };
      expect(hasPermission(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ).allowed).toBe(true);
    });

    test('denies for undefined module', () => {
      const user = { role: ROLES.ADMIN, branch_code: 'BR01' };
      const r = hasPermission(user, 'BR01', 'nonexistent_module', ACTIONS.READ);
      expect(r.allowed).toBe(false);
      expect(r.reason).toContain('No permissions defined');
    });

    test('ADMIN can write staff on own branch', () => {
      const user = { role: ROLES.ADMIN, branch_code: 'BR01' };
      expect(hasPermission(user, 'BR01', MODULES.STAFF, ACTIONS.WRITE).allowed).toBe(true);
    });

    test('ADMIN cannot delete anything', () => {
      const user = { role: ROLES.ADMIN, branch_code: 'BR01' };
      for (const mod of Object.values(MODULES)) {
        expect(hasPermission(user, 'BR01', mod, ACTIONS.DELETE).allowed).toBe(false);
      }
    });
  });

  /* ─── getBranchFilter ──────────────────────────────────────────────────── */
  describe('getBranchFilter', () => {
    test('returns null filter when no user', () => {
      const r = getBranchFilter(null);
      expect(r.filter).toEqual({ _id: null });
      expect(r.crossBranch).toBe(false);
    });

    test('HQ_SUPER_ADMIN sees all branches', () => {
      const r = getBranchFilter({ role: ROLES.HQ_SUPER_ADMIN });
      expect(r.filter).toEqual({});
      expect(r.crossBranch).toBe(true);
    });

    test('HQ_ADMIN sees all branches', () => {
      const r = getBranchFilter({ role: ROLES.HQ_ADMIN });
      expect(r.filter).toEqual({});
      expect(r.crossBranch).toBe(true);
    });

    test('BRANCH_MANAGER sees own branch by branch_id', () => {
      const r = getBranchFilter({
        role: ROLES.BRANCH_MANAGER,
        branch_id: 'bid1',
        branch_code: 'BR01',
      });
      expect(r.filter).toEqual({ branch_id: 'bid1' });
      expect(r.crossBranch).toBe(false);
    });

    test('THERAPIST sees own branch by branch_code if no branch_id', () => {
      const r = getBranchFilter({ role: ROLES.THERAPIST, branch_code: 'BR01' });
      expect(r.filter).toEqual({ branch_code: 'BR01' });
      expect(r.crossBranch).toBe(false);
    });

    test('unknown role returns null filter', () => {
      expect(getBranchFilter({ role: 'unknown' }).filter).toEqual({ _id: null });
    });
  });

  /* ─── getUserMenuPermissions ───────────────────────────────────────────── */
  describe('getUserMenuPermissions', () => {
    test('returns empty for unknown role', () => {
      expect(getUserMenuPermissions({ role: 'unknown' })).toEqual({});
    });

    test('HQ_SUPER_ADMIN gets all 10 modules', () => {
      const menu = getUserMenuPermissions({ role: ROLES.HQ_SUPER_ADMIN });
      expect(Object.keys(menu)).toHaveLength(10);
    });

    test('DRIVER gets only transport and notifications', () => {
      const menu = getUserMenuPermissions({ role: ROLES.DRIVER });
      expect(Object.keys(menu).sort()).toEqual([MODULES.NOTIFICATIONS, MODULES.TRANSPORT].sort());
    });

    test('THERAPIST has patients, schedule, reports, notifications', () => {
      const menu = getUserMenuPermissions({ role: ROLES.THERAPIST });
      expect(Object.keys(menu)).toContain(MODULES.PATIENTS);
      expect(Object.keys(menu)).toContain(MODULES.SCHEDULE);
      expect(Object.keys(menu)).toContain(MODULES.REPORTS);
      expect(Object.keys(menu)).toContain(MODULES.NOTIFICATIONS);
      expect(Object.keys(menu)).not.toContain(MODULES.FINANCE);
    });
  });

  /* ─── createAuditEntry ─────────────────────────────────────────────────── */
  describe('createAuditEntry', () => {
    test('creates proper audit entry with all fields', () => {
      const user = {
        _id: 'u1',
        username: 'admin',
        role: ROLES.HQ_ADMIN,
        branch_code: 'HQ',
        _ip: '1.2.3.4',
      };
      const entry = createAuditEntry(user, 'BR01', MODULES.PATIENTS, ACTIONS.READ, true, 'granted');
      expect(entry.user_id).toBe('u1');
      expect(entry.username).toBe('admin');
      expect(entry.role).toBe(ROLES.HQ_ADMIN);
      expect(entry.user_branch).toBe('HQ');
      expect(entry.target_branch).toBe('BR01');
      expect(entry.module).toBe(MODULES.PATIENTS);
      expect(entry.action).toBe(ACTIONS.READ);
      expect(entry.allowed).toBe(true);
      expect(entry.reason).toBe('granted');
      expect(entry.ip).toBe('1.2.3.4');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    test('falls back to .id when ._id is absent', () => {
      const user = { id: 'u2', username: 'test', role: ROLES.THERAPIST, branch_code: 'BR01' };
      const entry = createAuditEntry(
        user,
        'BR01',
        MODULES.PATIENTS,
        ACTIONS.WRITE,
        false,
        'denied'
      );
      expect(entry.user_id).toBe('u2');
      expect(entry.ip).toBeNull();
    });
  });
});
