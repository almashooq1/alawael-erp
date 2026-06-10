'use strict';

/**
 * W1093 — BeneficiaryMealEvent → unified core timeline linkage.
 *
 * Recording an allergy incident during a beneficiary meal publishes
 * `meal-event.meal_event.allergy_incident`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: clinical, severity: warning). Routine meals (no allergy
 * incident) must NOT surface on the clinical timeline.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BeneficiaryMealEvent = require('../models/BeneficiaryMealEvent');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1093-meal-event' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await BeneficiaryMealEvent.deleteMany({});
  await CareTimeline.deleteMany({});
});

async function waitForTimeline(filter, { tries = 40, gap = 50 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const row = await CareTimeline.findOne(filter).lean();
    if (row) return row;
    await new Promise(r => setTimeout(r, gap));
  }
  return null;
}

function meal(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-05-12T00:00:00.000Z'),
    mealType: 'lunch',
    menuItems: ['أرز', 'دجاج', 'سلطة'],
    consumedPercent: 60,
    ...overrides,
  };
}

describe('W1093 — BeneficiaryMealEvent → CareTimeline linkage', () => {
  it('records a clinical timeline row on an allergy incident', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryMealEvent.create(
      meal({
        beneficiaryId,
        branchId,
        allergyIncident: true,
        refusedItems: ['فول سوداني'],
      })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('meal_allergy_incident');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('warning');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.mealEventId)).toBe(String(doc._id));
    expect(row.metadata.mealType).toBe('lunch');
    expect(row.title).toContain('lunch');
  });

  it('does NOT fire for a routine meal without an allergy incident', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryMealEvent.create(meal({ beneficiaryId, allergyIncident: false }));

    await new Promise(r => setTimeout(r, 300));
    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(0);
  });

  it('captures refused items in metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryMealEvent.create(
      meal({
        beneficiaryId,
        allergyIncident: true,
        refusedItems: ['حليب', 'جبن'],
      })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(Array.isArray(row.metadata.refusedItems)).toBe(true);
    expect(row.metadata.refusedItems).toEqual(expect.arrayContaining(['حليب']));
  });

  it('does not duplicate the timeline row when the meal is updated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryMealEvent.create(meal({ beneficiaryId, allergyIncident: true }));

    await waitForTimeline({ beneficiaryId });

    doc.notes = 'تمت متابعة الحالة';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(1);
  });
});
