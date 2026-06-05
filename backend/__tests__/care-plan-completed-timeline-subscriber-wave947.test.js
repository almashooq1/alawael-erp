'use strict';

/**
 * care-plan-completed-timeline-subscriber-wave947.test.js — W947.
 *
 * Closes the care-plan lifecycle on the unified timeline. The chain already
 * recorded drafting (W937 care_plan_created), revision (W945 care_plan_updated)
 * and activation (W931 care_plan_approved), but the clinical *closure* of a plan
 * was invisible: CarePlansService.completePlan emitted `careplan.completed`
 * (bridged to `care-plans.careplan.completed`) yet no subscriber recorded it, and
 * the CareTimeline enum lacked `care_plan_completed`. W947 adds the enum value,
 * enriches the producer emit with episodeId, and wires
 * `care-plans:completed → timeline:record` so every completed plan lands on the
 * timeline as the terminal milestone, linked to its beneficiary + episode and
 * carrying the final achievementRate. Per doctrine "اربط كل خطة بالمستفيد والحلقة والزمن".
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `care_plan_completed` entry is persisted and linked to beneficiary + episode.
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
    s => s.pattern === pattern && s.name === 'care-plans:completed → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w947-care-plan-complete-timeline' },
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

describe('W947 — care-plans.careplan.completed records on the unified timeline', () => {
  it('registers a timeline subscriber on care-plans.careplan.completed', () => {
    expect(getHandler('care-plans.careplan.completed')).toBeInstanceOf(Function);
  });

  it('accepts care_plan_completed as a valid CareTimeline eventType', () => {
    const enumValues = CareTimeline.schema.path('eventType').enumValues;
    expect(enumValues).toContain('care_plan_completed');
  });

  it('persists a care_plan_completed entry linked to beneficiary + episode with rate', async () => {
    const handler = getHandler('care-plans.careplan.completed');
    await handler({
      payload: {
        planId: new mongoose.Types.ObjectId(),
        beneficiaryId,
        episodeId,
        achievementRate: 82,
      },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('care_plan_completed');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('success');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toBe('استكمال خطة الرعاية (نسبة التحقق 82٪)');
  });

  it('omits the achievement-rate suffix when achievementRate is null', async () => {
    const handler = getHandler('care-plans.careplan.completed');
    await handler({
      payload: {
        planId: new mongoose.Types.ObjectId(),
        beneficiaryId,
        episodeId,
        achievementRate: null,
      },
    });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.eventType).toBe('care_plan_completed');
    expect(entry.title_ar).toBe('استكمال خطة الرعاية');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('care-plans.careplan.completed');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
