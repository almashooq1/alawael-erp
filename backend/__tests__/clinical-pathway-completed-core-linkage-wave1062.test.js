'use strict';

/**
 * clinical-pathway-completed-core-linkage-wave1062.test.js — W1062.
 *
 * Links unified clinical-pathway-plan completion into the unified core
 * (per-beneficiary CareTimeline). Completing a pathway plan emits
 * clinical-pathway.clinical_pathway.completed → CareTimeline
 * 'clinical_pathway_completed' (clinical, success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ClinicalPathwayPlan;
let CareTimeline;
let integrationBus;

function basePlan(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    pathwayType: 'GENERIC_REHAB',
    status: 'ACTIVE',
    startDate: new Date(),
    stages: [{ code: 'INTAKE', title: 'Intake', order: 1, status: 'IN_PROGRESS' }],
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1062-clinical-pathway' } });
  await mongoose.connect(mongod.getUri());

  ClinicalPathwayPlan = require('../models/ClinicalPathwayPlan');
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
  await Promise.all([ClinicalPathwayPlan.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1062 — completed clinical pathway plans reach the unified-core timeline', () => {
  it('completing a pathway plan lands a clinical_pathway_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await ClinicalPathwayPlan.create(basePlan({ beneficiaryId }));

    p.status = 'COMPLETED';
    await p.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'clinical_pathway_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.planId)).toBe(String(p._id));
  });

  it('an active pathway plan does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ClinicalPathwayPlan.create(basePlan({ beneficiaryId, status: 'ACTIVE' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'clinical_pathway_completed',
      },
      0
    );
  });

  it('re-saving a completed pathway plan does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await ClinicalPathwayPlan.create(basePlan({ beneficiaryId }));
    p.status = 'COMPLETED';
    await p.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'clinical_pathway_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await ClinicalPathwayPlan.findById(p._id);
    again.currentStageCode = 'DONE';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'clinical_pathway_completed',
      },
      1
    );
  });
});
