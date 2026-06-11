'use strict';

/**
 * W1097 — BipEffectiveness → unified core timeline linkage.
 *
 * Recording a BIP (behaviour intervention plan) effectiveness reading
 * publishes `bip-effectiveness.bip_effectiveness.recorded`, which the DDD
 * cross-module subscriber materialises into a per-beneficiary CareTimeline
 * row (category: clinical). Severity reflects the percent change from the
 * FBA baseline frequency (negative = target behaviour reduced = success).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BipEffectiveness = require('../models/BipEffectiveness');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1097-bip-effectiveness' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await BipEffectiveness.deleteMany({});
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

function reading(overrides = {}) {
  return {
    fbaAssessmentId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    measuredBy: new mongoose.Types.ObjectId(),
    measuredAt: new Date('2026-05-06T00:00:00.000Z'),
    target: { frequency: 6 },
    snapshot: { baselineFrequency: 10 },
    ...overrides,
  };
}

describe('W1097 — BipEffectiveness → CareTimeline linkage', () => {
  it('records a clinical timeline row with success severity on improvement', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const fbaAssessmentId = new mongoose.Types.ObjectId();
    const doc = await BipEffectiveness.create(
      reading({
        beneficiaryId,
        branchId,
        fbaAssessmentId,
        target: { frequency: 4 },
        snapshot: { baselineFrequency: 10 }, // -60% → improvement
      })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('bip_effectiveness_recorded');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.readingId)).toBe(String(doc._id));
    expect(String(row.metadata.fbaAssessmentId)).toBe(String(fbaAssessmentId));
    expect(row.metadata.percentChangeFromBaseline).toBe(-60);
  });

  it('uses warning severity for a worsening reading (>=+10%)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BipEffectiveness.create(
      reading({
        beneficiaryId,
        target: { frequency: 13 },
        snapshot: { baselineFrequency: 10 }, // +30%
      })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
    expect(row.metadata.percentChangeFromBaseline).toBe(30);
  });

  it('records an info row when no baseline is available', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BipEffectiveness.create(
      reading({ beneficiaryId, target: { frequency: 5 }, snapshot: {} })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('info');
  });

  it('does not duplicate the timeline row when the reading is updated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BipEffectiveness.create(reading({ beneficiaryId }));

    await waitForTimeline({ beneficiaryId });

    doc.notes_ar = 'مراجعة محلل السلوك';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(1);
  });
});
