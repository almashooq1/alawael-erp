'use strict';

/**
 * measure-outcomes-pairs-alert-attribution-wave262.test.js — Wave 262.
 *
 * Extends W261 (`alerts[]` per pair on listMeasurePairsAt) with actor
 * attribution + dismissal/resolution context fields:
 *   - acknowledgedBy {id, fullName}
 *   - resolvedBy {id, fullName} + resolutionMode
 *   - dismissedBy {id, fullName} + dismissalReason
 *   - notes
 *
 * Pure-additive shape extension; existing W261 invariants (sort, window,
 * grouping) re-asserted lightly to catch regressions.
 *
 * MongoMemoryServer pattern mirrors W256 / W257 / W261.
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
let User;
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w262-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  Beneficiary = require('../models/Beneficiary');
  User = require('../models/User');
  aggregator = require('../services/measureOutcomesAggregator.service');
  await MeasureApplication.init();
  await MeasureAlert.init();
  await Beneficiary.init();
  await User.init();
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
  await User.deleteMany({});
});

// ─── Fixtures ───────────────────────────────────────────────────────

async function makeMeasure({ code = 'BERG', mcid = 4 } = {}) {
  return Measure.create({
    code,
    name: code,
    name_ar: 'بيرغ',
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

async function makeUser({ fullName }) {
  return User.create({
    fullName,
    email: `user-${Math.floor(Math.random() * 1000000)}@test.local`,
    isActive: true,
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

async function seedAlert(overrides) {
  return MeasureAlert.create({
    measureCode: 'BERG',
    alertType: 'REGRESSION_DETECTED',
    severity: 'high',
    status: 'open',
    firstSeenAt: new Date(Date.now() - (overrides.daysAgo ?? 10) * 86400000),
    lastEvaluatedAt: new Date(Date.now() - (overrides.daysAgo ?? 10) * 86400000),
    evidence: {
      n: 4,
      classification: 'regression',
      slopePerMonth: -1.5,
      message_ar: overrides.message_ar || 'تراجع ملحوظ',
    },
    ...overrides,
  });
}

describe('W262 — listMeasurePairsAt.alerts actor attribution', () => {
  test('open alert → all *By/Reason/Mode/notes fields null', async () => {
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
    });
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    const a = r.pairs[0].alerts[0];
    expect(a.acknowledgedBy).toBeNull();
    expect(a.resolvedBy).toBeNull();
    expect(a.dismissedBy).toBeNull();
    expect(a.dismissalReason).toBeNull();
    expect(a.resolutionMode).toBeNull();
    expect(a.notes).toBeNull();
  });

  test('dismissed alert → dismissedBy.fullName + dismissalReason surfaced', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const dr = await makeUser({ fullName: 'د. أحمد العامري' });
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
      status: 'dismissed',
      dismissedAt: new Date(Date.now() - 5 * 86400000),
      dismissedBy: dr._id,
      dismissalReason: 'تراجع مؤقت مرتبط بمرض عابر — لا يَستلزم تدخّلاً',
      notes: 'سيُعاد التقييم بعد التعافي',
    });
    const a = (await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id })).pairs[0]
      .alerts[0];
    expect(a.status).toBe('dismissed');
    expect(a.dismissedBy).toEqual({ id: String(dr._id), fullName: 'د. أحمد العامري' });
    expect(a.dismissalReason).toBe('تراجع مؤقت مرتبط بمرض عابر — لا يَستلزم تدخّلاً');
    expect(a.notes).toBe('سيُعاد التقييم بعد التعافي');
  });

  test('resolved alert → resolvedBy + resolutionMode surfaced', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const dr = await makeUser({ fullName: 'د. سارة المحمد' });
    const branchId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 60, s: 18 },
      { d: 30, s: 22 },
      { d: 5, s: 28 },
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
      daysAgo: 30,
      status: 'resolved',
      resolvedAt: new Date(Date.now() - 10 * 86400000),
      resolvedBy: dr._id,
      resolutionMode: 'manual',
    });
    const a = (await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id })).pairs[0]
      .alerts[0];
    expect(a.status).toBe('resolved');
    expect(a.resolvedBy).toEqual({ id: String(dr._id), fullName: 'د. سارة المحمد' });
    expect(a.resolutionMode).toBe('manual');
  });

  test('acknowledged alert → acknowledgedBy surfaced', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const dr = await makeUser({ fullName: 'د. خالد' });
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
      daysAgo: 25,
      status: 'acknowledged',
      acknowledgedAt: new Date(Date.now() - 12 * 86400000),
      acknowledgedBy: dr._id,
    });
    const a = (await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id })).pairs[0]
      .alerts[0];
    expect(a.status).toBe('acknowledged');
    expect(a.acknowledgedBy).toEqual({ id: String(dr._id), fullName: 'د. خالد' });
  });

  test('actor referenced but user deleted → {id, fullName: null}', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    const ghostId = new mongoose.Types.ObjectId();
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
      status: 'dismissed',
      dismissedAt: new Date(Date.now() - 5 * 86400000),
      dismissedBy: ghostId, // never seeded
      dismissalReason: 'استمرار التحقق لاحقاً',
    });
    const a = (await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id })).pairs[0]
      .alerts[0];
    expect(a.dismissedBy).toEqual({ id: String(ghostId), fullName: null });
    expect(a.dismissalReason).toBe('استمرار التحقق لاحقاً');
  });

  test('single User.find batches lookups across multiple alerts/pairs', async () => {
    const berg = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = await makeBeneficiary({ firstName_ar: 'علي' });
    const ben2 = await makeBeneficiary({ firstName_ar: 'سارة' });
    const dr = await makeUser({ fullName: 'د. مشترك' });
    for (const b of [ben1, ben2]) {
      for (const item of [
        { d: 60, s: 26 },
        { d: 30, s: 22 },
        { d: 5, s: 18 },
      ]) {
        await seedAdmin({
          beneficiaryId: b._id,
          measureId: berg._id,
          branchId,
          daysAgo: item.d,
          score: item.s,
        });
      }
      await seedAlert({
        beneficiaryId: b._id,
        measureId: berg._id,
        daysAgo: 15,
        status: 'dismissed',
        dismissedAt: new Date(Date.now() - 3 * 86400000),
        dismissedBy: dr._id,
        dismissalReason: 'سبب مشترك للحالتين',
      });
    }
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
    });
    expect(r.pairs).toHaveLength(2);
    for (const p of r.pairs) {
      expect(p.alerts).toHaveLength(1);
      expect(p.alerts[0].dismissedBy).toEqual({
        id: String(dr._id),
        fullName: 'د. مشترك',
      });
    }
  });
});
