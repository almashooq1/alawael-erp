'use strict';

/**
 * goal-created-timeline-subscriber-wave939.test.js — W939.
 *
 * The unified timeline already recorded goal *achievement* (goals.goal.achieved
 * → goal_achieved), but the goal-setting moment that opens each therapeutic
 * objective was invisible: GoalService.afterCreate emitted only the dead ad-hoc
 * `goalCreated` event (zero listeners, never bridged). W939 normalizes that emit
 * to `goal.created` (enriched with episodeId + goalNumber), adds it to the goals
 * serviceEventBridge, and wires `goals:created → timeline:record` so each new
 * goal lands on the CareTimeline (eventType goal_created) linked to its
 * beneficiary + episode. Per doctrine "اربط كل هدف بالمستفيد والحلقة والزمن".
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `goal_created` entry is persisted and linked to beneficiary + episode.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongod;
let CareTimeline;
let subscribers;

const beneficiaryId = new mongoose.Types.ObjectId();
const episodeId = new mongoose.Types.ObjectId();

function getHandler(pattern) {
  const sub = subscribers.find(
    s => s.pattern === pattern && s.name === 'goals:created → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w939-goal-create-timeline' } });
  await mongoose.connect(mongod.getUri());
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));

  const busStub = { subscribe: () => {} };
  subscribers = initializeDDDSubscribers(busStub, null);
});

beforeEach(async () => {
  await CareTimeline.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W939 — goals.goal.created records on the unified timeline', () => {
  it('registers a timeline subscriber on goals.goal.created', () => {
    expect(getHandler('goals.goal.created')).toBeInstanceOf(Function);
  });

  it('persists a goal_created CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('goals.goal.created');
    await handler({
      payload: { goalId: new mongoose.Types.ObjectId(), beneficiaryId, episodeId, goalNumber: 7 },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('goal_created');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('info');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toBe('تحديد هدف علاجي #7');
  });

  it('omits the goal-number suffix when goalNumber is missing', async () => {
    const handler = getHandler('goals.goal.created');
    await handler({ payload: { beneficiaryId, episodeId } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.title_ar).toBe('تحديد هدف علاجي');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('goals.goal.created');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
