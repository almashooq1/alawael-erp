'use strict';

/**
 * adaptive-sports-completion-core-linkage-wave1044.test.js — W1044.
 *
 * Links adaptive-sports-program COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When an AdaptiveSportsProgram (W362) reaches status 'completed'
 * (the beneficiary finished a structured adaptive / para-sport program), the
 * model emits adaptive-sports.adaptive_sports.completed → CareTimeline
 * 'adaptive_sports_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AdaptiveSportsProgram;
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

function baseProgram(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    sport: 'boccia',
    category: 'individual',
    physicalDemand: 'moderate',
    startDate: new Date('2026-03-01'),
    status: 'active',
    ...overrides,
  };
}

async function complete(program) {
  program.status = 'completed';
  program.endDate = new Date('2026-05-30');
  await program.save();
  return program;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1044-adaptive-sports-core' },
  });
  await mongoose.connect(mongod.getUri());

  AdaptiveSportsProgram = require('../models/AdaptiveSportsProgram');
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
  await Promise.all([AdaptiveSportsProgram.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1044 — adaptive sports completion reaches the unified-core timeline', () => {
  it('completing a program lands an adaptive_sports_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const program = await complete(
      await AdaptiveSportsProgram.create(baseProgram({ beneficiaryId }))
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'adaptive_sports_completed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.programId)).toBe(String(program._id));
    expect(tl.metadata.sport).toBe('boccia');
  });

  it('an active (non-completed) program produces NO completion timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await AdaptiveSportsProgram.create(baseProgram({ beneficiaryId, status: 'active' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'adaptive_sports_completed' })).toBe(0);
  });

  it('re-saving an already-completed program does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const program = await complete(
      await AdaptiveSportsProgram.create(baseProgram({ beneficiaryId }))
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'adaptive_sports_completed' });
    expect(tl).toBeTruthy();

    const again = await AdaptiveSportsProgram.findById(program._id);
    again.notes = 'Final coach summary recorded.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'adaptive_sports_completed' })
    ).toBe(1);
  });
});
