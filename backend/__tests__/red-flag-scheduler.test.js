/**
 * red-flag-scheduler.test.js — Beneficiary-360 Commit 7.
 *
 * `runOnce` is the unit under test — cron firing is a thin wrapper
 * over it, and we don't need to re-test node-cron. The fake engine
 * + store are built from the real contracts used elsewhere so the
 * scheduler exercises the same aggregation logic production will.
 */

'use strict';

const { createScheduledEvaluator } = require('../services/redFlagScheduler');

// ─── Fakes ──────────────────────────────────────────────────────

function makeFakeEngine({ verdictsByBId = {}, throwFor = [] } = {}) {
  return {
    async evaluateBeneficiary(beneficiaryId, { now } = {}) {
      if (throwFor.includes(beneficiaryId)) {
        throw new Error(`engine boom for ${beneficiaryId}`);
      }
      const verdicts = verdictsByBId[beneficiaryId] || [];
      return {
        beneficiaryId,
        evaluatedAt: (now instanceof Date ? now : new Date()).toISOString(),
        flagsEvaluated: verdicts.length,
        verdicts,
      };
    },
  };
}

function makeFakeStore({ transitionsByBId = {}, throwFor = [] } = {}) {
  const defaultTrans = {
    newlyRaised: [],
    stillRaised: [],
    newlyResolved: [],
    stillClear: [],
    suppressedByCooldown: [],
    errored: [],
  };
  return {
    async applyVerdicts(beneficiaryId, verdicts) {
      if (throwFor.includes(beneficiaryId)) {
        throw new Error(`store boom for ${beneficiaryId}`);
      }
      return { ...defaultTrans, ...(transitionsByBId[beneficiaryId] || {}) };
    },
  };
}

// ─── Construction ───────────────────────────────────────────────

describe('createScheduledEvaluator — construction', () => {
  it('throws when engine is missing', () => {
    expect(() =>
      createScheduledEvaluator({
        store: makeFakeStore(),
        getBeneficiaryIds: () => [],
      })
    ).toThrow(/engine/);
  });

  it('throws when store is missing', () => {
    expect(() =>
      createScheduledEvaluator({
        engine: makeFakeEngine(),
        getBeneficiaryIds: () => [],
      })
    ).toThrow(/store/);
  });

  it('throws when getBeneficiaryIds is missing', () => {
    expect(() =>
      createScheduledEvaluator({
        engine: makeFakeEngine(),
        store: makeFakeStore(),
      })
    ).toThrow(/getBeneficiaryIds/);
  });

  it('returns a frozen handle', () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => [],
    });
    expect(Object.isFrozen(s)).toBe(true);
  });
});

// ─── runOnce ────────────────────────────────────────────────────

describe('runOnce — sweep semantics', () => {
  it('evaluates every beneficiary and aggregates totals', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore({
        transitionsByBId: {
          'BEN-1': {
            newlyRaised: [{ flagId: 'a' }, { flagId: 'b' }],
            newlyResolved: [],
            errored: [],
          },
          'BEN-2': {
            newlyRaised: [{ flagId: 'a' }],
            newlyResolved: [{ flagId: 'b' }],
            errored: [],
          },
          'BEN-3': {
            newlyRaised: [],
            newlyResolved: [],
            errored: [],
          },
        },
      }),
      getBeneficiaryIds: async () => ['BEN-1', 'BEN-2', 'BEN-3'],
    });

    const summary = await s.runOnce();
    expect(summary.totalBeneficiaries).toBe(3);
    expect(summary.succeeded).toBe(3);
    expect(summary.errored).toBe(0);
    expect(summary.totals.newlyRaised).toBe(3);
    expect(summary.totals.newlyResolved).toBe(1);
    expect(summary.perBeneficiary).toHaveLength(3);
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('isolates per-beneficiary engine errors — sweep continues', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine({ throwFor: ['BEN-2'] }),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => ['BEN-1', 'BEN-2', 'BEN-3'],
    });
    const summary = await s.runOnce();
    expect(summary.succeeded).toBe(2);
    expect(summary.errored).toBe(1);
    const bad = summary.perBeneficiary.find(p => p.beneficiaryId === 'BEN-2');
    expect(bad.error).toMatch(/engine boom/);
  });

  it('isolates per-beneficiary store errors', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore({ throwFor: ['BEN-1'] }),
      getBeneficiaryIds: async () => ['BEN-1', 'BEN-2'],
    });
    const summary = await s.runOnce();
    expect(summary.succeeded).toBe(1);
    expect(summary.errored).toBe(1);
  });

  it('handles fatal getBeneficiaryIds failure without throwing', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => {
        throw new Error('DB down');
      },
    });
    const summary = await s.runOnce();
    expect(summary.totalBeneficiaries).toBe(0);
    expect(summary.errored).toBe(1);
    expect(summary.fatalError).toMatch(/DB down/);
  });

  it('throws when getBeneficiaryIds returns a non-array', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => 'not-an-array',
    });
    await expect(s.runOnce()).rejects.toThrow(/array/);
  });

  it('records the last run summary', async () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => ['BEN-1'],
    });
    expect(s.getLastRunSummary()).toBeNull();
    await s.runOnce();
    const last = s.getLastRunSummary();
    expect(last.totalBeneficiaries).toBe(1);
  });

  it('propagates injected clock to engine + store', async () => {
    const seenNow = [];
    const engine = {
      async evaluateBeneficiary(_bId, { now }) {
        seenNow.push({ place: 'engine', now });
        return { flagsEvaluated: 0, verdicts: [] };
      },
    };
    const store = {
      async applyVerdicts(_bId, _v, { now }) {
        seenNow.push({ place: 'store', now });
        return {
          newlyRaised: [],
          stillRaised: [],
          newlyResolved: [],
          stillClear: [],
          suppressedByCooldown: [],
          errored: [],
        };
      },
    };
    const s = createScheduledEvaluator({
      engine,
      store,
      getBeneficiaryIds: async () => ['BEN-1'],
    });
    const fixed = new Date('2026-04-22T10:00:00.000Z');
    await s.runOnce({ now: fixed });
    expect(seenNow).toHaveLength(2);
    expect(seenNow[0].now).toBe(fixed);
    expect(seenNow[1].now).toBe(fixed);
  });
});

// ─── start / stop ───────────────────────────────────────────────

describe('start / stop — cron wiring', () => {
  it('throws when start() is called without a cron dep', () => {
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => [],
    });
    expect(() => s.start()).toThrow(/cron/);
  });

  it('schedules with the provided cron dep + expression', () => {
    const scheduled = [];
    const cron = {
      schedule(expression, cb) {
        scheduled.push({ expression, cb });
        return { stop: () => {} };
      },
    };
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => [],
      cron,
    });
    s.start({ expression: '*/10 * * * *' });
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].expression).toBe('*/10 * * * *');
  });

  it('ignores a second start() call while already running', () => {
    const scheduled = [];
    const cron = {
      schedule: (expression, cb) => {
        scheduled.push({ expression, cb });
        return { stop: () => {} };
      },
    };
    const warns = [];
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => [],
      cron,
      logger: { info: () => {}, warn: m => warns.push(m), error: () => {} },
    });
    s.start();
    s.start();
    expect(scheduled).toHaveLength(1);
    expect(warns.some(w => /already running/.test(w))).toBe(true);
  });

  it('stop() releases the scheduled task', () => {
    let stopped = false;
    const cron = {
      schedule: () => ({
        stop: () => {
          stopped = true;
        },
      }),
    };
    const s = createScheduledEvaluator({
      engine: makeFakeEngine(),
      store: makeFakeStore(),
      getBeneficiaryIds: async () => [],
      cron,
    });
    s.start();
    s.stop();
    expect(stopped).toBe(true);
  });
});
