'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const WorkflowTransitionLog = require('../domains/workflow/models/WorkflowTransitionLog');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await WorkflowTransitionLog.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function transition(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    episodeId: new mongoose.Types.ObjectId(),
    executedBy: new mongoose.Types.ObjectId(),
    fromPhase: 'intake',
    toPhase: 'triage',
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1118 — WorkflowTransitionLog recorded → unified-core CareTimeline linkage', () => {
  test('records an administrative row when a workflow transition is logged', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await WorkflowTransitionLog.create(
      transition(beneficiaryId, { branchId, fromPhase: 'referral', toPhase: 'intake' })
    );
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('workflow_transition_recorded');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('info'); // status defaults success
    expect(String(row.metadata.logId)).toBe(String(doc._id));
    expect(row.metadata.fromPhase).toBe('referral');
    expect(row.metadata.toPhase).toBe('intake');
    expect(row.title).toContain('(referral → intake)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('maps a failed transition to a warning row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await WorkflowTransitionLog.create(transition(beneficiaryId, { status: 'failed' }));
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe('warning');
  });

  test('records one row per distinct transition', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await WorkflowTransitionLog.create(
      transition(beneficiaryId, { fromPhase: 'intake', toPhase: 'triage' })
    );
    await WorkflowTransitionLog.create(
      transition(beneficiaryId, { fromPhase: 'triage', toPhase: 'initial_assessment' })
    );
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(2);
  });

  test('records distinct transitions for distinct beneficiaries', async () => {
    const b1 = new mongoose.Types.ObjectId();
    const b2 = new mongoose.Types.ObjectId();
    await WorkflowTransitionLog.create(transition(b1));
    await WorkflowTransitionLog.create(transition(b2));
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId: b1 })).toBe(1);
    expect(await CareTimeline.countDocuments({ beneficiaryId: b2 })).toBe(1);
  });
});
