'use strict';

/**
 * red-flag-raised-core-linkage-wave1083.test.js — W1083.
 *
 * Links the safety-critical milestone (a clinical red flag is raised) into
 * the unified core. A new ACTIVE RedFlagState emits
 * red-flag.red_flag.raised → CareTimeline 'red_flag_raised' (clinical;
 * severity passes through). Cooldown rows and edits don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let RedFlagState;
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

function activeFlag(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    flagId: 'missed_two_sessions',
    status: 'active',
    severity: 'warning',
    domain: 'attendance',
    blocking: false,
    raisedAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1083-red-flag' } });
  await mongoose.connect(mongod.getUri());

  RedFlagState = require('../models/RedFlagState');
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
  await Promise.all([RedFlagState.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1083 — raised red flags reach the unified-core timeline', () => {
  it('a new active flag lands a red_flag_raised row (severity passthrough)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId().toString();
    await RedFlagState.create(activeFlag(beneficiaryId, { severity: 'critical', blocking: true }));

    const tl = await waitForTimeline({ eventType: 'red_flag_raised' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('critical');
    expect(tl.metadata.flagId).toBe('missed_two_sessions');
    expect(tl.metadata.blocking).toBe(true);
    expect(tl.title).toContain('blocking');
  });

  it('a cooldown record does not fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId().toString();
    await RedFlagState.create({
      beneficiaryId,
      flagId: 'resolved_flag',
      status: 'cooldown',
      resolvedAt: new Date(),
      cooldownUntil: new Date(Date.now() + 60_000),
    });

    await new Promise(r => setTimeout(r, 250));
    expect(await CareTimeline.countDocuments({ eventType: 'red_flag_raised' })).toBe(0);
  });

  it('an info-severity flag is recorded as info', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId().toString();
    await RedFlagState.create(activeFlag(beneficiaryId, { flagId: 'fyi', severity: 'info' }));

    const tl = await waitForTimeline({ eventType: 'red_flag_raised' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('info');
  });

  it('editing an existing active flag does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId().toString();
    const f = await RedFlagState.create(activeFlag(beneficiaryId));

    const tl = await waitForTimeline({ eventType: 'red_flag_raised' });
    expect(tl).toBeTruthy();

    const again = await RedFlagState.findById(f._id);
    again.lastObservedAt = new Date();
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'red_flag_raised' })).toBe(1);
  });
});
