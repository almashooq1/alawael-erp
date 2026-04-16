 
'use strict';
/**
 * Unit Tests — Clinical Engine Validation
 * ════════════════════════════════════════
 * Tests the express-validator chains for clinical evaluation endpoints.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/clinical-engine.validation');

function mockReq(body = {}, params = {}) {
  return { body, params, query: {}, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

const validId = '507f1f77bcf86cd799439011';

describe('clinical-engine.validation', () => {
  describe('evaluateBeneficiary', () => {
    it('passes with valid beneficiaryId', async () => {
      const req = mockReq({}, { beneficiaryId: validId });
      const result = await runValidation(v.evaluateBeneficiary, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid beneficiaryId', async () => {
      const req = mockReq({}, { beneficiaryId: 'bad-id' });
      const result = await runValidation(v.evaluateBeneficiary, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid evaluationType', async () => {
      const req = mockReq({ evaluationType: 'comprehensive' }, { beneficiaryId: validId });
      const result = await runValidation(v.evaluateBeneficiary, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid evaluationType', async () => {
      const req = mockReq({ evaluationType: 'superficial' }, { beneficiaryId: validId });
      const result = await runValidation(v.evaluateBeneficiary, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts all valid evaluation types', async () => {
      const types = ['comprehensive', 'focused', 'scheduled', 'event_triggered', 'manual'];
      for (const evaluationType of types) {
        const req = mockReq({ evaluationType }, { beneficiaryId: validId });
        const result = await runValidation(v.evaluateBeneficiary, req);
        expect(result.isEmpty()).toBe(true);
      }
    });
  });

  describe('evaluateBatch', () => {
    it('passes with empty body', async () => {
      const req = mockReq({});
      const result = await runValidation(v.evaluateBatch, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('passes with valid filter object', async () => {
      const req = mockReq({ filter: { status: 'active' } });
      const result = await runValidation(v.evaluateBatch, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects non-object filter', async () => {
      const req = mockReq({ filter: 'not an object' });
      const result = await runValidation(v.evaluateBatch, req);
      expect(result.isEmpty()).toBe(false);
    });
  });
});
