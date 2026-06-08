'use strict';

/**
 * behavior-plan-completion-core-linkage-wave1032.test.js — W1032.
 *
 * Links behavior-plan COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a BehaviorPlan (BIP) reaches the 'completed' status
 * (target behaviors resolved / intervention cycle finished), the model emits
 * behavior.behavior.plan_completed → CareTimeline 'behavior_plan_completed'
 * (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BehaviorPlan;
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

function basePlan(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    title: 'BIP — escape-maintained aggression',
    startDate: new Date(),
    status: 'draft',
    ...overrides,
  };
}

async function complete(plan) {
  plan.status = 'completed';
  plan.endDate = new Date();
  await plan.save();
  return plan;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1032-behavior-plan-core' },
  });
  await mongoose.connect(mongod.getUri());

  BehaviorPlan = require('../domains/behavior/models/BehaviorPlan');
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
  await Promise.all([BehaviorPlan.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1032 — Behavior plan completion reaches the unified-core timeline', () => {
  it('completing a behavior plan lands a behavior_plan_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const plan = await complete(await BehaviorPlan.create(basePlan({ beneficiaryId })));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'behavior_plan_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.planId)).toBe(String(plan._id));
    expect(tl.metadata.title).toBe('BIP — escape-maintained aggression');
  });

  it('a draft behavior plan produces NO completion timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BehaviorPlan.create(basePlan({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'behavior_plan_completed' })).toBe(0);
  });

  it('re-saving an already-completed plan does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const plan = await complete(await BehaviorPlan.create(basePlan({ beneficiaryId })));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'behavior_plan_completed' });
    expect(tl).toBeTruthy();

    const again = await BehaviorPlan.findById(plan._id);
    again.notes = 'Closed after MDT review.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'behavior_plan_completed' })
    ).toBe(1);
  });
});
