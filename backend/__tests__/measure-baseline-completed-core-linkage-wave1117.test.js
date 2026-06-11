'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { MeasureBaselineSlot } = require('../domains/goals/models/MeasureBaselineSlot');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await MeasureBaselineSlot.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function slot(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    episodeId: new mongoose.Types.ObjectId(),
    measureCode: 'VABS3',
    measureId: new mongoose.Types.ObjectId(),
    enteredAt: new Date(),
    state: 'BASELINE_REQUIRED',
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

/** Poll until a timeline row matching `query` exists (CI-load safe). */
async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

describe('W1117 — MeasureBaselineSlot completion → unified-core CareTimeline linkage', () => {
  test('records a clinical/success row when a baseline slot is completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await MeasureBaselineSlot.create(
      slot(beneficiaryId, { branchId, measureCode: 'CARS2' })
    );
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.state = 'BASELINE_COMPLETED';
    doc.baselineApplicationId = new mongoose.Types.ObjectId();
    doc.completedAt = new Date();
    await doc.save();
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('measure_baseline_completed');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.slotId)).toBe(String(doc._id));
    expect(row.metadata.measureCode).toBe('CARS2');
    expect(row.metadata.baselineApplicationId).toBeDefined();
    expect(row.title).toContain('(CARS2)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('fires when a slot is created already completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasureBaselineSlot.create(
      slot(beneficiaryId, {
        state: 'BASELINE_COMPLETED',
        baselineApplicationId: new mongoose.Types.ObjectId(),
        completedAt: new Date(),
        measureCode: 'GMFM88',
      })
    );
    await waitForTimeline({ beneficiaryId });

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.measureCode).toBe('GMFM88');
  });

  test('does not fire for a non-completed transition (scheduled)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await MeasureBaselineSlot.create(slot(beneficiaryId));
    await settle();

    doc.state = 'BASELINE_SCHEDULED';
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await MeasureBaselineSlot.create(
      slot(beneficiaryId, {
        state: 'BASELINE_COMPLETED',
        baselineApplicationId: new mongoose.Types.ObjectId(),
        completedAt: new Date(),
      })
    );
    await waitForTimeline({ beneficiaryId });
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.state = 'BASELINE_LOCKED';
    doc.lockedAt = new Date();
    doc.lockedBy = new mongoose.Types.ObjectId();
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});
