'use strict';

/**
 * allergy-recorded-core-linkage-wave1066.test.js — W1066.
 *
 * Links allergy recording (a safety milestone) into the unified core
 * (per-beneficiary CareTimeline). Recording a new active allergy emits
 * allergy.allergy.recorded → CareTimeline 'allergy_recorded' (clinical;
 * error for severe / life-threatening, warning otherwise).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Allergy;
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

function baseAllergy(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    substance: 'penicillin',
    severity: 'moderate',
    status: 'active',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1066-allergy' } });
  await mongoose.connect(mongod.getUri());

  ({ Allergy } = require('../models/Allergy'));
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
  await Promise.all([Allergy.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1066 — recorded allergies reach the unified-core timeline', () => {
  it('recording an active allergy lands an allergy_recorded row (warning)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await Allergy.create(baseAllergy({ beneficiaryId, severity: 'moderate' }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'allergy_recorded' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('warning');
    expect(String(tl.metadata.allergyId)).toBe(String(a._id));
    expect(tl.metadata.substance).toBe('penicillin');
  });

  it('a severe (life-threatening) allergy is surfaced as an error', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Allergy.create(
      baseAllergy({ beneficiaryId, substance: 'peanut', severity: 'life_threatening' })
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'allergy_recorded' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('error');
    expect(tl.metadata.severe).toBe(true);
  });

  it('an inactive allergy record does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Allergy.create(baseAllergy({ beneficiaryId, status: 'inactive' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'allergy_recorded' })
    ).toBe(0);
  });

  it('updating an existing allergy does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await Allergy.create(baseAllergy({ beneficiaryId }));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'allergy_recorded' });
    expect(tl).toBeTruthy();

    const again = await Allergy.findById(a._id);
    again.reaction = 'hives';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'allergy_recorded' })
    ).toBe(1);
  });
});
