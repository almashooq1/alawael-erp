'use strict';

const {
  validateAddEvent,
  VALID_EVENT_TYPES,
  validate,
} = require('../../domains/timeline/validators/timeline.validator');

describe('timeline.validator', () => {
  // ── validateAddEvent ────────────────────────────────────────────────────────
  describe('validateAddEvent', () => {
    test('valid body', () => {
      const r = validateAddEvent({ beneficiaryId: 'b1', eventType: 'session' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('missing beneficiaryId', () => {
      const r = validateAddEvent({ eventType: 'session' });
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('missing eventType', () => {
      const r = validateAddEvent({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(false);
    });
    test('invalid eventType', () => {
      const r = validateAddEvent({ beneficiaryId: 'b1', eventType: 'unknown' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_EVENT_TYPES pass', () => {
      VALID_EVENT_TYPES.forEach(type => {
        const r = validateAddEvent({ beneficiaryId: 'b1', eventType: type });
        expect(r.valid).toBe(true);
      });
    });
    test('null body', () => {
      const r = validateAddEvent(null);
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateAddEvent);
      const req = { body: { beneficiaryId: 'b1', eventType: 'session' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateAddEvent);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
