'use strict';

/**
 * episode-created-timeline-subscriber-wave929.test.js — W929.
 *
 * W928 wired student registration to open a canonical EpisodeOfCare and
 * publish `episodes.episode.created`, but no cross-module subscriber recorded
 * that moment on the unified CareTimeline (only `phase_transitioned` was
 * wired). The timeline therefore jumped from "registration" straight to the
 * first phase transition, hiding when the Episode of Care موحد was opened.
 *
 * W929 adds the `episodes:created → timeline:record` subscriber in
 * dddCrossModuleSubscribers. This behavioral test boots an in-memory Mongo,
 * registers the subscribers with a stub bus, invokes the new handler, and
 * asserts a durable CareTimeline `admission` entry is persisted and linked to
 * both the beneficiary and the episode.
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
  const sub = subscribers.find(s => s.pattern === pattern);
  return sub && sub.handler;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w929-episode-timeline' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));

  // Stub bus — just captures pattern→handler registrations.
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

describe('W929 — episodes.episode.created records the episode opening on the timeline', () => {
  it('registers a subscriber on episodes.episode.created', () => {
    expect(getHandler('episodes.episode.created')).toBeInstanceOf(Function);
  });

  it('persists an admission CareTimeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('episodes.episode.created');
    await handler({ payload: { beneficiaryId, episodeId, phase: 'intake' } });

    const entries = await CareTimeline.find({ beneficiaryId }).lean();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.eventType).toBe('admission');
    expect(entry.category).toBe('clinical');
    expect(String(entry.episodeId)).toBe(String(episodeId));
    expect(entry.title_ar).toContain('فتح حلقة علاجية');
    expect(entry.title_ar).toContain('intake');
  });

  it('does not throw when CareTimeline is unavailable / payload lacks beneficiaryId', async () => {
    const handler = getHandler('episodes.episode.created');
    await expect(handler({ payload: { episodeId } })).resolves.toBeUndefined();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
