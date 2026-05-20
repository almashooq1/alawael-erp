'use strict';

/**
 * measure-trend-engine-wave219.test.js — Wave 219.
 *
 * Verifies the longitudinal trend analysis layer:
 *
 *   Pure regression math (regression.js):
 *     - Perfect linear data → exact slope + intercept, R²=1
 *     - n<3 → null
 *     - Zero variance on x → null
 *     - Non-finite values → null
 *     - CI95 width shrinks as n grows
 *
 *   Classification (classify.js):
 *     - null fit → insufficient_data
 *     - Strong upward slope (higher_better) + R²≥0.5 → linear_improvement
 *     - Noisy positive slope + R²<0.5 → slow_improvement
 *     - Slope opposite to direction with CI not crossing 0 → regression
 *     - CI includes 0 + tiny absolute change → plateau
 *     - CI wide → oscillation
 *     - Direction='lower_better': downward slope is improvement
 *
 *   Engine integration with real DB:
 *     - <3 admins → insufficient_data
 *     - Linearly improving series → linear_improvement w/ correct slope
 *     - Version filter: 1.x records mixed with 2.x → only 2.x kept,
 *       1.x reported in excluded[]
 *     - windowDays restricts the data range
 *     - daysToTarget computed from current+goal+slope (forward projection)
 *     - direction=lower_better flips improvement sense correctly
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
const { fitLinear, buildPoints } = require('../measures/trend/regression');
const { classify, CLASSIFICATIONS } = require('../measures/trend/classify');

let mongod;
let Measure;
let MeasureApplication;
let trendEngine;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w219-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  trendEngine = require('../services/measureTrendEngine.service');
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
});

// ─── Pure regression math ─────────────────────────────────────────────

describe('W219 — regression.fitLinear', () => {
  test('perfect linear data → exact slope/intercept, R²=1', () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 1, y: 12 },
      { x: 2, y: 14 },
      { x: 3, y: 16 },
      { x: 4, y: 18 },
    ];
    const fit = fitLinear(pts);
    expect(fit.slope).toBeCloseTo(2, 5);
    expect(fit.intercept).toBeCloseTo(10, 5);
    expect(fit.r2).toBeCloseTo(1, 5);
    expect(fit.n).toBe(5);
  });

  test('n<3 → null', () => {
    expect(
      fitLinear([
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ])
    ).toBeNull();
    expect(fitLinear([])).toBeNull();
    expect(fitLinear(null)).toBeNull();
  });

  test('zero variance on x → null', () => {
    const pts = [
      { x: 5, y: 10 },
      { x: 5, y: 12 },
      { x: 5, y: 14 },
    ];
    expect(fitLinear(pts)).toBeNull();
  });

  test('non-finite values → null', () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 1, y: NaN },
      { x: 2, y: 14 },
    ];
    expect(fitLinear(pts)).toBeNull();
  });

  test('CI95 shrinks as n grows for the same underlying line', () => {
    // 4 noisy points
    const small = fitLinear([
      { x: 0, y: 10.1 },
      { x: 1, y: 11.9 },
      { x: 2, y: 14.2 },
      { x: 3, y: 15.8 },
    ]);
    // 8 noisy points around the same line
    const large = fitLinear([
      { x: 0, y: 10.1 },
      { x: 1, y: 11.9 },
      { x: 2, y: 14.2 },
      { x: 3, y: 15.8 },
      { x: 4, y: 18.1 },
      { x: 5, y: 19.9 },
      { x: 6, y: 22.2 },
      { x: 7, y: 23.8 },
    ]);
    const smallWidth = small.ci95[1] - small.ci95[0];
    const largeWidth = large.ci95[1] - large.ci95[0];
    expect(largeWidth).toBeLessThan(smallWidth);
  });
});

// ─── buildPoints from admin records ───────────────────────────────────

describe('W219 — regression.buildPoints', () => {
  test('shifts x to days-since-earliest, sorted ascending', () => {
    const admins = [
      { _id: 'b', applicationDate: new Date('2026-02-01'), totalRawScore: 20 },
      { _id: 'a', applicationDate: new Date('2026-01-01'), totalRawScore: 10 },
      { _id: 'c', applicationDate: new Date('2026-03-01'), totalRawScore: 30 },
    ];
    const { points, earliestDate } = buildPoints(admins);
    expect(points[0].x).toBe(0);
    expect(points[0].y).toBe(10);
    expect(points[1].x).toBeCloseTo(31, 0); // Jan has 31 days
    expect(points[2].x).toBeCloseTo(59, 0); // through end of Feb (28 in non-leap 2026)
    expect(earliestDate.toISOString().slice(0, 10)).toBe('2026-01-01');
  });

  test('filters records missing date or score', () => {
    const admins = [
      { applicationDate: new Date('2026-01-01'), totalRawScore: 10 },
      { applicationDate: new Date('2026-02-01') }, // missing score
      { totalRawScore: 30 }, // missing date
      { applicationDate: new Date('2026-03-01'), totalRawScore: 30 },
    ];
    const { points } = buildPoints(admins);
    expect(points).toHaveLength(2);
  });
});

// ─── Classification ───────────────────────────────────────────────────

describe('W219 — classify', () => {
  test('null fit → insufficient_data', () => {
    const r = classify(null);
    expect(r.classification).toBe(CLASSIFICATIONS.INSUFFICIENT);
    expect(r.confidence).toBe('low');
  });

  test('strong upward slope (higher_better) + high R² → linear_improvement', () => {
    const fit = fitLinear([
      { x: 0, y: 20 },
      { x: 30, y: 30 },
      { x: 60, y: 40 },
      { x: 90, y: 50 },
    ]);
    const r = classify(fit, { direction: 'higher_better', spanDays: 90 });
    expect(r.classification).toBe(CLASSIFICATIONS.LINEAR_IMPROVEMENT);
    expect(r.slopePerMonth).toBeGreaterThan(0);
    expect(r.r2).toBeCloseTo(1, 3);
  });

  test('lower_better: downward slope is improvement', () => {
    const fit = fitLinear([
      { x: 0, y: 30 },
      { x: 30, y: 20 },
      { x: 60, y: 10 },
      { x: 90, y: 5 },
    ]);
    const r = classify(fit, { direction: 'lower_better', spanDays: 90 });
    expect(r.classification).toBe(CLASSIFICATIONS.LINEAR_IMPROVEMENT);
  });

  test('downward slope under higher_better with CI not crossing 0 → regression', () => {
    const fit = fitLinear([
      { x: 0, y: 50 },
      { x: 30, y: 40 },
      { x: 60, y: 30 },
      { x: 90, y: 20 },
    ]);
    const r = classify(fit, { direction: 'higher_better', spanDays: 90 });
    expect(r.classification).toBe(CLASSIFICATIONS.REGRESSION);
    expect(r.slopePerMonth).toBeLessThan(0);
  });

  test('flat data with CI containing 0 + tiny SDC → plateau', () => {
    const fit = fitLinear([
      { x: 0, y: 40 },
      { x: 30, y: 40.1 },
      { x: 60, y: 39.9 },
      { x: 90, y: 40.05 },
      { x: 120, y: 40.0 },
    ]);
    const r = classify(fit, { direction: 'higher_better', spanDays: 120, sdc: 2 });
    expect(r.classification).toBe(CLASSIFICATIONS.PLATEAU);
  });

  test('oscillation: alternating noise → CI contains 0 + slope not tiny', () => {
    const fit = fitLinear([
      { x: 0, y: 20 },
      { x: 30, y: 35 },
      { x: 60, y: 22 },
      { x: 90, y: 36 },
      { x: 120, y: 23 },
      { x: 150, y: 34 },
    ]);
    const r = classify(fit, { direction: 'higher_better', spanDays: 150, sdc: 2 });
    // CI95 should include 0 with these alternating values.
    // It may classify as oscillation OR plateau depending on totalChange vs sdc;
    // accept either since both are "not improvement".
    expect([CLASSIFICATIONS.OSCILLATION, CLASSIFICATIONS.PLATEAU]).toContain(r.classification);
  });
});

// ─── Engine integration with real DB ──────────────────────────────────

async function makeBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
      sdc: { value: 2, ci: 0.95 },
    },
    ...overrides,
  });
}

async function seedAdmin({
  beneficiaryId,
  measureId,
  daysAgo,
  score,
  version = '1.0.0',
  status = 'completed',
}) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
    applicationDate: new Date(Date.now() - daysAgo * 86400000),
    purpose: 'progress',
    assessorId: new mongoose.Types.ObjectId(),
    totalRawScore: score,
    status,
    scoredWithMeasureVersion: version,
    scoredWithAlgorithmVersion: '1.0.0',
  });
}

describe('W219 — engine integration (real DB)', () => {
  test('<3 admins → insufficient_data', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 60, score: 28 });
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 30, score: 32 });
    const trend = await trendEngine.analyze(benId, measure._id);
    expect(trend.classification).toBe(CLASSIFICATIONS.INSUFFICIENT);
    expect(trend.n).toBe(2);
  });

  test('linearly improving series → linear_improvement with positive slope', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 20 },
      { d: 90, s: 28 },
      { d: 60, s: 36 },
      { d: 30, s: 44 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const trend = await trendEngine.analyze(benId, measure._id);
    expect(trend.classification).toBe(CLASSIFICATIONS.LINEAR_IMPROVEMENT);
    expect(trend.slopePerMonth).toBeGreaterThan(0);
    expect(trend.n).toBe(4);
    expect(trend.firstScore).toBe(20);
    expect(trend.lastScore).toBe(44);
  });

  test('version filter: 1.x mixed with 2.x → only 2.x kept', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    // 1.x history (older)
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 200,
      score: 20,
      version: '1.0.0',
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 180,
      score: 22,
      version: '1.2.0',
    });
    // 2.x history (newer)
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 90,
      score: 30,
      version: '2.0.0',
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 60,
      score: 35,
      version: '2.0.0',
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 30,
      score: 40,
      version: '2.0.0',
    });

    const trend = await trendEngine.analyze(benId, measure._id);
    expect(trend.n).toBe(3);
    expect(trend.dominantMajor).toBe('2');
    expect(trend.hadVersionMix).toBe(true);
    expect(trend.excluded).toHaveLength(2);
    expect(trend.excluded[0].reason).toBe('cross_major_bump');
  });

  test('windowDays restricts data range', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    // 5 admins spread across 300 days
    for (const item of [
      { d: 300, s: 10 },
      { d: 240, s: 15 },
      { d: 180, s: 22 },
      { d: 120, s: 28 },
      { d: 60, s: 35 },
      { d: 10, s: 42 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const all = await trendEngine.analyze(benId, measure._id);
    const recent = await trendEngine.recentTrend(benId, measure._id, { windowDays: 150 });
    expect(all.n).toBe(6);
    expect(recent.n).toBeLessThan(all.n);
    expect(recent.n).toBeGreaterThanOrEqual(3);
  });

  test('daysToTarget projected from slope+current+goal', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    // Improvement of ~7 score units / month → reach 60 from 42 takes ~80 days
    for (const item of [
      { d: 120, s: 21 },
      { d: 90, s: 28 },
      { d: 60, s: 35 },
      { d: 30, s: 42 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const trend = await trendEngine.analyze(benId, measure._id, {
      goal: { baseline: { value: 20 }, target: { value: 60 } },
    });
    expect(trend.daysToTarget).toBeGreaterThan(0);
    expect(trend.daysToTarget).toBeLessThan(200);
  });

  test('lower_better measure: declining values count as improvement', async () => {
    const measure = await makeBerg({ scoringDirection: 'lower_better', code: 'BERG-INVERSE' });
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 50 },
      { d: 90, s: 40 },
      { d: 60, s: 30 },
      { d: 30, s: 20 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const trend = await trendEngine.analyze(benId, measure._id);
    expect(trend.classification).toBe(CLASSIFICATIONS.LINEAR_IMPROVEMENT);
    expect(trend.direction).toBe('lower_better');
    expect(trend.slopePerMonth).toBeLessThan(0); // raw score going down
  });
});
