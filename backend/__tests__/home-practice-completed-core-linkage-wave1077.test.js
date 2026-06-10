'use strict';

/**
 * home-practice-completed-core-linkage-wave1077.test.js — W1077.
 *
 * Links the family-engagement milestone (guardian logs a completed
 * home-practice / carry-over activity) into the unified core. A
 * HomeCarryoverEntry with outcome 'completed' emits
 * home-carryover.home_carryover.completed → CareTimeline
 * 'home_practice_completed' (family; success). partial / skipped
 * outcomes are NOT surfaced.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let HomeCarryoverEntry;
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

function baseEntry(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    loggedAt: new Date(),
    activityDescription: 'Daily speech flashcards',
    outcome: 'completed',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1077-home-carryover' } });
  await mongoose.connect(mongod.getUri());

  ({ HomeCarryoverEntry } = require('../models/HomeCarryoverEntry'));
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
  await Promise.all([HomeCarryoverEntry.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1077 — completed home-practice logs reach the unified-core timeline', () => {
  it('a completed entry lands a home_practice_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await HomeCarryoverEntry.create(baseEntry({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'home_practice_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.entryId)).toBe(String(e._id));
    expect(tl.metadata.outcome).toBe('completed');
  });

  it('a skipped entry does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HomeCarryoverEntry.create(baseEntry({ beneficiaryId, outcome: 'skipped' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'home_practice_completed',
      })
    ).toBe(0);
  });

  it('a partial entry does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HomeCarryoverEntry.create(baseEntry({ beneficiaryId, outcome: 'partial' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'home_practice_completed',
      })
    ).toBe(0);
  });

  it('editing a completed entry does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await HomeCarryoverEntry.create(baseEntry({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'home_practice_completed' });
    expect(tl).toBeTruthy();

    const again = await HomeCarryoverEntry.findById(e._id);
    again.notes = 'reviewed by therapist';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'home_practice_completed',
      })
    ).toBe(1);
  });
});
