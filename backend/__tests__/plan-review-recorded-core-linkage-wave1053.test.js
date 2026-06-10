'use strict';

/**
 * plan-review-recorded-core-linkage-wave1053.test.js — W1053.
 *
 * Links care-plan review RECORDING into the unified core (per-beneficiary
 * CareTimeline). When a PlanReview document is created the model emits
 * plan-review.plan_review.recorded → CareTimeline 'plan_review_recorded'
 * (clinical/info).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PlanReview;
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

function baseReview(overrides = {}) {
  return {
    carePlan: new mongoose.Types.ObjectId(),
    beneficiary: new mongoose.Types.ObjectId(),
    reviewDate: new Date(),
    nextReviewDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    reviewType: 'SCHEDULED',
    progressRating: 'GOOD',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1053-plan-review-core' } });
  await mongoose.connect(mongod.getUri());

  PlanReview = require('../models/PlanReview');
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
  await Promise.all([PlanReview.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1053 — care-plan review recording reaches the unified-core timeline', () => {
  it('recording a review lands a plan_review_recorded row (clinical/info)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const r = await PlanReview.create(baseReview({ beneficiary }));

    const tl = await waitForTimeline({
      beneficiaryId: beneficiary,
      eventType: 'plan_review_recorded',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.reviewId)).toBe(String(r._id));
  });

  it('re-saving an existing review does not re-fire the event', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const r = await PlanReview.create(baseReview({ beneficiary }));

    await waitForTimeline({ beneficiaryId: beneficiary, eventType: 'plan_review_recorded' });

    const again = await PlanReview.findById(r._id);
    again.summary = 'Reviewed with family; goals on track.';
    await again.save();
    await new Promise(res => setTimeout(res, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId: beneficiary,
        eventType: 'plan_review_recorded',
      })
    ).toBe(1);
  });

  it('two distinct reviews produce two timeline rows', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    await PlanReview.create(baseReview({ beneficiary, reviewType: 'SCHEDULED' }));
    await PlanReview.create(baseReview({ beneficiary, reviewType: 'INTERIM' }));

    const start = Date.now();
    while (Date.now() - start < 4000) {
      const n = await CareTimeline.countDocuments({
        beneficiaryId: beneficiary,
        eventType: 'plan_review_recorded',
      });
      if (n >= 2) break;
      await new Promise(res => setTimeout(res, 25));
    }
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId: beneficiary,
        eventType: 'plan_review_recorded',
      })
    ).toBe(2);
  });
});
