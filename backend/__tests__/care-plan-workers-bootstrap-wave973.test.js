'use strict';

/**
 * W973 drift guard — carePlanWorkersBootstrap.
 *
 * Schedules the dormant care-plan background workers (overdue-review scanner W50
 * + family-retry worker W45). Both expose runOnce() and explicitly leave
 * scheduling to the caller; nothing did, so they were dead (W225 pattern).
 *
 * Locks: env-gated default OFF; throws without logger/app; graceful skip when
 * the engine didn't mount (app._carePlanWorkers absent); schedules both workers
 * when enabled; each scheduled tick invokes the worker's runOnce; wired into
 * app.js; carePlanningBootstrap exposes the workers.
 *
 * node-cron is mocked so no real timers leak.
 */

jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ stop() {} })) }));
const cron = require('node-cron');

const fs = require('fs');
const path = require('path');
const { wireCarePlanWorkers } = require('../startup/carePlanWorkersBootstrap');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'carePlanWorkersBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const CPB_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'carePlanningBootstrap.js'),
  'utf8'
);

const silent = { info() {}, warn() {}, error() {} };

afterEach(() => {
  delete process.env.ENABLE_CARE_PLAN_WORKERS;
  cron.schedule.mockClear();
});

describe('W973 carePlanWorkersBootstrap — source shape', () => {
  it('env-gates on ENABLE_CARE_PLAN_WORKERS', () => {
    expect(SRC).toMatch(/process\.env\.ENABLE_CARE_PLAN_WORKERS\s*!==\s*'true'/);
  });
  it('invokes runOnce on both workers', () => {
    expect(SRC).toMatch(/workers\.overdueReview[\s\S]{0,80}\.runOnce\(/);
    expect(SRC).toMatch(/workers\.familyRetry[\s\S]{0,80}\.runOnce\(/);
  });
  it('loads node-cron via loadOptional', () => {
    expect(SRC).toMatch(/loadOptional\(\s*'node-cron'\s*\)/);
  });
  it('guards each tick (a worker throw never escapes)', () => {
    expect(SRC).toMatch(/catch \(err\)/);
  });
  it('exports wireCarePlanWorkers', () => {
    expect(SRC).toMatch(/module\.exports\s*=\s*\{\s*wireCarePlanWorkers\s*\}/);
  });
});

describe('W973 — wiring', () => {
  it('app.js wires wireCarePlanWorkers after carePlanning', () => {
    expect(APP_SRC).toMatch(
      /carePlanWorkersBootstrap'\)\.wireCarePlanWorkers\(app,\s*\{\s*logger\s*\}\)/
    );
    // ordering: carePlanning mount precedes the worker scheduler
    expect(APP_SRC.indexOf('wireCarePlanning(app')).toBeLessThan(
      APP_SRC.indexOf('wireCarePlanWorkers(app')
    );
  });
  it('carePlanningBootstrap exposes app._carePlanWorkers', () => {
    expect(CPB_SRC).toMatch(/app\._carePlanWorkers\s*=\s*careplan\.workers/);
  });
});

describe('W973 — behavior', () => {
  it('throws without logger', () => {
    expect(() => wireCarePlanWorkers({}, {})).toThrow(/app \+ logger required/);
  });

  it('is inert when the flag is unset (no cron scheduled)', () => {
    const res = wireCarePlanWorkers({ _carePlanWorkers: {} }, { logger: silent });
    expect(res).toEqual({ started: false });
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('skips gracefully when the engine did not mount (no app._carePlanWorkers)', () => {
    process.env.ENABLE_CARE_PLAN_WORKERS = 'true';
    const res = wireCarePlanWorkers({}, { logger: silent });
    expect(res).toEqual({ started: false });
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('schedules both workers when enabled, and each tick calls runOnce', async () => {
    process.env.ENABLE_CARE_PLAN_WORKERS = 'true';
    const overdueReview = { runOnce: jest.fn(async () => ({ scanned: 1, overdue: 0 })) };
    const familyRetry = { runOnce: jest.fn(async () => ({ retried: 0 })) };
    const app = { _carePlanWorkers: { overdueReview, familyRetry } };

    const res = wireCarePlanWorkers(app, { logger: silent });
    expect(res.started).toBe(true);
    expect(res.scheduled).toEqual(expect.arrayContaining(['overdueReview', 'familyRetry']));
    expect(cron.schedule).toHaveBeenCalledTimes(2);

    // Invoke each registered cron callback → proves the wiring calls runOnce.
    for (const call of cron.schedule.mock.calls) {
      const tick = call[1];
      await tick();
    }
    expect(overdueReview.runOnce).toHaveBeenCalledTimes(1);
    expect(familyRetry.runOnce).toHaveBeenCalledTimes(1);
  });

  it('a worker throw inside a tick is swallowed (never rejects)', async () => {
    process.env.ENABLE_CARE_PLAN_WORKERS = 'true';
    const overdueReview = {
      runOnce: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    const app = { _carePlanWorkers: { overdueReview } };
    wireCarePlanWorkers(app, { logger: silent });
    const tick = cron.schedule.mock.calls[0][1];
    await expect(tick()).resolves.toBeUndefined();
  });
});
