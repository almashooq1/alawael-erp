'use strict';
/**
 * Unit tests for sessions.validator
 * @group unit
 */

const {
  validateCreateSession,
  validateUpdateSession,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_ATTENDANCE,
} = require('../../domains/sessions/validators/sessions.validator');

const VALID_OID = '507f1f77bcf86cd799439011';

describe('sessions.validator', () => {
  // ── validateCreateSession ────────────────────────────────────────────────

  describe('validateCreateSession', () => {
    const baseValid = {
      beneficiaryId: VALID_OID,
      episodeId: VALID_OID,
      therapistId: VALID_OID,
      scheduledDate: '2025-06-01',
    };

    it('passes with minimal valid body', () => {
      const { valid: v } = validateCreateSession(baseValid);
      expect(v).toBe(true);
    });

    it('fails when beneficiaryId is missing', () => {
      const { valid: v, errors } = validateCreateSession({
        ...baseValid,
        beneficiaryId: undefined,
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('beneficiaryId'))).toBe(true);
    });

    it('fails when episodeId is missing', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, episodeId: undefined });
      expect(v).toBe(false);
    });

    it('fails when therapistId is missing', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, therapistId: undefined });
      expect(v).toBe(false);
    });

    it('fails when scheduledDate is missing', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, scheduledDate: undefined });
      expect(v).toBe(false);
    });

    it('fails with invalid beneficiaryId', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, beneficiaryId: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with invalid type', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, type: 'bad_type' });
      expect(v).toBe(false);
    });

    it('passes with every valid type', () => {
      VALID_TYPES.forEach(type => {
        const { valid: v } = validateCreateSession({ ...baseValid, type });
        expect(v).toBe(true);
      });
    });

    it('fails when duration is below minimum (5)', () => {
      const { valid: v, errors } = validateCreateSession({ ...baseValid, duration: 3 });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('duration'))).toBe(true);
    });

    it('fails when duration exceeds maximum (480)', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, duration: 600 });
      expect(v).toBe(false);
    });

    it('passes with duration on boundary (5 and 480)', () => {
      expect(validateCreateSession({ ...baseValid, duration: 5 }).valid).toBe(true);
      expect(validateCreateSession({ ...baseValid, duration: 480 }).valid).toBe(true);
    });

    it('fails with invalid scheduledDate', () => {
      const { valid: v } = validateCreateSession({ ...baseValid, scheduledDate: 'bad-date' });
      expect(v).toBe(false);
    });
  });

  // ── validateUpdateSession ────────────────────────────────────────────────

  describe('validateUpdateSession', () => {
    it('fails with empty body (update requires at least one field)', () => {
      const { valid: v, errors } = validateUpdateSession({});
      expect(v).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('passes with valid status', () => {
      VALID_STATUSES.forEach(status => {
        const { valid: v } = validateUpdateSession({ status });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid status', () => {
      const { valid: v } = validateUpdateSession({ status: 'bad_status' });
      expect(v).toBe(false);
    });

    it('passes with valid attendance', () => {
      VALID_ATTENDANCE.forEach(attendance => {
        const { valid: v } = validateUpdateSession({ attendance });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid attendance', () => {
      const { valid: v } = validateUpdateSession({ attendance: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with duration out of range', () => {
      expect(validateUpdateSession({ duration: 0 }).valid).toBe(false);
      expect(validateUpdateSession({ duration: 999 }).valid).toBe(false);
    });

    it('passes with valid duration', () => {
      const { valid: v } = validateUpdateSession({ duration: 60 });
      expect(v).toBe(true);
    });

    it('fails with invalid actualDate', () => {
      const { valid: v } = validateUpdateSession({ actualDate: 'not-a-date' });
      expect(v).toBe(false);
    });

    it('passes with valid actualDate', () => {
      const { valid: v } = validateUpdateSession({ actualDate: '2025-06-01' });
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
