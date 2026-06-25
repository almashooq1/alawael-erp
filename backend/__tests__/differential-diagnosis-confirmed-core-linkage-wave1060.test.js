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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DifferentialDiagnosis;
let CareTimeline;
let integrationBus;

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

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.diagnosisId)).toBe(String(dx._id));
  });

  it('an active (unconfirmed) diagnosis does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DifferentialDiagnosis.create(baseDx({ beneficiaryId, status: 'active' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      },
      0
    );
  });

  it('re-saving a confirmed diagnosis does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const dx = await DifferentialDiagnosis.create(baseDx({ beneficiaryId }));
    dx.status = 'confirmed';
    dx.confirmedAt = new Date();
    await dx.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await DifferentialDiagnosis.findById(dx._id);
    again.clinicianAssessment = 'reviewed';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'differential_diagnosis_confirmed',
      },
      1
    );
  });
});
