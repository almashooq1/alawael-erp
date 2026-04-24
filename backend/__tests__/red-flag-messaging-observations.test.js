/**
 * red-flag-messaging-observations.test.js — Beneficiary-360 Commit 20.
 *
 * Integration: real PortalMessage model against mongodb-memory-server.
 * Pins the "staff reply closes the thread" semantics, archived/
 * guardian-self-reply handling, and the end-to-end flag firing.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createMessagingObservations,
} = require('../services/redFlagObservations/messagingObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let PortalMessage;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'messaging-obs-test' });
  PortalMessage = require('../models/PortalMessage');
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
  await PortalMessage.deleteMany({});
});

// ─── Fixture helpers ────────────────────────────────────────────

let msgCounter = 1;
async function seedMessage({
  bId,
  fromModel = 'Guardian',
  hoursAgo = 72,
  replies = [],
  isArchived = false,
  isReply = false,
  now = new Date(),
}) {
  const _id = new mongoose.Types.ObjectId();
  const createdAt = new Date(now.getTime() - hoursAgo * 3600 * 1000);
  // Raw driver insert so we can control createdAt precisely and
  // skip the many required-field validators the schema layers on.
  await PortalMessage.collection.insertOne({
    _id,
    fromId: new mongoose.Types.ObjectId(),
    fromModel,
    toId: new mongoose.Types.ObjectId(),
    toModel: fromModel === 'Guardian' ? 'User' : 'Guardian',
    subject: `TEST-${msgCounter++}`,
    message: 'fixture body',
    messageType: 'general',
    priority: 'normal',
    isRead: false,
    relatedBeneficiaryId:
      bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    relatedType: 'general',
    isReply,
    replies,
    isArchived,
    isFlagged: false,
    createdAt,
    updatedAt: createdAt,
  });
  return _id;
}

// ─── Unit ───────────────────────────────────────────────────────

describe('openThreadsForBeneficiary', () => {
  it('returns 0 when the beneficiary has no messages', async () => {
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(new mongoose.Types.ObjectId());
    expect(maxHoursOpen).toBe(0);
  });

  it('returns hours-since-creation for a single unanswered thread', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, hoursAgo: 60, now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(60);
  });

  it('takes the MAX across multiple unanswered threads', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, hoursAgo: 20, now });
    await seedMessage({ bId, hoursAgo: 72, now });
    await seedMessage({ bId, hoursAgo: 12, now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(72);
  });

  it('a staff reply closes the thread (not counted)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const staffReplyId = await seedMessage({
      bId,
      fromModel: 'User',
      hoursAgo: 2,
      isReply: true,
      now,
    });
    await seedMessage({ bId, hoursAgo: 72, replies: [staffReplyId], now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(0);
  });

  it('a guardian self-reply does NOT close the thread', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const guardianReplyId = await seedMessage({
      bId,
      fromModel: 'Guardian',
      hoursAgo: 12,
      isReply: true,
      now,
    });
    await seedMessage({ bId, hoursAgo: 72, replies: [guardianReplyId], now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(72);
  });

  it('archived threads are excluded', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, hoursAgo: 200, isArchived: true, now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(0);
  });

  it('staff-originated messages do NOT count (flag is about family → staff only)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, fromModel: 'User', hoursAgo: 200, now });
    const obs = createMessagingObservations({ model: PortalMessage });
    const { maxHoursOpen } = await obs.openThreadsForBeneficiary(bId, { now });
    expect(maxHoursOpen).toBe(0);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId: a, hoursAgo: 100, now });
    await seedMessage({ bId: b, hoursAgo: 10, now });
    const obs = createMessagingObservations({ model: PortalMessage });
    expect((await obs.openThreadsForBeneficiary(a, { now })).maxHoursOpen).toBe(100);
    expect((await obs.openThreadsForBeneficiary(b, { now })).maxHoursOpen).toBe(10);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('family.message.unanswered.48h fires end-to-end', () => {
  it('raises when an open thread has been unanswered > 48 hours', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, hoursAgo: 72, now });
    const locator = createLocator();
    locator.register('messagingService', createMessagingObservations({ model: PortalMessage }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.message.unanswered.48h'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(72);
  });

  it('does NOT raise at exactly 48 hours (operator is strict >)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedMessage({ bId, hoursAgo: 48, now });
    const locator = createLocator();
    locator.register('messagingService', createMessagingObservations({ model: PortalMessage }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.message.unanswered.48h'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when a staff reply was sent', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const staffReplyId = await seedMessage({
      bId,
      fromModel: 'User',
      hoursAgo: 2,
      isReply: true,
      now,
    });
    await seedMessage({ bId, hoursAgo: 72, replies: [staffReplyId], now });
    const locator = createLocator();
    locator.register('messagingService', createMessagingObservations({ model: PortalMessage }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.message.unanswered.48h'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
