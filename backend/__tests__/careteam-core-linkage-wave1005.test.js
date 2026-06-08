'use strict';

/**
 * careteam-core-linkage-wave1005.test.js — W1005.
 *
 * Wires care-team composition onto the unified-core timeline. Care-team
 * membership is an EMBEDDED `careTeam[]` array (+ `leadTherapistId`) inside
 * EpisodeOfCare, so the producer DIFFS a post('init') snapshot vs the saved
 * state. Fills the long-declared-but-producerless `team_member_added` /
 * `team_member_removed` / `lead_changed` CareTimeline enum values. RUNTIME
 * end-to-end against real in-memory Mongo + the real integration bus + real
 * subscribers. Creation is skipped (episode.created covers the initial team).
 *
 * NOTE: `addTeamMember`/`removeTeamMember` are model methods that already
 * `return this.save()` — `await` them (do NOT call save() again, or Mongoose
 * throws ParallelSaveError).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let EpisodeOfCare, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function newEpisode(extra = {}) {
  return EpisodeOfCare.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    startDate: new Date(),
    ...extra,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1005-careteam' } });
  await mongoose.connect(mongod.getUri());
  ({ EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare'));
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([EpisodeOfCare.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1005 — care-team changes reach the unified-core timeline', () => {
  it('creating an episode emits no care-team row; adding a member → team_member_added', async () => {
    const ep = await newEpisode();
    await new Promise(r => setTimeout(r, 150));
    expect(await CareTimeline.countDocuments({ beneficiaryId: ep.beneficiaryId })).toBe(0);

    const loaded = await EpisodeOfCare.findById(ep._id);
    await loaded.addTeamMember({ userId: new mongoose.Types.ObjectId(), role: 'speech_therapist' });
    const tl = await waitForTimeline({
      beneficiaryId: ep.beneficiaryId,
      eventType: 'team_member_added',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
  });

  it('removing a member → team_member_removed', async () => {
    const uid = new mongoose.Types.ObjectId();
    const ep = await newEpisode();
    let loaded = await EpisodeOfCare.findById(ep._id);
    await loaded.addTeamMember({ userId: uid, role: 'psychologist' });
    await waitForTimeline({ beneficiaryId: ep.beneficiaryId, eventType: 'team_member_added' });

    loaded = await EpisodeOfCare.findById(ep._id);
    await loaded.removeTeamMember(uid);
    const tl = await waitForTimeline({
      beneficiaryId: ep.beneficiaryId,
      eventType: 'team_member_removed',
    });
    expect(tl).toBeTruthy();
  });

  it('changing the lead therapist → lead_changed', async () => {
    const ep = await newEpisode();
    const loaded = await EpisodeOfCare.findById(ep._id);
    loaded.leadTherapistId = new mongoose.Types.ObjectId();
    await loaded.save();
    const tl = await waitForTimeline({
      beneficiaryId: ep.beneficiaryId,
      eventType: 'lead_changed',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('info');
  });
});
