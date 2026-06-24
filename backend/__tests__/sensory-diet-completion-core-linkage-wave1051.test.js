'use strict';

/**
 * sensory-diet-completion-core-linkage-wave1051.test.js — W1051.
 *
 * Links sensory-diet-program COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a SensoryDietProgram reaches status 'completed' the model
 * emits sensory-diet-program.sensory_diet.completed → CareTimeline
 * 'sensory_diet_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SensoryDietProgram;
let CareTimeline;
let integrationBus;

function baseProgram(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    status: 'active',
    activities: [{ name: 'Wall push-ups', sensorySystem: 'proprioceptive', purpose: 'calming' }],
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1051-sensory-diet-core' } });
  await mongoose.connect(mongod.getUri());

  SensoryDietProgram = require('../models/SensoryDietProgram');
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
  await Promise.all([SensoryDietProgram.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1051 — sensory-diet completion reaches the unified-core timeline', () => {
  it('completing a program lands a sensory_diet_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await SensoryDietProgram.create(baseProgram({ beneficiaryId }));

    p.status = 'completed';
    await p.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'sensory_diet_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.programId)).toBe(String(p._id));
  });

  it('an active (non-completed) program produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SensoryDietProgram.create(baseProgram({ beneficiaryId, status: 'active' }));

    await waitForCount({ eventType: 'sensory_diet_completed' }, 0);
  });

  it('re-saving an already-completed program does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await SensoryDietProgram.create(baseProgram({ beneficiaryId, status: 'completed' }));

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'sensory_diet_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await SensoryDietProgram.findById(p._id);
    again.reviewNotes = 'Goals achieved; regulation stable.';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'sensory_diet_completed' }, 1);
  });
});
