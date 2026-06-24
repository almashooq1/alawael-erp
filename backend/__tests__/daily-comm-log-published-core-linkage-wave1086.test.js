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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DailyCommunicationLog;
let CareTimeline;
let integrationBus;

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

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'daily_comm_log_published' }, 1);
    const tl = tlRows[0];
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

    await waitForCount({ beneficiaryId, eventType: 'daily_comm_log_published' }, 0);
  });

  it('marking the log parent-seen later does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const d = await DailyCommunicationLog.create(dailyLog(beneficiaryId));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'daily_comm_log_published' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await DailyCommunicationLog.findById(d._id);
    again.parentSeen = true;
    again.parentSeenAt = new Date();
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'daily_comm_log_published' }, 1);
  });

  it('records logs for distinct beneficiaries independently', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await DailyCommunicationLog.create(dailyLog(a));
    await DailyCommunicationLog.create(dailyLog(b, { mood: 'tired', engagement: 'low' }));

    const tlARows = await waitForRows(
      { beneficiaryId: a, eventType: 'daily_comm_log_published' },
      1
    );
    const tlA = tlARows[0];
    const tlBRows = await waitForRows(
      { beneficiaryId: b, eventType: 'daily_comm_log_published' },
      1
    );
    const tlB = tlBRows[0];
    expect(tlA).toBeTruthy();
    expect(tlB).toBeTruthy();
    expect(tlB.metadata.mood).toBe('tired');
  });
});
