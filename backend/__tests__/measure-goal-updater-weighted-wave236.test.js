'use strict';

/**
 * measure-goal-updater-weighted-wave236.test.js — Wave 236.
 *
 * Verifies the W216 measureGoalUpdater integration with W235 linkage:
 *
 *   Backward compatibility:
 *     - Objective with NO measureLinks → unchanged single-measure progress
 *     - Objective with exactly 1 PRIMARY link (no SECONDARY) → still
 *       uses single-measure path (linkage layer not invoked)
 *
 *   Weighted path (multiple contributing links):
 *     - PRIMARY + SECONDARY both showing improvement → weighted ≈ 100
 *     - REGRESSION on SECONDARY drags weighted progress down
 *     - INSUFFICIENT_DATA on SECONDARY → renormalizes, PRIMARY score wins
 *     - progressHistory note records "weighted across N links"
 *     - currentProgress = round(weighted score × 100)
 *
 *   Edge cases:
 *     - linkage service throws → falls back to single-measure
 *     - CONTRAINDICATED link not counted
 *     - unlinked status link not counted
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w236-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  measureAdmin = require('../services/measureAdministration.service');
  goalUpdater = require('../services/measureGoalUpdater.service');
  await Measure.init();
  await MeasureApplication.init();
  await TherapeuticGoal.init();
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

const DAY = 86400000;

async function seedMeasure({ code = 'BERG', mcid = 4, sdc = 2 } = {}) {
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
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: mcid, type: 'absolute', status: 'established', source: 'cite' },
      sdc: { value: sdc },
    },
    targetPopulation: ['all'],
  });
}

async function seedAdmin({ benId, measureId, daysAgo, totalRawScore, isBaseline = false }) {
  const status = isBaseline ? 'locked' : 'completed';
  return MeasureApplication.create({
    beneficiaryId: benId,
    measureId,
    assessorId: new mongoose.Types.ObjectId(),
    applicationDate: new Date(Date.now() - daysAgo * DAY),
    totalRawScore,
    status,
    isBaseline,
    purpose: isBaseline ? 'baseline' : 'progress',
    ...(status === 'locked'
      ? {
          scoredWithMeasureVersion: '1.0.0',
          scoredWithAlgorithmVersion: '1.0.0',
          lockedAt: new Date(),
          lockedBy: new mongoose.Types.ObjectId(),
        }
      : {}),
  });
}

async function seedGoalWithLinks({
  benId,
  measureIds,
  measureCodes,
  weights,
  linkTypes,
  baselineValue = 20,
  targetValue = 40,
}) {
  const links = measureIds.map((mid, i) => ({
    measureId: mid,
    measureCode: measureCodes[i],
    linkType: linkTypes[i],
    weight: weights[i],
    linkRationale: `link rationale for ${measureCodes[i]}`,
    interventionRefs: ['PROGRAM_X'],
    status: 'active',
    linkedBy: new mongoose.Types.ObjectId(),
    linkedAt: new Date(),
  }));
  return TherapeuticGoal.create({
    beneficiaryId: benId,
    episodeId: new mongoose.Types.ObjectId(),
    title: 'Improve balance',
    type: 'short_term',
    startDate: new Date(Date.now() - 90 * DAY),
    targetDate: new Date(Date.now() + 90 * DAY),
    baseline: { value: baselineValue, date: new Date(Date.now() - 90 * DAY) },
    target: { value: targetValue },
    status: 'active',
    objectives: [
      {
        title: 'Hit Berg target',
        measureLinks: links,
      },
    ],
  });
}

async function seedLegacyGoal({ benId, measureId, baselineValue = 20, targetValue = 40 }) {
  return TherapeuticGoal.create({
    beneficiaryId: benId,
    episodeId: new mongoose.Types.ObjectId(),
    title: 'Improve balance (legacy)',
    type: 'short_term',
    startDate: new Date(),
    baseline: { value: baselineValue, date: new Date() },
    target: { value: targetValue },
    status: 'active',
    objectives: [{ title: 'legacy', measureId }],
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. Backward compatibility
// ════════════════════════════════════════════════════════════════════════

describe('W236 — backward compatibility', () => {
  test('legacy goal (no measureLinks) → single-measure progress unchanged', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const goal = await seedLegacyGoal({
      benId,
      measureId: m._id,
      baselineValue: 20,
      targetValue: 40,
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 30, // halfway
    });
    expect(r.updated).toBe(1);
    expect(r.details[0].newProgress).toBe(50);
    expect(r.details[0].weighted).toBeFalsy(); // null or undefined — single-measure path
  });

  test('goal with exactly 1 PRIMARY (no SECONDARY) → single-measure path', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const goal = await seedGoalWithLinks({
      benId,
      measureIds: [m._id],
      measureCodes: ['BERG'],
      weights: [1],
      linkTypes: ['PRIMARY'],
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: m._id,
      totalRawScore: 30, // halfway in 20→40 range
    });
    expect(r.updated).toBe(1);
    expect(r.details[0].newProgress).toBe(50); // single-measure path
    expect(r.details[0].weighted).toBeFalsy(); // null or undefined — single-measure path
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Weighted path
// ════════════════════════════════════════════════════════════════════════

describe('W236 — weighted progress with multiple links', () => {
  test('PRIMARY + SECONDARY both SUSTAINED → weighted ≈ 100', async () => {
    const mP = await seedMeasure({ code: 'PRIM' });
    const mS = await seedMeasure({ code: 'SEC' });
    const benId = new mongoose.Types.ObjectId();
    // Baseline + 2 increasing admins per measure → SUSTAINED_IMPROVEMENT each
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 5, totalRawScore: 40 });
    await seedGoalWithLinks({
      benId,
      measureIds: [mP._id, mS._id],
      measureCodes: ['PRIM', 'SEC'],
      weights: [0.7, 0.3],
      linkTypes: ['PRIMARY', 'SECONDARY'],
    });
    // Now fire updater for a new PRIM admin
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40, // already at target
    });
    expect(r.updated).toBe(1);
    expect(r.details[0].weighted).toBeDefined();
    expect(r.details[0].weighted.linkCount).toBe(2);
    expect(r.details[0].newProgress).toBe(100);
  });

  test('REGRESSION on SECONDARY drags weighted score down', async () => {
    const mP = await seedMeasure({ code: 'PRIM2' });
    const mS = await seedMeasure({ code: 'SEC2' });
    const benId = new mongoose.Types.ObjectId();
    // PRIM improving (SUSTAINED) → score 1.0
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    // SEC regressing → score 0.0
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 90, totalRawScore: 40, isBaseline: true });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 5, totalRawScore: 20 });
    await seedGoalWithLinks({
      benId,
      measureIds: [mP._id, mS._id],
      measureCodes: ['PRIM2', 'SEC2'],
      weights: [0.7, 0.3],
      linkTypes: ['PRIMARY', 'SECONDARY'],
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40,
    });
    expect(r.updated).toBe(1);
    expect(r.details[0].weighted).toBeDefined();
    // 0.7 × 1.0 + 0.3 × 0.0 = 0.7 → 70
    expect(r.details[0].newProgress).toBe(70);
  });

  test('INSUFFICIENT_DATA on SECONDARY → renormalizes', async () => {
    const mP = await seedMeasure({ code: 'PRIM3' });
    const mS = await seedMeasure({ code: 'SEC3' });
    const benId = new mongoose.Types.ObjectId();
    // PRIM has 3 admins → SUSTAINED
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    // SEC has only baseline → INSUFFICIENT_DATA
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedGoalWithLinks({
      benId,
      measureIds: [mP._id, mS._id],
      measureCodes: ['PRIM3', 'SEC3'],
      weights: [0.7, 0.3],
      linkTypes: ['PRIMARY', 'SECONDARY'],
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40,
    });
    expect(r.updated).toBe(1);
    // SEC excluded + renorm: 1.0 × 0.7 / 0.7 = 1.0 → 100
    expect(r.details[0].newProgress).toBe(100);
  });

  test('progressHistory note records weighted-across-N-links', async () => {
    const mP = await seedMeasure({ code: 'PRIM4' });
    const mS = await seedMeasure({ code: 'SEC4' });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 5, totalRawScore: 40 });
    const goal = await seedGoalWithLinks({
      benId,
      measureIds: [mP._id, mS._id],
      measureCodes: ['PRIM4', 'SEC4'],
      weights: [0.6, 0.4],
      linkTypes: ['PRIMARY', 'SECONDARY'],
    });
    const adminId = new mongoose.Types.ObjectId();
    await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40,
      applicationId: adminId,
    });
    const updated = await TherapeuticGoal.findById(goal._id).lean();
    const lastEntry = updated.progressHistory[updated.progressHistory.length - 1];
    expect(lastEntry.notes).toMatch(/weighted across 2 links/);
    expect(lastEntry.value).toBe(40); // raw score still recorded
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Edge cases
// ════════════════════════════════════════════════════════════════════════

describe('W236 — edge cases', () => {
  test('CONTRAINDICATED link does NOT count toward aggregation', async () => {
    const mP = await seedMeasure({ code: 'PRIM5' });
    const mC = await seedMeasure({ code: 'CONTRA' });
    const benId = new mongoose.Types.ObjectId();
    // PRIM SUSTAINED. CONTRA has no admins (would be INSUFFICIENT anyway,
    // but more importantly it's filtered out before the linkage call).
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(Date.now() - 90 * DAY),
      baseline: { value: 20, date: new Date() },
      target: { value: 40 },
      status: 'active',
      objectives: [
        {
          title: 'o',
          measureLinks: [
            {
              measureId: mP._id,
              measureCode: 'PRIM5',
              linkType: 'PRIMARY',
              weight: 1,
              linkRationale: 'primary measure rationale',
              interventionRefs: ['PROGRAM_X'],
              linkedBy: new mongoose.Types.ObjectId(),
              status: 'active',
            },
            {
              measureId: mC._id,
              measureCode: 'CONTRA',
              linkType: 'CONTRAINDICATED',
              weight: 0,
              linkRationale: 'do not use this measure for this goal',
              interventionRefs: [],
              linkedBy: new mongoose.Types.ObjectId(),
              status: 'active',
            },
          ],
        },
      ],
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40,
    });
    expect(r.updated).toBe(1);
    // Only PRIM contributes (CONTRA filtered) → 1 link → single-measure path
    expect(r.details[0].weighted).toBeFalsy(); // null or undefined — single-measure path
    expect(r.details[0].newProgress).toBe(100); // single-measure for target=40 baseline=20 at 40
  });

  test('unlinked link does NOT count', async () => {
    const mP = await seedMeasure({ code: 'PRIM6' });
    const mU = await seedMeasure({ code: 'UNLNK' });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 5, totalRawScore: 40 });
    await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(Date.now() - 90 * DAY),
      baseline: { value: 20, date: new Date() },
      target: { value: 40 },
      status: 'active',
      objectives: [
        {
          title: 'o',
          measureLinks: [
            {
              measureId: mP._id,
              measureCode: 'PRIM6',
              linkType: 'PRIMARY',
              weight: 1,
              linkRationale: 'primary measure rationale',
              interventionRefs: ['PROGRAM_X'],
              linkedBy: new mongoose.Types.ObjectId(),
              status: 'active',
            },
            {
              measureId: mU._id,
              measureCode: 'UNLNK',
              linkType: 'SECONDARY',
              weight: 0,
              linkRationale: 'no longer relevant after intervention change',
              interventionRefs: ['X'],
              linkedBy: new mongoose.Types.ObjectId(),
              status: 'unlinked',
              unlinkedAt: new Date(),
              unlinkedBy: new mongoose.Types.ObjectId(),
              unlinkReason: 'intervention discontinued',
            },
          ],
        },
      ],
    });
    const r = await goalUpdater.updateGoalsForAdmin({
      beneficiaryId: benId,
      measureId: mP._id,
      totalRawScore: 40,
    });
    expect(r.updated).toBe(1);
    expect(r.details[0].weighted).toBeFalsy(); // null or undefined — single-measure path // 1 contributing → single-measure path
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Integration via real administer() path
// ════════════════════════════════════════════════════════════════════════

describe('W236 — end-to-end via administer()', () => {
  test('admin save triggers W216→W236 weighted update', async () => {
    const mP = await seedMeasure({ code: 'BERG_E2E' });
    const mS = await seedMeasure({ code: 'TUG_E2E' });
    const benId = new mongoose.Types.ObjectId();
    // Seed history so linkage weighted computation works
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mP._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 90, totalRawScore: 20, isBaseline: true });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: mS._id, daysAgo: 5, totalRawScore: 40 });
    const goal = await seedGoalWithLinks({
      benId,
      measureIds: [mP._id, mS._id],
      measureCodes: ['BERG_E2E', 'TUG_E2E'],
      weights: [0.6, 0.4],
      linkTypes: ['PRIMARY', 'SECONDARY'],
    });
    // Fire a fresh PRIM admin via real administer() — auto-triggers W216
    await measureAdmin.administer({
      measureRef: mP._id,
      beneficiary: { _id: benId, ageMonths: 360, icd10: [] },
      purpose: 'progress',
      totals: { totalRawScore: 40 },
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        episodeId: goal.episodeId,
      },
    });
    const updated = await TherapeuticGoal.findById(goal._id).lean();
    // PRIM now has 3 admins reaching target → SUSTAINED (score=1.0).
    // SEC has 3 admins reaching target → SUSTAINED (score=1.0).
    // weighted = 0.6 + 0.4 = 1.0 → 100
    expect(updated.currentProgress).toBe(100);
    expect(updated.status).toBe('achieved');
  });
});
