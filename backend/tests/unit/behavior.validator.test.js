'use strict';

const {
  validateCreateRecord,
  validateCreatePlan,
  validateUpdatePlan,
  validateAddReview,
  validate,
  VALID_SEVERITIES,
  VALID_TOPOGRAPHIES,
  VALID_PLAN_STATUSES,
} = require('../../domains/behavior/validators/behavior.validator');

describe('behavior.validator', () => {
  // ─── validateCreateRecord ────────────────────────────────────────────────────
  describe('validateCreateRecord', () => {
    it('returns valid with beneficiaryId + topography', () => {
      const result = validateCreateRecord({ beneficiaryId: 'b1', topography: 'aggression' });
      expect(result.valid).toBe(true);
    });

    it('returns valid with beneficiaryId + description (no topography)', () => {
      const result = validateCreateRecord({ beneficiaryId: 'b1', description: 'Threw an object' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateCreateRecord({ topography: 'aggression' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /beneficiaryId/i.test(e))).toBe(true);
    });

    it('returns invalid when neither topography nor description provided', () => {
      const result = validateCreateRecord({ beneficiaryId: 'b1' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown topography', () => {
      const result = validateCreateRecord({ beneficiaryId: 'b1', topography: 'flying' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid topographies', () => {
      for (const topography of VALID_TOPOGRAPHIES) {
        const r = validateCreateRecord({ beneficiaryId: 'b1', topography });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for unknown severity', () => {
      const result = validateCreateRecord({
        beneficiaryId: 'b1',
        topography: 'aggression',
        severity: 'extreme',
      });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid severities', () => {
      for (const severity of VALID_SEVERITIES) {
        const r = validateCreateRecord({ beneficiaryId: 'b1', topography: 'aggression', severity });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for bad occurredAt', () => {
      const result = validateCreateRecord({
        beneficiaryId: 'b1',
        topography: 'aggression',
        occurredAt: 'yesterday',
      });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateCreatePlan ──────────────────────────────────────────────────────
  describe('validateCreatePlan', () => {
    it('returns valid with beneficiaryId + title', () => {
      const result = validateCreatePlan({ beneficiaryId: 'b1', title: 'Reduce aggression' });
      expect(result.valid).toBe(true);
    });

    it('returns valid with beneficiaryId + targetBehavior (no title)', () => {
      const result = validateCreatePlan({ beneficiaryId: 'b1', targetBehavior: 'Hitting' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateCreatePlan({ title: 'Plan' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when neither title nor targetBehavior provided', () => {
      const result = validateCreatePlan({ beneficiaryId: 'b1' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateCreatePlan({ beneficiaryId: 'b1', title: 'P', status: 'unknown' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid plan statuses', () => {
      for (const status of VALID_PLAN_STATUSES) {
        const r = validateCreatePlan({ beneficiaryId: 'b1', title: 'P', status });
        expect(r.valid).toBe(true);
      }
    });
  });

  // ─── validateUpdatePlan ──────────────────────────────────────────────────────
  describe('validateUpdatePlan', () => {
    it('returns valid with at least one field', () => {
      const result = validateUpdatePlan({ title: 'Updated' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for empty body', () => {
      const result = validateUpdatePlan({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateUpdatePlan({ status: 'bad' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateAddReview ───────────────────────────────────────────────────────
  describe('validateAddReview', () => {
    it('returns valid when notes provided', () => {
      const result = validateAddReview({ notes: 'Progress observed' });
      expect(result.valid).toBe(true);
    });

    it('returns valid when outcome provided', () => {
      const result = validateAddReview({ outcome: 'Improved' });
      expect(result.valid).toBe(true);
    });

    it('returns valid when summary provided', () => {
      const result = validateAddReview({ summary: 'Summary text' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when none of notes/outcome/summary provided', () => {
      const result = validateAddReview({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid when all provided values are empty strings', () => {
      const result = validateAddReview({ notes: '', outcome: '', summary: '' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(validateCreateRecord);
      const req = { body: { beneficiaryId: 'b1', topography: 'aggression' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when validation fails', () => {
      const middleware = validate(validateCreateRecord);
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
