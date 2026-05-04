'use strict';

const {
  validateCreateGoal,
  validateUpdateGoal,
  validateLogProgress,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
} = require('../../domains/goals/validators/goals.validator');

describe('goals.validator', () => {
  // ─── validateCreateGoal ──────────────────────────────────────────────────────
  describe('validateCreateGoal', () => {
    it('returns valid for minimal required fields', () => {
      const result = validateCreateGoal({ beneficiaryId: 'b1', title: 'Walk independently' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateCreateGoal({ title: 'Walk' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /beneficiaryId/i.test(e))).toBe(true);
    });

    it('returns invalid when title is missing', () => {
      const result = validateCreateGoal({ beneficiaryId: 'b1' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /title/i.test(e))).toBe(true);
    });

    it('returns invalid for unknown type', () => {
      const result = validateCreateGoal({ beneficiaryId: 'b1', title: 'T', type: 'unknown' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts all valid types', () => {
      for (const type of VALID_TYPES) {
        const r = validateCreateGoal({ beneficiaryId: 'b1', title: 'T', type });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for unknown status', () => {
      const result = validateCreateGoal({ beneficiaryId: 'b1', title: 'T', status: 'ghost' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts all valid statuses', () => {
      for (const status of VALID_STATUSES) {
        const r = validateCreateGoal({ beneficiaryId: 'b1', title: 'T', status });
        expect(r.valid).toBe(true);
      }
    });

    it('rejects non-string beneficiaryId', () => {
      const result = validateCreateGoal({ beneficiaryId: 123, title: 'T' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateUpdateGoal ──────────────────────────────────────────────────────
  describe('validateUpdateGoal', () => {
    it('returns valid with a single updateable field', () => {
      const result = validateUpdateGoal({ title: 'New title' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for empty body', () => {
      const result = validateUpdateGoal({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown type', () => {
      const result = validateUpdateGoal({ type: 'bad-type' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateUpdateGoal({ status: 'bad-status' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when progress is out of range (>100)', () => {
      const result = validateUpdateGoal({ progress: 150 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /progress/i.test(e))).toBe(true);
    });

    it('returns invalid when progress is negative', () => {
      const result = validateUpdateGoal({ progress: -1 });
      expect(result.valid).toBe(false);
    });

    it('returns valid for progress exactly 0', () => {
      const result = validateUpdateGoal({ progress: 0 });
      expect(result.valid).toBe(true);
    });

    it('returns valid for progress exactly 100', () => {
      const result = validateUpdateGoal({ progress: 100 });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for bad targetDate format', () => {
      const result = validateUpdateGoal({ targetDate: 'not-a-date' });
      expect(result.valid).toBe(false);
    });

    it('returns valid for ISO targetDate', () => {
      const result = validateUpdateGoal({ targetDate: '2025-12-31' });
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateLogProgress ────────────────────────────────────────────────────
  describe('validateLogProgress', () => {
    it('returns valid when progress value provided', () => {
      const result = validateLogProgress({ progress: 50 });
      expect(result.valid).toBe(true);
    });

    it('returns valid when note provided instead of progress', () => {
      const result = validateLogProgress({ note: 'Good session' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when neither progress nor note provided', () => {
      const result = validateLogProgress({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid when progress is out of range', () => {
      const result = validateLogProgress({ progress: 200 });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for bad date format', () => {
      const result = validateLogProgress({ progress: 50, date: 'bad-date' });
      expect(result.valid).toBe(false);
    });

    it('returns valid for ISO date', () => {
      const result = validateLogProgress({ progress: 75, date: '2025-01-15' });
      expect(result.valid).toBe(true);
    });
  });

  // ─── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(validateCreateGoal);
      const req = { body: { beneficiaryId: 'b1', title: 'Goal' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when validation fails', () => {
      const middleware = validate(validateCreateGoal);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errors: expect.any(Array) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
