'use strict';

/**
 * pain-assessment-finalized-core-linkage-wave1064.test.js — W1064.
 *
 * Links pain-assessment finalization into the unified core (per-beneficiary
 * CareTimeline). Finalizing a pain assessment emits
 * pain-assessment.pain_assessment.finalized → CareTimeline
 * 'pain_assessment_finalized' (clinical; warning when significant, else info).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PainAssessment;
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

// A no-pain draft assessment (satisfies invariants: painPresent=false → score 0).
function baseDraft(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    scale: 'numeric_0_10',
    observerType: 'self_report',
    painPresent: false,
    score: 0,
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1064-pain-assessment' } });
  await mongoose.connect(mongod.getUri());

  PainAssessment = require('../models/PainAssessment');
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
  await Promise.all([PainAssessment.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1064 — finalized pain assessments reach the unified-core timeline', () => {
  it('finalizing a pain assessment lands a pain_assessment_finalized row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PainAssessment.create(baseDraft({ beneficiaryId }));

    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'pain_assessment_finalized',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('info'); // no pain → not significant
    expect(String(tl.metadata.assessmentId)).toBe(String(a._id));
  });

  it('significant pain finalization is surfaced as a warning', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PainAssessment.create(
      baseDraft({
        beneficiaryId,
        painPresent: true,
        score: 8,
        bodyLocations: ['lower_back'],
      })
    );

    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'pain_assessment_finalized',
    });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.significant).toBe(true);
  });

  it('a draft pain assessment does not create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PainAssessment.create(baseDraft({ beneficiaryId, status: 'draft' }));

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'pain_assessment_finalized',
      })
    ).toBe(0);
  });

  it('re-saving a finalized assessment does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await PainAssessment.create(baseDraft({ beneficiaryId }));
    finalize(a);
    await a.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'pain_assessment_finalized',
    });
    expect(tl).toBeTruthy();

    const again = await PainAssessment.findById(a._id);
    again.notes = 'addendum';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'pain_assessment_finalized',
      })
    ).toBe(1);
  });
});
