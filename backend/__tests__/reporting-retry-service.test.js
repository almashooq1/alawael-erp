/**
 * reporting-retry-service.test.js — Phase 10 Commit 6.
 *
 * Covers exponential-backoff computation + retry sweep orchestration.
 * The fake DeliveryModel mirrors the mongoose query chain we use:
 * find().sort().limit() → thenable.
 */

'use strict';

const {
  BACKOFF_MINUTES,
  DEFAULT_MAX_ATTEMPTS,
  nextAttemptDueAt,
  isDueNow,
  findRetryable,
  retryOne,
  runRetrySweep,
} = require('../services/reporting/retryService');

function makeDelivery(overrides = {}) {
  const base = {
    _id: 'd1',
    reportId: 'ben.progress.weekly',
    periodKey: '2026-W17',
    scopeKey: 'beneficiary:b1',
    status: 'FAILED',
    attempts: 1,
    failedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
    ...overrides,
  };
  return {
    ...base,
    markRetrying: jest.fn(function () {
      if (this.status !== 'FAILED') throw new Error(`cannot retry from ${this.status}`);
      this.status = 'RETRYING';
    }),
    save: jest.fn(async function () {
      return this;
    }),
  };
}

function makeModel(rows) {
  return {
    model: {
      find(filter) {
        let out = rows.slice();
        if (filter.status === 'FAILED') out = out.filter(r => r.status === 'FAILED');
        if (filter.attempts && filter.attempts.$lt != null) {
          out = out.filter(r => r.attempts < filter.attempts.$lt);
        }
        const chain = {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          then(resolve, reject) {
            return Promise.resolve(out).then(resolve, reject);
          },
        };
        return chain;
      },
    },
  };
}

// ─── Backoff math ────────────────────────────────────────────────

describe('nextAttemptDueAt / isDueNow', () => {
  // Semantics: attempts=N means "N attempts have failed"; the next
  // retry waits BACKOFF_MINUTES[N-1]. So attempts=1 → 30s, attempts=2 →
  // 5min, attempts=3 → 30min, attempts=4 → escalate (no more retries).

  test('after 1 failed attempt, next try is 30 seconds after failedAt', () => {
    const failedAt = new Date('2026-04-22T00:00:00Z');
    const d = makeDelivery({ attempts: 1, failedAt });
    const due = nextAttemptDueAt(d);
    expect(due.getTime()).toBe(failedAt.getTime() + BACKOFF_MINUTES[0] * 60_000);
  });

  test('after 3 attempts, backoff is 30 minutes (BACKOFF_MINUTES[2])', () => {
    const failedAt = new Date('2026-04-22T00:00:00Z');
    const d = makeDelivery({ attempts: 3, failedAt });
    const due = nextAttemptDueAt(d);
    expect(due.getTime()).toBe(failedAt.getTime() + BACKOFF_MINUTES[2] * 60_000);
  });

  test('returns null once retries are exhausted', () => {
    expect(nextAttemptDueAt(makeDelivery({ attempts: DEFAULT_MAX_ATTEMPTS }))).toBeNull();
  });

  test('isDueNow true when now >= next attempt', () => {
    const failedAt = new Date(Date.now() - 10 * 60_000); // 10 min ago
    expect(isDueNow(makeDelivery({ attempts: 1, failedAt }))).toBe(true);
  });

  test('isDueNow false when still inside the backoff window', () => {
    // attempts=2 needs 5 minutes; 30 seconds ago is too early.
    const failedAt = new Date(Date.now() - 30 * 1000);
    expect(isDueNow(makeDelivery({ attempts: 2, failedAt }))).toBe(false);
  });

  test('BACKOFF_MINUTES is the documented schedule', () => {
    expect(BACKOFF_MINUTES).toEqual([0.5, 5, 30, 120]);
  });
});

// ─── findRetryable ───────────────────────────────────────────────

describe('findRetryable', () => {
  test('returns only FAILED rows whose backoff has elapsed', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const rows = [
      // attempts=2 needs 5min; 10min elapsed → due.
      makeDelivery({ _id: 'old', attempts: 2, failedAt: new Date(now.getTime() - 10 * 60_000) }),
      // attempts=2 needs 5min; 10s elapsed → too early.
      makeDelivery({ _id: 'fresh', attempts: 2, failedAt: new Date(now.getTime() - 10_000) }),
      // attempts >= maxAttempts → filtered by the $lt query guard.
      makeDelivery({ _id: 'exhausted', attempts: 4, status: 'FAILED' }),
      // status SENT → filtered out upstream.
      { _id: 'sent', status: 'SENT', attempts: 1 },
    ];
    const Model = makeModel(rows);
    const out = await findRetryable(Model, { now });
    expect(out.map(r => r._id)).toEqual(['old']);
  });
});

// ─── retryOne ────────────────────────────────────────────────────

describe('retryOne', () => {
  test('marks RETRYING, saves, then calls engine.runInstance with the row keys', async () => {
    const d = makeDelivery({ attempts: 1 });
    const engine = {
      runInstance: jest.fn(async () => ({
        status: 'dispatched',
        instanceKey: 'ben.progress.weekly:2026-W17:beneficiary:b1',
        errors: [],
      })),
    };
    const res = await retryOne(d, { engine });
    expect(d.markRetrying).toHaveBeenCalled();
    expect(d.save).toHaveBeenCalled();
    expect(engine.runInstance).toHaveBeenCalledWith({
      reportId: d.reportId,
      periodKey: d.periodKey,
      scopeKey: d.scopeKey,
    });
    expect(res.status).toBe('dispatched');
  });

  test('swallows engine crash and returns engine_crash status', async () => {
    const d = makeDelivery({ attempts: 1 });
    const engine = {
      runInstance: async () => {
        throw new Error('boom');
      },
    };
    const res = await retryOne(d, { engine });
    expect(res.status).toBe('engine_crash');
    expect(res.errors).toContain('boom');
  });

  test('rejects when deps missing', async () => {
    const res = await retryOne(null, { engine: {} });
    expect(res.status).toBe('invalid');
  });
});

// ─── runRetrySweep ───────────────────────────────────────────────

describe('runRetrySweep', () => {
  test('retries every due row and emits retry events', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const rows = [
      makeDelivery({ _id: 'a', attempts: 1, failedAt: new Date(now.getTime() - 10 * 60_000) }),
      makeDelivery({ _id: 'b', attempts: 2, failedAt: new Date(now.getTime() - 60 * 60_000) }),
    ];
    const Model = makeModel(rows);
    const engine = {
      runInstance: jest.fn(async () => ({ status: 'dispatched', errors: [] })),
    };
    const events = [];
    const eventBus = { emit: (n, p) => events.push({ n, p }) };
    const summary = await runRetrySweep({
      DeliveryModel: Model,
      engine,
      eventBus,
      now,
    });
    expect(summary.scanned).toBe(2);
    expect(summary.retried).toBe(2);
    expect(events.filter(e => e.n === 'report.delivery.retried')).toHaveLength(2);
  });

  test('engine errors count toward summary.errors', async () => {
    const now = new Date();
    const rows = [
      makeDelivery({ _id: 'a', attempts: 1, failedAt: new Date(now.getTime() - 10 * 60_000) }),
    ];
    const engine = {
      runInstance: async () => ({ status: 'not_found', errors: ['missing report'] }),
    };
    const summary = await runRetrySweep({ DeliveryModel: makeModel(rows), engine, now });
    expect(summary.retried).toBe(0);
    expect(summary.errors.length).toBeGreaterThan(0);
  });

  test('throws on missing deps', async () => {
    await expect(runRetrySweep({})).rejects.toThrow(/DeliveryModel \+ engine required/);
  });
});
