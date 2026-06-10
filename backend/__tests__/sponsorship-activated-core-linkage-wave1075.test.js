'use strict';

/**
 * sponsorship-activated-core-linkage-wave1075.test.js — W1075.
 *
 * Links beneficiary sponsorship (kafala) activation into the unified core
 * (per-beneficiary CareTimeline). Moving a sponsorship pending → active
 * emits sponsorship.sponsorship.activated → CareTimeline
 * 'sponsorship_activated' (administrative; success). Anchors the
 * "a donor now covers this beneficiary" milestone on the timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Sponsorship;
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

function baseSponsorship(overrides = {}) {
  return {
    donorId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    sponsorshipType: 'full',
    monthlyAmount: 500,
    currency: 'SAR',
    startDate: new Date(),
    status: 'pending',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1075-sponsorship' } });
  await mongoose.connect(mongod.getUri());

  Sponsorship = require('../models/Sponsorship');
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
  await Promise.all([Sponsorship.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1075 — activated sponsorships reach the unified-core timeline', () => {
  it('activating a sponsorship lands a sponsorship_activated row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await Sponsorship.create(baseSponsorship({ beneficiaryId }));

    s.status = 'active';
    await s.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'sponsorship_activated' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.sponsorshipId)).toBe(String(s._id));
    expect(tl.metadata.sponsorshipType).toBe('full');
    expect(tl.metadata.monthlyAmount).toBe(500);
  });

  it('a partial sponsorship created directly as active carries its type through', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await Sponsorship.create(
      baseSponsorship({
        beneficiaryId,
        sponsorshipType: 'partial',
        monthlyAmount: 200,
        status: 'active',
      })
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'sponsorship_activated' });
    expect(tl).toBeTruthy();
    expect(tl.metadata.sponsorshipType).toBe('partial');
  });

  it('a pending sponsorship does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Sponsorship.create(baseSponsorship({ beneficiaryId, status: 'pending' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'sponsorship_activated',
      })
    ).toBe(0);
  });

  it('re-saving an active sponsorship does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await Sponsorship.create(baseSponsorship({ beneficiaryId }));
    s.status = 'active';
    await s.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'sponsorship_activated' });
    expect(tl).toBeTruthy();

    const again = await Sponsorship.findById(s._id);
    again.notes = 'agreement scanned';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'sponsorship_activated',
      })
    ).toBe(1);
  });
});
