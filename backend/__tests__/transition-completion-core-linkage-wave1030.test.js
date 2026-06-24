'use strict';

/**
 * transition-completion-core-linkage-wave1030.test.js — W1030.
 *
 * Links transition-plan COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a TransitionPlan (W361) reaches the terminal 'completed'
 * status (life-stage milestone reached — e.g. school→work, rehab→community),
 * the model emits transition.transition.completed → CareTimeline
 * 'transition_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TransitionPlan;
let CareTimeline;
let integrationBus;

function basePlan(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    transitionType: 'school_to_work',
    status: 'draft',
    ...overrides,
  };
}

async function completePlan(plan) {
  plan.status = 'completed';
  plan.actualTransitionDate = new Date();
  plan.transitionLeadName = 'Transition coordinator';
  await plan.save();
  return plan;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1030-transition-completion-core' },
  });
  await mongoose.connect(mongod.getUri());

  TransitionPlan = require('../models/TransitionPlan');
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
  await Promise.all([TransitionPlan.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1030 — Transition plan completion reaches the unified-core timeline', () => {
  it('completing a transition plan lands a transition_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const plan = await completePlan(await TransitionPlan.create(basePlan({ beneficiaryId })));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'transition_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.transitionPlanId)).toBe(String(plan._id));
    expect(tl.metadata.transitionType).toBe('school_to_work');
  });

  it('a not-completed plan produces NO completion timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await TransitionPlan.create(basePlan({ beneficiaryId, status: 'draft' }));

    await waitForCount({ eventType: 'transition_completed' }, 0);
  });

  it('re-saving an already-completed plan does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const plan = await completePlan(await TransitionPlan.create(basePlan({ beneficiaryId })));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'transition_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await TransitionPlan.findById(plan._id);
    again.notes = 'Receiving program confirmed enrolment.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'transition_completed' }, 1);
  });
});
