/**
 * reports-scheduler.test.js — Phase 10 Commit 1.
 *
 * Tests the ReportsScheduler by driving `runPeriodicity` directly; cron
 * firing is a thin wrapper and there's no value in re-testing node-cron.
 */

'use strict';

const {
  ReportsScheduler,
  defaultPeriodKey,
  DEFAULT_SCOPE_PROVIDER,
} = require('../scheduler/reports.scheduler');

function makeFakeCatalog(entries, cronMap = {}) {
  return {
    REPORTS: entries,
    PERIODICITIES: ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'on_demand'],
    PERIODICITY_CRON: { on_demand: null, ...cronMap },
    byPeriodicity: p => entries.filter(r => r.periodicity === p && r.enabled),
  };
}

function makeFakeEngine({ throwForReportId } = {}) {
  const calls = [];
  return {
    calls,
    runInstance: jest.fn(async input => {
      calls.push(input);
      if (throwForReportId && input.reportId === throwForReportId) {
        throw new Error('engine boom');
      }
      return { status: 'dispatched', instanceKey: `${input.reportId}:${input.periodKey}` };
    }),
  };
}

describe('defaultPeriodKey', () => {
  test('daily yields YYYY-MM-DD', () => {
    expect(defaultPeriodKey('daily', new Date(Date.UTC(2026, 3, 22)))).toBe('2026-04-22');
  });
  test('weekly yields YYYY-Www', () => {
    const k = defaultPeriodKey('weekly', new Date(Date.UTC(2026, 3, 22)));
    expect(k).toMatch(/^2026-W\d{2}$/);
  });
  test('monthly yields YYYY-MM', () => {
    expect(defaultPeriodKey('monthly', new Date(Date.UTC(2026, 3, 22)))).toBe('2026-04');
  });
  test('quarterly yields YYYY-Q<n>', () => {
    expect(defaultPeriodKey('quarterly', new Date(Date.UTC(2026, 3, 22)))).toBe('2026-Q2');
    expect(defaultPeriodKey('quarterly', new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');
  });
  test('semiannual yields YYYY-H<1|2>', () => {
    expect(defaultPeriodKey('semiannual', new Date(Date.UTC(2026, 2, 1)))).toBe('2026-H1');
    expect(defaultPeriodKey('semiannual', new Date(Date.UTC(2026, 7, 1)))).toBe('2026-H2');
  });
  test('annual yields YYYY', () => {
    expect(defaultPeriodKey('annual', new Date(Date.UTC(2026, 0, 1)))).toBe('2026');
  });
});

describe('ReportsScheduler — runPeriodicity', () => {
  const entries = [
    {
      id: 'a.daily',
      periodicity: 'daily',
      audiences: ['branch_manager'],
      channels: ['email'],
      enabled: true,
    },
    {
      id: 'b.daily',
      periodicity: 'daily',
      audiences: ['branch_manager'],
      channels: ['in_app'],
      enabled: true,
    },
    {
      id: 'c.weekly',
      periodicity: 'weekly',
      audiences: ['guardian'],
      channels: ['whatsapp'],
      enabled: true,
    },
  ];

  test('runs engine once per report × scope and returns a summary', async () => {
    const catalog = makeFakeCatalog(entries);
    const engine = makeFakeEngine();
    const scopeProvider = {
      async scopesFor(report) {
        // fan out a.daily to two branches; others tenant-wide
        if (report.id === 'a.daily') return ['branch:1', 'branch:2'];
        return [undefined];
      },
      periodKey: () => '2026-04-22',
    };
    const scheduler = new ReportsScheduler({ catalog, engine, scopeProvider });

    const summary = await scheduler.runPeriodicity('daily');

    expect(summary.runs.length).toBe(3); // 2 + 1
    expect(summary.errors).toEqual([]);
    expect(engine.runInstance).toHaveBeenCalledTimes(3);
    expect(engine.calls.map(c => c.reportId).sort()).toEqual(['a.daily', 'a.daily', 'b.daily']);
    expect(engine.calls.every(c => c.periodKey === '2026-04-22')).toBe(true);
  });

  test('engine throws are captured per-report, not fatal', async () => {
    const catalog = makeFakeCatalog(entries);
    const engine = makeFakeEngine({ throwForReportId: 'a.daily' });
    const scheduler = new ReportsScheduler({ catalog, engine });
    const summary = await scheduler.runPeriodicity('daily');
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.runs.length).toBe(1); // b.daily still ran
  });

  test('filters enabled reports only', async () => {
    const e = entries.concat([
      {
        id: 'd.daily',
        periodicity: 'daily',
        audiences: ['guardian'],
        channels: ['email'],
        enabled: false,
      },
    ]);
    const catalog = makeFakeCatalog(e);
    const engine = makeFakeEngine();
    const scheduler = new ReportsScheduler({ catalog, engine });
    const summary = await scheduler.runPeriodicity('daily');
    const ids = summary.runs.map(r => r.reportId);
    expect(ids).not.toContain('d.daily');
  });

  test('re-entrance guard prevents overlapping ticks', async () => {
    const catalog = makeFakeCatalog(entries);
    // Hold the first tick by blocking the scopeProvider on a gate we
    // release only after the second (guarded) tick has returned.
    let releaseGate;
    const gate = new Promise(res => {
      releaseGate = res;
    });
    const scopeProvider = {
      async scopesFor() {
        await gate;
        return [undefined];
      },
      periodKey: () => '2026-04-22',
    };
    const engine = {
      runInstance: jest.fn(async () => ({ status: 'dispatched' })),
    };
    const scheduler = new ReportsScheduler({ catalog, engine, scopeProvider });
    const firstTick = scheduler.runPeriodicity('daily');
    const secondTick = await scheduler.runPeriodicity('daily');
    expect(secondTick).toEqual({ skipped: true, reason: 'already running' });
    releaseGate();
    await firstTick;
    // Engine was only called by the first (non-skipped) tick.
    expect(engine.runInstance).toHaveBeenCalled();
  });

  test('start/stop with useInterval registers and cleans up timers', () => {
    const catalog = makeFakeCatalog(entries, {
      daily: '0 7 * * *',
      weekly: '0 8 * * MON',
    });
    const engine = makeFakeEngine();
    const scheduler = new ReportsScheduler({
      catalog,
      engine,
      useInterval: true,
      intervalMs: 60_000,
    });
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    // daily + weekly were registered (quarterly/semiannual/annual omitted
    // from cronMap → skipped).
    expect(scheduler._jobs.size).toBe(2);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });
});

describe('DEFAULT_SCOPE_PROVIDER', () => {
  test('returns a tenant-wide scope (undefined) by default', async () => {
    const s = await DEFAULT_SCOPE_PROVIDER.scopesFor({ id: 'x' }, '2026-04');
    expect(s).toEqual([undefined]);
  });
});
