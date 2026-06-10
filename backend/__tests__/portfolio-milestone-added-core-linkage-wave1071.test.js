'use strict';

/**
 * portfolio-milestone-added-core-linkage-wave1071.test.js — W1071.
 *
 * Links beneficiary portfolio milestones ("بورتفوليو الطفل") into the unified
 * core (per-beneficiary CareTimeline). Adding a milestone-flagged portfolio
 * item emits portfolio.portfolio.milestone_added → CareTimeline
 * 'portfolio_milestone_added' (family; success). Only items flagged
 * isMilestone surface — ordinary photos/videos do not.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BeneficiaryPortfolioItem;
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

function baseItem(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    type: 'achievement',
    title: 'First independent steps',
    url: 'https://cdn.example.com/portfolio/steps.jpg',
    achievementDate: new Date(),
    isMilestone: true,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1071-portfolio' } });
  await mongoose.connect(mongod.getUri());

  BeneficiaryPortfolioItem = require('../models/BeneficiaryPortfolioItem');
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
  await Promise.all([BeneficiaryPortfolioItem.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1071 — portfolio milestones reach the unified-core timeline', () => {
  it('adding a milestone item lands a portfolio_milestone_added row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const item = await BeneficiaryPortfolioItem.create(baseItem({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'portfolio_milestone_added' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.itemId)).toBe(String(item._id));
    expect(tl.metadata.type).toBe('achievement');
    expect(tl.title).toContain('First independent steps');
  });

  it('the milestone carries its branch through to the timeline', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await BeneficiaryPortfolioItem.create(baseItem({ beneficiaryId, branchId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'portfolio_milestone_added' });
    expect(tl).toBeTruthy();
    expect(String(tl.branchId)).toBe(String(branchId));
  });

  it('a non-milestone portfolio item does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryPortfolioItem.create(
      baseItem({ beneficiaryId, type: 'photo', isMilestone: false })
    );

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'portfolio_milestone_added' })
    ).toBe(0);
  });

  it('re-saving a milestone item does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const item = await BeneficiaryPortfolioItem.create(baseItem({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'portfolio_milestone_added' });
    expect(tl).toBeTruthy();

    const again = await BeneficiaryPortfolioItem.findById(item._id);
    again.description = 'captured during morning session';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'portfolio_milestone_added' })
    ).toBe(1);
  });
});
