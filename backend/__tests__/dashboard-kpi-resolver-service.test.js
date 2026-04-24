/**
 * dashboard-kpi-resolver-service.test.js — Phase 18 Commit 2.
 *
 * Verifies the production-side dashboard KPI resolver:
 *   - dispatches to direct computers when registered
 *   - falls back to Phase-10 reporting builders otherwise
 *   - computes delta vs prior period
 *   - builds a sparkline of N prior-period points
 *   - caches with TTL + serves cache hits
 *   - fails soft on every error path
 */

'use strict';

const {
  buildDashboardKpiResolver,
  _internals,
} = require('../services/dashboardKpiResolver.service');

const { byId: kpiById } = require('../config/kpi.registry');

// A minimal fake Phase-10 builder module — the KPI registry points
// at `financeReportBuilder.buildArAging` with path `dsoDays`.
function makeFakeFinanceBuilder(valuesByPeriod) {
  return {
    async buildArAging({ periodKey }) {
      if (!(periodKey in valuesByPeriod)) return null;
      return { dsoDays: valuesByPeriod[periodKey] };
    },
  };
}

describe('dashboardKpiResolver — reporting dispatch', () => {
  it('resolves a KPI through the Phase-10 reporting resolver', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    expect(kpi).toBeTruthy();

    const resolver = buildDashboardKpiResolver({
      modules: {
        financeReportBuilder: makeFakeFinanceBuilder({
          '2026-04-24': 70,
          '2026-04-23': 65,
          '2026-04-22': 68,
          '2026-04-21': 60,
        }),
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 3,
    });

    const out = await resolver(kpi, {});
    expect(out.value).toBe(70);
    expect(out.source).toBe('reporting');
    expect(typeof out.asOf).toBe('string');
    expect(out.periodKey).toBe('2026-04-24');
  });

  it('computes delta vs prior period when both values are numeric', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const resolver = buildDashboardKpiResolver({
      modules: {
        financeReportBuilder: makeFakeFinanceBuilder({
          '2026-04-24': 80,
          '2026-04-23': 50,
        }),
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const out = await resolver(kpi, {});
    expect(out.value).toBe(80);
    expect(out.priorValue).toBe(50);
    expect(out.delta).toBeCloseTo(0.6, 5);
  });

  it('leaves delta null when prior period has no data', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const resolver = buildDashboardKpiResolver({
      modules: {
        financeReportBuilder: makeFakeFinanceBuilder({ '2026-04-24': 75 }),
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const out = await resolver(kpi, {});
    expect(out.value).toBe(75);
    expect(out.delta).toBeNull();
  });

  it('builds a sparkline of requested length from prior periods', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const resolver = buildDashboardKpiResolver({
      modules: {
        financeReportBuilder: makeFakeFinanceBuilder({
          '2026-04-24': 50,
          '2026-04-23': 52,
          '2026-04-22': 54,
          '2026-04-21': 56,
          '2026-04-20': 58,
        }),
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 3,
    });
    const out = await resolver(kpi, {});
    expect(out.sparkline.length).toBe(3);
    // oldest → newest ordering
    expect(out.sparkline[0].t < out.sparkline[2].t).toBe(true);
    for (const pt of out.sparkline) expect(typeof pt.v).toBe('number');
  });

  it('returns empty source + null value when the builder module is missing', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const resolver = buildDashboardKpiResolver({
      modules: {}, // no financeReportBuilder
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const out = await resolver(kpi, {});
    expect(out.value).toBeNull();
    expect(out.source).toBe('reporting:empty');
  });
});

describe('dashboardKpiResolver — direct computers', () => {
  it('calls the computer override instead of the reporting pipeline', async () => {
    const kpi = kpiById('clinical.red_flags.active.count');
    expect(kpi).toBeTruthy();

    const resolver = buildDashboardKpiResolver({
      computers: {
        [kpi.id]: async () => 17,
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const out = await resolver(kpi, {});
    expect(out.value).toBe(17);
    expect(out.source).toBe('computer');
    // computer path intentionally skips delta
    expect(out.delta).toBeNull();
  });

  it('fails soft when a computer throws', async () => {
    const kpi = kpiById('clinical.red_flags.active.count');
    const resolver = buildDashboardKpiResolver({
      computers: {
        [kpi.id]: async () => {
          throw new Error('kaboom');
        },
      },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
      logger: { warn: () => {} },
    });
    const out = await resolver(kpi, {});
    expect(out.value).toBeNull();
    expect(out.source).toBe('computer:error');
  });
});

describe('dashboardKpiResolver — cache', () => {
  it('serves cached hits without re-invoking the builder', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const spy = jest.fn(({ periodKey }) =>
      Promise.resolve({ dsoDays: periodKey === '2026-04-24' ? 70 : 60 })
    );
    const resolver = buildDashboardKpiResolver({
      modules: { financeReportBuilder: { buildArAging: spy } },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const first = await resolver(kpi, {});
    const callsAfterFirst = spy.mock.calls.length;
    const second = await resolver(kpi, {});
    expect(second).toEqual(first);
    expect(spy.mock.calls.length).toBe(callsAfterFirst); // zero extra calls
  });

  it('uses distinct cache keys for distinct filter hashes', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const spy = jest.fn(({ periodKey }) =>
      Promise.resolve({ dsoDays: periodKey === '2026-04-24' ? 70 : 60 })
    );
    const resolver = buildDashboardKpiResolver({
      modules: { financeReportBuilder: { buildArAging: spy } },
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    await resolver(kpi, { branch: 'riyadh-1' });
    const afterA = spy.mock.calls.length;
    await resolver(kpi, { branch: 'riyadh-2' });
    expect(spy.mock.calls.length).toBeGreaterThan(afterA);
  });
});

describe('dashboardKpiResolver — internals', () => {
  it('stableFilterHash is deterministic across key order', () => {
    const a = _internals.stableFilterHash({ branch: 'x', payer: 'y' });
    const b = _internals.stableFilterHash({ payer: 'y', branch: 'x' });
    expect(a).toBe(b);
  });

  it('stableFilterHash returns "ø" for empty/missing', () => {
    expect(_internals.stableFilterHash({})).toBe('ø');
    expect(_internals.stableFilterHash(null)).toBe('ø');
    expect(_internals.stableFilterHash(undefined)).toBe('ø');
  });

  it('shiftPeriodKey walks days correctly', () => {
    expect(_internals.shiftPeriodKey('2026-04-01', 'daily')).toBe('2026-03-31');
    expect(_internals.shiftPeriodKey('2026-01-01', 'daily')).toBe('2025-12-31');
  });

  it('shiftPeriodKey walks weeks and months', () => {
    expect(_internals.shiftPeriodKey('2026-W05', 'weekly')).toBe('2026-W04');
    expect(_internals.shiftPeriodKey('2026-W01', 'weekly')).toBe('2025-W52');
    expect(_internals.shiftPeriodKey('2026-03', 'monthly')).toBe('2026-02');
    expect(_internals.shiftPeriodKey('2026-01', 'monthly')).toBe('2025-12');
  });

  it('safeRatio handles zero + non-numeric inputs', () => {
    expect(_internals.safeRatio(10, 0)).toBeNull();
    expect(_internals.safeRatio(null, 5)).toBeNull();
    expect(_internals.safeRatio(10, 'bad')).toBeNull();
    expect(_internals.safeRatio(12, 10)).toBeCloseTo(0.2, 5);
  });

  it('ttlFor picks shorter TTL for hourly KPIs', () => {
    const hourly = _internals.ttlFor({ frequency: 'hourly' });
    const monthly = _internals.ttlFor({ frequency: 'monthly' });
    expect(hourly).toBeLessThan(monthly);
  });

  it('LRU cache expires after TTL', () => {
    const now = { t: 1_000_000 };
    const originalNow = Date.now;
    Date.now = () => now.t;
    try {
      const c = _internals.createLruCache({ maxEntries: 3 });
      c.set('k', 'v', 1000);
      expect(c.get('k')).toBe('v');
      now.t += 2000;
      expect(c.get('k')).toBeUndefined();
    } finally {
      Date.now = originalNow;
    }
  });

  it('LRU cache evicts oldest beyond maxEntries', () => {
    const c = _internals.createLruCache({ maxEntries: 2 });
    c.set('a', 1, 60_000);
    c.set('b', 2, 60_000);
    c.set('c', 3, 60_000);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });
});

describe('dashboardKpiResolver — integrationHealthComputer', () => {
  it('returns 100 for a healthy snapshot with no penalties', async () => {
    const score = await _internals.integrationHealthComputer(null, {
      modules: {
        integrationHealthAggregator: {
          buildSnapshot: async () => ({
            overall: 'healthy',
            headline: {
              openCircuits: 0,
              parkedNet: 0,
              dlqReplaySuccessRate: 1,
            },
          }),
        },
      },
    });
    expect(score).toBe(100);
  });

  it('applies penalties for degraded / critical / open circuits', async () => {
    const score = await _internals.integrationHealthComputer(null, {
      modules: {
        integrationHealthAggregator: {
          buildSnapshot: async () => ({
            overall: 'critical',
            headline: {
              openCircuits: 2,
              parkedNet: 5,
              dlqReplaySuccessRate: 0.5,
            },
          }),
        },
      },
    });
    expect(score).toBeLessThan(60);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('returns null when aggregator throws', async () => {
    const score = await _internals.integrationHealthComputer(null, {
      modules: {
        integrationHealthAggregator: {
          buildSnapshot: async () => {
            throw new Error('nope');
          },
        },
      },
    });
    expect(score).toBeNull();
  });
});

describe('dashboardKpiResolver — redFlagsActiveComputer', () => {
  it('reads totals.active from listActiveFlags', async () => {
    const v = await _internals.redFlagsActiveComputer(null, {
      modules: {
        beneficiary360Service: {
          listActiveFlags: async () => ({ totals: { active: 12 } }),
        },
      },
    });
    expect(v).toBe(12);
  });

  it('falls back to flags.length when totals missing', async () => {
    const v = await _internals.redFlagsActiveComputer(null, {
      modules: {
        beneficiary360Service: {
          listActiveFlags: async () => ({ flags: [1, 2, 3] }),
        },
      },
    });
    expect(v).toBe(3);
  });

  it('returns null when service is missing', async () => {
    const v = await _internals.redFlagsActiveComputer(null, { modules: {} });
    expect(v).toBeNull();
  });
});

describe('dashboardKpiResolver — invalid input handling', () => {
  it('returns no-kpi shape when kpi is missing', async () => {
    const resolver = buildDashboardKpiResolver({});
    const out = await resolver(null);
    expect(out.source).toBe('no-kpi');
    expect(out.value).toBeNull();
  });
});
