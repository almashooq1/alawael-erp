'use strict';
/**
 * Unit tests for assessments.validator
 * @group unit
 */

const {
  validateCreateAssessment,
  validateUpdateAssessment,
  validate,
  VALID_CATEGORIES,
  VALID_STATUSES,
} = require('../../domains/assessments/validators/assessments.validator');

const VALID_OID = '507f1f77bcf86cd799439011';

describe('assessments.validator', () => {
  // ── validateCreateAssessment ─────────────────────────────────────────────

  describe('validateCreateAssessment', () => {
    it('passes with minimal valid body', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
      });
      expect(v).toBe(true);
    });

    it('also accepts beneficiary + episode aliases', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiary: VALID_OID,
        episode: VALID_OID,
      });
      expect(v).toBe(true);
    });

    it('fails when beneficiary is missing', () => {
      const { valid: v, errors } = validateCreateAssessment({ episodeId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('beneficiary'))).toBe(true);
    });

    it('fails when episode is missing', () => {
      const { valid: v, errors } = validateCreateAssessment({ beneficiaryId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('episode'))).toBe(true);
    });

    it('fails with invalid beneficiaryId format', () => {
      const { valid: v } = validateCreateAssessment({ beneficiaryId: 'bad', episodeId: VALID_OID });
      expect(v).toBe(false);
    });

    it('fails with invalid episodeId format', () => {
      const { valid: v } = validateCreateAssessment({ beneficiaryId: VALID_OID, episodeId: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with invalid category', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        category: 'unknown_cat',
      });
      expect(v).toBe(false);
    });

    it('passes with every valid category', () => {
      VALID_CATEGORIES.forEach(category => {
        const { valid: v } = validateCreateAssessment({
          beneficiaryId: VALID_OID,
          episodeId: VALID_OID,
          category,
        });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid assessedBy ObjectId', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        assessedBy: 'bad-oid',
      });
      expect(v).toBe(false);
    });

    it('fails with invalid assessmentDate', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        assessmentDate: 'not-a-date',
      });
      expect(v).toBe(false);
    });

    it('fails when scores is not an object', () => {
      const { valid: v } = validateCreateAssessment({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        scores: 'not-object',
      });
      expect(v).toBe(false);
    });
  });

  // ── validateUpdateAssessment ─────────────────────────────────────────────

  describe('validateUpdateAssessment', () => {
    it('fails with empty body (update requires at least one field)', () => {
      const { valid: v, errors } = validateUpdateAssessment({});
      expect(v).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('passes with valid status', () => {
      VALID_STATUSES.forEach(status => {
        const { valid: v } = validateUpdateAssessment({ status });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid status', () => {
      const { valid: v } = validateUpdateAssessment({ status: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with invalid reviewedBy', () => {
      const { valid: v } = validateUpdateAssessment({ reviewedBy: 'bad-oid' });
      expect(v).toBe(false);
    });

    it('passes with valid reviewedBy', () => {
      const { valid: v } = validateUpdateAssessment({ reviewedBy: VALID_OID });
      expect(v).toBe(true);
    });

    it('fails with invalid reviewDate', () => {
      const { valid: v } = validateUpdateAssessment({ reviewDate: 'bad-date' });
      expect(v).toBe(false);
    });

    it('passes with valid reviewDate', () => {
      const { valid: v } = validateUpdateAssessment({ reviewDate: '2025-06-01' });
      expect(v).toBe(true);
    });
  });

  // ── validate middleware ──────────────────────────────────────────────────

  describe('validate() middleware', () => {
    it('calls next() on valid body', () => {
      const mw = validate(() => ({ valid: true, errors: [] }));
      const next = jest.fn();
      mw({ body: {} }, {}, next);
      expect(next).toHaveBeenCalled();
    });

    it('sends 400 on invalid body', () => {
      const mw = validate(() => ({ valid: false, errors: ['err'] }));
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      mw({ body: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
