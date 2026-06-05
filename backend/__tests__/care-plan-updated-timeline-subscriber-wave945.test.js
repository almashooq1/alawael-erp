'use strict';

/**
 * care-plan-updated-timeline-subscriber-wave945.test.js — W945.
 *
 * The care-plan lifecycle already recorded drafting (W937 care_plan_created) and
 * activation (W931 care_plan_approved) on the unified timeline, but plan
 * *revisions* were invisible: CarePlansService.updatePlan emitted a non-canonical
 * `care-plan:updated` event with no episode link and no timeline subscriber.
 * W945 canonicalizes that emit to `careplan.updated` (enriched with episodeId),
 * adds it to the care-plans serviceEventBridge, and wires
 * `care-plans:updated → timeline:record` so every plan edit lands on the
 * CareTimeline (eventType care_plan_updated) linked to its beneficiary + episode.
 * Per doctrine "اربط كل خطة بالمستفيد والحلقة والزمن".
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `care_plan_updated` entry is persisted and linked to beneficiary + episode.
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
    s => s.pattern === pattern && s.name === 'care-plans:updated → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w945-care-plan-update-timeline' },
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

describe('W945 — care-plans.careplan.updated records on the unified timeline', () => {
  it('registers a timeline subscriber on care-plans.careplan.updated', () => {
    expect(getHandler('care-plans.careplan.updated')).toBeInstanceOf(Function);
  });

  it('persists a care_plan_updated CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('care-plans.careplan.updated');
    await handler({
      payload: { planId: new mongoose.Types.ObjectId(), beneficiaryId, episodeId },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('care_plan_updated');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('info');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toBe('تحديث خطة الرعاية');
  });

  it('records the revision even when the plan has no episode link', async () => {
    const handler = getHandler('care-plans.careplan.updated');
    await handler({ payload: { planId: new mongoose.Types.ObjectId(), beneficiaryId } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.eventType).toBe('care_plan_updated');
    expect(entry.episodeId).toBeUndefined();
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('care-plans.careplan.updated');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
