'use strict';

/**
 * episode-closed-timeline-subscriber-wave935.test.js — W935.
 *
 * W929 recorded episode opening (`admission`) on the unified timeline; W930 +
 * W931 added assessment completion + care-plan activation. The final
 * longitudinal pathway link is episode closure: EpisodeService.dischargeEpisode
 * emits `episode.closed` (bridged to `episodes.episode.closed`) with outcome +
 * durationDays, but no subscriber recorded the discharge on the CareTimeline —
 * the Episode of Care موحد closed silently. W935 adds
 * `episodes:closed → timeline:record` so each closure lands on the timeline
 * linked to its episode, closing the loop opened by the W929 `admission` entry.
 *
 * This behavioral test boots an in-memory Mongo, registers the subscribers with
 * a stub bus, invokes the new handler, and asserts a durable CareTimeline
 * `discharge` entry is persisted and linked to beneficiary + episode.
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
    s => s.pattern === pattern && s.name === 'episodes:closed → timeline:record'
  );
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w935-episode-close-timeline' } });
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

describe('W935 — episodes.episode.closed records on the unified timeline', () => {
  it('registers a timeline subscriber on episodes.episode.closed', () => {
    expect(getHandler('episodes.episode.closed')).toBeInstanceOf(Function);
  });

  it('persists a discharge CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('episodes.episode.closed');
    await handler({
      payload: { episodeId, beneficiaryId, outcome: 'completed', durationDays: 90 },
    });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('discharge');
    expect(entry.category).toBe('clinical');
    expect(entry.severity).toBe('info');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toContain('إغلاق حلقة علاجية');
    expect(entry.title_ar).toContain('90');
  });

  it('omits the duration suffix when durationDays is missing', async () => {
    const handler = getHandler('episodes.episode.closed');
    await handler({ payload: { episodeId, beneficiaryId, outcome: 'transferred' } });

    const entry = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(entry).toBeTruthy();
    expect(entry.title_ar).toBe('إغلاق حلقة علاجية: transferred');
  });

  it('does not throw when payload lacks beneficiaryId', async () => {
    const handler = getHandler('episodes.episode.closed');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
