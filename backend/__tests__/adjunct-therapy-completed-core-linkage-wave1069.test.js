'use strict';

/**
 * adjunct-therapy-completed-core-linkage-wave1069.test.js — W1069.
 *
 * Links adjunct-therapy session completion (hydro / hippo / animal-assisted)
 * into the unified core (per-beneficiary CareTimeline). Completing a session
 * emits adjunct-therapy.adjunct_therapy.session_completed → CareTimeline
 * 'adjunct_therapy_completed' (clinical; warning if an in-session incident
 * was logged, success otherwise).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AdjunctTherapySession;
let CareTimeline;
let integrationBus;

// A scheduled hydrotherapy session that satisfies the completion invariants
// once status flips: medically cleared + has content.
function baseSession(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    modality: 'hydrotherapy',
    sessionDate: new Date(),
    medicalCleared: true,
    clearedByName: 'Dr. Salem',
    clearedDate: new Date(),
    activities: ['supported floating', 'water walking'],
    outcomeNotes: 'tolerated well',
    status: 'scheduled',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1069-adjunct' } });
  await mongoose.connect(mongod.getUri());

  AdjunctTherapySession = require('../models/AdjunctTherapySession');
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
  await Promise.all([AdjunctTherapySession.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1069 — completed adjunct-therapy sessions reach the unified-core timeline', () => {
  it('completing a session lands an adjunct_therapy_completed row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await AdjunctTherapySession.create(baseSession({ beneficiaryId }));

    s.status = 'completed';
    await s.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'adjunct_therapy_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.sessionId)).toBe(String(s._id));
    expect(tl.metadata.modality).toBe('hydrotherapy');
  });

  it('a completed session with an in-session incident is surfaced as warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await AdjunctTherapySession.create(
      baseSession({
        beneficiaryId,
        incidentDuringSession: true,
        incidentNotes: 'brief distress, settled quickly',
      })
    );

    s.status = 'completed';
    await s.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'adjunct_therapy_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.hadIncident).toBe(true);
  });

  it('a scheduled session does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await AdjunctTherapySession.create(baseSession({ beneficiaryId, status: 'scheduled' }));

    await waitForCount({ beneficiaryId, eventType: 'adjunct_therapy_completed' }, 0);
  });

  it('re-saving a completed session does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await AdjunctTherapySession.create(baseSession({ beneficiaryId }));
    s.status = 'completed';
    await s.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'adjunct_therapy_completed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await AdjunctTherapySession.findById(s._id);
    again.notes = 'addendum';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'adjunct_therapy_completed' }, 1);
  });
});
