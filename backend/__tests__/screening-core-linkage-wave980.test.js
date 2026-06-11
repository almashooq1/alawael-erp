'use strict';

/**
 * screening-core-linkage-wave980.test.js — W980.
 *
 * Wires finalized vision/hearing screenings into the unified-core timeline,
 * flagging outcome='refer' (needs ophthalmology/optometry or audiology/ENT) as a
 * warning. Producers: native VisionScreening/HearingScreening post-save hooks
 * (fire when status reaches 'finalized', once). RUNTIME end-to-end against a real
 * in-memory Mongo + the real integration bus + real subscribers.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let VisionScreening, HearingScreening, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w980-screen' } });
  await mongoose.connect(mongod.getUri());

  VisionScreening = require('../models/VisionScreening');
  HearingScreening = require('../models/HearingScreening');
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
  await Promise.all([
    VisionScreening.deleteMany({}),
    HearingScreening.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

const finalizeFields = () => ({
  screenedBy: new mongoose.Types.ObjectId(),
  screenedAt: new Date(),
});

describe('W980 — screenings reach the unified-core timeline', () => {
  it('a draft vision screening produces no row; finalizing it lands screening_completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const v = await VisionScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'snellen_chart',
      outcome: 'pass',
      status: 'draft',
    });
    await new Promise(r => setTimeout(r, 150));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    const loaded = await VisionScreening.findById(v._id);
    loaded.status = 'finalized';
    Object.assign(loaded, finalizeFields());
    await loaded.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('info');
  });

  it('a vision screening finalized with outcome=refer lands a WARNING row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await VisionScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'lea_symbols',
      outcome: 'refer',
      referralReason: 'reduced acuity both eyes',
      referralTo: 'ophthalmology',
      status: 'finalized',
      ...finalizeFields(),
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.outcome).toBe('refer');
  });

  it('a finalized hearing screening lands screening_completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await HearingScreening.create({
      beneficiaryId,
      date: new Date(),
      screeningMethod: 'oae',
      outcome: 'pass',
      status: 'finalized',
      ...finalizeFields(),
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'screening_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
  });
});
