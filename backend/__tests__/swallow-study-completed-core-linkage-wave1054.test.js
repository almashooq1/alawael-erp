'use strict';

/**
 * swallow-study-completed-core-linkage-wave1054.test.js — W1054.
 *
 * Links instrumental swallow study COMPLETION into the unified core
 * (per-beneficiary CareTimeline). When an InstrumentalSwallowStudy reaches
 * status 'completed' the model emits
 * instrumental-swallow-study.swallow_study.completed → CareTimeline
 * 'swallow_study_completed' (clinical/success, or warning when aspiration).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let InstrumentalSwallowStudy;
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

function baseStudy(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    studyType: 'vfss',
    status: 'ordered',
    ...overrides,
  };
}

function completedFields(overrides = {}) {
  return {
    status: 'completed',
    performedDate: new Date(),
    performedByName: 'Dr. SLP',
    overallFinding: 'Mild oral-phase delay; safe on IDDSI level 5.',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1054-swallow-study-core' } });
  await mongoose.connect(mongod.getUri());

  InstrumentalSwallowStudy = require('../models/InstrumentalSwallowStudy');
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
  await Promise.all([InstrumentalSwallowStudy.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1054 — swallow study completion reaches the unified-core timeline', () => {
  it('completing a study lands a swallow_study_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await InstrumentalSwallowStudy.create(baseStudy({ beneficiaryId }));

    Object.assign(s, completedFields());
    await s.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'swallow_study_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.studyId)).toBe(String(s._id));
  });

  it('an ordered (non-completed) study produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await InstrumentalSwallowStudy.create(baseStudy({ beneficiaryId, status: 'ordered' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'swallow_study_completed' })).toBe(0);
  });

  it('re-saving an already-completed study does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await InstrumentalSwallowStudy.create(
      baseStudy({ beneficiaryId, ...completedFields() })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'swallow_study_completed',
    });
    expect(tl).toBeTruthy();

    const again = await InstrumentalSwallowStudy.findById(s._id);
    again.clinicianNotes = 'Counselled family on safe-swallow strategies.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'swallow_study_completed' })
    ).toBe(1);
  });
});
