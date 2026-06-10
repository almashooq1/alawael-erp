'use strict';

/**
 * dysphagia-assessment-finalized-core-linkage-wave1065.test.js — W1065.
 *
 * Links dysphagia (swallow) assessment finalization into the unified core
 * (per-beneficiary CareTimeline). Finalizing a swallow assessment emits
 * dysphagia-assessment.dysphagia_assessment.finalized → CareTimeline
 * 'dysphagia_assessment_finalized' (clinical; error when unsafe, else info).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DysphagiaAssessment;
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

// A low-risk draft swallow assessment (satisfies invariants).
function baseDraft(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    screeningTool: 'bedside_swallow_exam',
    aspirationRisk: 'low',
    status: 'draft',
    ...overrides,
  };
}

function finalize(doc) {
  doc.status = 'finalized';
  doc.assessedBy = new mongoose.Types.ObjectId();
  doc.assessedAt = new Date();
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1065-dysphagia' } });
  await mongoose.connect(mongod.getUri());

  DysphagiaAssessment = require('../models/DysphagiaAssessment');
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
  await Promise.all([DysphagiaAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1065 — finalized dysphagia assessments reach the unified-core timeline', () => {
  it('finalizing a swallow assessment lands a dysphagia_assessment_finalized row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await DysphagiaAssessment.create(baseDraft({ beneficiaryId }));

    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'dysphagia_assessment_finalized',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info'); // low risk → safe
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
  });

  it('an unsafe swallow (high aspiration risk) finalization is surfaced as an error', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await DysphagiaAssessment.create(
      baseDraft({
        beneficiaryId,
        aspirationRisk: 'high',
        slpReferral: true, // invariant: high risk must be actioned
      })
    );

    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'dysphagia_assessment_finalized',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('error');
    expect(tl.metadata.unsafe).toBe(true);
    expect(tl.metadata.aspirationRisk).toBe('high');
  });

  it('a draft swallow assessment does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DysphagiaAssessment.create(baseDraft({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'dysphagia_assessment_finalized',
      })
    ).toBe(0);
  });

  it('re-saving a finalized assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await DysphagiaAssessment.create(baseDraft({ beneficiaryId }));
    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'dysphagia_assessment_finalized',
    });
    expect(tl).toBeTruthy();

    const again = await DysphagiaAssessment.findById(a._id);
    again.notes = 'addendum';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'dysphagia_assessment_finalized',
      })
    ).toBe(1);
  });
});
