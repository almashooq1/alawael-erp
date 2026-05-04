'use strict';
/**
 * Unit tests for care-plans.validator
 * @group unit
 */

const {
  validateCreateCarePlan,
  validateUpdateCarePlan,
  validateGoalUpdate,
  validate,
  VALID_STATUSES,
  VALID_GOAL_STATUSES,
  VALID_PRIORITY,
} = require('../../domains/care-plans/validators/care-plans.validator');

const VALID_OID = '507f1f77bcf86cd799439011';

describe('care-plans.validator', () => {
  // ── validateCreateCarePlan ───────────────────────────────────────────────

  describe('validateCreateCarePlan', () => {
    it('passes with minimal valid body', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
      });
      expect(v).toBe(true);
    });

    it('fails when beneficiaryId is missing', () => {
      const { valid: v, errors } = validateCreateCarePlan({ episodeId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('beneficiaryId'))).toBe(true);
    });

    it('fails when episodeId is missing', () => {
      const { valid: v, errors } = validateCreateCarePlan({ beneficiaryId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('episodeId'))).toBe(true);
    });

    it('fails with invalid beneficiaryId format', () => {
      const { valid: v } = validateCreateCarePlan({ beneficiaryId: 'bad', episodeId: VALID_OID });
      expect(v).toBe(false);
    });

    it('fails with invalid status', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        status: 'bad_status',
      });
      expect(v).toBe(false);
    });

    it('passes with every valid status', () => {
      VALID_STATUSES.forEach(status => {
        const { valid: v } = validateCreateCarePlan({
          beneficiaryId: VALID_OID,
          episodeId: VALID_OID,
          status,
        });
        expect(v).toBe(true);
      });
    });

    it('fails when endDate is before startDate', () => {
      const { valid: v, errors } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        startDate: '2025-06-01',
        endDate: '2025-01-01',
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('endDate'))).toBe(true);
    });

    it('passes with valid date range', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        startDate: '2025-01-01',
        endDate: '2025-06-01',
      });
      expect(v).toBe(true);
    });

    it('fails when goals is not an array', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        goals: 'not-array',
      });
      expect(v).toBe(false);
    });

    it('passes with empty goals array', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        goals: [],
      });
      expect(v).toBe(true);
    });

    it('fails when a goal has no description', () => {
      const { valid: v, errors } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        goals: [{ priority: 'high', targetDate: '2025-06-01' }],
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('description'))).toBe(true);
    });

    it('fails when a goal has invalid priority', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        goals: [{ description: 'goal', priority: 'bad_priority' }],
      });
      expect(v).toBe(false);
    });

    it('passes with all valid priorities', () => {
      VALID_PRIORITY.forEach(priority => {
        const { valid: v } = validateCreateCarePlan({
          beneficiaryId: VALID_OID,
          episodeId: VALID_OID,
          goals: [{ description: 'goal', priority }],
        });
        expect(v).toBe(true);
      });
    });

    it('fails when a goal has invalid targetDate', () => {
      const { valid: v } = validateCreateCarePlan({
        beneficiaryId: VALID_OID,
        episodeId: VALID_OID,
        goals: [{ description: 'goal', targetDate: 'bad-date' }],
      });
      expect(v).toBe(false);
    });
  });

  // ── validateUpdateCarePlan ───────────────────────────────────────────────

  describe('validateUpdateCarePlan', () => {
    it('fails with empty body (update requires at least one field)', () => {
      const { valid: v, errors } = validateUpdateCarePlan({});
      expect(v).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('passes with valid status', () => {
      VALID_STATUSES.forEach(status => {
        const { valid: v } = validateUpdateCarePlan({ status });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid status', () => {
      const { valid: v } = validateUpdateCarePlan({ status: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with invalid endDate', () => {
      const { valid: v } = validateUpdateCarePlan({ endDate: 'bad-date' });
      expect(v).toBe(false);
    });

    it('passes with valid endDate', () => {
      const { valid: v } = validateUpdateCarePlan({ endDate: '2025-12-31' });
      expect(v).toBe(true);
    });
  });

  // ── validateGoalUpdate ───────────────────────────────────────────────────

  describe('validateGoalUpdate', () => {
    it('fails when goalId is missing', () => {
      const { valid: v, errors } = validateGoalUpdate({ status: 'achieved' });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('goalId'))).toBe(true);
    });

    it('fails when status is missing', () => {
      const { valid: v, errors } = validateGoalUpdate({ goalId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('status'))).toBe(true);
    });

    it('fails with invalid goalId', () => {
      const { valid: v } = validateGoalUpdate({ goalId: 'bad', status: 'achieved' });
      expect(v).toBe(false);
    });

    it('fails with invalid goal status', () => {
      const { valid: v } = validateGoalUpdate({ goalId: VALID_OID, status: 'bad_status' });
      expect(v).toBe(false);
    });

    it('passes with all valid goal statuses', () => {
      VALID_GOAL_STATUSES.forEach(status => {
        const { valid: v } = validateGoalUpdate({ goalId: VALID_OID, status });
        expect(v).toBe(true);
      });
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
