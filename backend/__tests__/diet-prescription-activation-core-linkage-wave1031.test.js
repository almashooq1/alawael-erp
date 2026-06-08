'use strict';

/**
 * diet-prescription-activation-core-linkage-wave1031.test.js — W1031.
 *
 * Links diet-prescription ACTIVATION into the unified core (per-beneficiary
 * CareTimeline). When a BeneficiaryDietPrescription (W368) reaches the 'active'
 * status (the IDDSI / NPO / enteral plan is now in effect), the model emits
 * diet-prescription.diet_prescription.activated → CareTimeline
 * 'diet_prescription_activated' (clinical/info).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DietPrescription;
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

function basePrescription(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    foodIddsiLevel: 5,
    drinkIddsiLevel: 2,
    status: 'draft',
    ...overrides,
  };
}

async function activate(prescription) {
  prescription.status = 'active';
  prescription.prescribedByName = 'Lead dietitian';
  prescription.prescriberDiscipline = 'registered_dietitian';
  prescription.prescribedAt = new Date();
  prescription.nextReviewDue = new Date(Date.now() + 90 * 24 * 3600e3);
  await prescription.save();
  return prescription;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1031-diet-activation-core' },
  });
  await mongoose.connect(mongod.getUri());

  DietPrescription = require('../models/BeneficiaryDietPrescription');
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
  await Promise.all([DietPrescription.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1031 — Diet prescription activation reaches the unified-core timeline', () => {
  it('activating a diet prescription lands a diet_prescription_activated row (clinical/info)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const rx = await activate(await DietPrescription.create(basePrescription({ beneficiaryId })));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'diet_prescription_activated' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info');
    expect(String(tl.metadata.prescriptionId)).toBe(String(rx._id));
    expect(tl.metadata.foodIddsiLevel).toBe(5);
  });

  it('a draft prescription produces NO activation timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DietPrescription.create(basePrescription({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'diet_prescription_activated' })).toBe(0);
  });

  it('re-saving an already-active prescription does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const rx = await activate(await DietPrescription.create(basePrescription({ beneficiaryId })));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'diet_prescription_activated' });
    expect(tl).toBeTruthy();

    const again = await DietPrescription.findById(rx._id);
    again.notes = 'Reviewed by SLP at MDT.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'diet_prescription_activated' })
    ).toBe(1);
  });
});
