'use strict';

/**
 * care-plan-activated-timeline-subscriber-wave931.test.js — W931.
 *
 * W930 recorded assessment completion on the unified timeline. The next pathway
 * link is care-plan activation: CarePlansService.activatePlan emits
 * `careplan.activated` (bridged to `care-plans.careplan.activated`), but no
 * subscriber recorded the activation on the CareTimeline. W931 adds
 * `care-plans:activated → timeline:record` so each activated plan lands on the
 * timeline linked to its episode.
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `care_plan_approved` entry is persisted and linked to beneficiary + episode.
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
const planId = new mongoose.Types.ObjectId();

function getHandler(pattern) {
  const sub = subscribers.find(
    s => s.pattern === pattern && s.name === 'care-plans:activated → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w931-careplan-timeline' } });
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

describe('W931 — care-plans.careplan.activated records on the unified timeline', () => {
  it('registers a timeline subscriber on care-plans.careplan.activated', () => {
    expect(getHandler('care-plans.careplan.activated')).toBeInstanceOf(Function);
  });

  it('persists a care_plan_approved CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('care-plans.careplan.activated');
    await handler({ payload: { planId, beneficiaryId, episodeId, goalCount: 3 } });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('care_plan_approved');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('success');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toContain('تفعيل خطة الرعاية');
    expect(entry.title_ar).toContain('3');
  });

  it('omits the goal suffix when goalCount is missing', async () => {
    const handler = getHandler('care-plans.careplan.activated');
    await handler({ payload: { planId, beneficiaryId, episodeId } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.title_ar).toBe('تفعيل خطة الرعاية');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('care-plans.careplan.activated');
    await expect(handler({ payload: { planId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
