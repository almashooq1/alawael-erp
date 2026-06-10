'use strict';

/**
 * family-home-program-completion-core-linkage-wave1047.test.js — W1047.
 *
 * Links family home-program COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a FamilyHomeProgram reaches status 'COMPLETED' the model
 * emits family-home-program.family_home_program.completed → CareTimeline
 * 'family_home_program_completed' (family/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FamilyHomeProgram;
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
    title: 'Daily speech practice',
    status: 'ACTIVE',
    startDate: new Date('2026-05-01'),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1047-family-home-core' } });
  await mongoose.connect(mongod.getUri());

  FamilyHomeProgram = require('../models/FamilyHomeProgram');
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
  await Promise.all([FamilyHomeProgram.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1047 — family home-program completion reaches the unified-core timeline', () => {
  it('completing a home program lands a family_home_program_completed row (family/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await FamilyHomeProgram.create(baseProgram({ beneficiaryId }));

    p.status = 'COMPLETED';
    p.endDate = new Date('2026-05-30');
    await p.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'family_home_program_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('family');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.programId)).toBe(String(p._id));
    expect(tl.metadata.title).toBe('Daily speech practice');
  });

  it('an ACTIVE (non-completed) home program produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await FamilyHomeProgram.create(baseProgram({ beneficiaryId, status: 'ACTIVE' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'family_home_program_completed' })).toBe(
      0
    );
  });

  it('re-saving an already-completed home program does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const p = await FamilyHomeProgram.create(
      baseProgram({ beneficiaryId, status: 'COMPLETED', endDate: new Date('2026-05-30') })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'family_home_program_completed',
    });
    expect(tl).toBeTruthy();

    const again = await FamilyHomeProgram.findById(p._id);
    again.title = 'Daily speech practice (archived)';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'family_home_program_completed',
      })
    ).toBe(1);
  });
});
