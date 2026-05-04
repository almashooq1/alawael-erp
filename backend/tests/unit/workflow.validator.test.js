'use strict';

const {
  validateStartJourney,
  validateAdvancePhase,
  validateExceptionAdvance,
  VALID_PHASES,
  validate,
} = require('../../domains/workflow/validators/workflow.validator');

describe('workflow.validator', () => {
  // ── validateStartJourney ────────────────────────────────────────────────────
  describe('validateStartJourney', () => {
    test('valid body', () => {
      const r = validateStartJourney({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('missing beneficiaryId', () => {
      const r = validateStartJourney({});
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('null body', () => {
      const r = validateStartJourney(null);
      expect(r.valid).toBe(false);
    });
  });

  // ── validateAdvancePhase ────────────────────────────────────────────────────
  describe('validateAdvancePhase', () => {
    test('valid phase', () => {
      const r = validateAdvancePhase({ toPhase: 'assessment' });
      expect(r.valid).toBe(true);
    });
    test('missing toPhase', () => {
      const r = validateAdvancePhase({});
      expect(r.valid).toBe(false);
    });
    test('invalid phase value', () => {
      const r = validateAdvancePhase({ toPhase: 'invalid-phase' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_PHASES pass', () => {
      VALID_PHASES.forEach(phase => {
        const r = validateAdvancePhase({ toPhase: phase });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateExceptionAdvance ────────────────────────────────────────────────
  describe('validateExceptionAdvance', () => {
    test('valid body', () => {
      const r = validateExceptionAdvance({ toPhase: 'discharge', reason: 'urgent' });
      expect(r.valid).toBe(true);
    });
    test('missing toPhase', () => {
      const r = validateExceptionAdvance({ reason: 'urgent' });
      expect(r.valid).toBe(false);
    });
    test('missing reason', () => {
      const r = validateExceptionAdvance({ toPhase: 'discharge' });
      expect(r.valid).toBe(false);
    });
    test('invalid phase', () => {
      const r = validateExceptionAdvance({ toPhase: 'xyz', reason: 'urgent' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request to next()', () => {
      const mw = validate(validateStartJourney);
      const req = { body: { beneficiaryId: 'b1' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateStartJourney);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
