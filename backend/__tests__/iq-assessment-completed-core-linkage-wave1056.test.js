'use strict';

/**
 * iq-assessment-completed-core-linkage-wave1056.test.js — W1056.
 *
 * Links IQ assessment recording into the unified core (per-beneficiary
 * CareTimeline). An IQAssessment carries final scores at creation, so creating
 * one emits iq-assessment.iq_assessment.completed → CareTimeline
 * 'iq_assessment_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let IQAssessment;
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

function baseAssessment(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    instrumentType: 'SB5',
    edition: 'N/A',
    examinerName: 'Dr. Psychometrist',
    examinerId: new mongoose.Types.ObjectId(),
    assessmentDate: new Date(),
    fullScaleIQ: 100,
    classificationBand: 'average',
    severityTier: 'L0',
    severity: 'normal',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1056-iq-assessment-core' } });
  await mongoose.connect(mongod.getUri());

  IQAssessment = require('../models/IQAssessment');
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
  await Promise.all([IQAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1056 — IQ assessment recording reaches the unified-core timeline', () => {
  it('recording an assessment lands an iq_assessment_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await IQAssessment.create(baseAssessment({ beneficiaryId, fullScaleIQ: 112 }));

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'iq_assessment_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
    expect(tl.metadata.fullScaleIQ).toBe(112);
  });

  it('re-saving an existing assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await IQAssessment.create(baseAssessment({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'iq_assessment_completed' });
    expect(tl).toBeTruthy();

    const again = await IQAssessment.findById(a._id);
    again.recommendations = { en: 'Re-test in 12 months.', ar: 'إعادة التقييم بعد 12 شهرًا.' };
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'iq_assessment_completed' })
    ).toBe(1);
  });

  it('two assessments for one beneficiary produce two timeline rows', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await IQAssessment.create(baseAssessment({ beneficiaryId }));
    await IQAssessment.create(
      baseAssessment({ beneficiaryId, instrumentType: 'WECHSLER', edition: 'WAIS-IV' })
    );

    await new Promise(r => setTimeout(r, 300));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'iq_assessment_completed' })
    ).toBe(2);
  });
});
