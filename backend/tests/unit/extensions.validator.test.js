'use strict';

const {
  validateCreateRecord,
  validateUpdateRecord,
  validate,
} = require('../../domains/extensions/validators/extensions.validator');

describe('extensions.validator', () => {
  // ── validateCreateRecord ────────────────────────────────────────────────────
  describe('validateCreateRecord', () => {
    test('valid body with beneficiaryId', () => {
      const r = validateCreateRecord({ beneficiaryId: 'b1', data: { key: 'value' } });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('valid body with episodeId', () => {
      const r = validateCreateRecord({ episodeId: 'ep1' });
      expect(r.valid).toBe(true);
    });
    test('valid body with relatedTo', () => {
      const r = validateCreateRecord({ relatedTo: 'something' });
      expect(r.valid).toBe(true);
    });
    test('missing all reference fields', () => {
      const r = validateCreateRecord({ data: { key: 'value' } });
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('null body', () => {
      const r = validateCreateRecord(null);
      expect(r.valid).toBe(false);
    });
    test('non-object body', () => {
      const r = validateCreateRecord('string');
      expect(r.valid).toBe(false);
    });
  });

  // ── validateUpdateRecord ────────────────────────────────────────────────────
  describe('validateUpdateRecord', () => {
    test('valid body with fields', () => {
      const r = validateUpdateRecord({ status: 'active' });
      expect(r.valid).toBe(true);
    });
    test('empty body fails', () => {
      const r = validateUpdateRecord({});
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('null body fails', () => {
      const r = validateUpdateRecord(null);
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateCreateRecord);
      const req = { body: { beneficiaryId: 'b1' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateCreateRecord);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
