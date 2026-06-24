'use strict';

/**
 * physiotherapy-assessment-finalized-core-linkage-wave1072.test.js — W1072.
 *
 * Links physiotherapy-assessment finalization into the unified core
 * (per-beneficiary CareTimeline). Finalizing a PT assessment emits
 * physiotherapy-assessment.physiotherapy_assessment.finalized → CareTimeline
 * 'physiotherapy_assessment_finalized' (clinical; success). Captures the
 * mobility baseline / re-assessment / discharge outcome on the timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PhysiotherapyAssessment;
let CareTimeline;
let integrationBus;

// A draft PT assessment that satisfies the finalize invariants once status flips.
function baseAssessment(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    assessmentType: 'initial',
    mobilityStatus: 'supervision',
    homeProgramGiven: true,
    assessedByName: 'PT Huda',
    assessedAt: new Date(),
    status: 'draft',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1072-pt-assessment' } });
  await mongoose.connect(mongod.getUri());

  PhysiotherapyAssessment = require('../models/PhysiotherapyAssessment');
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
  await Promise.all([PhysiotherapyAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1072 — finalized physiotherapy assessments reach the unified-core timeline', () => {
  it('finalizing an assessment lands a physiotherapy_assessment_finalized row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PhysiotherapyAssessment.create(baseAssessment({ beneficiaryId }));

    a.status = 'finalized';
    await a.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'physiotherapy_assessment_finalized',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
    expect(tl.metadata.mobilityStatus).toBe('supervision');
    expect(tl.metadata.homeProgramGiven).toBe(true);
  });

  it('a finalized discharge assessment carries its type through to the timeline', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PhysiotherapyAssessment.create(
      baseAssessment({
        beneficiaryId,
        assessmentType: 'discharge',
        goalsSummary: 'all mobility goals met; independent ambulation achieved',
      })
    );

    a.status = 'finalized';
    await a.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'physiotherapy_assessment_finalized',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.metadata.assessmentType).toBe('discharge');
  });

  it('a draft assessment does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PhysiotherapyAssessment.create(baseAssessment({ beneficiaryId, status: 'draft' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'physiotherapy_assessment_finalized',
      },
      0
    );
  });

  it('re-saving a finalized assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PhysiotherapyAssessment.create(baseAssessment({ beneficiaryId }));
    a.status = 'finalized';
    await a.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'physiotherapy_assessment_finalized',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await PhysiotherapyAssessment.findById(a._id);
    again.notes = 'addendum';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'physiotherapy_assessment_finalized',
      },
      1
    );
  });
});
