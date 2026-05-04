'use strict';

const {
  validateCreateStudy,
  validateEnrollParticipant,
  validateTransitionStatus,
  VALID_STUDY_TYPES,
  VALID_STATUSES,
  validate,
} = require('../../domains/research/validators/research.validator');

describe('research.validator', () => {
  // ── validateCreateStudy ─────────────────────────────────────────────────────
  describe('validateCreateStudy', () => {
    test('valid body with title', () => {
      const r = validateCreateStudy({ title: 'Rehab Study 2025', type: 'observational' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('accepts name instead of title', () => {
      const r = validateCreateStudy({ name: 'My Study', type: 'survey' });
      expect(r.valid).toBe(true);
    });
    test('missing title/name', () => {
      const r = validateCreateStudy({ type: 'observational' });
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('missing type', () => {
      const r = validateCreateStudy({ title: 'Study' });
      expect(r.valid).toBe(false);
    });
    test('invalid study type', () => {
      const r = validateCreateStudy({ title: 'Study', type: 'unknown' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_STUDY_TYPES pass', () => {
      VALID_STUDY_TYPES.forEach(type => {
        const r = validateCreateStudy({ title: 'Study', type });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateEnrollParticipant ───────────────────────────────────────────────
  describe('validateEnrollParticipant', () => {
    test('valid body', () => {
      const r = validateEnrollParticipant({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(true);
    });
    test('missing beneficiaryId', () => {
      const r = validateEnrollParticipant({});
      expect(r.valid).toBe(false);
    });
  });

  // ── validateTransitionStatus ────────────────────────────────────────────────
  describe('validateTransitionStatus', () => {
    test('valid status', () => {
      const r = validateTransitionStatus({ status: 'active' });
      expect(r.valid).toBe(true);
    });
    test('missing status', () => {
      const r = validateTransitionStatus({});
      expect(r.valid).toBe(false);
    });
    test('invalid status', () => {
      const r = validateTransitionStatus({ status: 'unknown' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_STATUSES pass', () => {
      VALID_STATUSES.forEach(status => {
        const r = validateTransitionStatus({ status });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateCreateStudy);
      const req = { body: { title: 'Study', type: 'observational' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateCreateStudy);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
