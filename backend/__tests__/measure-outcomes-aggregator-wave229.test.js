'use strict';

/**
 * measure-outcomes-aggregator-wave229.test.js — Wave 229.
 *
 * Verifies the rollup service that feeds dashboards + monthly reports.
 *
 *   Pure helpers:
 *     - _deriveOverallStatus: each branch of the heuristic
 *     - _monthBucket: YYYY-MM stable across timezones
 *     - _quarterBucket: YYYY-Qn
 *
 *   aggregateBeneficiary:
 *     - empty (no admins) → insufficient
 *     - admins only, no alerts → status reflects trend
 *     - regression alert → concerning
 *     - failed goal → concerning
 *     - improving + open plateau alert → mixed
 *     - improving + no concerning signals → progressing
 *     - MCID achievement flagged per measure when delta >= mcidValue
 *
 *   aggregateBranch:
 *     - empty branch returns zero rates
 *     - thin-history pairs land in pairsThinHistory, not denom
 *     - rich-history MCID achievement counted correctly
 *     - alerts open at branch level rolled by type
 *     - goal counts rolled by status
 *
 *   aggregateBranchTimeseries:
 *     - bucketing by month groups across days
 *     - bucketing by quarter groups across months
 *     - admins + alerts merged into the same key set, sorted ascending
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureApplication;
let MeasureAlert;
let MeasureReassessmentTask;
let TherapeuticGoal;
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w227-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  aggregator = require('../services/measureOutcomesAggregator.service');
  await MeasureApplication.init();
  await MeasureAlert.init();
  await MeasureReassessmentTask.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureAlert.deleteMany({});
  await MeasureReassessmentTask.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

// ─── Pure helpers ─────────────────────────────────────────────────

describe('W229 — pure helpers', () => {
  test('_deriveOverallStatus: regression alert → concerning', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: { REGRESSION_DETECTED: 1 },
      measures: [{ trend: 'linear_improvement' }],
      goals: [],
    });
    expect(s).toBe('concerning');
  });

  test('_deriveOverallStatus: failed goal → concerning', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: {},
      measures: [{ trend: 'linear_improvement' }],
      goals: [{ status: 'not_achieved' }],
    });
    expect(s).toBe('concerning');
  });

  test('_deriveOverallStatus: improving + plateau alert → mixed', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: { PLATEAU_DETECTED: 1 },
      measures: [{ trend: 'linear_improvement' }],
      goals: [],
    });
    expect(s).toBe('mixed');
  });

  test('_deriveOverallStatus: improving + no concerning → progressing', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: {},
      measures: [{ trend: 'linear_improvement' }, { trend: 'slow_improvement' }],
      goals: [{ status: 'active' }],
    });
    expect(s).toBe('progressing');
  });

  test('_deriveOverallStatus: no measures → insufficient', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: {},
      measures: [],
      goals: [],
    });
    expect(s).toBe('insufficient');
  });

  test('_deriveOverallStatus: no improving signals → mixed', () => {
    const s = aggregator._deriveOverallStatus({
      alertsByType: {},
      measures: [{ trend: 'oscillation' }],
      goals: [],
    });
    expect(s).toBe('mixed');
  });

  test('_monthBucket: YYYY-MM with zero-pad', () => {
    expect(aggregator._monthBucket(new Date('2026-01-15'))).toBe('2026-01');
    expect(aggregator._monthBucket(new Date('2026-11-30'))).toBe('2026-11');
  });

  test('_quarterBucket: YYYY-Qn', () => {
    expect(aggregator._quarterBucket(new Date('2026-01-15'))).toBe('2026-Q1');
    expect(aggregator._quarterBucket(new Date('2026-04-01'))).toBe('2026-Q2');
    expect(aggregator._quarterBucket(new Date('2026-12-31'))).toBe('2026-Q4');
  });
});

// ─── Fixtures ─────────────────────────────────────────────────────

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

async function seedAdmin({ beneficiaryId, measureId, branchId, daysAgo, score, mcidValue = 4 }) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
    branchId,
    applicationDate: new Date(Date.now() - daysAgo * 86400000),
    purpose: 'progress',
    assessorId: new mongoose.Types.ObjectId(),
    totalRawScore: score,
    status: 'completed',
    scoredWithMeasureVersion: '1.0.0',
    scoredWithAlgorithmVersion: '1.0.0',
    mcidAtAdministration: {
      value: mcidValue,
      type: 'absolute',
      status: 'established',
      source: 'Donoghue 2009',
    },
  });
}

async function seedAlert({ beneficiaryId, measureId, branchId, alertType, severity = 'high' }) {
  return MeasureAlert.create({
    beneficiaryId,
    measureId,
    measureCode: 'BERG',
    branchId,
    alertType,
    severity,
    status: 'open',
    evidence: { n: 4 },
  });
}

// ─── aggregateBeneficiary ─────────────────────────────────────────

describe('W229 — aggregateBeneficiary', () => {
  test('empty (no admins) → insufficient', async () => {
    const r = await aggregator.aggregateBeneficiary(new mongoose.Types.ObjectId());
    expect(r.overallStatus).toBe('insufficient');
    expect(r.measures).toHaveLength(0);
  });

  test('linearly improving series → measures populated + MCID achieved', async () => {
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
    const r = await aggregator.aggregateBeneficiary(benId);
    expect(r.measures).toHaveLength(1);
    const bergRow = r.measures[0];
    expect(bergRow.measureCode).toBe('BERG');
    expect(bergRow.baselineScore).toBe(20);
    expect(bergRow.latestScore).toBe(44);
    expect(bergRow.deltaFromBaseline).toBe(24);
    expect(bergRow.mcidAchieved).toBe(true); // 24 >= 4
    expect(bergRow.trend).toBeTruthy();
  });

  test('regression alert open → status=concerning', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 50 },
      { d: 60, s: 30 },
      { d: 30, s: 15 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      alertType: 'REGRESSION_DETECTED',
    });
    const r = await aggregator.aggregateBeneficiary(benId);
    expect(r.alerts.open).toBe(1);
    expect(r.alerts.byType.REGRESSION_DETECTED).toBe(1);
    expect(r.overallStatus).toBe('concerning');
  });

  test('failed goal → status=concerning', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 28 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'Goal',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 100 },
      status: 'not_achieved',
    });
    const r = await aggregator.aggregateBeneficiary(benId);
    expect(r.goals.total).toBe(1);
    expect(r.overallStatus).toBe('concerning');
  });

  test('overdue tasks counted', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    // Seed at least one admin so the aggregator doesn't early-return.
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 30, score: 30 });
    await MeasureReassessmentTask.create({
      beneficiaryId: benId,
      measureId: measure._id,
      measureCode: 'BERG',
      dueAt: new Date(Date.now() - 10 * 86400000), // 10 days overdue
      status: 'pending',
    });
    const r = await aggregator.aggregateBeneficiary(benId);
    expect(r.tasks.pending).toBe(1);
    expect(r.tasks.overdue).toBe(1);
  });
});

// ─── aggregateBranch ───────────────────────────────────────────────

describe('W229 — aggregateBranch', () => {
  test('empty branch returns zeros', async () => {
    const r = await aggregator.aggregateBranch(new mongoose.Types.ObjectId());
    expect(r.beneficiariesWithAdmin).toBe(0);
    expect(r.mcidAchievementRate).toBe(0);
    expect(r.pairsAnalysed).toBe(0);
  });

  test('thin-history pairs land in pairsThinHistory, not denom', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = new mongoose.Types.ObjectId();
    const ben2 = new mongoose.Types.ObjectId();
    // ben1: 3 admins, MCID achieved (20→28→40)
    for (const item of [
      { d: 80, s: 20 },
      { d: 50, s: 28 },
      { d: 20, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben1,
        measureId: measure._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    // ben2: only 2 admins (thin) — should NOT count in denom
    for (const item of [
      { d: 50, s: 30 },
      { d: 20, s: 32 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben2,
        measureId: measure._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await aggregator.aggregateBranch(branchId);
    expect(r.pairsAnalysed).toBe(1);
    expect(r.pairsThinHistory).toBe(1);
    expect(r.mcidAchievedCount).toBe(1);
    expect(r.mcidAchievementRate).toBe(1); // 1/1
    expect(r.beneficiariesWithAdmin).toBe(2);
    expect(r.administrationsTotal).toBe(5);
  });

  test('open alerts rolled by type', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben = new mongoose.Types.ObjectId();
    await seedAlert({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
    });
    await seedAlert({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      alertType: 'PLATEAU_DETECTED',
      severity: 'medium',
    });
    const r = await aggregator.aggregateBranch(branchId);
    expect(r.alerts.total).toBe(2);
    expect(r.alerts.regression).toBe(1);
    expect(r.alerts.plateau).toBe(1);
  });

  test('goal counts rolled by status', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await TherapeuticGoal.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'A',
      type: 'short_term',
      branchId,
      startDate: new Date(),
      target: { value: 100 },
      status: 'active',
    });
    await TherapeuticGoal.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'B',
      type: 'short_term',
      branchId,
      startDate: new Date(),
      target: { value: 100 },
      status: 'achieved',
    });
    const r = await aggregator.aggregateBranch(branchId);
    expect(r.goals.total).toBe(2);
    expect(r.goals.active).toBe(1);
    expect(r.goals.achieved).toBe(1);
    expect(r.goals.achievedRate).toBe(0.5);
  });
});

// ─── aggregateBranchTimeseries ─────────────────────────────────────

describe('W229 — aggregateBranchTimeseries', () => {
  test('month buckets group across days', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben = new mongoose.Types.ObjectId();
    // 3 admins in same month, 1 admin in a different month
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 5,
      score: 30,
    });
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 10,
      score: 28,
    });
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 20,
      score: 25,
    });
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 60,
      score: 20,
    });

    const r = await aggregator.aggregateBranchTimeseries(branchId, { bucket: 'month', months: 6 });
    expect(r.bucket).toBe('month');
    expect(r.points.length).toBeGreaterThanOrEqual(2);
    const totalAdmins = r.points.reduce((acc, p) => acc + p.administrations, 0);
    expect(totalAdmins).toBe(4);
    // Verify ascending order
    const buckets = r.points.map(p => p.bucket);
    const sorted = [...buckets].sort();
    expect(buckets).toEqual(sorted);
  });

  test('quarter buckets group across months', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben = new mongoose.Types.ObjectId();
    // 2 admins in past month (current quarter)
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 10,
      score: 30,
    });
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 40,
      score: 25,
    });
    // 1 admin 5 months ago (likely different quarter)
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 150,
      score: 20,
    });

    const r = await aggregator.aggregateBranchTimeseries(branchId, {
      bucket: 'quarter',
      months: 6,
    });
    expect(r.bucket).toBe('quarter');
    const totalAdmins = r.points.reduce((acc, p) => acc + p.administrations, 0);
    expect(totalAdmins).toBe(3);
    // Quarter labels match Qn pattern
    for (const p of r.points) {
      expect(p.bucket).toMatch(/^\d{4}-Q[1-4]$/);
    }
  });

  test('alerts merged into time series alongside admins', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben = new mongoose.Types.ObjectId();
    await seedAdmin({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      daysAgo: 10,
      score: 30,
    });
    await seedAlert({
      beneficiaryId: ben,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
    });
    const r = await aggregator.aggregateBranchTimeseries(branchId, { bucket: 'month', months: 6 });
    const totalAlerts = r.points.reduce((acc, p) => acc + p.alertsRaised, 0);
    expect(totalAlerts).toBe(1);
  });
});
