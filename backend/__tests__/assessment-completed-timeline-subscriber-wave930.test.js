'use strict';

/**
 * assessment-completed-timeline-subscriber-wave930.test.js — W930.
 *
 * W929 recorded episode opening on the unified timeline. The next pathway link
 * is assessment completion: AssessmentsService emits `assessment.completed`
 * (bridged to `assessments.assessment.completed`), but the only subscriber was
 * the AI recommendation generator — nothing recorded the completion on the
 * CareTimeline. W930 adds `assessments:completed → timeline:record` so each
 * assessment lands on the timeline linked to its episode.
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `assessment_completed` entry is persisted and linked to beneficiary + episode.
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
const assessmentId = new mongoose.Types.ObjectId();

function getHandler(pattern) {
  // The W930 timeline subscriber is registered before the AI subscriber on the
  // same pattern, so select by name to avoid grabbing the AI handler.
  const sub = subscribers.find(
    s => s.pattern === pattern && s.name === 'assessments:completed → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w930-assessment-timeline' } });
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

describe('W930 — assessments.assessment.completed records on the unified timeline', () => {
  it('registers a timeline subscriber on assessments.assessment.completed', () => {
    expect(getHandler('assessments.assessment.completed')).toBeInstanceOf(Function);
  });

  it('persists an assessment_completed CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('assessments.assessment.completed');
    await handler({
      payload: { assessmentId, beneficiaryId, episodeId, type: 'M-CHAT-R', overallScore: 72 },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('assessment_completed');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('success');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toContain('اكتمال تقييم');
    expect(entry.title_ar).toContain('M-CHAT-R');
    expect(entry.title_ar).toContain('72');
  });

  it('omits the score suffix when overallScore is missing', async () => {
    const handler = getHandler('assessments.assessment.completed');
    await handler({ payload: { assessmentId, beneficiaryId, type: 'Observation' } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.title_ar).toBe('اكتمال تقييم: Observation');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('assessments.assessment.completed');
    await expect(handler({ payload: { assessmentId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
