'use strict';

/**
 * differential-diagnosis-confirmed-core-linkage-wave1060.test.js — W1060.
 *
 * Links CDSS differential-diagnosis confirmation into the unified core
 * (per-beneficiary CareTimeline). Confirming a diagnosis emits
 * differential-diagnosis.differential_diagnosis.confirmed → CareTimeline
 * 'differential_diagnosis_confirmed' (clinical, success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DifferentialDiagnosis;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseDx(overrides = {}) {
  return {
    branchId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    requestedBy: new mongoose.Types.ObjectId(),
    presentingSymptoms: { fever: true, cough: true },
    status: 'active',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1060-differential-diagnosis' } });
  await mongoose.connect(mongod.getUri());

  DifferentialDiagnosis = require('../models/DifferentialDiagnosis');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([DifferentialDiagnosis.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1060 — confirmed differential diagnoses reach the unified-core timeline', () => {
  it('confirming a diagnosis lands a differential_diagnosis_confirmed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const dx = await DifferentialDiagnosis.create(baseDx({ beneficiaryId }));

    dx.status = 'confirmed';
    dx.confirmedDiagnosisId = new mongoose.Types.ObjectId();
    dx.confirmedAt = new Date();
    await dx.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'differential_diagnosis_confirmed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.diagnosisId)).toBe(String(dx._id));
  });

  it('an active (unconfirmed) diagnosis does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DifferentialDiagnosis.create(baseDx({ beneficiaryId, status: 'active' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      })
    ).toBe(0);
  });

  it('re-saving a confirmed diagnosis does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const dx = await DifferentialDiagnosis.create(baseDx({ beneficiaryId }));
    dx.status = 'confirmed';
    dx.confirmedAt = new Date();
    await dx.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'differential_diagnosis_confirmed',
    });
    expect(tl).toBeTruthy();

    const again = await DifferentialDiagnosis.findById(dx._id);
    again.clinicianAssessment = 'reviewed';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      })
    ).toBe(1);
  });
});
