'use strict';

/**
 * measure-alert-engine-wave221.test.js — Wave 221.
 *
 * Verifies the alert engine that turns W219 trend output + W211b
 * frozen MCID into persistent MeasureAlert records.
 *
 *   Pure rules (no DB):
 *     - trend='regression' → REGRESSION_DETECTED (severity=high)
 *     - trend='plateau' AND spanDays>=90 → PLATEAU_DETECTED (medium)
 *     - trend='plateau' AND spanDays<90 → no plateau alert (too early)
 *     - <3 admins → no MCID_NOT_MET (need data)
 *     - 3 admins, no MCID delta hit, mcid established → MCID_NOT_MET
 *     - MCID delta hit → no MCID_NOT_MET (achieved)
 *     - MCID status=literature_pending → no MCID_NOT_MET (no claim)
 *
 *   DB integration via scanBeneficiaryMeasure():
 *     - Linearly improving series → no alerts
 *     - Regressing series → REGRESSION_DETECTED created
 *     - Re-scan idempotent (same alert refreshed, not duplicated)
 *     - Auto-resolve when condition clears (regression → improvement)
 *     - Partial unique index enforces at-most-one open per type
 *
 *   Lifecycle:
 *     - acknowledge() flips open → acknowledged
 *     - resolve() with mode=manual
 *     - dismiss() requires reason
 *     - Wave-18: dismissed without reason rejected
 *
 *   Cross-measure scan:
 *     - scanBeneficiary() walks every distinct measureId
 *
 *   Env off-switch:
 *     - MEASURE_ALERT_ENGINE=off → returns disabled with no DB work
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
let alertEngine;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w220-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  alertEngine = require('../services/measureAlertEngine.service');
  await MeasureApplication.init();
  await MeasureAlert.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureAlert.deleteMany({});
  delete process.env.MEASURE_ALERT_ENGINE;
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

async function seedAdmin({
  beneficiaryId,
  measureId,
  daysAgo,
  score,
  mcidStatus = 'established',
  mcidValue = 4,
}) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
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
      status: mcidStatus,
      source: 'Donoghue 2009',
    },
  });
}

// ─── Pure rules ───────────────────────────────────────────────────

describe('W221 — pure rules from trend', () => {
  const measure = {
    scoringDirection: 'higher_better',
    interpretation: { mcid: { value: 4, status: 'established' } },
  };

  test('regression trend → REGRESSION_DETECTED high', () => {
    const trend = {
      classification: 'regression',
      n: 5,
      spanDays: 120,
      firstScore: 50,
      lastScore: 30,
      slopePerMonth: -5,
      r2: 0.95,
    };
    const f = alertEngine._rulesFromTrend(trend, [], measure);
    const r = f.find(x => x.alertType === 'REGRESSION_DETECTED');
    expect(r).toBeTruthy();
    expect(r.severity).toBe('high');
    expect(r.evidence.slopePerMonth).toBe(-5);
  });

  test('plateau trend with spanDays>=90 → PLATEAU_DETECTED', () => {
    const trend = { classification: 'plateau', n: 4, spanDays: 100, slopePerMonth: 0.2 };
    const f = alertEngine._rulesFromTrend(trend, [], measure);
    expect(f.find(x => x.alertType === 'PLATEAU_DETECTED')).toBeTruthy();
  });

  test('plateau trend with spanDays<90 → no PLATEAU alert', () => {
    const trend = { classification: 'plateau', n: 3, spanDays: 60 };
    const f = alertEngine._rulesFromTrend(trend, [], measure);
    expect(f.find(x => x.alertType === 'PLATEAU_DETECTED')).toBeUndefined();
  });

  test('MCID_NOT_MET requires ≥3 admins', () => {
    const trend = { classification: 'slow_improvement', n: 2, spanDays: 60 };
    const admins = [
      {
        totalRawScore: 20,
        applicationDate: new Date('2026-01-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
      {
        totalRawScore: 22,
        applicationDate: new Date('2026-02-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
    ];
    const f = alertEngine._rulesFromTrend(trend, admins, measure);
    expect(f.find(x => x.alertType === 'MCID_NOT_MET')).toBeUndefined();
  });

  test('MCID_NOT_MET: 3 admins, best delta < MCID → alert', () => {
    const trend = { classification: 'slow_improvement', n: 3, spanDays: 90 };
    const admins = [
      {
        totalRawScore: 20,
        applicationDate: new Date('2026-01-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
      {
        totalRawScore: 21,
        applicationDate: new Date('2026-02-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
      {
        totalRawScore: 22,
        applicationDate: new Date('2026-03-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
    ];
    const f = alertEngine._rulesFromTrend(trend, admins, measure);
    const r = f.find(x => x.alertType === 'MCID_NOT_MET');
    expect(r).toBeTruthy();
    expect(r.evidence.bestAchievedDelta).toBe(2);
    expect(r.evidence.mcidValue).toBe(4);
  });

  test('MCID achieved → no MCID_NOT_MET alert', () => {
    const trend = { classification: 'linear_improvement', n: 3, spanDays: 90 };
    const admins = [
      {
        totalRawScore: 20,
        applicationDate: new Date('2026-01-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
      {
        totalRawScore: 25,
        applicationDate: new Date('2026-02-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
      {
        totalRawScore: 30,
        applicationDate: new Date('2026-03-01'),
        mcidAtAdministration: { value: 4, status: 'established' },
      },
    ];
    const f = alertEngine._rulesFromTrend(trend, admins, measure);
    expect(f.find(x => x.alertType === 'MCID_NOT_MET')).toBeUndefined();
  });

  test('MCID status=literature_pending → no MCID_NOT_MET (no claim)', () => {
    const trend = { classification: 'slow_improvement', n: 3 };
    const admins = [
      {
        totalRawScore: 20,
        applicationDate: new Date('2026-01-01'),
        mcidAtAdministration: { value: 4, status: 'literature_pending' },
      },
      {
        totalRawScore: 21,
        applicationDate: new Date('2026-02-01'),
        mcidAtAdministration: { value: 4, status: 'literature_pending' },
      },
      {
        totalRawScore: 22,
        applicationDate: new Date('2026-03-01'),
        mcidAtAdministration: { value: 4, status: 'literature_pending' },
      },
    ];
    const f = alertEngine._rulesFromTrend(trend, admins, measure);
    expect(f.find(x => x.alertType === 'MCID_NOT_MET')).toBeUndefined();
  });
});

// ─── DB integration ───────────────────────────────────────────────

describe('W221 — scanBeneficiaryMeasure() integration', () => {
  test('linearly improving series → no regression/plateau alert', async () => {
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
    const r = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    const types = r.alerts.map(a => a.alertType);
    expect(types).not.toContain('REGRESSION_DETECTED');
    expect(types).not.toContain('PLATEAU_DETECTED');
  });

  test('regressing series → REGRESSION_DETECTED created (open)', async () => {
    const measure = await makeBerg();
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
    const r = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    const reg = r.alerts.find(a => a.alertType === 'REGRESSION_DETECTED');
    expect(reg).toBeTruthy();
    expect(reg.status).toBe('open');
    expect(reg.severity).toBe('high');
  });

  test('re-scan is idempotent — refresh, not duplicate', async () => {
    const measure = await makeBerg();
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
    await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    const open = await MeasureAlert.find({ beneficiaryId: benId, status: 'open' }).lean();
    const reg = open.filter(a => a.alertType === 'REGRESSION_DETECTED');
    expect(reg).toHaveLength(1);
  });

  test('partial unique index blocks duplicate open insert', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await MeasureAlert.create({
      beneficiaryId: benId,
      measureId: measure._id,
      measureCode: 'BERG',
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
      status: 'open',
      evidence: { n: 4 },
    });
    await expect(
      MeasureAlert.create({
        beneficiaryId: benId,
        measureId: measure._id,
        measureCode: 'BERG',
        alertType: 'REGRESSION_DETECTED',
        severity: 'high',
        status: 'open',
        evidence: { n: 4 },
      })
    ).rejects.toThrow();
  });

  test('auto-resolve when condition clears', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    // Initial regressing series → REGRESSION fires.
    for (const item of [
      { d: 200, s: 50 },
      { d: 180, s: 40 },
      { d: 160, s: 30 },
      { d: 140, s: 20 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r1 = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    expect(r1.alerts.find(a => a.alertType === 'REGRESSION_DETECTED')).toBeTruthy();
    // Improvement turns around — add positive trend that overwhelms the early regression.
    for (const item of [
      { d: 90, s: 25 },
      { d: 60, s: 35 },
      { d: 30, s: 48 },
      { d: 5, s: 55 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r2 = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    const resolved = r2.autoResolved || [];
    expect(resolved.find(a => a.alertType === 'REGRESSION_DETECTED')).toBeTruthy();
    const stillOpen = await MeasureAlert.find({
      beneficiaryId: benId,
      alertType: 'REGRESSION_DETECTED',
      status: 'open',
    }).lean();
    expect(stillOpen).toHaveLength(0);
  });

  test('insufficient admins → skipped, no alerts', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 60, score: 30 });
    const r = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    expect(r.skipped).toBe('insufficient_admins');
  });

  test('inactive measure → skipped', async () => {
    const measure = await makeBerg({ status: 'deprecated' });
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 50 },
      { d: 90, s: 40 },
      { d: 60, s: 30 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    expect(r.skipped).toBe('measure_inactive');
  });
});

// ─── Lifecycle ─────────────────────────────────────────────────────

async function makeOpenAlert(MeasureAlert, benId, measure) {
  return MeasureAlert.create({
    beneficiaryId: benId,
    measureId: measure._id,
    measureCode: 'BERG',
    alertType: 'PLATEAU_DETECTED',
    severity: 'medium',
    status: 'open',
    evidence: { n: 4, spanDays: 120 },
  });
}

describe('W221 — alert lifecycle', () => {
  test('acknowledge flips open → acknowledged', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    const out = await alertEngine.acknowledge(a._id, new mongoose.Types.ObjectId());
    expect(out.status).toBe('acknowledged');
    expect(out.acknowledgedAt).toBeTruthy();
  });

  test('acknowledge refuses non-open', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    await alertEngine.acknowledge(a._id, new mongoose.Types.ObjectId());
    await expect(alertEngine.acknowledge(a._id)).rejects.toThrow(/cannot acknowledge/);
  });

  test('resolve flips → resolved with mode=manual', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    const out = await alertEngine.resolve(a._id, { actorId: new mongoose.Types.ObjectId() });
    expect(out.status).toBe('resolved');
    expect(out.resolutionMode).toBe('manual');
  });

  test('dismiss requires reason', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    await expect(alertEngine.dismiss(a._id, { reason: '' })).rejects.toThrow(
      /dismissalReason is required/
    );
  });

  test('dismiss flips → dismissed with reason', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    const out = await alertEngine.dismiss(a._id, {
      actorId: new mongoose.Types.ObjectId(),
      reason: 'patient discharged',
    });
    expect(out.status).toBe('dismissed');
    expect(out.dismissalReason).toBe('patient discharged');
  });

  test('cannot dismiss from resolved', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const a = await makeOpenAlert(MeasureAlert, benId, measure);
    await alertEngine.resolve(a._id);
    await expect(alertEngine.dismiss(a._id, { reason: 'too late' })).rejects.toThrow(
      /cannot dismiss from status=resolved/
    );
  });
});

// ─── Wave-18 invariants ────────────────────────────────────────────

describe('W221 — schema invariants', () => {
  test('status=resolved without resolvedAt is rejected', async () => {
    const measure = await makeBerg();
    const a = new MeasureAlert({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      measureCode: 'BERG',
      alertType: 'REGRESSION_DETECTED',
      status: 'resolved',
    });
    await expect(a.save()).rejects.toThrow(/resolvedAt required/);
  });

  test('status=dismissed without reason is rejected', async () => {
    const measure = await makeBerg();
    const a = new MeasureAlert({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      measureCode: 'BERG',
      alertType: 'REGRESSION_DETECTED',
      status: 'dismissed',
      dismissedAt: new Date(),
    });
    await expect(a.save()).rejects.toThrow(/dismissalReason required/);
  });
});

// ─── Cross-measure scan ────────────────────────────────────────────

describe('W221 — scanBeneficiary() walks every measure', () => {
  test('scans distinct measureIds for a beneficiary', async () => {
    const m1 = await makeBerg();
    const m2 = await makeBerg({ code: 'BERG-2', name: 'Berg-clone' });
    const benId = new mongoose.Types.ObjectId();
    for (const m of [m1, m2]) {
      for (const item of [
        { d: 120, s: 50 },
        { d: 90, s: 40 },
        { d: 60, s: 30 },
        { d: 30, s: 20 },
      ]) {
        await seedAdmin({ beneficiaryId: benId, measureId: m._id, daysAgo: item.d, score: item.s });
      }
    }
    const r = await alertEngine.scanBeneficiary(benId);
    expect(r.scanned).toBe(2);
    expect(r.alerts.filter(a => a.alertType === 'REGRESSION_DETECTED')).toHaveLength(2);
  });
});

// ─── Off-switch ─────────────────────────────────────────────────────

describe('W221 — env off-switch', () => {
  test('MEASURE_ALERT_ENGINE=off → disabled, no DB work', async () => {
    process.env.MEASURE_ALERT_ENGINE = 'off';
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 50 },
      { d: 90, s: 40 },
      { d: 60, s: 30 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await alertEngine.scanBeneficiaryMeasure(benId, measure._id);
    expect(r.disabled).toBe(true);
    expect(await MeasureAlert.countDocuments()).toBe(0);
  });
});
