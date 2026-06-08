'use strict';

/**
 * transition-plan-core-linkage-wave986.test.js — W986.
 *
 * Wires life-stage transition plans onto the unified-core timeline: a completed
 * plan (the beneficiary successfully moved to the next life stage — success) and
 * a cancelled plan (the transition was abandoned — warning). Producer: native
 * TransitionPlan post-save hook (status flip to completed / cancelled).
 * RUNTIME end-to-end against a real in-memory Mongo + the real integration bus +
 * real subscribers → a `care_transition` CareTimeline row.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TransitionPlan, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w986-transition' } });
  await mongoose.connect(mongod.getUri());
  TransitionPlan = require('../models/TransitionPlan');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');
  const { integrationBus } = require('../integration/systemIntegrationBus');
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

// Create a fresh DRAFT plan (draft requires no lead; transitionType + beneficiaryId required).
function newDraftPlan(extra = {}) {
  return TransitionPlan.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    transitionType: 'rehab_to_community',
    status: 'draft',
    ...extra,
  });
}

describe('W986 — transition plans reach the unified-core timeline', () => {
  it('a draft plan produces no timeline row until it reaches a terminal status', async () => {
    const p = await newDraftPlan();
    await new Promise(r => setTimeout(r, 150));
    expect(await CareTimeline.countDocuments({ beneficiaryId: p.beneficiaryId })).toBe(0);

    // draft → completed (invariants: actualTransitionDate + a transition lead)
    const loaded = await TransitionPlan.findById(p._id);
    loaded.status = 'completed';
    loaded.actualTransitionDate = new Date();
    loaded.transitionLeadName = 'منسق الانتقال';
    await loaded.save();

    const tl = await waitForTimeline({
      beneficiaryId: p.beneficiaryId,
      eventType: 'care_transition',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
  });

  it('a cancelled plan lands a WARNING care_transition row', async () => {
    const p = await newDraftPlan();
    const loaded = await TransitionPlan.findById(p._id);
    loaded.status = 'cancelled';
    loaded.transitionLeadName = 'منسق الانتقال';
    await loaded.save();
    const tl = await waitForTimeline({
      beneficiaryId: p.beneficiaryId,
      eventType: 'care_transition',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a non-terminal status change (paused) produces no row', async () => {
    const p = await newDraftPlan();
    const loaded = await TransitionPlan.findById(p._id);
    loaded.status = 'paused';
    loaded.transitionLeadName = 'منسق الانتقال';
    await loaded.save();
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId: p.beneficiaryId })).toBe(0);
  });
});
