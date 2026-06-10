'use strict';

/**
 * dtt-session-completed-core-linkage-wave1067.test.js — W1067.
 *
 * Links DTT (discrete-trial-training / ABA) session completion into the
 * unified core (per-beneficiary CareTimeline). Completing a DTT session emits
 * dtt-session.dtt_session.completed → CareTimeline 'dtt_session_completed'
 * (clinical; success when ≥1 target reached mastery, info otherwise).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DttSession;
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

// A scheduled DTT session with one target carrying trial data.
function baseSession(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    sessionDate: new Date(),
    programArea: 'communication',
    status: 'scheduled',
    targets: [
      {
        targetName: 'Mand for "water"',
        masteryCriterionPct: 80,
        masteryAchieved: false,
        trials: [
          { sequence: 1, promptLevel: 'independent', response: 'correct' },
          { sequence: 2, promptLevel: 'gestural', response: 'incorrect' },
        ],
      },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1067-dtt' } });
  await mongoose.connect(mongod.getUri());

  DttSession = require('../models/DttSession');
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
  await Promise.all([DttSession.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1067 — completed DTT sessions reach the unified-core timeline', () => {
  it('completing a DTT session lands a dtt_session_completed row (info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await DttSession.create(baseSession({ beneficiaryId }));

    s.status = 'completed';
    await s.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'dtt_session_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.sessionId)).toBe(String(s._id));
    expect(tl.metadata.totalTrials).toBe(2);
  });

  it('a completed session with a mastered target is surfaced as success', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await DttSession.create(
      baseSession({
        beneficiaryId,
        targets: [
          {
            targetName: 'Mand for "more"',
            masteryAchieved: true,
            trials: [{ sequence: 1, promptLevel: 'independent', response: 'correct' }],
          },
        ],
      })
    );

    s.status = 'completed';
    await s.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'dtt_session_completed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('success');
    expect(tl.metadata.masteryCount).toBe(1);
  });

  it('a scheduled session does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DttSession.create(baseSession({ beneficiaryId, status: 'scheduled' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'dtt_session_completed' })
    ).toBe(0);
  });

  it('re-saving a completed session does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await DttSession.create(baseSession({ beneficiaryId }));
    s.status = 'completed';
    await s.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'dtt_session_completed' });
    expect(tl).toBeTruthy();

    const again = await DttSession.findById(s._id);
    again.sessionNotes = 'addendum';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'dtt_session_completed' })
    ).toBe(1);
  });
});
