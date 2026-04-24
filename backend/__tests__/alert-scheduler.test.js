/**
 * alert-scheduler.test.js — Phase 18 Commit 8.2.
 *
 * Exercises the scheduler via `runOnce()` — no fake timers, no
 * setInterval. That keeps the tests fast + deterministic.
 */

'use strict';

const { buildAlertScheduler } = require('../services/dashboardAlertScheduler.service');

function fakeCoordinator(behaviour = {}) {
  const calls = [];
  return {
    calls,
    evaluateSnapshot: jest.fn(async ({ heroKpis, scope }) => {
      calls.push({ heroKpis, scope });
      if (behaviour.throw) throw new Error(behaviour.throw);
      const decisions = heroKpis.map(h => ({
        action: h.classification === 'red' ? 'fire' : 'noop',
        policyId: 'test.policy',
        kpiId: h.id,
      }));
      return decisions;
    }),
  };
}

function fakeKpiResolver(valuesByKpi) {
  return jest.fn(async kpi => ({
    value: valuesByKpi[kpi.id] ?? null,
    delta: 0,
    source: 'test',
  }));
}

// Lightweight fake dashboards — only `id` and `heroKpiIds` matter.
const FAKE_DASHBOARDS = [
  { id: 'fake.executive', heroKpiIds: ['finance.ar.dso.days', 'crm.nps.score'] },
  { id: 'fake.clinical', heroKpiIds: ['clinical.red_flags.active.count'] },
];

describe('buildAlertScheduler — factory validation', () => {
  it('throws when coordinator is missing', () => {
    expect(() => buildAlertScheduler({ kpiResolver: () => null })).toThrow(
      /coordinator\.evaluateSnapshot is required/
    );
  });

  it('throws when kpiResolver is missing', () => {
    expect(() => buildAlertScheduler({ coordinator: fakeCoordinator() })).toThrow(
      /kpiResolver is required/
    );
  });
});

describe('scheduler.runOnce — iteration + decision counting', () => {
  it('resolves every heroKpi and calls evaluateSnapshot once per dashboard', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({
      'finance.ar.dso.days': 95,
      'crm.nps.score': 30,
      'clinical.red_flags.active.count': 8,
    });
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: FAKE_DASHBOARDS,
    });
    const res = await sched.runOnce();
    expect(coord.evaluateSnapshot).toHaveBeenCalledTimes(2);
    // Total heroKpi snapshots across the 2 fake dashboards = 2 + 1.
    expect(resolver).toHaveBeenCalledTimes(3);
    expect(typeof res.durationMs).toBe('number');
    expect(res.errors).toEqual([]);
  });

  it('classifies values against KPI thresholds (red → fire)', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({
      'finance.ar.dso.days': 120, // lower_is_better, critical=90 → red
    });
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['finance.ar.dso.days'] }],
    });
    const res = await sched.runOnce();
    expect(res.fired).toBe(1);
    expect(coord.calls[0].heroKpis[0].classification).toBe('red');
  });

  it('classifies higher_is_better KPIs correctly', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({
      'crm.nps.score': 50, // higher_is_better, warning=30 → green
    });
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['crm.nps.score'] }],
    });
    await sched.runOnce();
    expect(coord.calls[0].heroKpis[0].classification).toBe('green');
  });

  it('marks classification=unknown when value is null', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({}); // returns null value
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['finance.ar.dso.days'] }],
    });
    await sched.runOnce();
    expect(coord.calls[0].heroKpis[0].classification).toBe('unknown');
  });

  it('records an error + keeps going when the resolver throws', async () => {
    const coord = fakeCoordinator();
    const resolver = jest.fn(() => Promise.reject(new Error('db down')));
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['finance.ar.dso.days'] }],
      logger: { warn: () => {} },
    });
    const res = await sched.runOnce();
    // heroKpi with classification='unknown' still reaches coordinator
    expect(coord.evaluateSnapshot).toHaveBeenCalled();
    expect(res.errors).toEqual([]); // the error was soft; no dashboard-level failure
  });

  it('captures a dashboard-level error when the coordinator throws', async () => {
    const coord = fakeCoordinator({ throw: 'coord exploded' });
    const resolver = fakeKpiResolver({ 'finance.ar.dso.days': 50 });
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['finance.ar.dso.days'] }],
      logger: { warn: () => {} },
    });
    const res = await sched.runOnce();
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].dashboardId).toBe('x');
  });

  it('skips dashboards with no heroKpiIds', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({});
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'empty', heroKpiIds: [] }],
    });
    await sched.runOnce();
    expect(coord.evaluateSnapshot).not.toHaveBeenCalled();
  });
});

describe('scheduler.status — observability', () => {
  it('counts ticks + fired + evaluated across runs', async () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({
      'finance.ar.dso.days': 120, // red → fire
    });
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      dashboards: [{ id: 'x', heroKpiIds: ['finance.ar.dso.days'] }],
    });
    await sched.runOnce();
    await sched.runOnce();
    const s = sched.status();
    expect(s.ticks).toBe(2);
    expect(s.totalEvaluated).toBe(2);
    expect(s.totalFired).toBe(2);
    expect(s.dashboardsWatched).toBe(1);
    expect(s.lastTickErrors).toEqual([]);
  });

  it('reports running=false until start is called', () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({});
    const sched = buildAlertScheduler({ coordinator: coord, kpiResolver: resolver });
    expect(sched.status().running).toBe(false);
  });
});

describe('scheduler.start / stop lifecycle', () => {
  it('start returns true the first time, false on repeat', () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({});
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      intervalMs: 3600_000,
      dashboards: [],
    });
    expect(sched.start()).toBe(true);
    expect(sched.start()).toBe(false);
    sched.stop();
  });

  it('stop returns true once + false when already stopped', () => {
    const coord = fakeCoordinator();
    const resolver = fakeKpiResolver({});
    const sched = buildAlertScheduler({
      coordinator: coord,
      kpiResolver: resolver,
      intervalMs: 3600_000,
      dashboards: [],
    });
    sched.start();
    expect(sched.stop()).toBe(true);
    expect(sched.stop()).toBe(false);
  });
});
