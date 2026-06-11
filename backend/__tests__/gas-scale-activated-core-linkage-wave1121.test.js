'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const GasScale = require('../models/GasScale');
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
  await GasScale.deleteMany({});
});

function levels() {
  return [-2, -1, 0, 1, 2].map(level => ({
    level,
    description_ar: `مستوى ${level}`,
  }));
}

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function scale(beneficiaryId, overrides = {}) {
  return {
    goalId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    title_ar: 'مقياس تحقيق هدف الحركة',
    domain: 'motor',
    levels: levels(),
    baselineLevel: -1,
    expectedOutcomeLevel: 0,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1121 — GasScale activated → unified-core CareTimeline linkage', () => {
  test('records a clinical success row when a GAS scale is activated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await GasScale.create(scale(beneficiaryId, { branchId, domain: 'communication' }));
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('gas_scale_activated');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.scaleId)).toBe(String(doc._id));
    expect(row.metadata.domain).toBe('communication');
    expect(row.metadata.version).toBe(1);
    expect(row.title).toContain('(communication)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('does not double-record on a non-status save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await GasScale.create(scale(beneficiaryId));
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.weight = 2;
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });

  test('re-activating (archived → active) records again', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await GasScale.create(scale(beneficiaryId, { status: 'archived' }));
    await settle();
    // archived on create → status !== active → no row
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.status = 'active';
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });

  test('metadata carries the goal + beneficiary linkage', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const goalId = new mongoose.Types.ObjectId();
    await GasScale.create(scale(beneficiaryId, { goalId }));
    await settle();

    const row = await CareTimeline.findOne({ beneficiaryId }).lean();
    expect(row).toBeTruthy();
    expect(String(row.metadata.goalId)).toBe(String(goalId));
    expect(String(row.metadata.beneficiaryId)).toBe(String(beneficiaryId));
  });
});
