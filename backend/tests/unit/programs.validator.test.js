'use strict';

const {
  validateCreateProgram,
  validateUpdateProgram,
  validateEnrollBeneficiary,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_CATEGORIES,
} = require('../../domains/programs/validators/programs.validator');

describe('programs.validator', () => {
  // ─── validateCreateProgram ───────────────────────────────────────────────────
  describe('validateCreateProgram', () => {
    it('returns valid with name only', () => {
      const result = validateCreateProgram({ name: 'Early Intervention Program' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when name is missing', () => {
      const result = validateCreateProgram({});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /name/i.test(e))).toBe(true);
    });

    it('returns invalid for unknown type', () => {
      const result = validateCreateProgram({ name: 'P', type: 'mystery' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid types', () => {
      for (const type of VALID_TYPES) {
        const r = validateCreateProgram({ name: 'P', type });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for unknown status', () => {
      const result = validateCreateProgram({ name: 'P', status: 'unknown' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid statuses', () => {
      for (const status of VALID_STATUSES) {
        const r = validateCreateProgram({ name: 'P', status });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for unknown category', () => {
      const result = validateCreateProgram({ name: 'P', category: 'alien' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid categories', () => {
      for (const category of VALID_CATEGORIES) {
        const r = validateCreateProgram({ name: 'P', category });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for maxCapacity of 0', () => {
      const result = validateCreateProgram({ name: 'P', maxCapacity: 0 });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for negative maxCapacity', () => {
      const result = validateCreateProgram({ name: 'P', maxCapacity: -10 });
      expect(result.valid).toBe(false);
    });

    it('returns valid for positive integer maxCapacity', () => {
      const result = validateCreateProgram({ name: 'P', maxCapacity: 20 });
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateUpdateProgram ───────────────────────────────────────────────────
  describe('validateUpdateProgram', () => {
    it('returns valid with at least one field', () => {
      const result = validateUpdateProgram({ name: 'Updated Program' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for empty body', () => {
      const result = validateUpdateProgram({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown type', () => {
      const result = validateUpdateProgram({ type: 'bad' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateUpdateProgram({ status: 'bad' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown category', () => {
      const result = validateUpdateProgram({ category: 'bad' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateEnrollBeneficiary ───────────────────────────────────────────────
  describe('validateEnrollBeneficiary', () => {
    it('returns valid with beneficiaryId + programId', () => {
      const result = validateEnrollBeneficiary({ beneficiaryId: 'b1', programId: 'p1' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateEnrollBeneficiary({ programId: 'p1' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /beneficiaryId/i.test(e))).toBe(true);
    });

    it('returns invalid when programId is missing', () => {
      const result = validateEnrollBeneficiary({ beneficiaryId: 'b1' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /programId/i.test(e))).toBe(true);
    });

    it('returns valid with optional startDate in ISO format', () => {
      const result = validateEnrollBeneficiary({
        beneficiaryId: 'b1',
        programId: 'p1',
        startDate: '2025-01-01',
      });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for bad startDate format', () => {
      const result = validateEnrollBeneficiary({
        beneficiaryId: 'b1',
        programId: 'p1',
        startDate: 'tomorrow',
      });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(validateCreateProgram);
      const req = { body: { name: 'Test Program' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when validation fails', () => {
      const middleware = validate(validateCreateProgram);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
