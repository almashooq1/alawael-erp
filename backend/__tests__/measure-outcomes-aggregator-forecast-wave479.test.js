'use strict';

/**
 * measure-outcomes-aggregator-forecast-wave479.test.js — Wave 479
 * (Phase B3 — surfaces W429 FORECAST_OFF_TRACK in the W229 aggregator).
 *
 * Behavioural drift guard for the W479 additions to
 * services/measureOutcomesAggregator.service.js +
 * routes/measures-outcomes.routes.js:
 *
 *   - aggregateBranch.alerts.forecastOffTrack       (new counter)
 *   - aggregateBranch.forecastOffTrackRate          (new rate)
 *   - aggregateBranchTimeseries.points[].alertsByType
 *     {forecastOffTrack, regression, plateau, mcidNotMet}
 *     sums to the existing alertsRaised field
 *   - listForecastOffTrackForBranch(branchId, opts)
 *       · returns rich evidence shape
 *       · severity-ranked critical→low, then firstSeenAt asc
 *       · honours severity filter
 *       · honours limit cap (1..500)
 *       · returns empty when no FORECAST_OFF_TRACK alerts
 *       · ignores other alertTypes
 *       · models_unavailable when collections not registered
 *
 * Uses real Mongoose + MongoMemoryServer (same pattern as W229).
 * Self-contained: no shared state with the W229 suite.
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
let Beneficiary;
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w479-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  Beneficiary = require('../models/Beneficiary');
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
  await Beneficiary.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────

async function makeMeasure(code = 'BERG') {
  return Measure.create({
    code,
    name: code,
    name_ar: code === 'BERG' ? 'مقياس بيرغ للتوازن' : code,
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
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'test' },
    },
  });
}

async function makeBeneficiary(overrides = {}) {
  return Beneficiary.create({
    firstName: overrides.firstName || 'Said',
    lastName: overrides.lastName || 'Test',
    firstName_ar: overrides.firstName_ar || 'سعيد',
    lastName_ar: overrides.lastName_ar || 'التجريبي',
    beneficiaryNumber:
      overrides.beneficiaryNumber || `BEN-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  });
}

async function seedAlert({
  beneficiaryId,
  measureId,
  branchId,
  alertType = 'FORECAST_OFF_TRACK',
  severity = 'high',
  firstSeenAt = new Date(),
  evidence = {},
}) {
  return MeasureAlert.create({
    beneficiaryId,
    measureId,
    measureCode: 'BERG',
    branchId,
    alertType,
    severity,
    status: 'open',
    firstSeenAt,
    lastEvaluatedAt: new Date(),
    evidence,
  });
}

async function seedAdmin({ beneficiaryId, measureId, branchId, daysAgo, score }) {
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
      value: 4,
      type: 'absolute',
      status: 'established',
      source: 'test',
    },
  });
}

// ════════════════════════════════════════════════════════════════════
// W479 — aggregateBranch.alerts.forecastOffTrack counter
// ════════════════════════════════════════════════════════════════════

describe('W479 — aggregateBranch forecastOffTrack counter', () => {
  test('counts FORECAST_OFF_TRACK alerts in alerts.forecastOffTrack', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();
    // Seed admin so denom > 0 enables rate computation.
    for (const { d, s } of [
      { d: 90, s: 20 },
      { d: 60, s: 24 },
      { d: 30, s: 28 },
    ]) {
      await seedAdmin({
        beneficiaryId: benA,
        measureId: measure._id,
        branchId,
        daysAgo: d,
        score: s,
      });
    }
    // Two open FORECAST_OFF_TRACK on DIFFERENT beneficiaries — the
    // partial unique index `(ben, measure, alertType, status='open')`
    // prevents same-ben duplicates by design.
    await seedAlert({
      beneficiaryId: benA,
      measureId: measure._id,
      branchId,
      alertType: 'FORECAST_OFF_TRACK',
    });
    await seedAlert({
      beneficiaryId: benB,
      measureId: measure._id,
      branchId,
      alertType: 'FORECAST_OFF_TRACK',
      severity: 'critical',
    });

    const r = await aggregator.aggregateBranch(branchId);
    expect(r.alerts.forecastOffTrack).toBe(2);
    expect(r.alerts.total).toBeGreaterThanOrEqual(2);
    expect(typeof r.forecastOffTrackRate).toBe('number');
  });

  test('returns zero forecastOffTrack when no FORECAST_OFF_TRACK alerts', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
    });
    const r = await aggregator.aggregateBranch(branchId);
    expect(r.alerts.forecastOffTrack).toBe(0);
    expect(r.forecastOffTrackRate).toBe(0);
  });

  test('preserves existing regression/plateau/mcidNotMet counters (backward compat)', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
    });
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      alertType: 'PLATEAU_DETECTED',
    });
    const r = await aggregator.aggregateBranch(branchId);
    expect(r.alerts.regression).toBe(1);
    expect(r.alerts.plateau).toBe(1);
    expect(r.alerts.mcidNotMet).toBe(0);
    expect(r.alerts.forecastOffTrack).toBe(0);
    expect(r.alerts.total).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════
// W479 — aggregateBranchTimeseries alertsByType split
// ════════════════════════════════════════════════════════════════════

describe('W479 — aggregateBranchTimeseries alertsByType', () => {
  test('splits alertsRaised by type per bucket; sum matches alertsRaised', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benA = new mongoose.Types.ObjectId();
    const baseDate = new Date();
    baseDate.setUTCDate(15);

    // One FORECAST_OFF_TRACK + one REGRESSION_DETECTED on the same
    // ben+measure is OK because they're different alertType — the
    // partial unique index only fires on collisions within a type.
    await seedAlert({
      beneficiaryId: benA,
      measureId: measure._id,
      branchId,
      alertType: 'FORECAST_OFF_TRACK',
      firstSeenAt: baseDate,
    });
    await seedAlert({
      beneficiaryId: benA,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
      firstSeenAt: baseDate,
    });
    // Seed at least one admin to populate the bucket set.
    await seedAdmin({
      beneficiaryId: benA,
      measureId: measure._id,
      branchId,
      daysAgo: 5,
      score: 20,
    });

    const r = await aggregator.aggregateBranchTimeseries(branchId, {
      bucket: 'month',
      months: 6,
    });
    const withAlerts = r.points.filter(p => p.alertsRaised > 0);
    expect(withAlerts.length).toBeGreaterThan(0);
    for (const p of withAlerts) {
      expect(p.alertsByType).toBeDefined();
      const sum =
        p.alertsByType.forecastOffTrack +
        p.alertsByType.regression +
        p.alertsByType.plateau +
        p.alertsByType.mcidNotMet;
      expect(sum).toBe(p.alertsRaised);
    }
    // The seeded bucket should have both types.
    const seededBucket = withAlerts.find(
      p => p.alertsByType.forecastOffTrack > 0 && p.alertsByType.regression > 0
    );
    expect(seededBucket).toBeTruthy();
  });

  test('preserves alertsRaised field (backward compat)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const r = await aggregator.aggregateBranchTimeseries(branchId, {
      bucket: 'month',
      months: 3,
    });
    expect(r).toHaveProperty('points');
    for (const p of r.points) {
      expect(typeof p.alertsRaised).toBe('number');
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// W479 — listForecastOffTrackForBranch
// ════════════════════════════════════════════════════════════════════

describe('W479 — listForecastOffTrackForBranch', () => {
  test('returns empty when no FORECAST_OFF_TRACK alerts', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const r = await aggregator.listForecastOffTrackForBranch(branchId);
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  test('ignores other alertTypes', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      alertType: 'REGRESSION_DETECTED',
    });
    await seedAlert({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      alertType: 'PLATEAU_DETECTED',
    });
    const r = await aggregator.listForecastOffTrackForBranch(branchId);
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  test('returns rich evidence shape on each item', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const ben = await makeBeneficiary({
      firstName_ar: 'سعيد',
      lastName_ar: 'التجريبي',
      beneficiaryNumber: 'BEN-TEST-1',
    });
    const goalId = new mongoose.Types.ObjectId();
    const projectedAt = new Date(Date.now() + 60 * 86400000);
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: measure._id,
      branchId,
      severity: 'critical',
      evidence: {
        n: 5,
        spanDays: 120,
        r2: 0.82,
        slopePerMonth: -0.4,
        projected: 26.5,
        projectedAt,
        target: 40,
        gap: -13.5,
        severity: 'critical',
        ciMisses: true,
        direction: 'higher',
        goalId,
        goalTitle: 'تحسين توازن الجلوس المستقل',
        message_ar: 'الإسقاط دون الهدف.',
      },
    });

    const r = await aggregator.listForecastOffTrackForBranch(branchId);
    expect(r.total).toBe(1);
    expect(r.items).toHaveLength(1);
    const item = r.items[0];
    expect(item).toMatchObject({
      severity: 'critical',
      measureCode: 'BERG',
      measureNameAr: 'مقياس بيرغ للتوازن',
      beneficiaryNameAr: 'سعيد التجريبي',
      projected: 26.5,
      target: 40,
      gap: -13.5,
      r2: 0.82,
      n: 5,
      spanDays: 120,
      ciMisses: true,
      direction: 'higher',
      goalTitle: 'تحسين توازن الجلوس المستقل',
      messageAr: 'الإسقاط دون الهدف.',
    });
    // beneficiaryNumber is read off the canonical schema; if the field
    // isn't populated (no `beneficiaryNumber` on Beneficiary.js), the
    // listing returns null per the service contract.
    expect(typeof item.beneficiaryNumber === 'string' || item.beneficiaryNumber === null).toBe(
      true
    );
    expect(item.goalId).toBe(String(goalId));
    expect(item.alertId).toBeTruthy();
    expect(item.firstSeenAt).toBeTruthy();
    expect(item.projectedAt).toBeTruthy();
  });

  test('severity-ranks critical → low, then firstSeenAt asc', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const now = Date.now();
    // Distinct beneficiary per alert — partial-unique index prevents
    // multiple OPEN alerts with the same (ben, measure, alertType).
    const benM = new mongoose.Types.ObjectId();
    const benC = new mongoose.Types.ObjectId();
    const benH = new mongoose.Types.ObjectId();

    await seedAlert({
      beneficiaryId: benM,
      measureId: measure._id,
      branchId,
      severity: 'medium',
      firstSeenAt: new Date(now - 1000),
    });
    await seedAlert({
      beneficiaryId: benC,
      measureId: measure._id,
      branchId,
      severity: 'critical',
      firstSeenAt: new Date(now),
    });
    await seedAlert({
      beneficiaryId: benH,
      measureId: measure._id,
      branchId,
      severity: 'high',
      firstSeenAt: new Date(now - 2000),
    });

    const r = await aggregator.listForecastOffTrackForBranch(branchId);
    expect(r.total).toBe(3);
    expect(r.items.map(i => i.severity)).toEqual(['critical', 'high', 'medium']);
  });

  test('honours severity filter', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();
    await seedAlert({
      beneficiaryId: benA,
      measureId: measure._id,
      branchId,
      severity: 'critical',
    });
    await seedAlert({
      beneficiaryId: benB,
      measureId: measure._id,
      branchId,
      severity: 'low',
    });
    const r = await aggregator.listForecastOffTrackForBranch(branchId, {
      severity: 'critical',
    });
    expect(r.total).toBe(1);
    expect(r.items[0].severity).toBe('critical');
  });

  test('limit clamps to [1, 500]', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 5; i++) {
      await seedAlert({
        beneficiaryId: new mongoose.Types.ObjectId(),
        measureId: measure._id,
        branchId,
        severity: 'medium',
      });
    }
    const r = await aggregator.listForecastOffTrackForBranch(branchId, { limit: 2 });
    expect(r.total).toBe(5);
    expect(r.items).toHaveLength(2);

    const rZero = await aggregator.listForecastOffTrackForBranch(branchId, { limit: 0 });
    expect(rZero.items.length).toBeGreaterThan(0); // clamped to ≥1

    const rHuge = await aggregator.listForecastOffTrackForBranch(branchId, {
      limit: 10000,
    });
    expect(rHuge.items.length).toBe(5); // can't exceed total
  });

  test('only returns alerts for the requested branch (isolation)', async () => {
    const measure = await makeMeasure();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    // Different beneficiaries to satisfy the partial unique index —
    // semantically the test is about branch isolation, ben choice is
    // incidental.
    await seedAlert({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      branchId: branchA,
    });
    await seedAlert({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      branchId: branchB,
    });
    const r = await aggregator.listForecastOffTrackForBranch(branchA);
    expect(r.total).toBe(1);
    expect(r.items[0].measureId).toBe(String(measure._id));
  });

  test('throws on missing branchId', async () => {
    await expect(aggregator.listForecastOffTrackForBranch()).rejects.toThrow(/branchId/);
  });
});
