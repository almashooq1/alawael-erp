'use strict';

/**
 * clinical-core-linkage-wave1046.test.js — W1046.
 *
 * RUNTIME end-to-end linkage of the seven W1010-W1042 clinical-safety modules
 * onto the unified-core timeline. Each module's native post-save producer hook
 * publishes to the REAL integration bus; the REAL dddCrossModuleSubscribers
 * persist a CareTimeline row. Asserts the row + eventType + computed severity.
 *
 * This is the contract that turns the modules from islands into nodes on the
 * beneficiary's unified clinical timeline.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CareTimeline;
let Falls, Pressure, Sleep, OM, Driving, MedRec, Infection;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query).sort({ createdAt: -1 });
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1046-core-linkage' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  Falls = require('../models/FallsRiskAssessment');
  Pressure = require('../models/PressureInjuryRecord');
  Sleep = require('../models/SleepAssessment');
  OM = require('../models/OrientationMobilityAssessment');
  Driving = require('../models/DrivingRehabAssessment');
  MedRec = require('../models/MedicationReconciliation');
  Infection = require('../models/InfectionSurveillanceCase');
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

describe('W1046 — falls-risk finalized reaches the timeline', () => {
  it('high-risk finalize → falls_risk_assessed (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await Falls.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      tool: 'morse',
      riskLevel: 'high',
      riskScore: 60,
      preventionInterventions: ['supervision_increase'],
      nextReviewDue: new Date('2026-07-01'),
    });
    // draft → finalized
    const reloaded = await Falls.findById(doc._id);
    reloaded.status = 'finalized';
    reloaded.finalizedByName = 'د. سارة';
    reloaded.finalizedAt = new Date();
    await reloaded.save();

    const row = await waitForTimeline({ beneficiaryId, eventType: 'falls_risk_assessed' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
    expect(row.category).toBe('clinical');
  });
});

describe('W1046 — pressure injury identified + resolved reach the timeline', () => {
  it('new stage_3 active → pressure_injury (error); then healed → pressure_injury_resolved (success)', async () => {
    const beneficiaryId = bid();
    const doc = await Pressure.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      bodySite: 'sacrum',
      stage: 'stage_3',
      origin: 'facility_acquired',
      status: 'active',
      offloadingOrders: ['repositioning_2hourly'],
    });
    const opened = await waitForTimeline({ beneficiaryId, eventType: 'pressure_injury' });
    expect(opened).not.toBeNull();
    expect(opened.severity).toBe('error');

    const reloaded = await Pressure.findById(doc._id);
    reloaded.status = 'healed';
    reloaded.healedAt = new Date();
    await reloaded.save();
    const resolved = await waitForTimeline({ beneficiaryId, eventType: 'pressure_injury_resolved' });
    expect(resolved).not.toBeNull();
    expect(resolved.severity).toBe('success');
  });
});

describe('W1046 — sleep / O&M / driving finalize reach the timeline', () => {
  it('sleep severe → sleep_assessment (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await Sleep.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      tool: 'bears',
      problemSeverity: 'severe',
      problemScore: 7,
      sleepHygieneInterventions: ['consistent_bedtime_routine'],
      nextReviewDue: new Date('2026-07-01'),
    });
    const r = await Sleep.findById(doc._id);
    r.status = 'finalized';
    r.finalizedByName = 'د. منى';
    r.finalizedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'sleep_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
  });

  it('O&M dependent → mobility_assessment (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await OM.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      visionStatus: 'blind',
      independenceLevel: 'dependent',
      independenceScore: 10,
      trainingGoals: ['cane_skills_indoor'],
    });
    const r = await OM.findById(doc._id);
    r.status = 'finalized';
    r.finalizedByName = 'أخصائي';
    r.finalizedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'mobility_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
  });

  it('driving not_fit → driving_assessment (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await Driving.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      recommendation: 'not_fit_currently',
      readinessLevel: 'not_ready',
      nextReviewDue: new Date('2026-09-01'),
    });
    const r = await Driving.findById(doc._id);
    r.status = 'finalized';
    r.finalizedByName = 'أخصائي';
    r.finalizedAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'driving_assessment' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
  });
});

describe('W1046 — medication reconciliation reaches the timeline', () => {
  it('reconcile with unresolved discrepancy → medication_reconciliation (warning)', async () => {
    const beneficiaryId = bid();
    const doc = await MedRec.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      reconciliationType: 'admission',
      medications: [{ name: 'Valproate', discrepancyType: 'omission', discrepancyResolved: false }],
    });
    const r = await MedRec.findById(doc._id);
    r.status = 'reconciled';
    r.reconciledByName = 'صيدلي';
    r.reconciledAt = new Date();
    await r.save();
    const row = await waitForTimeline({ beneficiaryId, eventType: 'medication_reconciliation' });
    expect(row).not.toBeNull();
    expect(row.severity).toBe('warning');
  });
});

describe('W1046 — infection case opened + resolved reach the timeline', () => {
  it('confirmed + isolation → infection_case (error); then resolved → infection_resolved (success)', async () => {
    const beneficiaryId = bid();
    const doc = await Infection.create({
      beneficiaryId,
      date: new Date('2026-06-01'),
      category: 'gastrointestinal',
      pathogen: 'Norovirus',
      caseStatus: 'confirmed',
      isolationRequired: true,
      precautionType: 'contact',
    });
    const opened = await waitForTimeline({ beneficiaryId, eventType: 'infection_case' });
    expect(opened).not.toBeNull();
    expect(opened.severity).toBe('error');

    const reloaded = await Infection.findById(doc._id);
    reloaded.caseStatus = 'resolved';
    reloaded.resolutionDate = new Date('2026-06-08');
    await reloaded.save();
    const resolved = await waitForTimeline({ beneficiaryId, eventType: 'infection_resolved' });
    expect(resolved).not.toBeNull();
    expect(resolved.severity).toBe('success');
  });
});
