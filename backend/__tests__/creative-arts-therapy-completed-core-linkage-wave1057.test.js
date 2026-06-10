'use strict';

/**
 * creative-arts-therapy-completed-core-linkage-wave1057.test.js — W1057.
 *
 * Links creative-arts therapy session COMPLETION into the unified core
 * (per-beneficiary CareTimeline). When a CreativeArtsTherapySession reaches
 * status 'completed' the model emits
 * creative-arts-therapy.creative_arts_therapy.completed → CareTimeline
 * 'creative_arts_therapy_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CreativeArtsTherapySession;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseSession(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    modality: 'music',
    sessionDate: new Date(),
    status: 'scheduled',
    ...overrides,
  };
}

function completedFields(overrides = {}) {
  return {
    status: 'completed',
    engagementLevel: 'high',
    responseNotes: 'Active participation; sustained attention through the full session.',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1057-creative-arts-core' } });
  await mongoose.connect(mongod.getUri());

  CreativeArtsTherapySession = require('../models/CreativeArtsTherapySession');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([CreativeArtsTherapySession.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1057 — creative arts therapy completion reaches the unified-core timeline', () => {
  it('completing a session lands a creative_arts_therapy_completed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await CreativeArtsTherapySession.create(baseSession({ beneficiaryId }));

    Object.assign(s, completedFields());
    await s.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'creative_arts_therapy_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.sessionId)).toBe(String(s._id));
    expect(tl.metadata.modality).toBe('music');
  });

  it('a scheduled (non-completed) session produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CreativeArtsTherapySession.create(baseSession({ beneficiaryId, status: 'scheduled' }));

    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ eventType: 'creative_arts_therapy_completed' })
    ).toBe(0);
  });

  it('re-saving an already-completed session does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await CreativeArtsTherapySession.create(
      baseSession({ beneficiaryId, ...completedFields() })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'creative_arts_therapy_completed',
    });
    expect(tl).toBeTruthy();

    const again = await CreativeArtsTherapySession.findById(s._id);
    again.notes = 'Shared the artwork with the parent at pickup.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'creative_arts_therapy_completed',
      })
    ).toBe(1);
  });
});
