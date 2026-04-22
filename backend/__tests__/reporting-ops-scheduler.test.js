/**
 * reporting-ops-scheduler.test.js — Phase 10 Commit 6.
 */

'use strict';

const { ReportsOpsScheduler, DEFAULT_CRON } = require('../scheduler/reports-ops.scheduler');

function makeModel() {
  return {
    model: {
      find() {
        const chain = {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          then(res) {
            return Promise.resolve([]).then(res);
          },
        };
        return chain;
      },
    },
  };
}

function makeCatalog() {
  return {
    REPORTS: [],
    enabled: () => [],
    byId: () => null,
  };
}

describe('ReportsOpsScheduler — constructor guards', () => {
  test('requires DeliveryModel / catalog / engine', () => {
    expect(() => new ReportsOpsScheduler({})).toThrow(/DeliveryModel required/);
    expect(() => new ReportsOpsScheduler({ DeliveryModel: makeModel() })).toThrow(
      /catalog required/
    );
    expect(
      () =>
        new ReportsOpsScheduler({
          DeliveryModel: makeModel(),
          catalog: makeCatalog(),
        })
    ).toThrow(/engine required/);
  });
});

describe('ReportsOpsScheduler — per-sweep methods', () => {
  test('runRetry returns sweep summary', async () => {
    const engine = { runInstance: jest.fn() };
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    const out = await s.runRetry();
    expect(out).toMatchObject({ scanned: 0, retried: 0, errors: [] });
  });

  test('runEscalation returns sweep summary', async () => {
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    const out = await s.runEscalation();
    expect(out).toMatchObject({ scanned: 0, escalated: 0, errors: [] });
  });

  test('runRetention returns sweep summary with dryRun echo', async () => {
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    const out = await s.runRetention({ dryRun: true });
    expect(out).toMatchObject({ scanned: 0, purged: 0 });
  });

  test('re-entrance guard: second call returns skipped while first pending', async () => {
    // Hold the first sweep by blocking the DeliveryModel.find() on a
    // gate we release only after the second (guarded) call returns.
    let releaseGate;
    const gate = new Promise(r => {
      releaseGate = r;
    });
    const Model = {
      model: {
        find() {
          const chain = {
            sort() {
              return chain;
            },
            limit() {
              return chain;
            },
            then(res, rej) {
              return gate.then(() => []).then(res, rej);
            },
          };
          return chain;
        },
      },
    };
    const s = new ReportsOpsScheduler({
      DeliveryModel: Model,
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    const first = s.runRetry();
    const second = await s.runRetry();
    expect(second).toEqual({ skipped: true, reason: 'already running' });
    releaseGate();
    await first;
  });
});

describe('ReportsOpsScheduler — start / stop', () => {
  test('useInterval mode registers 3 jobs and cleans up on stop', () => {
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      useInterval: true,
      intervalsMs: { retry: 60_000, escalation: 60_000, retention: 60_000 },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    s.start();
    expect(s.isRunning()).toBe(true);
    expect(s._jobs.size).toBe(3);
    s.stop();
    expect(s.isRunning()).toBe(false);
  });

  test('cron mode calls cron.schedule per sweep', () => {
    const cron = {
      validate: jest.fn(() => true),
      schedule: jest.fn(() => ({ stop: jest.fn() })),
    };
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      cron,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    s.start();
    expect(cron.schedule).toHaveBeenCalledTimes(3);
    const exprs = cron.schedule.mock.calls.map(c => c[0]);
    expect(exprs).toEqual([DEFAULT_CRON.retry, DEFAULT_CRON.escalation, DEFAULT_CRON.retention]);
    s.stop();
  });

  test('skips invalid cron expressions with a logged error', () => {
    const cron = {
      validate: jest.fn(() => false),
      schedule: jest.fn(),
    };
    const err = jest.fn();
    const s = new ReportsOpsScheduler({
      DeliveryModel: makeModel(),
      catalog: makeCatalog(),
      engine: { runInstance: jest.fn() },
      cron,
      logger: { info: () => {}, warn: () => {}, error: err },
    });
    s.start();
    expect(cron.schedule).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    s.stop();
  });
});
