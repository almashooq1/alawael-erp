'use strict';

/**
 * residual-islands-core-linkage-wave1120.test.js — W1120.
 *
 * RUNTIME end-to-end linkage of the six remaining per-beneficiary lifecycle
 * "islands" that were unlinked on BOTH main and the parallel feat/w928 branch:
 *   ADLAssessment · IntegrationAssessment · SelfAdvocacyTrainingPlan ·
 *   DecisionRightsAssessment · IndependentLivingPlan · CaregiverSupportProgram.
 *
 * Each model's native post-save producer hook publishes to the REAL integration
 * bus; the REAL dddCrossModuleSubscribers persist a CareTimeline row. Completes
 * the unified-core linkage backlog (MDTCoordination stays the only deferred dup).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CareTimeline;
let ADL, Integ, SelfAdv, DecRights, IndLiving, Caregiver;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query).sort({ createdAt: -1 });
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function oid() {
  return new mongoose.Types.ObjectId();
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1120-core-linkage' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  ADL = require('../models/ADLAssessment');
  Integ = require('../models/IntegrationAssessment');
  SelfAdv = require('../models/SelfAdvocacyTrainingPlan');
  DecRights = require('../models/DecisionRightsAssessment');
  IndLiving = require('../models/IndependentLivingPlan');
  Caregiver = require('../models/CaregiverSupportProgram');
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
});

describe('W1120 — ADL assessment completion reaches the timeline', () => {
  it('draft → completed → adl_assessment (info)', async () => {
    const beneficiaryId = oid();
    const doc = await ADL.create({
      beneficiary: beneficiaryId,
      assessor: oid(),
      assessmentDate: new Date('2026-06-01'),
      assessmentType: 'initial',
    });
    const r = await ADL.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'adl_assessment' });
    expect(row).not.toBeNull();
    expect(row.category).toBe('clinical');
    expect(row.metadata.assessmentType).toBe('initial');
  });
});

describe('W1120 — integration assessment completion reaches the timeline', () => {
  it('draft → completed → integration_assessment (info)', async () => {
    const beneficiaryId = oid();
    const doc = await Integ.create({
      beneficiary: beneficiaryId,
      assessor: oid(),
      assessmentType: 'initial',
      integrationLevel: 'moderate',
      overallIntegrationScore: 60,
    });
    const r = await Integ.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'integration_assessment' });
    expect(row).not.toBeNull();
    expect(row.metadata.assessmentType).toBe('initial');
  });
});

describe('W1120 — self-advocacy plan completion reaches the timeline', () => {
  it('active → completed → self_advocacy_completed (success)', async () => {
    const beneficiaryId = oid();
    const doc = await SelfAdv.create({
      beneficiaryId,
      branchId: oid(),
      track: 'track_adult',
      createdBy: oid(),
    });
    const r = await SelfAdv.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'self_advocacy_completed' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('success');
  });
});

describe('W1120 — decision-rights assessment finalization reaches the timeline', () => {
  it('draft → finalized → decision_rights_assessment (info)', async () => {
    const beneficiaryId = oid();
    const doc = await DecRights.create({
      beneficiaryId,
      branchId: oid(),
      decisionType: 'therapy_participation',
      assessedBy: oid(),
      assessedByRole: 'physician',
      // Full capacity → 'autonomous' layer → no supportArrangement gate on finalize
      capacity: { understanding: 3, retention: 3, weighing: 3, communication: 3 },
    });
    const r = await DecRights.findById(doc._id);
    r.status = 'finalized';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'decision_rights_assessment' });
    expect(row).not.toBeNull();
    expect(row.metadata.decisionType).toBe('therapy_participation');
  });
});

describe('W1120 — independent-living plan completion reaches the timeline', () => {
  it('draft → completed → independent_living_completed (success)', async () => {
    const beneficiaryId = oid();
    const doc = await IndLiving.create({
      beneficiary: beneficiaryId,
      title: 'ILS plan',
      createdBy: oid(),
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-08-01'),
    });
    const r = await IndLiving.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'independent_living_completed' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('success');
  });
});

describe('W1120 — caregiver support program completion reaches the timeline', () => {
  it('enrolled → completed → caregiver_support_completed (success)', async () => {
    const beneficiaryId = oid();
    const doc = await Caregiver.create({
      beneficiaryId,
      programType: 'caregiver_training',
      caregiverName: 'أم محمد',
      caregiverRelationship: 'mother',
      totalModules: 4,
    });
    const r = await Caregiver.findById(doc._id);
    r.status = 'completed';
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'caregiver_support_completed' });
    expect(row).not.toBeNull();
    expect(row.category).toBe('family');
    expect(row.metadata.programType).toBe('caregiver_training');
  });
});
