/**
 * reporting-rate-limiter.test.js — Phase 10 Commit 6.
 */

'use strict';

const {
  DEFAULT_LIMITS,
  limitFor,
  countRecentDeliveries,
  createRateLimiter,
} = require('../services/reporting/rateLimiter');

function makeModel({ counts = {}, rows = [] } = {}) {
  return {
    model: {
      async countDocuments(filter) {
        const k = String(filter.recipientId);
        if (counts[k] != null) return counts[k];
        // Fallback: count from rows matching recipient + createdAt window.
        return rows.filter(
          r =>
            String(r.recipientId) === k &&
            (!filter.createdAt?.$gte || new Date(r.createdAt) >= new Date(filter.createdAt.$gte))
        ).length;
      },
    },
  };
}

describe('limitFor', () => {
  test('known roles return DEFAULT_LIMITS entries', () => {
    expect(limitFor('guardian')).toBe(DEFAULT_LIMITS.guardian);
    expect(limitFor('executive')).toBe(DEFAULT_LIMITS.executive);
  });

  test('unknown role defaults to 20', () => {
    expect(limitFor('martian')).toBe(20);
  });

  test('overrides win', () => {
    expect(limitFor('guardian', { guardian: 5 })).toBe(5);
  });
});

describe('countRecentDeliveries', () => {
  test('uses countDocuments when available', async () => {
    const Model = makeModel({ counts: { u1: 7 } });
    const n = await countRecentDeliveries(Model, 'u1');
    expect(n).toBe(7);
  });

  test('defaults the window to now-24h', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const Model = {
      model: {
        countDocuments: jest.fn(async filter => {
          expect(filter.createdAt.$gte).toBeInstanceOf(Date);
          const sinceMs = new Date(filter.createdAt.$gte).getTime();
          expect(now.getTime() - sinceMs).toBe(24 * 3600 * 1000);
          return 3;
        }),
      },
    };
    await countRecentDeliveries(Model, 'u1', { now });
    expect(Model.model.countDocuments).toHaveBeenCalled();
  });
});

describe('createRateLimiter', () => {
  test('allows while current < limit; blocks + emits event at limit', async () => {
    const events = [];
    const Model = makeModel({ counts: { g1: 19, g2: 20 } });
    const limiter = createRateLimiter({
      DeliveryModel: Model,
      eventBus: { emit: (n, p) => events.push({ n, p }) },
    });
    const a = await limiter.check({ recipientId: 'g1', role: 'guardian' });
    expect(a.allowed).toBe(true);
    expect(a.limit).toBe(DEFAULT_LIMITS.guardian);

    const b = await limiter.check({ recipientId: 'g2', role: 'guardian' });
    expect(b.allowed).toBe(false);
    expect(events.find(e => e.n === 'report.delivery.rate_limited')).toBeTruthy();
  });

  test('missing recipientId is allowed with infinite limit', async () => {
    const limiter = createRateLimiter({ DeliveryModel: makeModel() });
    const out = await limiter.check({ role: 'guardian' });
    expect(out.allowed).toBe(true);
    expect(out.limit).toBe(Infinity);
  });

  test('executive role uses the higher cap', async () => {
    const Model = makeModel({ counts: { ceo: 50 } });
    const limiter = createRateLimiter({ DeliveryModel: Model });
    const out = await limiter.check({ recipientId: 'ceo', role: 'executive' });
    expect(out.allowed).toBe(true);
    expect(out.limit).toBe(DEFAULT_LIMITS.executive);
  });

  test('per-call overrides win', async () => {
    const Model = makeModel({ counts: { g1: 4 } });
    const limiter = createRateLimiter({
      DeliveryModel: Model,
      overrides: { guardian: 3 },
    });
    const out = await limiter.check({ recipientId: 'g1', role: 'guardian' });
    expect(out.allowed).toBe(false);
    expect(out.limit).toBe(3);
  });
});
