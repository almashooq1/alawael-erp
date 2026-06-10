'use strict';

/**
 * daily-comm-log-published-core-linkage-wave1086.test.js — W1086.
 *
 * Links the family-engagement milestone (a daily parent communication log
 * was published) into the unified core. A new published DailyCommunicationLog
 * emits daily-comm-log.daily_comm_log.published → CareTimeline
 * 'daily_comm_log_published' (family/info). Drafts and edits don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DailyCommunicationLog;
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

function dailyLog(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    mood: 'happy',
    engagement: 'high',
    authorName: 'Therapist Sara',
    status: 'published',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1086-daily-comm-log' } });
  await mongoose.connect(mongod.getUri());

  DailyCommunicationLog = require('../models/DailyCommunicationLog');
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
  await Promise.all([DailyCommunicationLog.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1086 — published daily communication logs reach the unified-core timeline', () => {
  it('a published log lands a family timeline row (info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const d = await DailyCommunicationLog.create(dailyLog(beneficiaryId));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'daily_comm_log_published' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.logId)).toBe(String(d._id));
    expect(tl.metadata.mood).toBe('happy');
    expect(tl.metadata.engagement).toBe('high');
    expect(tl.title).toContain('mood: happy');
  });

  it('a draft log does not fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DailyCommunicationLog.create(dailyLog(beneficiaryId, { status: 'draft' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'daily_comm_log_published' })
    ).toBe(0);
  });

  it('marking the log parent-seen later does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const d = await DailyCommunicationLog.create(dailyLog(beneficiaryId));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'daily_comm_log_published' });
    expect(tl).toBeTruthy();

    const again = await DailyCommunicationLog.findById(d._id);
    again.parentSeen = true;
    again.parentSeenAt = new Date();
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'daily_comm_log_published' })
    ).toBe(1);
  });

  it('records logs for distinct beneficiaries independently', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await DailyCommunicationLog.create(dailyLog(a));
    await DailyCommunicationLog.create(dailyLog(b, { mood: 'tired', engagement: 'low' }));

    const tlA = await waitForTimeline({ beneficiaryId: a, eventType: 'daily_comm_log_published' });
    const tlB = await waitForTimeline({ beneficiaryId: b, eventType: 'daily_comm_log_published' });
    expect(tlA).toBeTruthy();
    expect(tlB).toBeTruthy();
    expect(tlB.metadata.mood).toBe('tired');
  });
});
