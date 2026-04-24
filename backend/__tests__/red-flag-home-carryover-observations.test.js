/**
 * red-flag-home-carryover-observations.test.js — Beneficiary-360 Commit 25.
 *
 * Integration: real HomeCarryoverEntry model against mongodb-
 * memory-server. Pins the "no entries → sentinel" behavior,
 * latest-entry lookup, per-beneficiary isolation, and the end-to-end
 * family.home_carryover.missing.14d flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createHomeCarryoverObservations,
  NO_ENTRIES_SENTINEL,
} = require('../services/redFlagObservations/homeCarryoverObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let HomeCarryoverEntry;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'home-carryover-test' });
  HomeCarryoverEntry = require('../models/HomeCarryoverEntry').HomeCarryoverEntry;
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await HomeCarryoverEntry.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedEntry({ bId, daysAgo = 1, outcome = 'completed', now = new Date() }) {
  return HomeCarryoverEntry.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    loggedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    outcome,
  });
}

// ─── Unit: lastEntryForBeneficiary ──────────────────────────────

describe('lastEntryForBeneficiary', () => {
  it('returns the NO_ENTRIES sentinel when no entries exist', async () => {
    const obs = createHomeCarryoverObservations({ model: HomeCarryoverEntry });
    const { daysSinceEntry } = await obs.lastEntryForBeneficiary(new mongoose.Types.ObjectId());
    expect(daysSinceEntry).toBe(NO_ENTRIES_SENTINEL);
  });

  it('returns 0 for an entry logged today', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId, daysAgo: 0, now });
    const obs = createHomeCarryoverObservations({ model: HomeCarryoverEntry });
    const { daysSinceEntry } = await obs.lastEntryForBeneficiary(bId, { now });
    expect(daysSinceEntry).toBe(0);
  });

  it('returns days-since-entry for a single old entry', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId, daysAgo: 20, now });
    const obs = createHomeCarryoverObservations({ model: HomeCarryoverEntry });
    const { daysSinceEntry } = await obs.lastEntryForBeneficiary(bId, { now });
    expect(daysSinceEntry).toBe(20);
  });

  it('takes the MOST RECENT entry when multiple exist', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId, daysAgo: 30, now });
    await seedEntry({ bId, daysAgo: 7, now });
    await seedEntry({ bId, daysAgo: 3, now });
    const obs = createHomeCarryoverObservations({ model: HomeCarryoverEntry });
    const { daysSinceEntry } = await obs.lastEntryForBeneficiary(bId, { now });
    expect(daysSinceEntry).toBe(3);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId: a, daysAgo: 5, now });
    // b has no entries
    const obs = createHomeCarryoverObservations({ model: HomeCarryoverEntry });
    expect((await obs.lastEntryForBeneficiary(a, { now })).daysSinceEntry).toBe(5);
    expect((await obs.lastEntryForBeneficiary(b, { now })).daysSinceEntry).toBe(
      NO_ENTRIES_SENTINEL
    );
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('family.home_carryover.missing.14d fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register(
      'homeCarryoverService',
      createHomeCarryoverObservations({ model: HomeCarryoverEntry })
    );
    return createEngine({ locator });
  }

  it('raises when the most recent entry is ≥ 14 days old', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId, daysAgo: 18, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.home_carryover.missing.14d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(18);
  });

  it('does NOT raise at 13 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedEntry({ bId, daysAgo: 13, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.home_carryover.missing.14d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('raises on a beneficiary with zero entries (sentinel is well above 14)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.home_carryover.missing.14d'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(NO_ENTRIES_SENTINEL);
  });
});
