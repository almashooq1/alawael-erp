'use strict';

/**
 * clinical-assessment-core-linkage-wave1047.test.js — W1047.
 *
 * RUNTIME end-to-end linkage of the W670-W673 clinical-assessment trio
 * (dysphagia / pain / physiotherapy) — previously islands that bypass the
 * generic AssessmentsService emitter — onto the unified-core timeline. Each
 * finalize publishes to the REAL integration bus; the REAL subscribers persist
 * a CareTimeline row.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CareTimeline, Dysphagia, Pain, Physio;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query).sort({ createdAt: -1 });
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1047-clinical-assessment' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  Dysphagia = require('../models/DysphagiaAssessment');
  Pain = require('../models/PainAssessment');
  Physio = require('../models/PhysiotherapyAssessment');
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
});

function bid() {
  return new mongoose.Types.ObjectId();
}

describe('W1047 — dysphagia finalized reaches the timeline', () => {
  it('high aspiration risk finalize → dysphagia_assessment (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await Dysphagia.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      screeningTool: 'bedside_swallow_exam',
      aspirationRisk: 'high',
      slpReferral: true,
    });
    const r = await Dysphagia.findById(doc._id);
    r.status = 'finalized';
    r.assessedByName = 'أخصائي نطق';
    r.assessedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'dysphagia_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
    expect(row.category).toBe('clinical');
  });
});

describe('W1047 — pain finalized reaches the timeline', () => {
  it('no-pain finalize → pain_assessment (info)', async () => {
    const beneficiaryId = bid();
    const doc = await Pain.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      scale: 'numeric_0_10',
      painPresent: false,
      score: 0,
    });
    const r = await Pain.findById(doc._id);
    r.status = 'finalized';
    r.assessedByName = 'ممرضة';
    r.assessedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'pain_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('info');
  });
});

describe('W1047 — physiotherapy finalized reaches the timeline', () => {
  it('initial finalize → physiotherapy_assessment (info)', async () => {
    const beneficiaryId = bid();
    const doc = await Physio.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      assessmentType: 'initial',
    });
    const r = await Physio.findById(doc._id);
    r.status = 'finalized';
    r.assessedByName = 'أخصائي علاج طبيعي';
    r.assessedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'physiotherapy_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('info');
  });
});
