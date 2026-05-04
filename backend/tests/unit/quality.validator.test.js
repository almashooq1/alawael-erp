'use strict';

const {
  validateAuditBeneficiary,
  validateResolveAction,
  validate,
} = require('../../domains/quality/validators/quality.validator');

describe('quality.validator', () => {
  // ── validateAuditBeneficiary ──────────────────────────────────────────────
  describe('validateAuditBeneficiary', () => {
    it('valid — empty body', () => {
      expect(validateAuditBeneficiary({}).valid).toBe(true);
    });

    it('valid — with episodeId', () => {
      expect(validateAuditBeneficiary({ episodeId: 'ep123' }).valid).toBe(true);
    });

    it('invalid — episodeId present but empty string', () => {
      const r = validateAuditBeneficiary({ episodeId: '' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });

  // ── validateResolveAction ─────────────────────────────────────────────────
  describe('validateResolveAction', () => {
    it('valid — with note', () => {
      expect(validateResolveAction({ note: 'تم التصحيح' }).valid).toBe(true);
    });

    it('valid — with resolution', () => {
      expect(validateResolveAction({ resolution: 'تم الحل' }).valid).toBe(true);
    });

    it('valid — with outcome', () => {
      expect(validateResolveAction({ outcome: 'نتيجة ايجابية' }).valid).toBe(true);
    });

    it('invalid — empty body', () => {
      const r = validateResolveAction({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });

  // ── validate middleware ───────────────────────────────────────────────────
  describe('validate middleware factory', () => {
    it('calls next() when valid', () => {
      const mw = validate(() => ({ valid: true, errors: [] }));
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      mw({ body: {} }, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 400 when invalid', () => {
      const mw = validate(() => ({ valid: false, errors: ['خطأ'] }));
      const next = jest.fn();
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      mw({ body: {} }, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
