'use strict';

const {
  validateCreateProgram,
  validateEnrollTrainee,
  validateSubmitEvaluation,
  VALID_PROGRAM_TYPES,
  validate,
} = require('../../domains/field-training/validators/field-training.validator');

describe('field-training.validator', () => {
  // ── validateCreateProgram ───────────────────────────────────────────────────
  describe('validateCreateProgram', () => {
    test('valid body with title', () => {
      const r = validateCreateProgram({ title: 'Clinical Internship', type: 'clinical' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });
    test('accepts name instead of title', () => {
      const r = validateCreateProgram({ name: 'Admin Program', type: 'administrative' });
      expect(r.valid).toBe(true);
    });
    test('missing title/name', () => {
      const r = validateCreateProgram({ type: 'clinical' });
      expect(r.valid).toBe(false);
      expect(r.errors.length > 0).toBe(true);
    });
    test('missing type', () => {
      const r = validateCreateProgram({ title: 'Program' });
      expect(r.valid).toBe(false);
    });
    test('invalid program type', () => {
      const r = validateCreateProgram({ title: 'Program', type: 'unknown' });
      expect(r.valid).toBe(false);
    });
    test('all VALID_PROGRAM_TYPES pass', () => {
      VALID_PROGRAM_TYPES.forEach(type => {
        const r = validateCreateProgram({ title: 'Program', type });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateEnrollTrainee ───────────────────────────────────────────────────
  describe('validateEnrollTrainee', () => {
    test('valid body with traineeId', () => {
      const r = validateEnrollTrainee({ traineeId: 't1' });
      expect(r.valid).toBe(true);
    });
    test('accepts beneficiaryId', () => {
      const r = validateEnrollTrainee({ beneficiaryId: 'b1' });
      expect(r.valid).toBe(true);
    });
    test('accepts userId', () => {
      const r = validateEnrollTrainee({ userId: 'u1' });
      expect(r.valid).toBe(true);
    });
    test('missing all id fields', () => {
      const r = validateEnrollTrainee({});
      expect(r.valid).toBe(false);
    });
  });

  // ── validateSubmitEvaluation ────────────────────────────────────────────────
  describe('validateSubmitEvaluation', () => {
    test('valid with scores', () => {
      const r = validateSubmitEvaluation({ scores: { communication: 4 } });
      expect(r.valid).toBe(true);
    });
    test('valid with rating 1-5', () => {
      const r = validateSubmitEvaluation({ rating: 3 });
      expect(r.valid).toBe(true);
    });
    test('missing evaluation', () => {
      const r = validateSubmitEvaluation({});
      expect(r.valid).toBe(false);
    });
    test('rating out of range', () => {
      const r = validateSubmitEvaluation({ rating: 6 });
      expect(r.valid).toBe(false);
    });
    test('rating 0 is invalid', () => {
      const r = validateSubmitEvaluation({ rating: 0 });
      expect(r.valid).toBe(false);
    });
  });

  // ── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    test('passes valid request', () => {
      const mw = validate(validateCreateProgram);
      const req = { body: { title: 'Program', type: 'clinical' } };
      const res = {};
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    test('returns 400 for invalid request', () => {
      const mw = validate(validateCreateProgram);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
