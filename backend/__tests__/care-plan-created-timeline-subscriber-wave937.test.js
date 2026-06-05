'use strict';

/**
 * care-plan-created-timeline-subscriber-wave937.test.js — W937.
 *
 * W931 recorded care-plan activation (`care_plan_approved`) on the unified
 * timeline, but the plan's *creation* (the draft that opens the care-plan
 * lifecycle) was never surfaced — CarePlansService.createPlan emitted only the
 * service-local `care-plan:created` event, which was neither dot-normalized nor
 * bridged to the integration bus. W937 normalizes that emit to
 * `careplan.created`, adds it to the care-plans serviceEventBridge, and wires
 * `care-plans:created → timeline:record` so each drafted plan lands on the
 * CareTimeline linked to its beneficiary + episode, opening the chain that the
 * W931 `care_plan_approved` entry continues. Per doctrine
 * "اربط كل خطة بالمستفيد والحلقة العلاجية والزمن".
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `care_plan_created` entry is persisted and linked to beneficiary + episode.
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
    s => s.pattern === pattern && s.name === 'care-plans:created → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w937-care-plan-create-timeline' },
  });
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

describe('W937 — care-plans.careplan.created records on the unified timeline', () => {
  it('registers a timeline subscriber on care-plans.careplan.created', () => {
    expect(getHandler('care-plans.careplan.created')).toBeInstanceOf(Function);
  });

  it('persists a care_plan_created CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('care-plans.careplan.created');
    await handler({
      payload: { planId: new mongoose.Types.ObjectId(), beneficiaryId, episodeId, type: 'speech' },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('care_plan_created');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('info');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toBe('إنشاء خطة رعاية: speech');
  });

  it('falls back to the default rehabilitation type when type is missing', async () => {
    const handler = getHandler('care-plans.careplan.created');
    await handler({ payload: { beneficiaryId, episodeId } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.title_ar).toBe('إنشاء خطة رعاية: rehabilitation');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('care-plans.careplan.created');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
