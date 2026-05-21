'use strict';

/**
 * measure-outcomes-pairs-alerts-wave261.test.js — Wave 261.
 *
 * Tests the `alerts[]` extension added to `listMeasurePairsAt()` in
 * W261. W256 covers the per-pair shape; W257 covers scoreHistory;
 * this file only exercises the W221 alert events attached per pair so
 * the W260 detail chart can render vertical markers at firstSeenAt.
 *
 * Coverage:
 *   - pair with no alerts → alerts: []
 *   - pair with alerts → fields {id, alertType, severity, status,
 *     firstSeenAt, messageAr from evidence.message_ar}
 *   - alerts outside the window excluded
 *   - alerts ordered by firstSeenAt asc
 *   - independent grouping per beneficiary
 *
 * MongoMemoryServer pattern mirrors W256/W257.
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
let Beneficiary;
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w261-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  Beneficiary = require('../models/Beneficiary');
  aggregator = require('../services/measureOutcomesAggregator.service');
  await MeasureApplication.init();
  await MeasureAlert.init();
  await Beneficiary.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureAlert.deleteMany({});
  await Beneficiary.deleteMany({});
});

// ─── Fixtures ───────────────────────────────────────────────────────

async function makeMeasure({ code = 'BERG', name_ar = 'بيرغ', mcid = 4 } = {}) {
  return Measure.create({
    code,
    name: code,
    name_ar,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status: 'active',
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: mcid, type: 'absolute', status: 'established', source: 'test' },
      sdc: { value: 2, ci: 0.95 },
    },
  });
}

async function makeBeneficiary({ firstName_ar = 'علي' } = {}) {
  return Beneficiary.create({
    firstName: 'TestFirst',
    lastName: 'TestLast',
    firstName_ar,
    lastName_ar: '',
    beneficiaryNumber: `B-${Math.floor(Math.random() * 1000000)}`,
    gender: 'male',
    dateOfBirth: new Date('2015-01-01'),
    nationality: 'SA',
    branchId: new mongoose.Types.ObjectId(),
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

async function seedAlert({
  beneficiaryId,
  measureId,
  measureCode = 'BERG',
  alertType = 'REGRESSION_DETECTED',
  severity = 'high',
  daysAgo,
  message_ar = null,
  status = 'open',
}) {
  return MeasureAlert.create({
    beneficiaryId,
    measureId,
    measureCode,
    alertType,
    severity,
    status,
    firstSeenAt: new Date(Date.now() - daysAgo * 86400000),
    lastEvaluatedAt: new Date(Date.now() - daysAgo * 86400000),
    evidence: {
      n: 4,
      classification: 'regression',
      slopePerMonth: -1.5,
      message_ar: message_ar || 'تراجع ملحوظ في الأداء خلال الفترة الأخيرة',
    },
  });
}

describe('W261 — listMeasurePairsAt.alerts', () => {
  test('pair with no alerts → alerts: []', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 60, s: 18 },
      { d: 30, s: 22 },
      { d: 5, s: 26 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].alerts).toEqual([]);
  });

  test('pair with alerts → populated rows with message_ar surfaced as messageAr', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 60, s: 26 },
      { d: 30, s: 22 },
      { d: 5, s: 18 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      daysAgo: 20,
      message_ar: 'تراجع حاد في توازن الجسم',
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
    });
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    expect(r.pairs).toHaveLength(1);
    const a = r.pairs[0].alerts;
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
      status: 'open',
      messageAr: 'تراجع حاد في توازن الجسم',
    });
    expect(typeof a[0].id).toBe('string');
    expect(typeof a[0].firstSeenAt).toBe('string'); // ISO
    expect(a[0].acknowledgedAt).toBeNull();
    expect(a[0].resolvedAt).toBeNull();
    expect(a[0].dismissedAt).toBeNull();
  });

  test('alerts outside the window are excluded', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    // Admins inside the wide window
    for (const item of [
      { d: 150, s: 26 },
      { d: 100, s: 22 },
      { d: 30, s: 18 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    // One alert inside, one outside
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      daysAgo: 40,
      message_ar: 'داخل النافذة',
    });
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      alertType: 'PLATEAU_DETECTED',
      daysAgo: 300, // way before
      message_ar: 'خارج النافذة',
      severity: 'medium',
    });
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
      from: new Date(Date.now() - 200 * 86400000), // 200d back
    });
    expect(r.pairs).toHaveLength(1);
    const a = r.pairs[0].alerts;
    expect(a).toHaveLength(1);
    expect(a[0].messageAr).toBe('داخل النافذة');
  });

  test('alerts ordered by firstSeenAt asc', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 80, s: 26 },
      { d: 40, s: 22 },
      { d: 5, s: 18 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    // Seed out of chronological order
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      daysAgo: 10,
      message_ar: 'الأحدث',
    });
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      alertType: 'MCID_NOT_MET',
      daysAgo: 70,
      message_ar: 'الأقدم',
    });
    await seedAlert({
      beneficiaryId: ben._id,
      measureId: berg._id,
      alertType: 'PLATEAU_DETECTED',
      daysAgo: 35,
      message_ar: 'الأوسط',
    });
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    const a = r.pairs[0].alerts;
    expect(a.map(x => x.messageAr)).toEqual(['الأقدم', 'الأوسط', 'الأحدث']);
    const times = a.map(x => new Date(x.firstSeenAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  test('alerts grouped independently per beneficiary', async () => {
    const berg = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = await makeBeneficiary({ firstName_ar: 'علي' });
    const ben2 = await makeBeneficiary({ firstName_ar: 'سارة' });
    for (const item of [
      { d: 60, s: 26 },
      { d: 30, s: 22 },
      { d: 5, s: 18 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben1._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
      await seedAdmin({
        beneficiaryId: ben2._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s + 4,
      });
    }
    await seedAlert({
      beneficiaryId: ben1._id,
      measureId: berg._id,
      daysAgo: 25,
      message_ar: 'علي — تراجع',
    });
    await seedAlert({
      beneficiaryId: ben2._id,
      measureId: berg._id,
      daysAgo: 10,
      alertType: 'PLATEAU_DETECTED',
      message_ar: 'سارة — ثبات',
    });
    await seedAlert({
      beneficiaryId: ben2._id,
      measureId: berg._id,
      daysAgo: 40,
      alertType: 'MCID_NOT_MET',
      message_ar: 'سارة — لم يبلغ MCID',
    });
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    expect(r.pairs).toHaveLength(2);
    const byBen = Object.fromEntries(r.pairs.map(p => [p.beneficiaryNameAr, p.alerts]));
    expect(byBen['علي']).toHaveLength(1);
    expect(byBen['علي'][0].messageAr).toBe('علي — تراجع');
    expect(byBen['سارة']).toHaveLength(2);
    expect(byBen['سارة'].map(x => x.messageAr)).toEqual(['سارة — لم يبلغ MCID', 'سارة — ثبات']);
  });
});
