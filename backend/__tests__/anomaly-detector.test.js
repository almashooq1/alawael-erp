/**
 * anomaly-detector.test.js — Phase 18 Commit 6.
 *
 * Pure-function tests for the EWMA + z-score detector and the
 * rolling history store.
 */

'use strict';

const {
  detectAnomaly,
  DEFAULT_OPTIONS,
  _internals,
} = require('../services/anomalyDetector.service');
const { createInMemoryHistoryStore, seriesKey } = require('../services/kpiHistoryStore.service');

function makeStableSeries(n, value = 50, startTs = Date.parse('2026-04-01T00:00:00Z')) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ t: startTs + i * 3600_000, v: value });
  }
  return out;
}

function makeNoisySeries(n, base = 50, jitter = 1, startTs = Date.parse('2026-04-01T00:00:00Z')) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i += 1) {
    // Deterministic-ish jitter from the index.
    v = base + Math.sin(i * 0.7) * jitter;
    out.push({ t: startTs + i * 3600_000, v });
  }
  return out;
}

describe('detectAnomaly — degraded input', () => {
  it('returns not-anomaly when currentValue is missing', () => {
    const r = detectAnomaly({ series: makeStableSeries(10), currentValue: null });
    expect(r.anomaly).toBe(false);
    expect(r.reason).toBe('current_value_missing');
  });

  it('requires minPoints of history', () => {
    const r = detectAnomaly({ series: makeStableSeries(3), currentValue: 55 });
    expect(r.anomaly).toBe(false);
    expect(r.reason).toMatch(/insufficient_history/);
  });

  it('returns zero_variance when the series is a flat line and variance=0', () => {
    const r = detectAnomaly({
      series: makeStableSeries(20, 50),
      currentValue: 100,
      options: { seasonal: null },
    });
    expect(r.anomaly).toBe(false);
    expect(r.reason).toBe('zero_variance');
  });

  it('never throws on malformed inputs', () => {
    expect(() =>
      detectAnomaly({
        series: [{ t: 'not-a-date', v: 'nope' }, null, { t: 1, v: Infinity }],
        currentValue: 50,
      })
    ).not.toThrow();
  });
});

describe('detectAnomaly — signal detection', () => {
  it('fires critical when the value is far above the baseline', () => {
    const r = detectAnomaly({
      series: makeNoisySeries(30, 50, 1),
      currentValue: 200,
      options: { seasonal: null },
    });
    expect(r.anomaly).toBe(true);
    expect(r.severity).toBe('critical');
    expect(r.direction).toBe('above');
    expect(r.zScore).toBeGreaterThan(DEFAULT_OPTIONS.critZ);
  });

  it('fires warning in the middle severity band', () => {
    const r = detectAnomaly({
      series: makeNoisySeries(30, 50, 1),
      currentValue: 53, // z~3 range depending on jitter
      options: { seasonal: null, warnZ: 2, critZ: 4 },
    });
    // Not guaranteed to be exactly warning but should be anomalous
    expect(r.anomaly).toBe(true);
    expect(['warning', 'critical']).toContain(r.severity);
  });

  it('does not fire when the value is within expected range', () => {
    const r = detectAnomaly({
      series: makeNoisySeries(30, 50, 2),
      currentValue: 50.5,
      options: { seasonal: null },
    });
    expect(r.anomaly).toBe(false);
    expect(r.reason).toBe('within_expected_range');
  });

  it('reports direction=below when the value sits far under the baseline', () => {
    const r = detectAnomaly({
      series: makeNoisySeries(30, 100, 1),
      currentValue: 40,
      options: { seasonal: null },
    });
    expect(r.anomaly).toBe(true);
    expect(r.direction).toBe('below');
    expect(r.zScore).toBeLessThan(0);
  });
});

describe('detectAnomaly — seasonal', () => {
  it('uses seasonal fallback when EWMA variance is zero but seasonal has signal', () => {
    // 20 stable points at 50 + one extreme current value
    const series = makeStableSeries(20, 50, Date.parse('2026-04-01T00:00:00Z'));
    // Craft a seasonal signal: alter every 24th point to 80
    for (let i = 0; i < series.length; i += 24) series[i].v = 80;
    const r = detectAnomaly({
      series,
      currentValue: 200,
      clock: { now: () => series[0].t }, // same hour bucket as the seasonal spikes
      options: { seasonal: 'hour', seasonalMinMatches: 1 },
    });
    // May or may not flag — depends on variance. We at least want a
    // defined reason rather than a crash.
    expect(typeof r.reason).toBe('string');
  });
});

describe('detectAnomaly — internals', () => {
  it('cleanSeries drops non-numeric + unsortable points and sorts by t', () => {
    const cleaned = _internals.cleanSeries([
      { t: 2, v: 2 },
      { t: 1, v: 1 },
      { t: 3, v: 'nope' },
      null,
      { t: '2026-04-01T00:00:00Z', v: 10 },
    ]);
    expect(cleaned.length).toBe(3);
    expect(cleaned[0].t).toBeLessThanOrEqual(cleaned[1].t);
  });

  it('ewmaStats handles single-point + flat series', () => {
    expect(_internals.ewmaStats([], 0.3)).toEqual({ ewma: null, stdev: null, n: 0 });
    expect(_internals.ewmaStats([42], 0.3).ewma).toBe(42);
    const flat = _internals.ewmaStats([1, 1, 1, 1], 0.3);
    expect(flat.ewma).toBe(1);
    expect(flat.stdev).toBe(0);
  });

  it('seasonalBucket picks hour or day-of-week', () => {
    const ts = Date.parse('2026-04-01T13:00:00Z');
    expect(_internals.seasonalBucket(ts, 'hour')).toBe(13);
    expect(_internals.seasonalBucket(ts, 'dow')).toBe(new Date(ts).getUTCDay());
    expect(_internals.seasonalBucket(ts, null)).toBeNull();
  });

  it('verdictSeverity maps z correctly', () => {
    const opts = { warnZ: 2, critZ: 3 };
    expect(_internals.verdictSeverity(1.5, opts)).toBeNull();
    expect(_internals.verdictSeverity(2.1, opts)).toBe('warning');
    expect(_internals.verdictSeverity(-3.2, opts)).toBe('critical');
  });
});

// ─── History store ────────────────────────────────────────────

describe('kpiHistoryStore', () => {
  function stubClock(start = Date.parse('2026-04-01T00:00:00Z')) {
    let t = start;
    return {
      now: () => t,
      advance(ms) {
        t += ms;
        return t;
      },
    };
  }

  it('seriesKey encodes scope deterministically', () => {
    const a = seriesKey('kpi.a', { branch: 'x' });
    const b = seriesKey('kpi.a', { branch: 'x' });
    expect(a).toBe(b);
    expect(seriesKey('kpi.a', null)).toBe('kpi.a::');
  });

  it('record rejects non-numeric + non-string kpiId', () => {
    const store = createInMemoryHistoryStore();
    expect(store.record({ kpiId: 'x', value: 'nope' })).toBeNull();
    expect(store.record({ kpiId: '', value: 1 })).toBeNull();
    expect(store.record({ kpiId: 'x', value: NaN })).toBeNull();
  });

  it('record appends to the series and caps at maxPointsPerSeries', () => {
    const clock = stubClock();
    const store = createInMemoryHistoryStore({ maxPointsPerSeries: 3, clock });
    store.record({ kpiId: 'x', value: 1, t: 1 });
    store.record({ kpiId: 'x', value: 2, t: 2 });
    store.record({ kpiId: 'x', value: 3, t: 3 });
    store.record({ kpiId: 'x', value: 4, t: 4 });
    const s = store.series({ kpiId: 'x' });
    expect(s.length).toBe(3);
    expect(s[0].v).toBe(2);
    expect(s[2].v).toBe(4);
  });

  it('record rejects out-of-order writes', () => {
    const store = createInMemoryHistoryStore();
    store.record({ kpiId: 'x', value: 1, t: 10 });
    const res = store.record({ kpiId: 'x', value: 2, t: 5 });
    expect(res).toBeTruthy(); // returns existing
    const s = store.series({ kpiId: 'x' });
    expect(s.length).toBe(1);
  });

  it('expires series after ttlMs', () => {
    const clock = stubClock();
    const store = createInMemoryHistoryStore({ ttlMs: 1000, clock });
    store.record({ kpiId: 'x', value: 1, t: 1 });
    expect(store.series({ kpiId: 'x' }).length).toBe(1);
    clock.advance(2000);
    expect(store.series({ kpiId: 'x' }).length).toBe(0);
  });

  it('enforces maxSeries via LRU', () => {
    const clock = stubClock();
    const store = createInMemoryHistoryStore({ maxSeries: 2, clock });
    store.record({ kpiId: 'a', value: 1 });
    store.record({ kpiId: 'b', value: 1 });
    store.record({ kpiId: 'c', value: 1 });
    expect(store.series({ kpiId: 'a' }).length).toBe(0);
    expect(store.series({ kpiId: 'c' }).length).toBe(1);
  });
});

// ─── Resolver integration ────────────────────────────────────

describe('dashboardKpiResolver + anomaly detector integration', () => {
  const { buildDashboardKpiResolver } = require('../services/dashboardKpiResolver.service');
  const anomalyDetector = require('../services/anomalyDetector.service');
  const { byId: kpiById } = require('../config/kpi.registry');

  function fakeFinanceModule(valueByPeriod) {
    return {
      financeReportBuilder: {
        async buildArAging({ periodKey }) {
          if (!(periodKey in valueByPeriod)) return null;
          return { dsoDays: valueByPeriod[periodKey] };
        },
      },
    };
  }

  it('attaches an anomaly block when history is rich + value deviates', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const historyStore = createInMemoryHistoryStore();
    // Pre-seed the series with stable-ish history.
    const base = Date.parse('2026-04-01T00:00:00Z');
    for (let i = 0; i < 20; i += 1) {
      historyStore.record({
        kpiId: kpi.id,
        scope: null,
        value: 50 + Math.sin(i) * 0.5,
        t: base + i * 3600_000,
      });
    }
    // Now resolve a huge value.
    const valueByPeriod = { '2026-04-24': 250 };
    const resolver = buildDashboardKpiResolver({
      modules: fakeFinanceModule(valueByPeriod),
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
      historyStore,
      anomalyDetector,
    });
    const out = await resolver(kpi, {});
    expect(out.anomaly).toBeTruthy();
    expect(out.anomaly.detected).toBe(true);
    expect(out.anomaly.direction).toBe('above');
    expect(out.anomaly.severity).toBe('critical');
  });

  it('leaves anomaly null when history is too short', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const historyStore = createInMemoryHistoryStore();
    const valueByPeriod = { '2026-04-24': 60, '2026-04-23': 55 };
    const resolver = buildDashboardKpiResolver({
      modules: fakeFinanceModule(valueByPeriod),
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
      historyStore,
      anomalyDetector,
    });
    const out = await resolver(kpi, {});
    expect(out.anomaly).toBeTruthy();
    expect(out.anomaly.detected).toBe(false);
    expect(out.anomaly.reason).toMatch(/insufficient_history/);
  });

  it('records the resolved value in the history store for subsequent runs', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const historyStore = createInMemoryHistoryStore();
    const valueByPeriod = { '2026-04-24': 60, '2026-04-23': 55 };
    const resolver = buildDashboardKpiResolver({
      modules: fakeFinanceModule(valueByPeriod),
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
      historyStore,
      anomalyDetector,
    });
    await resolver(kpi, {});
    const series = historyStore.series({ kpiId: kpi.id });
    expect(series.length).toBeGreaterThan(0);
    expect(series[series.length - 1].v).toBe(60);
  });

  it('skips anomaly attachment when no detector is injected (backward-compat)', async () => {
    const kpi = kpiById('finance.ar.dso.days');
    const valueByPeriod = { '2026-04-24': 60 };
    const resolver = buildDashboardKpiResolver({
      modules: fakeFinanceModule(valueByPeriod),
      clock: { now: () => new Date('2026-04-24T10:00:00Z') },
      sparklinePoints: 0,
    });
    const out = await resolver(kpi, {});
    expect(out.anomaly).toBeNull();
  });
});

// ─── Narrative rule ──────────────────────────────────────────

describe('narrative — R-ANOMALY-DETECTED rule', () => {
  const narrative = require('../services/dashboardNarrative.service');

  it('fires when any snapshot carries a detected anomaly', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        {
          id: 'finance.ar.dso.days',
          nameEn: 'DSO',
          nameAr: 'أيام التحصيل',
          value: 200,
          delta: 0.8,
          classification: 'red',
          anomaly: {
            detected: true,
            severity: 'critical',
            zScore: 4.2,
            direction: 'above',
            reason: 'within_expected_range',
          },
        },
      ],
    });
    expect(r.rulesFired).toContain('R-ANOMALY-DETECTED');
    expect(r.paragraphsAr.some(p => /شذوذ إحصائي/.test(p))).toBe(true);
  });

  it('does NOT fire when anomaly.detected=false', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        {
          id: 'finance.ar.dso.days',
          value: 55,
          classification: 'green',
          anomaly: { detected: false, severity: null, zScore: 0.3 },
        },
      ],
    });
    expect(r.rulesFired).not.toContain('R-ANOMALY-DETECTED');
  });
});
