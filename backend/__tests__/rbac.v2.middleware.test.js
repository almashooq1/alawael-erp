'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../config/rbac.config', () => {
  const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    USER: 'user',
    GUEST: 'guest',
  };
  const ACTIONS = { CREATE: 'create', READ: 'read', UPDATE: 'update', DELETE: 'delete' };
  const RESOURCES = { USERS: 'users', REPORTS: 'reports' };
  const ROLE_HIERARCHY = ['guest', 'user', 'staff', 'manager', 'admin', 'super_admin'];
  const ROLE_PERMISSIONS = {};

  const getRoleLevel = role => {
    const levels = { guest: 0, user: 10, staff: 20, manager: 30, admin: 40, super_admin: 50 };
    return levels[role] || 0;
  };

  return {
    ROLES,
    ACTIONS,
    RESOURCES,
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
    resolvePermissions: jest.fn(() => []),
    hasPermission: jest.fn().mockReturnValue(true),
    getRoleLevel,
    isAtLeast: jest.fn().mockReturnValue(true),
  };
});

const rbacConfig = require('../config/rbac.config');
const {
  requirePermission,
  requireRole,
  requireMinLevel,
  ROLES,
  ACTIONS,
  RESOURCES,
} = require('../middleware/rbac.v2.middleware');

// ── helpers ──────────────────────────────────────────────────────────────────
const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// ─────────────────────────────────────────────────────────────────────────────
describe('rbac.v2.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rbacConfig.hasPermission.mockReturnValue(true);
  });

  // ── requirePermission ────────────────────────────────────────────────────
  describe('requirePermission', () => {
    it('returns 401 when no user on request', () => {
      const mw = requirePermission('users', 'read');
      const res = mockRes();
      const next = jest.fn();
      mw({ user: null }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('calls next() when user has permission', () => {
      rbacConfig.hasPermission.mockReturnValue(true);
      const mw = requirePermission('users', 'read');
      const next = jest.fn();
      mw({ user: { id: 'u1', role: 'admin' } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user lacks permission', () => {
      rbacConfig.hasPermission.mockReturnValue(false);
      const mw = requirePermission('users', 'delete');
      const res = mockRes();
      const next = jest.fn();
      mw({ user: { id: 'u1', role: 'user', email: 'u@test.com' } }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('checks all actions when array provided', () => {
      rbacConfig.hasPermission.mockReturnValue(true);
      const mw = requirePermission('users', ['read', 'update']);
      const next = jest.fn();
      mw({ user: { id: 'u1', role: 'admin' } }, mockRes(), next);
      expect(rbacConfig.hasPermission).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalled();
    });

    it('allows self-access when allowSelf is true and IDs match', () => {
      rbacConfig.hasPermission.mockReturnValue(false);
      const mw = requirePermission('users', 'update', { allowSelf: true });
      const next = jest.fn();
      mw({ user: { id: 'u1', role: 'user' }, params: { id: 'u1' }, body: {} }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('does not allow self-access when IDs differ', () => {
      rbacConfig.hasPermission.mockReturnValue(false);
      const mw = requirePermission('users', 'update', { allowSelf: true });
      const res = mockRes();
      const next = jest.fn();
      mw(
        { user: { id: 'u1', role: 'user', email: 'u@test.com' }, params: { id: 'u2' }, body: {} },
        res,
        next
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── requireRole ──────────────────────────────────────────────────────────
  describe('requireRole', () => {
    it('returns 401 when no user', () => {
      const mw = requireRole('admin');
      const res = mockRes();
      const next = jest.fn();
      mw({ user: null }, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('allows exact role match', () => {
      const mw = requireRole('admin');
      const next = jest.fn();
      mw({ user: { role: 'admin' } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('super_admin bypasses any role check', () => {
      const mw = requireRole('staff');
      const next = jest.fn();
      mw({ user: { role: 'super_admin' } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('allows by hierarchy level', () => {
      // admin level(40) >= user level(10) → allowed
      const mw = requireRole('user');
      const next = jest.fn();
      mw({ user: { role: 'admin' } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when role insufficient', () => {
      // guest level(0) < admin level(40) → denied
      const mw = requireRole('admin');
      const res = mockRes();
      const next = jest.fn();
      mw({ user: { role: 'guest' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── requireMinLevel ──────────────────────────────────────────────────────
  describe('requireMinLevel', () => {
    it('returns 401 when no user', () => {
      const mw = requireMinLevel(10);
      const res = mockRes();
      const next = jest.fn();
      mw({ user: null }, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('allows when user level >= minLevel', () => {
      const mw = requireMinLevel(20);
      const next = jest.fn();
      mw({ user: { role: 'admin' } }, mockRes(), next); // admin = 40 >= 20
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user level < minLevel', () => {
      const mw = requireMinLevel(50);
      const res = mockRes();
      const next = jest.fn();
      mw({ user: { role: 'user' } }, res, next); // user = 10 < 50
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── Re-exports ───────────────────────────────────────────────────────────
  describe('Re-exports from rbac.config', () => {
    it('exports ROLES, ACTIONS, RESOURCES', () => {
      expect(ROLES).toBeDefined();
      expect(ROLES.ADMIN).toBe('admin');
      expect(ACTIONS).toHaveProperty('READ');
      expect(RESOURCES).toHaveProperty('USERS');
    });
  });
});
