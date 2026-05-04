'use strict';

const {
  validateGenerateReport,
  validate,
  VALID_FORMATS,
} = require('../../domains/reports/validators/reports.validator');

describe('reports.validator', () => {
  // ── validateGenerateReport ────────────────────────────────────────────────
  describe('validateGenerateReport', () => {
    it('valid — empty body', () => {
      expect(validateGenerateReport({}).valid).toBe(true);
    });

    it('valid — with beneficiaryId and dateFrom/dateTo', () => {
      const r = validateGenerateReport({
        beneficiaryId: 'b123',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });
      expect(r.valid).toBe(true);
    });

    it('valid — all VALID_FORMATS accepted', () => {
      VALID_FORMATS.forEach(format => {
        expect(validateGenerateReport({ format }).valid).toBe(true);
      });
    });

    it('invalid — unknown format', () => {
      const r = validateGenerateReport({ format: 'docx' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — dateFrom after dateTo', () => {
      const r = validateGenerateReport({ dateFrom: '2025-02-01', dateTo: '2025-01-01' });
      expect(r.valid).toBe(false);
    });

    it('valid — equal dateFrom and dateTo', () => {
      const r = validateGenerateReport({ dateFrom: '2025-01-15', dateTo: '2025-01-15' });
      expect(r.valid).toBe(true);
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
      expect(next).not.toHaveBeenCalled();
    });
  });
});
