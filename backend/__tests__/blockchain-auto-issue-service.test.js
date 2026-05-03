/**
 * blockchain-auto-issue-service.test.js
 *
 * Tests the auto-issue funnel WITHOUT touching Mongo. We mock the cert
 * service so the funnel's input-validation, idempotency-key shape, source-
 * default mapping, and metric labelling can all be asserted in isolation.
 *
 * The lifecycle integration (does it actually create + anchor a cert?) is
 * covered by the routes/cert-service tests in their own suites.
 */

'use strict';

jest.mock('../services/blockchainCertService', () => ({
  createCertificate: jest.fn(),
  issueCertificate: jest.fn(),
}));

const certService = require('../services/blockchainCertService');
const metrics = require('../services/blockchain/metrics');
const auto = require('../services/blockchainAutoIssueService');

const baseRecipient = { name: { ar: 'علي', en: 'Ali' }, nationalId: '1234567890' };

describe('blockchainAutoIssueService', () => {
  const ORIG_FLAG = process.env.BLOCKCHAIN_AUTO_ISSUE;

  beforeEach(() => {
    jest.resetAllMocks();
    metrics._resetForTests();
    process.env.BLOCKCHAIN_AUTO_ISSUE = '1';
  });
  afterAll(() => {
    if (ORIG_FLAG === undefined) delete process.env.BLOCKCHAIN_AUTO_ISSUE;
    else process.env.BLOCKCHAIN_AUTO_ISSUE = ORIG_FLAG;
  });

  describe('feature flag', () => {
    it('returns skipped when BLOCKCHAIN_AUTO_ISSUE is unset', async () => {
      delete process.env.BLOCKCHAIN_AUTO_ISSUE;
      const out = await auto.autoIssue({ source: 'lms', sourceRef: 'x', recipient: baseRecipient });
      expect(out).toEqual({ ok: false, skipped: true, reason: 'auto-issue disabled' });
      expect(certService.createCertificate).not.toHaveBeenCalled();
    });

    it('runs when BLOCKCHAIN_AUTO_ISSUE=1', () => {
      expect(auto.isEnabled()).toBe(true);
    });
  });

  describe('input validation', () => {
    it('rejects when source is missing', async () => {
      const out = await auto.autoIssue({ sourceRef: 'x', recipient: baseRecipient });
      expect(out.ok).toBe(false);
      expect(out.error).toMatch(/source/);
      expect(certService.createCertificate).not.toHaveBeenCalled();
    });

    it('rejects when sourceRef is missing', async () => {
      const out = await auto.autoIssue({ source: 'lms', recipient: baseRecipient });
      expect(out.ok).toBe(false);
      expect(certService.createCertificate).not.toHaveBeenCalled();
    });

    it('rejects when recipient name is empty', async () => {
      const out = await auto.autoIssue({
        source: 'lms',
        sourceRef: 'x',
        recipient: { name: { ar: '', en: '' } },
      });
      expect(out.ok).toBe(false);
      expect(out.error).toMatch(/recipient/);
    });
  });

  describe('idempotency key shape', () => {
    it('uses auto:<source>:<ref> as the key', () => {
      expect(auto.buildIdempotencyKey('lms', 'enr-1')).toBe('auto:lms:enr-1');
      expect(auto.buildIdempotencyKey('iep', '64f…')).toBe('auto:iep:64f…');
    });
  });

  describe('source defaults', () => {
    it('falls back to source-specific category + title', () => {
      expect(auto.buildCategory('lms')).toBe('training');
      expect(auto.buildCategory('iep')).toBe('rehabilitation');
      expect(auto.buildCategory('cpe')).toBe('professional');
      expect(auto.buildCategory('onboarding')).toBe('compliance');
      // unknown source still maps somewhere
      expect(auto.buildCategory('totally-new-thing')).toBe('achievement');
    });

    it('honors explicit category override', () => {
      expect(auto.buildCategory('lms', 'achievement')).toBe('achievement');
    });

    it('uses explicit title when provided, else falls back per-source', () => {
      expect(auto.buildTitle('lms', { ar: 'X', en: 'Y' })).toEqual({ ar: 'X', en: 'Y' });
      expect(auto.buildTitle('iep', null)).toMatchObject({
        ar: expect.any(String),
        en: expect.any(String),
      });
    });
  });

  describe('happy path', () => {
    it('calls createCertificate with the idempotency key, then issueCertificate', async () => {
      certService.createCertificate.mockResolvedValue({
        certificate: { _id: 'c1', hash: 'h' },
        deduped: false,
      });
      certService.issueCertificate.mockResolvedValue({ _id: 'c1', status: 'issued' });

      const out = await auto.autoIssue({
        source: 'lms',
        sourceRef: 'enr-42',
        recipient: baseRecipient,
        title: { ar: 'دورة', en: 'Course' },
        data: { hours: 5 },
      });

      expect(out).toEqual({ ok: true, certificate: { _id: 'c1', status: 'issued' } });
      expect(certService.createCertificate).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: baseRecipient,
          title: { ar: 'دورة', en: 'Course' },
          data: { hours: 5 },
          category: 'training',
        }),
        expect.objectContaining({ idempotencyKey: 'auto:lms:enr-42' })
      );
      expect(certService.issueCertificate).toHaveBeenCalledWith('c1', expect.any(Object));
    });

    it('skips issueCertificate when deduped', async () => {
      certService.createCertificate.mockResolvedValue({
        certificate: { _id: 'c1', hash: 'h', status: 'issued' },
        deduped: true,
      });

      const out = await auto.autoIssue({
        source: 'iep',
        sourceRef: 'iep-1',
        recipient: baseRecipient,
      });

      expect(out.deduped).toBe(true);
      expect(certService.issueCertificate).not.toHaveBeenCalled();
    });

    it('honors skipIssue: creates draft only', async () => {
      certService.createCertificate.mockResolvedValue({
        certificate: { _id: 'c1', status: 'draft' },
        deduped: false,
      });
      const out = await auto.autoIssue({
        source: 'training',
        sourceRef: 't-1',
        recipient: baseRecipient,
        skipIssue: true,
      });
      expect(out.ok).toBe(true);
      expect(certService.issueCertificate).not.toHaveBeenCalled();
    });
  });

  describe('failure isolation', () => {
    it('swallows createCertificate errors and counts auto_issue.error', async () => {
      certService.createCertificate.mockRejectedValue(new Error('mongo down'));
      const out = await auto.autoIssue({
        source: 'lms',
        sourceRef: 'x',
        recipient: baseRecipient,
      });
      expect(out.ok).toBe(false);
      expect(out.error).toBe('mongo down');
      const errRow = metrics
        .snapshot()
        .find(r => r.name === 'blockchain_auto_issue_total' && r.labels.outcome === 'error');
      expect(errRow.value).toBe(1);
    });

    it('counts deduped/issued outcomes correctly in metrics', async () => {
      certService.createCertificate.mockResolvedValueOnce({
        certificate: { _id: 'c1' },
        deduped: false,
      });
      certService.issueCertificate.mockResolvedValueOnce({ _id: 'c1' });
      certService.createCertificate.mockResolvedValueOnce({
        certificate: { _id: 'c1' },
        deduped: true,
      });

      await auto.autoIssue({ source: 'lms', sourceRef: 'a', recipient: baseRecipient });
      await auto.autoIssue({ source: 'lms', sourceRef: 'a', recipient: baseRecipient });

      const rows = metrics
        .snapshot()
        .filter(r => r.name === 'blockchain_auto_issue_total' && r.labels.source === 'lms');
      const issued = rows.find(r => r.labels.outcome === 'issued');
      const deduped = rows.find(r => r.labels.outcome === 'deduped');
      expect(issued.value).toBe(1);
      expect(deduped.value).toBe(1);
    });
  });
});
