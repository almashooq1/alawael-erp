'use strict';

/**
 * morning-health-check-flagged-core-linkage-wave1059.test.js — W1059.
 *
 * Links flagged morning health checks into the unified core
 * (per-beneficiary CareTimeline). A check with decision observe/send_home
 * emits morning-health-check.morning_health_check.flagged → CareTimeline
 * 'morning_health_check_flagged' (clinical; send_home=error, observe=warning).
 * Routine "allow" checks do NOT reach the timeline.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MorningHealthCheck;
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

function baseCheck(overrides = {}) {
  seq += 1;
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(Date.now() + seq * 86400000),
    decision: 'allow',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1059-morning-health-check' } });
  await mongoose.connect(mongod.getUri());

  MorningHealthCheck = require('../models/MorningHealthCheck');
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
  await Promise.all([MorningHealthCheck.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1059 — flagged morning health checks reach the unified-core timeline', () => {
  it('a send_home check lands a morning_health_check_flagged row (error)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const c = await MorningHealthCheck.create(
      baseCheck({ beneficiaryId, decision: 'send_home', reason: 'fever', temperatureC: 38.5 })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'morning_health_check_flagged',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('error');
    expect(String(tl.metadata.checkId)).toBe(String(c._id));
  });

  it('an observe check is recorded with warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MorningHealthCheck.create(baseCheck({ beneficiaryId, decision: 'observe' }));

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'morning_health_check_flagged',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a routine allow check does NOT reach the timeline', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MorningHealthCheck.create(baseCheck({ beneficiaryId, decision: 'allow' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'morning_health_check_flagged',
      })
    ).toBe(0);
  });
});
