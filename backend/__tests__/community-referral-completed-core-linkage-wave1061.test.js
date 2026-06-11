'use strict';

/**
 * community-referral-completed-core-linkage-wave1061.test.js — W1061.
 *
 * Links community-referral completion into the unified core
 * (per-beneficiary CareTimeline). Completing a beneficiary-linked referral
 * emits community-referral.community_referral.completed → CareTimeline
 * 'community_referral_completed' (administrative, success). Referrals
 * without a beneficiaryId never reach the timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CommunityReferral;
let CareTimeline;
let integrationBus;
let seq = 0;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseReferral(overrides = {}) {
  seq += 1;
  return {
    uuid: `cref-${Date.now()}-${seq}`,
    branchId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    beneficiaryName: 'Test Beneficiary',
    referralType: 'external',
    status: 'pending',
    referralDate: new Date(),
    reasonForReferral: 'Specialist support',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1061-community-referral' } });
  await mongoose.connect(mongod.getUri());

  CommunityReferral = require('../models/CommunityReferral');
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
  await Promise.all([CommunityReferral.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1061 — completed community referrals reach the unified-core timeline', () => {
  it('completing a referral lands a community_referral_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await CommunityReferral.create(baseReferral({ beneficiaryId }));

    r.status = 'completed';
    r.completedAt = new Date();
    await r.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'community_referral_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.referralId)).toBe(String(r._id));
  });

  it('a pending referral does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CommunityReferral.create(baseReferral({ beneficiaryId, status: 'pending' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'community_referral_completed',
      })
    ).toBe(0);
  });

  it('re-saving a completed referral does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await CommunityReferral.create(baseReferral({ beneficiaryId }));
    r.status = 'completed';
    r.completedAt = new Date();
    await r.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'community_referral_completed',
    });
    expect(tl).toBeTruthy();

    const again = await CommunityReferral.findById(r._id);
    again.outcomeNotes = 'resolved';
    await again.save();
    await new Promise(res => setTimeout(res, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'community_referral_completed',
      })
    ).toBe(1);
  });
});
