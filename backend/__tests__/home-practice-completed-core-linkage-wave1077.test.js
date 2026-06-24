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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let HomeCarryoverEntry;
let CareTimeline;
let integrationBus;

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

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'home_practice_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.entryId)).toBe(String(e._id));
    expect(tl.metadata.outcome).toBe('completed');
  });

  it('a skipped entry does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HomeCarryoverEntry.create(baseEntry({ beneficiaryId, outcome: 'skipped' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'home_practice_completed',
      },
      0
    );
  });

  it('a partial entry does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HomeCarryoverEntry.create(baseEntry({ beneficiaryId, outcome: 'partial' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'home_practice_completed',
      },
      0
    );
  });

  it('editing a completed entry does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await HomeCarryoverEntry.create(baseEntry({ beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'home_practice_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await HomeCarryoverEntry.findById(e._id);
    again.notes = 'reviewed by therapist';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'home_practice_completed',
      },
      1
    );
  });
});
