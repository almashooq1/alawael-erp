/**
 * nphies-reconciliation-service.test.js — async half of the NPHIES lifecycle.
 *
 * Scenarios:
 *   • processWebhook updates a matching claim to APPROVED and sets status=PAID
 *   • processWebhook with unknown claimReference returns matched=false (not an error)
 *   • processWebhook missing claimReference throws INVALID_WEBHOOK_PAYLOAD
 *   • sweep polls only PENDING_REVIEW claims past minAgeMs
 *   • sweep applies adapter results and increments stats.changed
 *   • sweep skips claims the adapter still returns PENDING_REVIEW for
 *   • sweep collects errors without aborting the batch
 */

'use strict';

const { createService } = require('../services/nphiesReconciliationService');

function claim(overrides = {}) {
  const now = Date.now();
  const obj = {
    _id: overrides._id || `claim-${Math.random().toString(36).slice(2, 8)}`,
    claimNumber: overrides.claimNumber || 'CLM-001',
    memberId: overrides.memberId || 'MBR-1',
    insurerId: overrides.insurerId || 'INS-1',
    totalAmount: overrides.totalAmount ?? 1000,
    status: overrides.status || 'SUBMITTED',
    nphies: {
      submission: {
        status: 'PENDING_REVIEW',
        claimReference: overrides.claimReference || 'REF-001',
        submittedAt: new Date(now - 60 * 60 * 1000),
        updatedAt: overrides.updatedAtMs ? new Date(overrides.updatedAtMs) : undefined,
      },
      ...(overrides.nphiesExtras || {}),
    },
    ...overrides,
  };
  obj.toObject = () => ({ ...obj });
  obj.save = jest.fn(async () => obj);
  return obj;
}

function createFakeClaimModel(rows) {
  return {
    async findOne(q) {
      if (q['nphies.submission.claimReference']) {
        return (
          rows.find(
            r => r.nphies?.submission?.claimReference === q['nphies.submission.claimReference']
          ) || null
        );
      }
      return null;
    },
    find(q) {
      const chain = {
        sort: () => chain,
        limit: async n => {
          let matched = rows.filter(r => r.nphies?.submission?.status === 'PENDING_REVIEW');
          if (q.$or) {
            matched = matched.filter(r => {
              const t = r.nphies?.submission?.updatedAt;
              return !t || t < q.$or[0]['nphies.submission.updatedAt'].$lt;
            });
          }
          return matched.slice(0, n);
        },
      };
      chain.then = (resolve, reject) => chain.limit(25).then(resolve, reject);
      return chain;
    },
  };
}

describe('nphiesReconciliationService.processWebhook', () => {
  it('updates matching claim and sets status=PAID on APPROVED', async () => {
    const c = claim({ claimReference: 'REF-99' });
    const service = createService({ claimModel: createFakeClaimModel([c]), adapter: {} });
    const result = await service.processWebhook({
      claimReference: 'REF-99',
      status: 'APPROVED',
      approvedAmount: 1000,
      remainingBalance: 0,
    });
    expect(result.matched).toBe(true);
    expect(c.nphies.submission.status).toBe('APPROVED');
    expect(c.status).toBe('PAID');
    expect(c.save).toHaveBeenCalled();
  });

  it('returns matched=false on unknown claimReference without error', async () => {
    const service = createService({ claimModel: createFakeClaimModel([]), adapter: {} });
    const result = await service.processWebhook({
      claimReference: 'REF-UNKNOWN',
      status: 'APPROVED',
    });
    expect(result.matched).toBe(false);
  });

  it('throws INVALID_WEBHOOK_PAYLOAD when claimReference is missing', async () => {
    const service = createService({ claimModel: createFakeClaimModel([]), adapter: {} });
    await expect(service.processWebhook({ status: 'APPROVED' })).rejects.toMatchObject({
      code: 'INVALID_WEBHOOK_PAYLOAD',
    });
  });
});

describe('nphiesReconciliationService.sweep', () => {
  it('polls only claims past minAgeMs and applies adapter results', async () => {
    const oldEnough = claim({
      _id: 'old',
      claimReference: 'REF-OLD',
      updatedAtMs: Date.now() - 60 * 60 * 1000,
    });
    const tooFresh = claim({
      _id: 'fresh',
      claimReference: 'REF-FRESH',
      updatedAtMs: Date.now() - 60 * 1000,
    });
    const adapter = {
      pollClaim: jest.fn(async ({ claimReference }) => {
        if (claimReference === 'REF-OLD') {
          return { status: 'APPROVED', approvedAmount: 500, remainingBalance: 0 };
        }
        return null;
      }),
    };
    const service = createService({
      claimModel: createFakeClaimModel([oldEnough, tooFresh]),
      adapter,
    });
    const stats = await service.sweep({ minAgeMs: 10 * 60 * 1000, batchSize: 50 });
    expect(adapter.pollClaim).toHaveBeenCalledTimes(1);
    expect(adapter.pollClaim.mock.calls[0][0].claimReference).toBe('REF-OLD');
    expect(stats.changed).toBe(1);
    expect(oldEnough.status).toBe('PAID');
  });

  it('skips claims still PENDING_REVIEW on the adapter side', async () => {
    const c = claim({
      _id: 'still',
      claimReference: 'REF-STILL',
      updatedAtMs: Date.now() - 60 * 60 * 1000,
    });
    const adapter = { pollClaim: jest.fn().mockResolvedValue({ status: 'PENDING_REVIEW' }) };
    const service = createService({ claimModel: createFakeClaimModel([c]), adapter });
    const stats = await service.sweep({ minAgeMs: 10 * 60 * 1000 });
    expect(stats.changed).toBe(0);
    expect(stats.unchanged).toBeGreaterThan(0);
  });

  it('tallies errors without aborting the batch', async () => {
    const a = claim({
      _id: 'a',
      claimReference: 'REF-A',
      updatedAtMs: Date.now() - 60 * 60 * 1000,
    });
    const b = claim({
      _id: 'b',
      claimReference: 'REF-B',
      updatedAtMs: Date.now() - 60 * 60 * 1000,
    });
    const adapter = {
      pollClaim: jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ status: 'APPROVED', approvedAmount: 0 }),
    };
    const service = createService({ claimModel: createFakeClaimModel([a, b]), adapter });
    const stats = await service.sweep({ minAgeMs: 10 * 60 * 1000 });
    expect(stats.errors).toBe(1);
    expect(stats.changed).toBe(1);
  });
});
