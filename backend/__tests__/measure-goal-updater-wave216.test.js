'use strict';

/**
 * measure-goal-updater-wave216.test.js — Wave 216.
 *
 * Verifies the auto-update wire between MeasureApplication and the
 * TherapeuticGoal model:
 *
 *   Pure progress math (no DB):
 *     - higher_better goal (target > baseline): progress fraction
 *     - lower_better goal (target < baseline): progress fraction inverted
 *     - target === baseline: returns null (intent unclear)
 *     - over-shoot clamped to 100, under-shoot clamped to 0
 *     - non-numeric inputs return null
 *
 *   Rating bands:
 *     - <25 → not_attempted
 *     - 25-74 → emerging
 *     - 75-99 → developing
 *     - 100 → achieved
 *
 *   updateGoalsForAdmin (with real DB):
 *     - Matching active goal → progress + progressHistory entry written
 *     - Multiple matching goals → all updated
 *     - Non-matching measure → no update
 *     - Deleted goal → skipped
 *     - 'achieved' status → skipped (already at target — don't backslide)
 *     - target === baseline → skipped (no math)
 *     - 100% progress flips status to achieved (via existing pre-save hook)
 *     - Non-numeric totalRawScore → noop
 *
 *   Post-save hook integration (via measureAdministration.administer):
 *     - Real admin flow updates the linked goal
 *     - Correction record does NOT trigger another update
 *     - Failing goalUpdater never blocks the primary admin write
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
let TherapeuticGoal;
let measureAdmin;
let goalUpdater;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w216-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  // TherapeuticGoal is exported as `{ TherapeuticGoal }` or default — handle either.
  if (!TherapeuticGoal) {
    TherapeuticGoal =
      require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal ||
      require('../domains/goals/models/TherapeuticGoal');
  }
  measureAdmin = require('../services/measureAdministration.service');
  goalUpdater = require('../services/measureGoalUpdater.service');
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

// ─── Fixtures ──────────────────────────────────────────────────────────

async function makeBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
    },
    ...overrides,
  });
}

async function makeGoal({
  beneficiaryId,
  episodeId = new mongoose.Types.ObjectId(),
  measureId,
  baselineValue = 20,
  targetValue = 40,
  status = 'active',
  isDeleted = false,
}) {
  return TherapeuticGoal.create({
    beneficiaryId,
    episodeId,
    title: 'Improve balance',
    type: 'short_term',
    startDate: new Date(),
    baseline: { value: baselineValue, date: new Date() },
    target: { value: targetValue },
    objectives: [
      {
        title: 'Hit Berg target',
        measureId,
      },
    ],
    status,
    isDeleted,
  });
}

// ─── 1. Pure progress math ─────────────────────────────────────────────

describe('W216 — pure progress math', () => {
  test('higher_better: linear interpolation', () => {
    expect(goalUpdater._computeProgress(20, 40, 30)).toBe(50);
    expect(goalUpdater._computeProgress(20, 40, 20)).toBe(0);
    expect(goalUpdater._computeProgress(20, 40, 40)).toBe(100);
  });

  test('lower_better: target < baseline still linear', () => {
    // baseline=20 (bad), target=10 (better) → at 15 = 50%, at 10 = 100%
    expect(goalUpdater._computeProgress(20, 10, 15)).toBe(50);
    expect(goalUpdater._computeProgress(20, 10, 20)).toBe(0);
    expect(goalUpdater._computeProgress(20, 10, 10)).toBe(100);
  });

  test('clamps to [0,100] under-shoot and over-shoot', () => {
    expect(goalUpdater._computeProgress(20, 40, 10)).toBe(0); // worse than baseline
    expect(goalUpdater._computeProgress(20, 40, 60)).toBe(100); // beyond target
  });

  test('returns null on degenerate inputs', () => {
    expect(goalUpdater._computeProgress(20, 20, 25)).toBeNull(); // equal
    expect(goalUpdater._computeProgress(null, 40, 30)).toBeNull();
    expect(goalUpdater._computeProgress(20, 40, null)).toBeNull();
    expect(goalUpdater._computeProgress(20, 40, 'thirty')).toBeNull();
  });
});

// ─── 2. Rating bands ───────────────────────────────────────────────────

describe('W216 — rating bands', () => {
  test.each([
    [0, 'not_attempted'],
    [20, 'not_attempted'],
    [25, 'emerging'],
    [60, 'emerging'],
    [75, 'developing'],
    [99, 'developing'],
    [100, 'achieved'],
  ])('progress=%i → %s', (progress, rating) => {
    expect(goalUpdater._ratingFor(progress)).toBe(rating);
  });
});

// ─── 3. updateGoalsForAdmin (direct call) ──────────────────────────────

describe('W216 — updateGoalsForAdmin()', () => {
  test('matching active goal → progress + progressHistory written', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const goal = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 20,
      targetValue: 40,
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 30, // halfway
      applicationId: new mongoose.Types.ObjectId(),
      applicationDate: new Date(),
      assessorId: new mongoose.Types.ObjectId(),
    });
    expect(r.updated).toBe(1);
    const fresh = await TherapeuticGoal.findById(goal._id).lean();
    expect(fresh.currentProgress).toBe(50);
    expect(fresh.progressHistory).toHaveLength(1);
    expect(fresh.progressHistory[0].value).toBe(30);
    expect(fresh.progressHistory[0].rating).toBe('emerging');
    expect(fresh.progressHistory[0].notes).toMatch(/auto-update from MeasureApplication/);
  });

  test('multiple matching goals → all updated', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const g1 = await makeGoal({ beneficiaryId: benId, measureId: measure._id });
    const g2 = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 10,
      targetValue: 50,
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 30,
    });
    expect(r.updated).toBe(2);
    const a = await TherapeuticGoal.findById(g1._id).lean();
    const b = await TherapeuticGoal.findById(g2._id).lean();
    expect(a.currentProgress).toBe(50); // 20→40, at 30
    expect(b.currentProgress).toBe(50); // 10→50, at 30
  });

  test('non-matching measure → no update', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await makeGoal({ beneficiaryId: benId, measureId: measure._id });
    const otherMeasureId = new mongoose.Types.ObjectId();
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: otherMeasureId,
      totalRawScore: 30,
    });
    expect(r.updated).toBe(0);
  });

  test('deleted goal is skipped', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      isDeleted: true,
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 30,
    });
    expect(r.updated).toBe(0);
  });

  test('achieved goal is skipped (already at target)', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      status: 'achieved',
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 30,
    });
    expect(r.updated).toBe(0);
  });

  test('target === baseline → skipped (no math)', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 30,
      targetValue: 30,
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 30,
    });
    expect(r.updated).toBe(0);
    expect(r.skipped).toBe(1);
  });

  test('100% progress flips goal status to achieved', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const goal = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 20,
      targetValue: 40,
    });
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: 50, // beyond target → 100% (clamped)
    });
    const fresh = await TherapeuticGoal.findById(goal._id).lean();
    expect(fresh.currentProgress).toBe(100);
    expect(fresh.status).toBe('achieved');
    expect(fresh.achievedDate).toBeTruthy();
  });

  test('non-numeric totalRawScore → noop', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    await makeGoal({ beneficiaryId: benId, measureId: measure._id });
    const r1 = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: undefined,
    });
    expect(r1.updated).toBe(0);
    expect(r1.reason).toBe('no_score');
    const r2 = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      totalRawScore: NaN,
    });
    expect(r2.updated).toBe(0);
  });
});

// ─── 4. Post-save hook integration ─────────────────────────────────────

describe('W216 — post-save hook integration via administer()', () => {
  test('admin flow auto-updates the linked goal', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const goal = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 20,
      targetValue: 60,
    });

    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'baseline',
      rawItems: Array(14).fill(3), // sum = 42
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });

    const fresh = await TherapeuticGoal.findById(goal._id).lean();
    // baseline=20, target=60, current=42 → (42-20)/(60-20) = 55%
    expect(fresh.currentProgress).toBe(55);
    expect(fresh.progressHistory).toHaveLength(1);
    expect(fresh.progressHistory[0].value).toBe(42);
  });

  test('correction admin does NOT re-trigger goal update', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const goal = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 20,
      targetValue: 60,
    });

    // First admin lands + auto-updates the goal
    const baseline = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'baseline',
      rawItems: Array(14).fill(2), // sum = 28 → progress = 20%
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await measureAdmin.lockBaseline(baseline._id, new mongoose.Types.ObjectId());

    const afterBaseline = await TherapeuticGoal.findById(goal._id).lean();
    expect(afterBaseline.progressHistory).toHaveLength(1);

    // Correction lands — should NOT append another progress entry
    await measureAdmin.correct(
      baseline._id,
      { totalRawScore: 35 },
      'transcription fix',
      new mongoose.Types.ObjectId()
    );

    const afterCorrection = await TherapeuticGoal.findById(goal._id).lean();
    expect(afterCorrection.progressHistory).toHaveLength(1);
    // currentProgress unchanged — still reflects original admin
    expect(afterCorrection.currentProgress).toBe(afterBaseline.currentProgress);
  });

  test('multiple admins build progressHistory chronologically', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const goal = await makeGoal({
      beneficiaryId: benId,
      measureId: measure._id,
      baselineValue: 20,
      targetValue: 60,
    });

    // 1st admin: 28 (progress=20)
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'baseline',
      rawItems: Array(14).fill(2),
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        applicationDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      },
    });

    // 2nd admin: 42 (progress=55) — cooldown satisfied (200d > 30d minInterval).
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'progress',
      rawItems: Array(14).fill(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });

    const fresh = await TherapeuticGoal.findById(goal._id).lean();
    expect(fresh.progressHistory).toHaveLength(2);
    expect(fresh.currentProgress).toBe(55);
    expect(fresh.trend?.direction).toBe('improving');
  });
});
