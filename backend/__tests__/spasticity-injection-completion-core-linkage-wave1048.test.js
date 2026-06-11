'use strict';

/**
 * spasticity-injection-completion-core-linkage-wave1048.test.js — W1048.
 *
 * Links spasticity-injection COMPLETION into the unified core (per-beneficiary
 * CareTimeline). When a SpasticityInjection reaches status 'completed' the model
 * emits spasticity-injection.spasticity_injection.completed → CareTimeline
 * 'spasticity_injection_completed' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SpasticityInjection;
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

function baseInjection(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    agent: 'botulinum_toxin_a',
    procedureDate: new Date('2026-05-10'),
    status: 'planned',
    ...overrides,
  };
}

function completedFields() {
  return {
    status: 'completed',
    consentObtained: true,
    targetedMuscles: [{ muscle: 'gastrocnemius', side: 'left' }],
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1048-spasticity-core' } });
  await mongoose.connect(mongod.getUri());

  SpasticityInjection = require('../models/SpasticityInjection');
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
  await Promise.all([SpasticityInjection.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1048 — spasticity-injection completion reaches the unified-core timeline', () => {
  it('completing an injection lands a spasticity_injection_completed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const inj = await SpasticityInjection.create(baseInjection({ beneficiaryId }));

    Object.assign(inj, completedFields());
    await inj.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'spasticity_injection_completed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.injectionId)).toBe(String(inj._id));
    expect(tl.metadata.agent).toBe('botulinum_toxin_a');
  });

  it('a planned (non-completed) injection produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SpasticityInjection.create(baseInjection({ beneficiaryId, status: 'planned' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'spasticity_injection_completed' })).toBe(
      0
    );
  });

  it('re-saving an already-completed injection does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const inj = await SpasticityInjection.create(
      baseInjection({ beneficiaryId, ...completedFields() })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'spasticity_injection_completed',
    });
    expect(tl).toBeTruthy();

    const again = await SpasticityInjection.findById(inj._id);
    again.notes = 'Tolerated procedure well.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'spasticity_injection_completed',
      })
    ).toBe(1);
  });
});
