/* eslint-disable no-undef */
'use strict';
/**
 * Unit Tests — Claims Processor Validation
 * ═════════════════════════════════════════
 * Tests the express-validator chains for claims endpoints.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/claims-processor.validation');

/* ─── Helpers ─── */
function mockReq(body = {}, params = {}) {
  return { body, params, query: {}, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

const validId = '507f1f77bcf86cd799439011';

describe('claims-processor.validation', () => {
  /* ═══ Claims ═══ */
  describe('createClaim', () => {
    const validClaim = {
      claimNumber: 'CLM-001',
      beneficiaryId: validId,
      policyId: validId,
      providerId: validId,
      claimType: 'rehabilitation',
      serviceFrom: '2026-03-01T00:00:00.000Z',
      lines: [
        {
          lineNumber: 1,
          serviceCode: 'PT-001',
          description: 'Physical therapy session',
          serviceDate: '2026-03-01T00:00:00.000Z',
          unitPrice: 250,
          totalCharge: 250,
        },
      ],
    };

    it('passes with valid claim', async () => {
      const req = mockReq(validClaim);
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing claimNumber', async () => {
      const { claimNumber, ...rest } = validClaim;
      const req = mockReq(rest);
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array()[0].path).toBe('claimNumber');
    });

    it('rejects invalid claimType', async () => {
      const req = mockReq({ ...validClaim, claimType: 'alien_treatment' });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'claimType')).toBe(true);
    });

    it('rejects empty lines array', async () => {
      const req = mockReq({ ...validClaim, lines: [] });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('validates line item fields', async () => {
      const req = mockReq({
        ...validClaim,
        lines: [
          {
            lineNumber: 0,
            serviceCode: '',
            description: '',
            serviceDate: 'bad',
            unitPrice: -1,
            totalCharge: -1,
          },
        ],
      });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(false);
      // Should catch multiple errors
      expect(result.array().length).toBeGreaterThan(1);
    });

    it('accepts valid submissionChannel', async () => {
      const req = mockReq({ ...validClaim, submissionChannel: 'nphies' });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid submissionChannel', async () => {
      const req = mockReq({ ...validClaim, submissionChannel: 'pigeon' });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid priority', async () => {
      const req = mockReq({ ...validClaim, priority: 'urgent' });
      const result = await runValidation(v.createClaim, req);
      expect(result.isEmpty()).toBe(true);
    });
  });

  /* ═══ Claim Actions ═══ */
  describe('adjudicateClaim', () => {
    it('passes with valid adjudication', async () => {
      const req = mockReq({ totalApproved: 200, totalDenied: 50 });
      const result = await runValidation(v.adjudicateClaim, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('passes with empty body (all optional)', async () => {
      const req = mockReq({});
      const result = await runValidation(v.adjudicateClaim, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects negative totalApproved', async () => {
      const req = mockReq({ totalApproved: -100 });
      const result = await runValidation(v.adjudicateClaim, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Batches ═══ */
  describe('createBatch', () => {
    it('passes with valid batch', async () => {
      const req = mockReq({
        batchNumber: 'BATCH-001',
        providerId: validId,
      });
      const result = await runValidation(v.createBatch, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing batchNumber', async () => {
      const req = mockReq({ providerId: validId });
      const result = await runValidation(v.createBatch, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid providerId', async () => {
      const req = mockReq({ batchNumber: 'B-01', providerId: 'bad' });
      const result = await runValidation(v.createBatch, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid channel', async () => {
      const req = mockReq({ batchNumber: 'B-02', providerId: validId, channel: 'electronic' });
      const result = await runValidation(v.createBatch, req);
      expect(result.isEmpty()).toBe(true);
    });
  });

  /* ═══ Appeals ═══ */
  describe('createAppeal', () => {
    it('passes with valid appeal', async () => {
      const req = mockReq({
        appealNumber: 'APL-001',
        claimId: validId,
        beneficiaryId: validId,
        appealReason: 'Unjustified denial of coverage',
      });
      const result = await runValidation(v.createAppeal, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing appealReason', async () => {
      const req = mockReq({
        appealNumber: 'APL-002',
        claimId: validId,
        beneficiaryId: validId,
      });
      const result = await runValidation(v.createAppeal, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid appeal level', async () => {
      const req = mockReq({
        appealNumber: 'APL-003',
        claimId: validId,
        beneficiaryId: validId,
        appealReason: 'Denied unfairly',
        level: 'second_level',
      });
      const result = await runValidation(v.createAppeal, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid appeal level', async () => {
      const req = mockReq({
        appealNumber: 'APL-004',
        claimId: validId,
        beneficiaryId: validId,
        appealReason: 'Test',
        level: 'supreme_court',
      });
      const result = await runValidation(v.createAppeal, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Resolve Appeal ═══ */
  describe('resolveAppeal', () => {
    it('passes with valid resolution', async () => {
      const req = mockReq({ status: 'approved', approvedAmount: 500 });
      const result = await runValidation(v.resolveAppeal, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid status', async () => {
      const req = mockReq({ status: 'maybe' });
      const result = await runValidation(v.resolveAppeal, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ EOBs ═══ */
  describe('createEOB', () => {
    it('passes with valid EOB', async () => {
      const req = mockReq({
        eobNumber: 'EOB-001',
        claimId: validId,
        beneficiaryId: validId,
      });
      const result = await runValidation(v.createEOB, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid EOB type', async () => {
      const req = mockReq({
        eobNumber: 'EOB-002',
        claimId: validId,
        beneficiaryId: validId,
        type: 'unknown_type',
      });
      const result = await runValidation(v.createEOB, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid type', async () => {
      const req = mockReq({
        eobNumber: 'EOB-003',
        claimId: validId,
        beneficiaryId: validId,
        type: 'payment',
      });
      const result = await runValidation(v.createEOB, req);
      expect(result.isEmpty()).toBe(true);
    });
  });
});
