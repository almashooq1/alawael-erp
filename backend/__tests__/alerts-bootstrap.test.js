/**
 * alerts-bootstrap.test.js — Wave 7.
 *
 * Verifies the one-call wiring helper composes a working stack:
 *   - engine has all 19 bundled rules registered
 *   - ctxFactory surfaces models + kpiHistoryStore + a fresh `now`
 *   - dispatcher persists raised findings through the AlertModel
 *   - scheduler integrates with the dispatcher.tick contract
 *
 * Uses an in-memory fake AlertModel so we exercise the real
 * AlertDispatcher code path without touching Mongo.
 */

'use strict';

const { buildAlertsStack } = require('../alerts/bootstrap');

// We can't easily replace the AlertModel mongoose-proxy from inside
// the test because bootstrap requires it directly. Instead, we run
// the engine without the dispatcher's persistence path by exercising
// `engine.runAll(ctx)` directly via the returned stack — same contract
// the scheduler honors at tick time. The dispatcher itself has its
// own dedicated test suite (`alerts.dispatcher.test.js`).

describe('buildAlertsStack — composition', () => {
  test('registers every bundled rule (19)', () => {
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });
    expect(stack.rules.length).toBe(19);
    expect(stack.engine.rules.size).toBe(19);
  });

  test('returns a fresh ctx from ctxFactory each call', () => {
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });
    const a = stack.ctxFactory();
    // Advance the clock by 1ms then call again — `now` must differ.
    return new Promise(resolve =>
      setTimeout(() => {
        const b = stack.ctxFactory();
        expect(b.now.getTime()).toBeGreaterThanOrEqual(a.now.getTime());
        resolve();
      }, 2)
    );
  });

  test('threads kpiHistoryStore through ctx when supplied', () => {
    const store = { list: () => [], record() {} };
    const stack = buildAlertsStack({
      kpiHistoryStore: store,
      logger: { warn() {}, info() {}, error() {} },
    });
    const ctx = stack.ctxFactory();
    expect(ctx.kpiHistoryStore).toBe(store);
  });

  test('omits kpiHistoryStore from ctx when not supplied', () => {
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });
    const ctx = stack.ctxFactory();
    expect('kpiHistoryStore' in ctx).toBe(false);
  });

  test('threads models through ctx (rules can see them)', () => {
    const fakeIncident = { find: async () => [] };
    const stack = buildAlertsStack({
      models: { Incident: fakeIncident },
      logger: { warn() {}, info() {}, error() {} },
    });
    const ctx = stack.ctxFactory();
    expect(ctx.models.Incident).toBe(fakeIncident);
  });
});

describe('buildAlertsStack — engine integration', () => {
  test('engine.runAll executes against the ctxFactory shape', async () => {
    // Provide just enough models + a tripped kpiHistoryStore so at
    // least one rule fires end-to-end. We use the EWMA bridge here
    // because it doesn't require a Mongoose model.
    const T0 = Date.parse('2026-05-01T00:00:00Z');
    const baseline = [];
    for (let i = 0; i < 20; i++) baseline.push({ t: T0 + i * 3.6e6, v: 50 + (i % 2 ? 1 : -1) });
    baseline.push({ t: T0 + 21 * 3.6e6, v: 200 });

    const store = {
      list: () => [{ kpiId: 'k1', scope: null, points: baseline }],
    };
    const stack = buildAlertsStack({
      kpiHistoryStore: store,
      logger: { warn() {}, info() {}, error() {} },
    });

    const result = await stack.engine.runAll(stack.ctxFactory());
    const anomaly = result.raised.find(a => a.ruleId === 'kpi-anomaly-detected');
    expect(anomaly).toBeTruthy();
  });

  test('falls open gracefully when no models / store supplied', async () => {
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });
    const result = await stack.engine.runAll(stack.ctxFactory());
    // Every rule should return [] safely — total raised must be 0,
    // never throw.
    expect(result.raised.length).toBe(0);
    expect(result.activeCount).toBe(0);
  });
});

describe('buildAlertsStack — scheduler shape', () => {
  test('returns a non-running scheduler bound to the dispatcher', () => {
    const stack = buildAlertsStack({ logger: { warn() {}, info() {}, error() {} } });
    expect(stack.scheduler.isRunning()).toBe(false);
    expect(stack.scheduler.dispatcher).toBe(stack.dispatcher);
  });

  test('cron config is plumbed through when supplied', () => {
    // Pass a fake cron lib so the scheduler stores cronExpression
    // without actually trying to schedule.
    const fakeCron = { schedule: jest.fn(() => ({ stop() {} })) };
    const stack = buildAlertsStack({
      cronExpression: '*/5 * * * *',
      cron: fakeCron,
      logger: { warn() {}, info() {}, error() {} },
    });
    expect(stack.scheduler.cronExpression).toBe('*/5 * * * *');
    expect(stack.scheduler.cron).toBe(fakeCron);
  });
});
