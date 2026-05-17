/**
 * eod-digest-loaders-wave32.test.js — Wave 32.
 *
 *   end-of-day.loader:
 *     1. Factory returns null when branchIds missing/empty
 *     2. Empty branches with zero activity → empty summaries
 *     3. Branch with resolved alerts → summary with resolvedCount
 *     4. Branch with open follow-ups → summary with openFollowUpCount
 *     5. Alert/FollowUp query throw → still returns (with zeros), no crash
 *     6. UTC day boundary helpers
 *     7. End-to-end: loader → generator emits Insight that passes G-validators
 *
 *   executive-digest.loader:
 *     8. Factory returns null when KpiValue or metrics missing
 *     9. Partition: rows in last 7 days = "thisWeek"; 8-14d = "prevWeek"
 *    10. avg vs sum vs last aggregator modes
 *    11. Skip metrics with empty thisWeek OR prevWeek
 *    12. Hydrates labels from metrics config
 *    13. End-to-end: loader → digest generator emits Insight w/ G-validators
 *
 *   Registry integration:
 *    14. Both real loaders replace their stubs when deps are configured
 *    15. Missing deps → both fall back to stubs
 */

'use strict';

const mongoose = require('mongoose');
const { createEndOfDayLoader } = require('../intelligence/loaders/end-of-day.loader');
const {
  createExecutiveDigestLoader,
  _internal: digestInternal,
} = require('../intelligence/loaders/executive-digest.loader');
const { buildLoaders } = require('../intelligence/orchestrator-loaders.registry');
const endOfDayGenerator = require('../intelligence/generators/end-of-day.generator');
const digestGenerator = require('../intelligence/generators/executive-digest.generator');

const insightModelExports = require('../intelligence/insight.model');
const Insight =
  mongoose.models.Insight || mongoose.model('Insight', insightModelExports.InsightSchema);

// ─── Mongoose mocks ───────────────────────────────────────────

function modelWithCount(count) {
  return { countDocuments: async () => count };
}

function modelThatThrows(message) {
  return {
    countDocuments: async () => {
      throw new Error(message);
    },
    find: () => {
      throw new Error(message);
    },
  };
}

function findRowsModel(rows) {
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

// ─── 1-6. end-of-day.loader ───────────────────────────────────

describe('end-of-day.loader', () => {
  test('factory returns null when branchIds missing/empty', () => {
    expect(
      createEndOfDayLoader({ Alert: modelWithCount(0), logger: { warn: () => {} } })
    ).toBeNull();
    expect(
      createEndOfDayLoader({
        Alert: modelWithCount(0),
        branchIds: [],
        logger: { warn: () => {} },
      })
    ).toBeNull();
  });

  test('all branches with zero activity → empty summaries', async () => {
    const loader = createEndOfDayLoader({
      Alert: modelWithCount(0),
      FollowUp: modelWithCount(0),
      branchIds: ['B-1', 'B-2', 'B-3'],
    });
    const ctx = await loader();
    expect(ctx.summaries).toEqual([]);
  });

  test('branch with resolved alerts emits a summary', async () => {
    const counts = { resolved: 4, snoozed: 1, followups: 2 };
    let call = 0;
    const Alert = {
      countDocuments: async () => {
        call += 1;
        // alternating: resolved, snoozed, resolved, snoozed...
        return call % 2 === 1 ? counts.resolved : counts.snoozed;
      },
    };
    const FollowUp = modelWithCount(counts.followups);
    const loader = createEndOfDayLoader({
      Alert,
      FollowUp,
      branchIds: ['B-1'],
    });
    const ctx = await loader();
    expect(ctx.summaries).toHaveLength(1);
    expect(ctx.summaries[0].roleGroup).toBe('branch_manager');
    expect(ctx.summaries[0].resolvedCount).toBe(counts.resolved);
    expect(ctx.summaries[0].snoozedCount).toBe(counts.snoozed);
    expect(ctx.summaries[0].openFollowUpCount).toBe(counts.followups);
  });

  test('branch with only open follow-ups still emits a summary', async () => {
    const loader = createEndOfDayLoader({
      Alert: modelWithCount(0),
      FollowUp: modelWithCount(3),
      branchIds: ['B-1'],
    });
    const ctx = await loader();
    expect(ctx.summaries).toHaveLength(1);
    expect(ctx.summaries[0].openFollowUpCount).toBe(3);
  });

  test('Alert query throw → loader returns (with zeros), no crash', async () => {
    const loader = createEndOfDayLoader({
      Alert: modelThatThrows('alert query down'),
      FollowUp: modelWithCount(2),
      branchIds: ['B-1'],
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.summaries).toHaveLength(1);
    expect(ctx.summaries[0].resolvedCount).toBe(0);
    expect(ctx.summaries[0].openFollowUpCount).toBe(2);
  });

  test('maxBranches caps the work', async () => {
    const branches = Array.from({ length: 200 }, (_, i) => `B-${i}`);
    const loader = createEndOfDayLoader({
      Alert: modelWithCount(1),
      FollowUp: modelWithCount(1),
      branchIds: branches,
      maxBranches: 10,
    });
    const ctx = await loader();
    expect(ctx.summaries.length).toBeLessThanOrEqual(10);
  });

  test('UTC day boundary helpers', () => {
    const { startOfTodayUTC, endOfTodayUTC } =
      require('../intelligence/loaders/end-of-day.loader')._internal;
    const t = new Date('2026-05-17T15:30:45Z');
    expect(startOfTodayUTC(t).toISOString()).toBe('2026-05-17T00:00:00.000Z');
    expect(endOfTodayUTC(t).toISOString()).toBe('2026-05-17T23:59:59.999Z');
  });

  test('end-to-end: loader → generator emits Insight that passes G-validators', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const loader = createEndOfDayLoader({
      Alert: modelWithCount(3),
      FollowUp: modelWithCount(5),
      branchIds: [branchId],
    });
    const ctx = await loader();
    const payloads = await endOfDayGenerator.evaluate(ctx);
    expect(payloads).toHaveLength(1);
    const doc = new Insight(payloads[0]);
    expect(doc.validateSync()).toBeFalsy();
  });
});

// ─── 8-13. executive-digest.loader ────────────────────────────

describe('executive-digest.loader', () => {
  test('factory returns null when KpiValue missing', () => {
    expect(
      createExecutiveDigestLoader({
        metrics: [{ kpiDefinitionId: 'k1' }],
        logger: { warn: () => {} },
      })
    ).toBeNull();
  });

  test('factory returns null when metrics empty', () => {
    expect(
      createExecutiveDigestLoader({
        KpiValue: findRowsModel([]),
        logger: { warn: () => {} },
      })
    ).toBeNull();
    expect(
      createExecutiveDigestLoader({
        KpiValue: findRowsModel([]),
        metrics: [],
        logger: { warn: () => {} },
      })
    ).toBeNull();
  });

  test('partitions rows into thisWeek (last 7d) and prevWeek (8-14d)', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    // 4 days ago = thisWeek; 11 days ago = prevWeek
    const rows = [
      {
        kpiDefinitionId: kpiId,
        periodDate: new Date('2026-05-13T12:00:00Z'),
        value: 100,
      },
      {
        kpiDefinitionId: kpiId,
        periodDate: new Date('2026-05-06T12:00:00Z'),
        value: 80,
      },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [{ kpiDefinitionId: kpiId, labelEn: 'A', betterIsHigher: true }],
      now: () => fixedNow,
    });
    const ctx = await loader();
    expect(ctx.comparisons).toHaveLength(1);
    expect(ctx.comparisons[0].current).toBe(100);
    expect(ctx.comparisons[0].previous).toBe(80);
  });

  test('aggregator=avg averages multiple points per week', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    const rows = [
      // thisWeek: avg(100, 120) = 110
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-13'), value: 100 },
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-14'), value: 120 },
      // prevWeek: avg(50, 70) = 60
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-06'), value: 50 },
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-07'), value: 70 },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [{ kpiDefinitionId: kpiId, labelEn: 'A', aggregator: 'avg' }],
      now: () => fixedNow,
    });
    const ctx = await loader();
    expect(ctx.comparisons[0].current).toBe(110);
    expect(ctx.comparisons[0].previous).toBe(60);
  });

  test('aggregator=sum totals each week', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    const rows = [
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-13'), value: 100 },
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-14'), value: 120 },
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-06'), value: 50 },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [{ kpiDefinitionId: kpiId, labelEn: 'A', aggregator: 'sum' }],
      now: () => fixedNow,
    });
    const ctx = await loader();
    expect(ctx.comparisons[0].current).toBe(220);
    expect(ctx.comparisons[0].previous).toBe(50);
  });

  test('aggregator=last takes the most recent value', async () => {
    const { aggregate } = digestInternal;
    expect(aggregate([10, 20, 30], 'last')).toBe(30);
  });

  test('skips metrics with empty thisWeek OR prevWeek', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    const rows = [
      // Only thisWeek data — no prevWeek
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-13'), value: 100 },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [{ kpiDefinitionId: kpiId, labelEn: 'A' }],
      now: () => fixedNow,
    });
    const ctx = await loader();
    expect(ctx.comparisons).toHaveLength(0);
  });

  test('hydrates labels + unit + betterIsHigher from metrics config', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    const rows = [
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-13'), value: 95 },
      { kpiDefinitionId: kpiId, periodDate: new Date('2026-05-06'), value: 92 },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [
        {
          kpiDefinitionId: kpiId,
          kpiId: 'kpi.attendance.daily_rate',
          labelAr: 'الحضور اليومي',
          labelEn: 'Daily attendance',
          unit: 'percent',
          betterIsHigher: true,
        },
      ],
      now: () => fixedNow,
    });
    const ctx = await loader();
    const c = ctx.comparisons[0];
    expect(c.kpiId).toBe('kpi.attendance.daily_rate');
    expect(c.labelAr).toBe('الحضور اليومي');
    expect(c.unit).toBe('percent');
    expect(c.betterIsHigher).toBe(true);
  });

  test('end-to-end: loader → digest generator → Insight passes G-validators', async () => {
    const k1 = new mongoose.Types.ObjectId();
    const k2 = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T12:00:00Z');
    const rows = [
      // K1: thisWeek=80, prevWeek=100 → worsened 20%
      { kpiDefinitionId: k1, periodDate: new Date('2026-05-13'), value: 80 },
      { kpiDefinitionId: k1, periodDate: new Date('2026-05-06'), value: 100 },
      // K2: thisWeek=120, prevWeek=100 → improved 20%
      { kpiDefinitionId: k2, periodDate: new Date('2026-05-13'), value: 120 },
      { kpiDefinitionId: k2, periodDate: new Date('2026-05-06'), value: 100 },
    ];
    const loader = createExecutiveDigestLoader({
      KpiValue: findRowsModel(rows),
      metrics: [
        { kpiDefinitionId: k1, labelEn: 'A', betterIsHigher: true },
        { kpiDefinitionId: k2, labelEn: 'B', betterIsHigher: true },
      ],
      now: () => fixedNow,
    });
    const ctx = await loader();
    const payloads = await digestGenerator.evaluate(ctx);
    expect(payloads).toHaveLength(1);
    const doc = new Insight(payloads[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('query throw → empty comparisons, no crash', async () => {
    const loader = createExecutiveDigestLoader({
      KpiValue: modelThatThrows('kpivalue down'),
      metrics: [{ kpiDefinitionId: new mongoose.Types.ObjectId() }],
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.comparisons).toEqual([]);
  });
});

// ─── 14-15. Registry integration ──────────────────────────────

describe('orchestrator-loaders — Wave 32 stub elimination', () => {
  test('end-of-day + executive-digest both replace stubs when deps are configured', async () => {
    const kpiId = new mongoose.Types.ObjectId();
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        models: {
          Alert: modelWithCount(2),
          FollowUp: modelWithCount(1),
          KpiValue: findRowsModel([
            { kpiDefinitionId: kpiId, periodDate: new Date(Date.now() - 86400000), value: 80 },
            {
              kpiDefinitionId: kpiId,
              periodDate: new Date(Date.now() - 10 * 86400000),
              value: 100,
            },
          ]),
        },
        endOfDayOpts: { branchIds: ['B-1'] },
        digestOpts: { metrics: [{ kpiDefinitionId: kpiId, labelEn: 'A' }] },
      },
    });
    expect(stubbedGeneratorIds).not.toContain('end-of-day.v1');
    expect(stubbedGeneratorIds).not.toContain('executive-digest.v1');
    // Sanity: both loaders run and return non-stub ctx shapes
    const eod = await loaders['end-of-day.v1']();
    expect(Array.isArray(eod.summaries)).toBe(true);
    const dig = await loaders['executive-digest.v1']();
    expect(Array.isArray(dig.comparisons)).toBe(true);
  });

  test('without endOfDayOpts.branchIds → end-of-day stays on stub', () => {
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        models: { Alert: modelWithCount(0) },
        endOfDayOpts: {}, // no branchIds
      },
    });
    expect(stubbedGeneratorIds).toContain('end-of-day.v1');
    expect(typeof loaders['end-of-day.v1']).toBe('function');
  });

  test('without digestOpts.metrics → executive-digest stays on stub', () => {
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        models: { KpiValue: findRowsModel([]) },
        // digestOpts.metrics missing
      },
    });
    expect(stubbedGeneratorIds).toContain('executive-digest.v1');
    expect(typeof loaders['executive-digest.v1']).toBe('function');
  });
});
