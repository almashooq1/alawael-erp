/**
 * disability-authority-adapter-wave281.test.js — Disability Authority adapter (W281).
 *
 * Mock-mode is the default for dev / CI / local. Live mode requires
 * sandbox credentials from the Authority — covered by the live config
 * shape test only (no real API calls).
 */

'use strict';

jest.unmock('mongoose');

const adapter = require('../services/disabilityAuthorityAdapter');

describe('W281 — Disability Authority adapter', () => {
  describe('module shape', () => {
    it('exports the public surface', () => {
      expect(typeof adapter.verifyDisabilityCard).toBe('function');
      expect(typeof adapter.pullReferralInbox).toBe('function');
      expect(typeof adapter.submitPeriodicReport).toBe('function');
      expect(typeof adapter.getConfig).toBe('function');
    });

    it('reports mode + ttl in getConfig', () => {
      const cfg = adapter.getConfig();
      expect(cfg.mode).toMatch(/^(mock|live)$/);
      expect(cfg.referralTtlMs).toBeGreaterThan(0);
    });
  });

  describe('verifyDisabilityCard (mock mode)', () => {
    it('returns valid + classification + expiry for normal cards', async () => {
      const result = await adapter.verifyDisabilityCard({
        cardNumber: 'DA-CARD-12345',
        nationalId: '1234567890',
      });
      expect(result.valid).toBe(true);
      expect(adapter._MOCK_CLASSIFICATIONS).toContain(result.classification);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.mode).toBe('mock');
    });

    it('returns expired for cardNumber ending in 99', async () => {
      const result = await adapter.verifyDisabilityCard({
        cardNumber: 'DA-CARD-X99',
        nationalId: '1234567890',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CARD_EXPIRED');
      expect(result.expiredAt).toBeInstanceOf(Date);
    });

    it('returns not-found for cardNumber ending in 88', async () => {
      const result = await adapter.verifyDisabilityCard({
        cardNumber: 'DA-CARD-X88',
        nationalId: '1234567890',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CARD_NOT_FOUND');
    });

    it('throws DA_INVALID_INPUT on missing cardNumber', async () => {
      await expect(
        adapter.verifyDisabilityCard({ nationalId: '1234567890' })
      ).rejects.toMatchObject({ code: 'DA_INVALID_INPUT' });
    });
  });

  describe('pullReferralInbox (mock mode)', () => {
    it('returns a deterministic small list per branchId', async () => {
      const a = await adapter.pullReferralInbox({ branchId: 'branch-1' });
      const b = await adapter.pullReferralInbox({ branchId: 'branch-1' });
      expect(a.referrals.length).toBe(b.referrals.length);
      expect(a.referrals[0].referralId).toBe(b.referrals[0].referralId); // deterministic
      expect(a.lastSyncAt).toBeInstanceOf(Date);
    });

    it('filters by sinceDate', async () => {
      // sinceDate set to now+1day — nothing should be newer
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await adapter.pullReferralInbox({ branchId: 'b1', sinceDate: future });
      expect(result.referrals.length).toBe(0);
    });

    it('each referral has the expected shape', async () => {
      const result = await adapter.pullReferralInbox({ branchId: 'shape-test' });
      expect(result.referrals.length).toBeGreaterThan(0);
      const r = result.referrals[0];
      expect(r).toMatchObject({
        referralId: expect.any(String),
        nationalId: expect.stringMatching(/^\d{10}$/),
        classification: expect.any(String),
        cardNumber: expect.any(String),
        priority: expect.stringMatching(/^(high|normal|low)$/),
      });
    });
  });

  describe('submitPeriodicReport (mock mode)', () => {
    const validInput = {
      reportNumber: 'RPT-2026-05-001',
      period: {
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
      },
      payload: { services: 100, beneficiaries: 50 },
    };

    it('returns submissionId + acceptedAt + idempotencyKey', async () => {
      const result = await adapter.submitPeriodicReport(validInput);
      expect(result.submissionId).toMatch(/^da-/);
      expect(result.acceptedAt).toBeInstanceOf(Date);
      expect(result.idempotencyKey).toHaveLength(24);
    });

    it('same reportNumber + period yields same idempotencyKey (deterministic)', async () => {
      const a = await adapter.submitPeriodicReport(validInput);
      const b = await adapter.submitPeriodicReport(validInput);
      expect(a.idempotencyKey).toBe(b.idempotencyKey);
    });

    it('rejects missing period', async () => {
      await expect(
        adapter.submitPeriodicReport({ reportNumber: 'X', payload: {} })
      ).rejects.toMatchObject({ code: 'DA_INVALID_INPUT' });
    });

    it('rejects missing payload', async () => {
      await expect(
        adapter.submitPeriodicReport({
          reportNumber: 'X',
          period: { startDate: new Date(), endDate: new Date() },
        })
      ).rejects.toMatchObject({ code: 'DA_INVALID_INPUT' });
    });
  });

  describe('idempotency key', () => {
    it('hashes (reportNumber + periodStart) consistently', () => {
      const k1 = adapter._idempotencyKey('RPT-1', new Date('2026-01-01'));
      const k2 = adapter._idempotencyKey('RPT-1', new Date('2026-01-01'));
      expect(k1).toBe(k2);
      const k3 = adapter._idempotencyKey('RPT-2', new Date('2026-01-01'));
      expect(k3).not.toBe(k1);
    });
  });
});
