 
'use strict';
/**
 * Unit Tests — Insurance Manager Validation
 * ══════════════════════════════════════════
 * Tests the express-validator chains for insurance endpoints.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/insurance-manager.validation');

function mockReq(body = {}, params = {}) {
  return { body, params, query: {}, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

const validId = '507f1f77bcf86cd799439011';

describe('insurance-manager.validation', () => {
  /* ═══ Providers ═══ */
  describe('createProvider', () => {
    it('passes with valid provider', async () => {
      const req = mockReq({
        code: 'PROV-001',
        name: 'National Insurance Co.',
        type: 'government',
      });
      const result = await runValidation(v.createProvider, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid type', async () => {
      const req = mockReq({ code: 'P-02', name: 'Test', type: 'alien_insurance' });
      const result = await runValidation(v.createProvider, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid email', async () => {
      const req = mockReq({
        code: 'P-03',
        name: 'Test',
        type: 'private',
        contact: { email: 'not-email' },
      });
      const result = await runValidation(v.createProvider, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid networkTier', async () => {
      const req = mockReq({
        code: 'P-04',
        name: 'Test',
        type: 'cooperative',
        networkTier: 'preferred',
      });
      const result = await runValidation(v.createProvider, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('validates serviceCategories entries', async () => {
      const req = mockReq({
        code: 'P-05',
        name: 'Test',
        type: 'private',
        serviceCategories: ['physical_therapy', 'invalid_cat'],
      });
      const result = await runValidation(v.createProvider, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Policies ═══ */
  describe('createPolicy', () => {
    const validPolicy = {
      beneficiaryId: validId,
      providerId: validId,
      policyNumber: 'POL-001',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      expiryDate: '2027-01-01T00:00:00.000Z',
    };

    it('passes with valid policy', async () => {
      const req = mockReq(validPolicy);
      const result = await runValidation(v.createPolicy, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid beneficiaryId', async () => {
      const req = mockReq({ ...validPolicy, beneficiaryId: 'bad' });
      const result = await runValidation(v.createPolicy, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid effectiveDate', async () => {
      const req = mockReq({ ...validPolicy, effectiveDate: 'yesterday' });
      const result = await runValidation(v.createPolicy, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid planClass', async () => {
      const req = mockReq({ ...validPolicy, planClass: 'VIP' });
      const result = await runValidation(v.createPolicy, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid planClass', async () => {
      const req = mockReq({ ...validPolicy, planClass: 'PLATINUM' });
      const result = await runValidation(v.createPolicy, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Pre-Auth ═══ */
  describe('createPreAuth', () => {
    it('passes with valid pre-auth', async () => {
      const req = mockReq({
        authNumber: 'AUTH-001',
        policyId: validId,
        providerId: validId,
        beneficiaryId: validId,
      });
      const result = await runValidation(v.createPreAuth, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing authNumber', async () => {
      const req = mockReq({
        policyId: validId,
        providerId: validId,
        beneficiaryId: validId,
      });
      const result = await runValidation(v.createPreAuth, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid urgency', async () => {
      const req = mockReq({
        authNumber: 'AUTH-002',
        policyId: validId,
        providerId: validId,
        beneficiaryId: validId,
        urgency: 'emergency',
      });
      const result = await runValidation(v.createPreAuth, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid urgency', async () => {
      const req = mockReq({
        authNumber: 'AUTH-003',
        policyId: validId,
        providerId: validId,
        beneficiaryId: validId,
        urgency: 'sometime_later',
      });
      const result = await runValidation(v.createPreAuth, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('validates requestedServices.*.category', async () => {
      const req = mockReq({
        authNumber: 'AUTH-004',
        policyId: validId,
        providerId: validId,
        beneficiaryId: validId,
        requestedServices: [{ category: 'invalid_svc', sessions: 5, estimatedCost: 1000 }],
      });
      const result = await runValidation(v.createPreAuth, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Pre-Auth Actions ═══ */
  describe('denyPreAuth', () => {
    it('passes with valid denial', async () => {
      const req = mockReq({ reviewer: validId, reason: 'Not covered under plan' });
      const result = await runValidation(v.denyPreAuth, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing reason', async () => {
      const req = mockReq({ reviewer: validId });
      const result = await runValidation(v.denyPreAuth, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid reviewer', async () => {
      const req = mockReq({ reviewer: 'bad', reason: 'Test' });
      const result = await runValidation(v.denyPreAuth, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Coverage Rules ═══ */
  describe('createCoverageRule', () => {
    it('passes with valid coverage rule', async () => {
      const req = mockReq({
        providerId: validId,
        category: 'physical_therapy',
        coverageType: 'co_pay',
      });
      const result = await runValidation(v.createCoverageRule, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid coverageType', async () => {
      const req = mockReq({
        providerId: validId,
        category: 'physical_therapy',
        coverageType: 'black_market',
      });
      const result = await runValidation(v.createCoverageRule, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects coPayPercent > 100', async () => {
      const req = mockReq({
        providerId: validId,
        category: 'physical_therapy',
        coverageType: 'co_pay',
        coPayPercent: 200,
      });
      const result = await runValidation(v.createCoverageRule, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Check Coverage ═══ */
  describe('checkCoverage', () => {
    it('passes with valid category', async () => {
      const req = mockReq({ category: 'speech_therapy' });
      const result = await runValidation(v.checkCoverage, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid category', async () => {
      const req = mockReq({ category: 'quantum_healing' });
      const result = await runValidation(v.checkCoverage, req);
      expect(result.isEmpty()).toBe(false);
    });
  });
});
