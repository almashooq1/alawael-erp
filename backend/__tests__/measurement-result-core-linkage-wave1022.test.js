'use strict';

/**
 * measurement-result-core-linkage-wave1022.test.js — W1022.
 *
 * Links measurement/assessment result APPROVAL into the unified core
 * (per-beneficiary CareTimeline), following the W994…W998 pattern.
 * MeasurementResult is the standardized-assessment score record
 * (beneficiaryId REQUIRED). When a result reaches APPROVED status, the
 * longitudinal record must carry the finalized score + interpreted level:
 *   - MeasurementResult.status === 'APPROVED' → measurements.measurement.result_approved
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasurementResult;
let CareTimeline;
let integrationBus;

function baseResult(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    measurementId: new mongoose.Types.ObjectId(),
    typeId: new mongoose.Types.ObjectId(),
    dateAdministrated: new Date(),
    rawScore: 42,
    overallLevel: 'MODERATE',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1022-measurement-core' } });
  await mongoose.connect(mongod.getUri());

  MeasurementResult = require('../models/measurement/MeasurementResult.model');
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
  await Promise.all([MeasurementResult.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1022 — Measurement result approval reaches the unified-core timeline', () => {
  it('approving a result lands a measurement_result_approved row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const res = await MeasurementResult.create(
      baseResult({ beneficiaryId, status: 'PENDING_REVIEW' })
    );

    res.status = 'APPROVED';
    await res.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'measurement_result_approved',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.resultId)).toBe(String(res._id));
    expect(tl.metadata.overallLevel).toBe('MODERATE');
    expect(tl.metadata.rawScore).toBe(42);
  });

  it('a draft result produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasurementResult.create(baseResult({ beneficiaryId, status: 'DRAFT' }));

    await waitForCount({ eventType: 'measurement_result_approved' }, 0);
  });

  it('a result created directly as APPROVED also fires once', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasurementResult.create(baseResult({ beneficiaryId, status: 'APPROVED' }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'measurement_result_approved',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'measurement_result_approved',
      })
    ).toBe(1);
  });

  it('re-saving an already-approved result does not re-fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const res = await MeasurementResult.create(baseResult({ beneficiaryId, status: 'APPROVED' }));

    await waitForRows({ beneficiaryId, eventType: 'measurement_result_approved' }, 1);

    const again = await MeasurementResult.findById(res._id);
    again.standardScore = 95;
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'measurement_result_approved',
      },
      1
    );
  });
});
