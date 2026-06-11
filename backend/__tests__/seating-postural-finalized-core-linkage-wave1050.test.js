'use strict';

/**
 * seating-postural-finalized-core-linkage-wave1050.test.js — W1050.
 *
 * Links seating/postural assessment FINALIZATION into the unified core
 * (per-beneficiary CareTimeline). When a SeatingPosturalAssessment reaches
 * status 'finalized' the model emits
 * seating-postural-assessment.seating_postural.finalized → CareTimeline
 * 'seating_postural_finalized' (clinical/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SeatingPosturalAssessment;
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

function baseAssessment(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    assessmentType: 'initial',
    date: new Date('2026-05-01'),
    status: 'draft',
    ...overrides,
  };
}

function finalizedFields() {
  return {
    status: 'finalized',
    assessedByName: 'Dr. Salem',
    assessedAt: new Date('2026-05-02'),
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1050-seating-core' } });
  await mongoose.connect(mongod.getUri());

  SeatingPosturalAssessment = require('../models/SeatingPosturalAssessment');
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
  await Promise.all([SeatingPosturalAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1050 — seating/postural finalization reaches the unified-core timeline', () => {
  it('finalizing lands a seating_postural_finalized row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await SeatingPosturalAssessment.create(baseAssessment({ beneficiaryId }));

    Object.assign(a, finalizedFields());
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'seating_postural_finalized',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
    expect(tl.metadata.assessmentType).toBe('initial');
  });

  it('a draft (non-finalized) assessment produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeatingPosturalAssessment.create(baseAssessment({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'seating_postural_finalized' })).toBe(0);
  });

  it('re-saving an already-finalized assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await SeatingPosturalAssessment.create(
      baseAssessment({ beneficiaryId, ...finalizedFields() })
    );

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'seating_postural_finalized',
    });
    expect(tl).toBeTruthy();

    const again = await SeatingPosturalAssessment.findById(a._id);
    again.outcomeSummary = 'Tilt-in-space chair recommended.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'seating_postural_finalized',
      })
    ).toBe(1);
  });
});
