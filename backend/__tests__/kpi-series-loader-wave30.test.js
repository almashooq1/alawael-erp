/**
 * kpi-series-loader-wave30.test.js — Wave 30.
 *
 *   1. Factory returns null when KpiValue model missing
 *   2. Empty rows → empty series ctx
 *   3. Grouping: same kpiDefinitionId × different branchId = separate series
 *   4. Grouping: same kpiDefinitionId × same branchId = ONE series, multiple points
 *   5. Points ordered ASC by periodDate (matches generator expectation)
 *   6. metricById hydration: `metrics` config provides labels + unit
 *   7. Auto-discover: queries KpiDefinition when `metrics` not provided
 *   8. Cap on max series + max points per series
 *   9. Query throw → empty ctx, no crash
 *  10. windowDays cutoff is respected (filter in the find)
 *  11. End-to-end: ctx → anomaly generator emits insight that survives G-validators
 *  12. End-to-end: ctx → trend-deviation generator emits when slope reverses
 *  13. Boot registry: anomaly + trend-deviation BOTH use the same loader
 *      (one query per tick, not two)
 */

'use strict';

const mongoose = require('mongoose');
const { createKpiSeriesLoader } = require('../intelligence/loaders/kpi-series.loader');
const { buildLoaders } = require('../intelligence/orchestrator-loaders.registry');
const anomalyGenerator = require('../intelligence/generators/anomaly.generator');
const trendGenerator = require('../intelligence/generators/trend-deviation.generator');
const insightModelExports = require('../intelligence/insight.model');
const Insight =
  mongoose.models.Insight || mongoose.model('Insight', insightModelExports.InsightSchema);

// ─── Chainable-thenable mocks ─────────────────────────────────

function modelFromRows(rows) {
  function chain(out) {
    return {
      select: () => chain(out),
      sort: () => chain(out),
      limit: () => chain(out),
      lean: () => Promise.resolve(out),
    };
  }
  return { find: () => chain(rows) };
}

function findThatCaptures(rows, capture) {
  return {
    find: filter => {
      capture.push(filter);
      function chain(out) {
        return {
          select: () => chain(out),
          sort: () => chain(out),
          limit: () => chain(out),
          lean: () => Promise.resolve(out),
        };
      }
      return chain(rows);
    },
  };
}

function modelThatThrows(message) {
  return {
    find: () => {
      throw new Error(message);
    },
  };
}

// ─── 1-2. Factory + empty case ─────────────────────────────────

describe('kpi-series.loader — factory', () => {
  test('returns null when KpiValue missing', () => {
    const loader = createKpiSeriesLoader({ logger: { warn: () => {} } });
    expect(loader).toBeNull();
  });

  test('returns a function when KpiValue is provided', () => {
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows([]),
      metrics: [{ kpiDefinitionId: 'k1' }],
    });
    expect(typeof loader).toBe('function');
  });

  test('empty rows → empty series ctx', async () => {
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows([]),
      metrics: [{ kpiDefinitionId: 'k1' }],
    });
    const ctx = await loader();
    expect(ctx.series).toEqual([]);
    expect(ctx.now).toBeInstanceOf(Date);
  });

  test('no metrics + no KpiDefinition → empty series', async () => {
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows([]),
    });
    const ctx = await loader();
    expect(ctx.series).toEqual([]);
  });
});

// ─── 3-6. Grouping + hydration ─────────────────────────────────

describe('kpi-series.loader — grouping & hydration', () => {
  const kpiA = new mongoose.Types.ObjectId();
  const kpiB = new mongoose.Types.ObjectId();
  const branch1 = new mongoose.Types.ObjectId();
  const branch2 = new mongoose.Types.ObjectId();

  test('groups same kpi × different branches into separate series', async () => {
    const rows = [
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-01'), value: 10 },
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-02'), value: 11 },
      { kpiDefinitionId: kpiA, branchId: branch2, periodDate: new Date('2026-05-01'), value: 20 },
      { kpiDefinitionId: kpiA, branchId: branch2, periodDate: new Date('2026-05-02'), value: 22 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiA, labelEn: 'Metric A' }],
    });
    const ctx = await loader();
    expect(ctx.series).toHaveLength(2);
    const branch1Series = ctx.series.find(s => String(s.branchId) === String(branch1));
    expect(branch1Series.points).toHaveLength(2);
  });

  test('groups same kpi × same branch into one series with multiple points', async () => {
    const rows = [
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-01'), value: 10 },
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-02'), value: 11 },
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-03'), value: 12 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiA }],
    });
    const ctx = await loader();
    expect(ctx.series).toHaveLength(1);
    expect(ctx.series[0].points).toHaveLength(3);
  });

  test('points sorted ASC by periodDate (matches generator expectation)', async () => {
    // Rows ARRIVE in ASC order because the loader sorts by periodDate
    // ascending in its query. The mock just returns what we give it,
    // so we feed ASC-sorted rows here to match what real Mongo would.
    const rows = [
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-01'), value: 10 },
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-02'), value: 11 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiA }],
    });
    const ctx = await loader();
    expect(ctx.series[0].points[0].at < ctx.series[0].points[1].at).toBe(true);
  });

  test('null branchId treated as org-wide (single series)', async () => {
    const rows = [
      { kpiDefinitionId: kpiA, branchId: null, periodDate: new Date('2026-05-01'), value: 10 },
      { kpiDefinitionId: kpiA, branchId: null, periodDate: new Date('2026-05-02'), value: 11 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiA }],
    });
    const ctx = await loader();
    expect(ctx.series).toHaveLength(1);
    expect(ctx.series[0].branchId).toBeNull();
  });

  test('hydrates labels + unit from metrics config', async () => {
    const rows = [
      { kpiDefinitionId: kpiA, branchId: branch1, periodDate: new Date('2026-05-01'), value: 10 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [
        {
          kpiDefinitionId: kpiA,
          metricId: 'attendance.daily',
          labelAr: 'الحضور اليومي',
          labelEn: 'Daily attendance',
          unit: 'percent',
          category: 'operational',
          betterIsHigher: true,
        },
      ],
    });
    const ctx = await loader();
    expect(ctx.series[0].metricId).toBe('attendance.daily');
    expect(ctx.series[0].metricLabelAr).toBe('الحضور اليومي');
    expect(ctx.series[0].metricLabelEn).toBe('Daily attendance');
    expect(ctx.series[0].unit).toBe('percent');
    expect(ctx.series[0].category).toBe('operational');
    expect(ctx.series[0].betterIsHigher).toBe(true);
  });

  test('falls back to kpiDefinitionId-as-label when no metrics config matches the returned rows', async () => {
    // The metrics config says "look up kpiA", but the rows come back
    // for kpiB. In production this would mean the metrics list was
    // stale relative to Mongo; the loader gracefully labels using the
    // raw id so the data still surfaces (better than dropping it).
    const rows = [
      { kpiDefinitionId: kpiB, branchId: branch1, periodDate: new Date('2026-05-01'), value: 10 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiA }], // doesn't include kpiB
    });
    const ctx = await loader();
    expect(ctx.series).toHaveLength(1);
    expect(ctx.series[0].metricId).toBe(String(kpiB));
    expect(ctx.series[0].metricLabelEn).toBe(String(kpiB));
  });
});

// ─── 7. Auto-discover ─────────────────────────────────────────

describe('kpi-series.loader — auto-discover via KpiDefinition', () => {
  test('queries KpiDefinition when metrics not provided', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const branch = new mongoose.Types.ObjectId();
    const defs = [
      {
        _id: kpiId,
        name: 'Daily attendance',
        nameAr: 'الحضور اليومي',
        nameEn: 'Daily attendance',
        unit: 'percent',
        betterIsHigher: true,
      },
    ];
    const values = [
      { kpiDefinitionId: kpiId, branchId: branch, periodDate: new Date('2026-05-01'), value: 95 },
    ];
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(values),
      KpiDefinition: modelFromRows(defs),
    });
    const ctx = await loader();
    expect(ctx.series).toHaveLength(1);
    expect(ctx.series[0].metricLabelEn).toBe('Daily attendance');
  });

  test('auto-discover query failure returns empty series', async () => {
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows([]),
      KpiDefinition: modelThatThrows('def query failed'),
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.series).toEqual([]);
  });
});

// ─── 8. Caps + 9. Resilience ──────────────────────────────────

describe('kpi-series.loader — caps & resilience', () => {
  test('caps series count at maxSeries', async () => {
    const branchIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId());
    const kpiId = new mongoose.Types.ObjectId();
    const rows = branchIds.map((b, i) => ({
      kpiDefinitionId: kpiId,
      branchId: b,
      periodDate: new Date(2026, 4, i + 1),
      value: i,
    }));
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiId }],
      maxSeries: 3,
    });
    const ctx = await loader();
    expect(ctx.series.length).toBeLessThanOrEqual(3);
  });

  test('caps points per series at maxPointsPerSeries', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const branch = new mongoose.Types.ObjectId();
    const rows = Array.from({ length: 100 }, (_, i) => ({
      kpiDefinitionId: kpiId,
      branchId: branch,
      periodDate: new Date(2026, 4, (i % 28) + 1),
      value: i,
    }));
    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(rows),
      metrics: [{ kpiDefinitionId: kpiId }],
      maxPointsPerSeries: 20,
    });
    const ctx = await loader();
    expect(ctx.series[0].points.length).toBe(20);
  });

  test('KpiValue throw → empty ctx', async () => {
    const loader = createKpiSeriesLoader({
      KpiValue: modelThatThrows('mongo down'),
      metrics: [{ kpiDefinitionId: 'k1' }],
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.series).toEqual([]);
  });
});

// ─── 10. Cutoff filter ────────────────────────────────────────

describe('kpi-series.loader — cutoff', () => {
  test('windowDays drives the periodDate cutoff in the query', async () => {
    const captured = [];
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T00:00:00Z');
    const loader = createKpiSeriesLoader({
      KpiValue: findThatCaptures([], captured),
      metrics: [{ kpiDefinitionId: kpiId }],
      windowDays: 14,
      now: () => fixedNow,
    });
    await loader();
    expect(captured).toHaveLength(1);
    const filter = captured[0];
    expect(filter.periodDate.$gte).toBeInstanceOf(Date);
    const expected = new Date(fixedNow.getTime() - 14 * 86_400_000);
    expect(filter.periodDate.$gte.toISOString()).toBe(expected.toISOString());
  });
});

// ─── 11-12. End-to-end via generators ─────────────────────────

describe('kpi-series.loader — end-to-end with generators', () => {
  test('clean baseline + spike → anomaly emits insight surviving G-validators', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const branch = new mongoose.Types.ObjectId();
    // 20 stable points around 100 + final spike at 200
    const points = [];
    for (let i = 0; i < 20; i++) {
      points.push({
        kpiDefinitionId: kpiId,
        branchId: branch,
        periodDate: new Date(2026, 4, i + 1),
        value: 100 + (i % 3),
      });
    }
    points.push({
      kpiDefinitionId: kpiId,
      branchId: branch,
      periodDate: new Date(2026, 4, 21),
      value: 200,
    });

    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(points),
      metrics: [
        {
          kpiDefinitionId: kpiId,
          labelAr: 'مؤشر',
          labelEn: 'Metric',
          unit: 'count',
        },
      ],
    });
    const ctx = await loader();
    const payloads = await anomalyGenerator.evaluate(ctx);
    expect(payloads.length).toBeGreaterThanOrEqual(1);
    const doc = new Insight(payloads[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('slope reversal in series → trend-deviation emits insight', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const branch = new mongoose.Types.ObjectId();
    // First half: climbing 70→90 (positive slope)
    // Second half: falling 88→60 (negative slope)
    // betterIsHigher: true → reversal toward worse
    const points = [];
    for (let i = 0; i < 8; i++) {
      points.push({
        kpiDefinitionId: kpiId,
        branchId: branch,
        periodDate: new Date(2026, 4, i + 1),
        value: 70 + i * 2.5,
      });
    }
    for (let i = 0; i < 8; i++) {
      points.push({
        kpiDefinitionId: kpiId,
        branchId: branch,
        periodDate: new Date(2026, 4, 9 + i),
        value: 88 - i * 3.5,
      });
    }

    const loader = createKpiSeriesLoader({
      KpiValue: modelFromRows(points),
      metrics: [
        {
          kpiDefinitionId: kpiId,
          labelAr: 'م',
          labelEn: 'M',
          betterIsHigher: true,
        },
      ],
    });
    const ctx = await loader();
    const payloads = await trendGenerator.evaluate(ctx);
    expect(payloads.length).toBeGreaterThanOrEqual(1);
    expect(payloads[0].kind).toBe('trend-deviation');
  });
});

// ─── 13. Boot registry — single shared loader ────────────────

describe('orchestrator-loaders — anomaly + trend-deviation share loader', () => {
  test('with KpiValue present: both generators use the SAME loader instance', () => {
    const kpiId = new mongoose.Types.ObjectId();
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        models: {
          KpiValue: modelFromRows([]),
        },
        kpiSeriesOpts: {
          metrics: [{ kpiDefinitionId: kpiId }],
        },
      },
    });
    expect(loaders['anomaly.v1']).toBe(loaders['trend-deviation.v1']);
    expect(stubbedGeneratorIds).not.toContain('anomaly.v1');
    expect(stubbedGeneratorIds).not.toContain('trend-deviation.v1');
  });

  test('without KpiValue: both generators fall back to (different) stubs', () => {
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: { models: {} },
    });
    // Both stubs exist
    expect(loaders['anomaly.v1']).toBeTruthy();
    expect(loaders['trend-deviation.v1']).toBeTruthy();
    // And both are reported as stubbed
    expect(stubbedGeneratorIds).toContain('anomaly.v1');
    expect(stubbedGeneratorIds).toContain('trend-deviation.v1');
  });
});
