'use strict';

/**
 * measure-readiness-gate-wave223.test.js — Wave 223.
 *
 * Verifies the measure readiness gate for care-plan review + discharge:
 *
 *   Required-measure resolution:
 *     - Explicit requiredMeasureIds wins
 *     - Else: derived from active TherapeuticGoals' objectives[].measureId
 *     - Inactive goals excluded
 *     - Deleted goals excluded
 *     - Deduped across goals
 *
 *   Per-measure verdict:
 *     - NEVER_ADMINISTERED when no completed|locked admin exists
 *     - Fresh when latest admin within standardIntervalDays
 *     - ADMIN_STALE when latest admin > standardIntervalDays
 *     - Open task always blocks regardless of freshness
 *     - Phase mapped to reason: BREACHED|ESCALATED|OVERDUE|other
 *     - freshnessWindowDays override applied
 *
 *   Output shape:
 *     - gateCarePlanReview returns readyToReview
 *     - gateDischarge returns readyToDischarge
 *     - blockedBy[].length === 0 → ready = true
 *     - No required measures → ready=true with NO_REQUIRED_MEASURES note
 *
 *   listRequiredMeasures:
 *     - Returns deduped measure docs from active goals
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureApplication;
let MeasureReassessmentTask;
let TherapeuticGoal;
let gate;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w223-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask'));
  TherapeuticGoal =
    require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal ||
    require('../domains/goals/models/TherapeuticGoal');
  gate = require('../services/measureReadinessGate.service');
  await MeasureApplication.init();
  await MeasureReassessmentTask.init();
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureReassessmentTask.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

const DAY = 86400000;

// ─── Fixtures ──────────────────────────────────────────────────────────

async function seedMeasure({ code = 'BERG', standardIntervalDays = 90, ...overrides } = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    reassessment: { standardIntervalDays, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
    },
    targetPopulation: ['all'],
    ...overrides,
  });
}

async function seedAdmin({ benId, measureId, daysAgo = 30, status = 'completed' }) {
  // W211b governance: locked records require scoredWithMeasureVersion.
  const lockedExtras =
    status === 'locked'
      ? {
          scoredWithMeasureVersion: '1.0.0',
          scoredWithAlgorithmVersion: '1.0.0',
          lockedAt: new Date(),
          lockedBy: new mongoose.Types.ObjectId(),
        }
      : {};
  return MeasureApplication.create({
    beneficiaryId: benId,
    measureId,
    assessorId: new mongoose.Types.ObjectId(),
    applicationDate: new Date(Date.now() - daysAgo * DAY),
    totalRawScore: 42,
    status,
    ...lockedExtras,
  });
}

async function seedTask({ benId, measureId, dueAt, phase = 'SCHEDULED', status = 'pending' }) {
  return MeasureReassessmentTask.create({
    beneficiaryId: benId,
    measureId,
    measureCode: 'BERG',
    standardIntervalDays: 90,
    dueAt: dueAt || new Date(),
    overdueDays: 0,
    status,
    phase,
  });
}

async function seedGoal({ benId, measureId, status = 'active', isDeleted = false }) {
  return TherapeuticGoal.create({
    beneficiaryId: benId,
    episodeId: new mongoose.Types.ObjectId(),
    title: 'Improve balance',
    type: 'short_term',
    startDate: new Date(),
    baseline: { value: 20, date: new Date() },
    target: { value: 40 },
    objectives: [{ title: 'Hit Berg target', measureId }],
    status,
    isDeleted,
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. Required-measure resolution
// ════════════════════════════════════════════════════════════════════════

describe('W223 — required-measure resolution', () => {
  test('explicit requiredMeasureIds wins over goal lookup', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    const m2 = await seedMeasure({ code: 'FIM' });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 30 });
    // Goal points to BERG, but we explicitly ask for FIM only
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({
      beneficiaryId: benId,
      requiredMeasureIds: [m2._id],
    });
    expect(out.requiredMeasureIds).toEqual([String(m2._id)]);
    expect(out.blockedBy[0].code).toBe('FIM');
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.NEVER_ADMINISTERED);
  });

  test('derives from active goals when not explicit', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    const m2 = await seedMeasure({ code: 'FIM' });
    await seedGoal({ benId, measureId: m1._id });
    await seedGoal({ benId, measureId: m2._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    const ids = out.requiredMeasureIds.sort();
    expect(ids).toEqual([String(m1._id), String(m2._id)].sort());
  });

  test('inactive goals excluded', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    const m2 = await seedMeasure({ code: 'FIM' });
    await seedGoal({ benId, measureId: m1._id, status: 'active' });
    await seedGoal({ benId, measureId: m2._id, status: 'achieved' });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.requiredMeasureIds).toEqual([String(m1._id)]);
  });

  test('deleted goals excluded', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    const m2 = await seedMeasure({ code: 'FIM' });
    await seedGoal({ benId, measureId: m1._id });
    await seedGoal({ benId, measureId: m2._id, isDeleted: true });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.requiredMeasureIds).toEqual([String(m1._id)]);
  });

  test('deduped across goals', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    // Two goals both pointing to the same measure
    await seedGoal({ benId, measureId: m1._id });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.requiredMeasureIds.length).toBe(1);
  });

  test('no active goals → ready with NO_REQUIRED_MEASURES note', async () => {
    const benId = new mongoose.Types.ObjectId();
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(true);
    expect(out.blockedBy).toEqual([]);
    expect(out.notes).toContain(gate.REASON_CODES.NO_REQUIRED_MEASURES);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Per-measure verdict
// ════════════════════════════════════════════════════════════════════════

describe('W223 — per-measure verdict', () => {
  test('fresh admin within standardIntervalDays → ready', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 30 });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(true);
    expect(out.blockedBy).toEqual([]);
    expect(out.freshMeasures.length).toBe(1);
    expect(out.freshMeasures[0].code).toBe('BERG');
    expect(out.freshMeasures[0].daysSince).toBe(30);
    expect(out.freshMeasures[0].cadenceDays).toBe(90);
  });

  test('NEVER_ADMINISTERED when no completed admin', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(false);
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.NEVER_ADMINISTERED);
  });

  test('in-progress admin does NOT count as fresh', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await MeasureApplication.create({
      beneficiaryId: benId,
      measureId: m1._id,
      assessorId: new mongoose.Types.ObjectId(),
      applicationDate: new Date(),
      status: 'in_progress',
    });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.NEVER_ADMINISTERED);
  });

  test('ADMIN_STALE when latest admin exceeds standardIntervalDays', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 120 }); // > 90d
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.ADMIN_STALE);
    expect(out.blockedBy[0].ageDays).toBe(120);
    expect(out.blockedBy[0].cadenceDays).toBe(90);
  });

  test('freshnessWindowDays override applied', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 60 });
    await seedGoal({ benId, measureId: m1._id });
    // Tighter window: 30d. Admin is 60d → stale.
    const out = await gate.gateCarePlanReview({
      beneficiaryId: benId,
      freshnessWindowDays: 30,
    });
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.ADMIN_STALE);
    expect(out.blockedBy[0].cadenceDays).toBe(30);
  });

  test('locked admin counts as fresh', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 20, status: 'locked' });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(true);
  });

  test('latest admin wins when multiple exist', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 120 }); // stale
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 30 }); // fresh
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(true);
    expect(out.freshMeasures[0].daysSince).toBe(30);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Open tasks block regardless of freshness
// ════════════════════════════════════════════════════════════════════════

describe('W223 — open tasks block', () => {
  test.each([
    ['BREACHED', 'TASK_OPEN_BREACHED'],
    ['ESCALATED', 'TASK_OPEN_ESCALATED'],
    ['OVERDUE', 'TASK_OPEN_OVERDUE'],
    ['DUE_NOW', 'TASK_OPEN'],
    ['DUE_SOON', 'TASK_OPEN'],
    ['SCHEDULED', 'TASK_OPEN'],
  ])('phase=%s → reason=%s', async (phase, reason) => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    // Fresh admin — but open task still blocks
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 10 });
    await seedTask({ benId, measureId: m1._id, phase });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(false);
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES[reason]);
    expect(out.blockedBy[0].taskPhase).toBe(phase);
  });

  test('completed task does NOT block', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 10 });
    await MeasureReassessmentTask.create({
      beneficiaryId: benId,
      measureId: m1._id,
      measureCode: 'BERG',
      standardIntervalDays: 90,
      dueAt: new Date(),
      status: 'completed',
      completedAt: new Date(),
    });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(true);
  });

  test('acknowledged task DOES block', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 10 });
    await seedTask({
      benId,
      measureId: m1._id,
      phase: 'OVERDUE',
      status: 'acknowledged',
    });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(false);
    expect(out.blockedBy[0].reason).toBe(gate.REASON_CODES.TASK_OPEN_OVERDUE);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Output shape & gateDischarge
// ════════════════════════════════════════════════════════════════════════

describe('W223 — output shape', () => {
  test('gateDischarge returns readyToDischarge flag', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 30 });
    await seedGoal({ benId, measureId: m1._id });
    const out = await gate.gateDischarge({ beneficiaryId: benId });
    expect(out.readyToDischarge).toBe(true);
    expect(out.readyToReview).toBeUndefined();
  });

  test('rejects without beneficiaryId', async () => {
    await expect(gate.gateCarePlanReview({})).rejects.toThrow(/beneficiaryId required/);
    await expect(gate.gateDischarge({})).rejects.toThrow(/beneficiaryId required/);
  });

  test('listRequiredMeasures returns measure docs', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG' });
    const m2 = await seedMeasure({ code: 'FIM' });
    await seedGoal({ benId, measureId: m1._id });
    await seedGoal({ benId, measureId: m2._id });
    const list = await gate.listRequiredMeasures({ beneficiaryId: benId });
    const codes = list.map(m => m.code).sort();
    expect(codes).toEqual(['BERG', 'FIM']);
    expect(list[0].reassessment.standardIntervalDays).toBe(90);
  });

  test('listRequiredMeasures empty when no active goals', async () => {
    const list = await gate.listRequiredMeasures({
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(list).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Mixed scenario — partial readiness
// ════════════════════════════════════════════════════════════════════════

describe('W223 — mixed scenario', () => {
  test('one fresh, one stale, one task-blocked', async () => {
    const benId = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'BERG', standardIntervalDays: 90 });
    const m2 = await seedMeasure({ code: 'FIM', standardIntervalDays: 60 });
    const m3 = await seedMeasure({ code: 'GMFM', standardIntervalDays: 90 });
    await seedAdmin({ benId, measureId: m1._id, daysAgo: 30 }); // fresh
    await seedAdmin({ benId, measureId: m2._id, daysAgo: 90 }); // stale (60d cadence)
    await seedAdmin({ benId, measureId: m3._id, daysAgo: 10 }); // fresh BUT...
    await seedTask({ benId, measureId: m3._id, phase: 'OVERDUE' }); // ...task blocks
    await seedGoal({ benId, measureId: m1._id });
    await seedGoal({ benId, measureId: m2._id });
    await seedGoal({ benId, measureId: m3._id });

    const out = await gate.gateCarePlanReview({ beneficiaryId: benId });
    expect(out.readyToReview).toBe(false);
    expect(out.freshMeasures.length).toBe(1);
    expect(out.freshMeasures[0].code).toBe('BERG');
    expect(out.blockedBy.length).toBe(2);
    const blockedByCode = Object.fromEntries(out.blockedBy.map(b => [b.code, b.reason]));
    expect(blockedByCode.FIM).toBe(gate.REASON_CODES.ADMIN_STALE);
    expect(blockedByCode.GMFM).toBe(gate.REASON_CODES.TASK_OPEN_OVERDUE);
  });
});
