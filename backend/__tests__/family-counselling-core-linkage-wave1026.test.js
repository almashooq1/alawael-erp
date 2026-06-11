'use strict';

/**
 * family-counselling-core-linkage-wave1026.test.js — W1026.
 *
 * Links family-counselling session COMPLETION into the unified core
 * (per-beneficiary CareTimeline), following the W994…W1025 pattern.
 * FamilyCounsellingSession is the per-family counselling encounter
 * (beneficiaryId REQUIRED). When a session reaches 'completed', the
 * longitudinal record must carry it as a family-wellbeing milestone:
 *   - FamilyCounsellingSession.status === 'completed'
 *       → family-counselling.family_counselling.completed
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FamilyCounsellingSession;
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
    counsellorUserId: new mongoose.Types.ObjectId(),
    sessionDate: new Date(),
    durationMinutes: 60,
    sessionType: 'periodic_checkin',
    triggerSource: 'scheduled_routine',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1026-family-counselling-core' },
  });
  await mongoose.connect(mongod.getUri());

  FamilyCounsellingSession = require('../models/FamilyCounsellingSession');
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
  await Promise.all([FamilyCounsellingSession.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1026 — Family counselling completion reaches the unified-core timeline', () => {
  it('completing a session lands a family_counselling_completed row (family/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const session = await FamilyCounsellingSession.create(
      baseSession({ beneficiaryId, status: 'in_progress' })
    );

    session.status = 'completed';
    session.sessionNotes = 'Caregiver coping strategies reviewed.';
    await session.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'family_counselling_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.familyCounsellingSessionId)).toBe(String(session._id));
    expect(tl.metadata.sessionType).toBe('periodic_checkin');
    expect(tl.metadata.triggerSource).toBe('scheduled_routine');
    expect(tl.metadata.durationMinutes).toBe(60);
  });

  it('a scheduled (not completed) session produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await FamilyCounsellingSession.create(baseSession({ beneficiaryId, status: 'scheduled' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'family_counselling_completed' })).toBe(
      0
    );
  });

  it('re-saving an already-completed session does not re-fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const session = await FamilyCounsellingSession.create(
      baseSession({ beneficiaryId, status: 'in_progress' })
    );
    session.status = 'completed';
    await session.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'family_counselling_completed',
    });
    expect(tl).toBeTruthy();

    const again = await FamilyCounsellingSession.findById(session._id);
    again.sessionNotes = 'Notes amended after supervision.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'family_counselling_completed',
      })
    ).toBe(1);
  });
});
