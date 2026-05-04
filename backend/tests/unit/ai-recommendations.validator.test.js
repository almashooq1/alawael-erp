'use strict';

const {
  validateCalculateBatch,
  validateGenerateRecommendation,
  validateFeedback,
  VALID_RECOMMENDATION_TYPES,
  validate,
} = require('../../domains/ai-recommendations/validators/ai-recommendations.validator');

describe('ai-recommendations.validator', () => {
  // ── validateCalculateBatch ──────────────────────────────────────────────────
  describe('validateCalculateBatch', () => {
    test('empty body is valid (all optional)', () => {
      const r = validateCalculateBatch({});
      expect(r.valid).toBe(true);
    });
    test('valid body with branchId string', () => {
      const r = validateCalculateBatch({ branchId: 'branch1' });
      expect(r.valid).toBe(true);
    });
    test('invalid branchId type (number)', () => {
      const r = validateCalculateBatch({ branchId: 123 });
      expect(r.valid).toBe(false);
    });
    test('null body is valid', () => {
      const r = validateCalculateBatch(null);
      expect(r.valid).toBe(true);
    });
  });

  // ── validateGenerateRecommendation ─────────────────────────────────────────
  describe('validateGenerateRecommendation', () => {
    test('valid body with beneficiaryId', () => {
      const r = validateGenerateRecommendation({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(true);
    });
    test('valid body with type', () => {
      const r = validateGenerateRecommendation({ beneficiaryId: 'b1', type: 'goal' });
      expect(r.valid).toBe(true);
    });
    test('missing beneficiaryId', () => {
      const r = validateGenerateRecommendation({});
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('invalid type', () => {
      const r = validateGenerateRecommendation({ beneficiaryId: 'b1', type: 'unknown' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_RECOMMENDATION_TYPES pass', () => {
      VALID_RECOMMENDATION_TYPES.forEach(type => {
        const r = validateGenerateRecommendation({ beneficiaryId: 'b1', type });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateFeedback ────────────────────────────────────────────────────────
  describe('validateFeedback', () => {
    test('accepted = true', () => {
      const r = validateFeedback({ accepted: true });
      expect(r.valid).toBe(true);
    });
    test('accepted = false', () => {
      const r = validateFeedback({ accepted: false });
      expect(r.valid).toBe(true);
    });
    test('missing accepted field', () => {
      const r = validateFeedback({});
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateGenerateRecommendation);
      const req = { body: { beneficiaryId: 'b1' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateGenerateRecommendation);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
