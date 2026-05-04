'use strict';

const {
  validateCreateRole,
  validateCreatePermission,
  validateAssignPermission,
  validateCheckPermission,
  validate,
} = require('../../domains/security/validators/security.validator');

describe('security.validator', () => {
  // ── validateCreateRole ──────────────────────────────────────────────────────
  describe('validateCreateRole', () => {
    test('valid body with name', () => {
      const r = validateCreateRole({ name: 'admin' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('missing name', () => {
      const r = validateCreateRole({});
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('null body', () => {
      const r = validateCreateRole(null);
      expect(r.valid).toBe(false);
    });
  });

  // ── validateCreatePermission ────────────────────────────────────────────────
  describe('validateCreatePermission', () => {
    test('valid body', () => {
      const r = validateCreatePermission({ name: 'read:beneficiaries', resource: 'beneficiary' });
      expect(r.valid).toBe(true);
    });
    test('missing name', () => {
      const r = validateCreatePermission({ resource: 'beneficiary' });
      expect(r.valid).toBe(false);
    });
    test('missing resource', () => {
      const r = validateCreatePermission({ name: 'read:beneficiaries' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateAssignPermission ────────────────────────────────────────────────
  describe('validateAssignPermission', () => {
    test('valid body', () => {
      const r = validateAssignPermission({ permissionId: 'perm123' });
      expect(r.valid).toBe(true);
    });
    test('missing permissionId', () => {
      const r = validateAssignPermission({});
      expect(r.valid).toBe(false);
    });
  });

  // ── validateCheckPermission ─────────────────────────────────────────────────
  describe('validateCheckPermission', () => {
    test('valid body', () => {
      const r = validateCheckPermission({ userId: 'u1', permission: 'read:beneficiaries' });
      expect(r.valid).toBe(true);
    });
    test('missing userId', () => {
      const r = validateCheckPermission({ permission: 'read' });
      expect(r.valid).toBe(false);
    });
    test('missing permission', () => {
      const r = validateCheckPermission({ userId: 'u1' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ──────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request to next()', () => {
      const mw = validate(validateCreateRole);
      const req = { body: { name: 'admin' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateCreateRole);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
