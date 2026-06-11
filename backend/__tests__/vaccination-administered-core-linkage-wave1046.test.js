'use strict';

/**
 * vaccination-administered-core-linkage-wave1046.test.js — W1046.
 *
 * Links vaccination ADMINISTRATION into the unified core (per-beneficiary
 * CareTimeline). When a Vaccination row moves to status 'administered' (the
 * beneficiary received a dose), the model emits vaccination.vaccination
 * .administered → CareTimeline 'vaccination_administered' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Vaccination;
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

function baseVaccination(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    vaccine: 'MMR',
    doseNumber: 1,
    status: 'scheduled',
    dueDate: new Date('2026-05-01'),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1046-vaccination-core' } });
  await mongoose.connect(mongod.getUri());

  ({ Vaccination } = require('../models/Vaccination'));
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
  await Promise.all([Vaccination.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1046 — vaccination administration reaches the unified-core timeline', () => {
  it('administering a vaccine lands a vaccination_administered row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const v = await Vaccination.create(baseVaccination({ beneficiaryId }));

    v.status = 'administered';
    v.administeredAt = new Date('2026-05-03');
    await v.save();

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'vaccination_administered' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.vaccinationId)).toBe(String(v._id));
    expect(tl.metadata.vaccine).toBe('MMR');
  });

  it('a scheduled (non-administered) vaccination produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await Vaccination.create(baseVaccination({ beneficiaryId, status: 'scheduled' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'vaccination_administered' })).toBe(0);
  });

  it('re-saving an already-administered vaccination does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const v = await Vaccination.create(
      baseVaccination({ beneficiaryId, status: 'administered', administeredAt: new Date() })
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'vaccination_administered' });
    expect(tl).toBeTruthy();

    const again = await Vaccination.findById(v._id);
    again.notes = 'No adverse reaction observed.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'vaccination_administered' })
    ).toBe(1);
  });
});
