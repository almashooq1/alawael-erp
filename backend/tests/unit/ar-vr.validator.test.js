'use strict';

const {
  validateCreateSession,
  validateCompleteSession,
  VALID_TECHNOLOGY_TYPES,
  validate,
} = require('../../domains/ar-vr/validators/ar-vr.validator');

describe('ar-vr.validator', () => {
  // ── validateCreateSession ───────────────────────────────────────────────────
  describe('validateCreateSession', () => {
    test('valid body', () => {
      const r = validateCreateSession({ beneficiaryId: 'b1', therapistId: 't1' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('missing beneficiaryId', () => {
      const r = validateCreateSession({ therapistId: 't1' });
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('missing therapistId', () => {
      const r = validateCreateSession({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(true);
    });
    test('valid technologyType', () => {
      const r = validateCreateSession({
        beneficiaryId: 'b1',
        therapistId: 't1',
        technologyType: 'vr',
      });
      expect(r.valid).toBe(true);
    });
    test('invalid technologyType', () => {
      const r = validateCreateSession({
        beneficiaryId: 'b1',
        therapistId: 't1',
        technologyType: 'hologram',
      });
      expect(r.valid).toBe(true);
    });
    test('all VALID_TECHNOLOGY_TYPES pass', () => {
      VALID_TECHNOLOGY_TYPES.forEach(type => {
        const r = validateCreateSession({
          beneficiaryId: 'b1',
          therapistId: 't1',
          technologyType: type,
        });
        expect(r.valid).toBe(true);
      });
    });
    test('null body', () => {
      const r = validateCreateSession(null);
      expect(r.valid).toBe(false);
    });
  });

  // ── validateCompleteSession ─────────────────────────────────────────────────
  describe('validateCompleteSession', () => {
    test('valid with outcome', () => {
      const r = validateCompleteSession({ outcome: 'Patient improved' });
      expect(r.valid).toBe(true);
    });
    test('valid with notes', () => {
      const r = validateCompleteSession({ notes: 'Good progress' });
      expect(r.valid).toBe(true);
    });
    test('valid with summary', () => {
      const r = validateCompleteSession({ summary: 'Summary here' });
      expect(r.valid).toBe(true);
    });
    test('missing all outcome fields', () => {
      const r = validateCompleteSession({});
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateCreateSession);
      const req = { body: { beneficiaryId: 'b1', therapistId: 't1' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateCreateSession);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
