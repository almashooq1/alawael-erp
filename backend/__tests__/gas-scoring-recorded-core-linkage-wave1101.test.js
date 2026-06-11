'use strict';

/**
 * W1101 — GasScoring → unified core timeline linkage.
 *
 * Scoring a beneficiary's goal-attainment level on a GAS scale (a new
 * active GasScoring record) publishes `gas-scoring.gas_scoring.recorded`,
 * which the DDD cross-module subscriber materialises into a per-beneficiary
 * CareTimeline row (category: clinical). Severity reflects attainment:
 * success when the achieved level meets/exceeds expected, warning when it
 * drops below the midpoint, info otherwise. Superseded corrections never
 * re-fire the milestone.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const GasScoring = require('../models/GasScoring');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1101-gas-scoring' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await GasScoring.deleteMany({});
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

function scoring(beneficiaryId, branchId, overrides = {}) {
  return {
    scaleId: new mongoose.Types.ObjectId(),
    goalId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    branchId,
    achievedLevel: 1,
    scoredBy: new mongoose.Types.ObjectId(),
    purpose: 'progress',
    snapshot: {
      scaleVersion: 1,
      weight: 1,
      expectedOutcomeLevel: 0,
      baselineLevel: -2,
    },
    ...overrides,
  };
}

describe('W1101 — GasScoring → CareTimeline linkage', () => {
  it('records a clinical/success timeline row when a goal meets expectation', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await GasScoring.create(scoring(beneficiaryId, branchId, { achievedLevel: 2 }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('gas_scoring_recorded');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.scoringId)).toBe(String(doc._id));
    expect(row.metadata.achievedLevel).toBe(2);
    expect(row.metadata.purpose).toBe('progress');
    expect(row.title).toContain('+2');
  });

  it('records a warning row when the achieved level is below the midpoint', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await GasScoring.create(
      scoring(beneficiaryId, branchId, {
        achievedLevel: -1,
        snapshot: { scaleVersion: 1, weight: 1, expectedOutcomeLevel: 0, baselineLevel: -2 },
      })
    );

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
    expect(row.metadata.metExpected).toBe(false);
  });

  it('does NOT fire when a scoring is created already superseded', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await GasScoring.create(scoring(beneficiaryId, branchId, { status: 'superseded' }));

    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does not duplicate the timeline row on a subsequent unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await GasScoring.create(scoring(beneficiaryId, branchId));

    await waitForTimeline({ beneficiaryId });

    doc.evidence_ar = 'ملاحظة مراجعة';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});
