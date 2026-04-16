 
'use strict';
/**
 * Unit Tests — Consent Manager Validation
 * ════════════════════════════════════════
 * Tests the express-validator chains for consent/DSAR endpoints.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/consent-manager.validation');

function mockReq(body = {}, params = {}) {
  return { body, params, query: {}, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

const validId = '507f1f77bcf86cd799439011';

describe('consent-manager.validation', () => {
  /* ═══ Grant Consent ═══ */
  describe('grantConsent', () => {
    it('passes with valid consent grant', async () => {
      const req = mockReq({ purpose: 'treatment' }, { beneficiaryId: validId });
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid beneficiaryId param', async () => {
      const req = mockReq({ purpose: 'treatment' }, { beneficiaryId: 'bad' });
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid purpose', async () => {
      const req = mockReq({ purpose: 'mind_reading' }, { beneficiaryId: validId });
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid lawfulBasis', async () => {
      const req = mockReq(
        { purpose: 'research', lawfulBasis: 'consent' },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid lawfulBasis', async () => {
      const req = mockReq(
        { purpose: 'treatment', lawfulBasis: 'because_i_said_so' },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid grantMethod', async () => {
      const req = mockReq(
        { purpose: 'treatment', grantMethod: 'electronic' },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('validates scope.dataCategories entries', async () => {
      const req = mockReq(
        { purpose: 'treatment', scope: { dataCategories: ['personal', 'invalid_cat'] } },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid expiresAt', async () => {
      const req = mockReq(
        { purpose: 'treatment', expiresAt: '2027-01-01T00:00:00.000Z' },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid expiresAt', async () => {
      const req = mockReq(
        { purpose: 'treatment', expiresAt: 'not-a-date' },
        { beneficiaryId: validId }
      );
      const result = await runValidation(v.grantConsent, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Withdraw Consent ═══ */
  describe('withdrawConsent', () => {
    it('passes with valid withdrawal', async () => {
      const req = mockReq({ purpose: 'marketing' }, { beneficiaryId: validId });
      const result = await runValidation(v.withdrawConsent, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing purpose', async () => {
      const req = mockReq({}, { beneficiaryId: validId });
      const result = await runValidation(v.withdrawConsent, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ DSAR ═══ */
  describe('createDSAR', () => {
    it('passes with valid DSAR', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'access',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid requestType', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'hack_database',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid identityVerificationMethod', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'erasure',
        identityVerificationMethod: 'two_factor',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid identityVerificationMethod', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'erasure',
        identityVerificationMethod: 'blood_oath',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid dataExportFormat', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'portability',
        dataExportFormat: 'fhir_bundle',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid dataExportFormat', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        requestType: 'portability',
        dataExportFormat: 'pdf',
      });
      const result = await runValidation(v.createDSAR, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Retention Policy ═══ */
  describe('updateRetentionPolicy', () => {
    it('passes with valid update', async () => {
      const req = mockReq(
        { retentionPeriodDays: 365, archiveBeforeDelete: true },
        { domain: 'clinical' }
      );
      const result = await runValidation(v.updateRetentionPolicy, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects retentionPeriodDays < 1', async () => {
      const req = mockReq({ retentionPeriodDays: 0 }, { domain: 'clinical' });
      const result = await runValidation(v.updateRetentionPolicy, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects non-boolean archiveBeforeDelete', async () => {
      const req = mockReq({ archiveBeforeDelete: 'yes' }, { domain: 'clinical' });
      const result = await runValidation(v.updateRetentionPolicy, req);
      expect(result.isEmpty()).toBe(false);
    });
  });
});
