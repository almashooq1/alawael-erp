'use strict';

/**
 * pathway-bundles-behavioral-wave1212.test.js — behavioral counterpart to the
 * W1205 static drift guard (pathway-bundles-wave1205.test.js).
 *
 * Exercises services/pathwayBundle.service.js against a REAL in-memory
 * MongoDB with the REAL Measure / GoalBank / ClinicalPathwayPlan /
 * TherapeuticGoal / EpisodeOfCare / CareTimeline models — so the W235
 * measureLink invariant chain (one PRIMARY, weight, linkRationale ≥10,
 * interventionRefs ≥1) actually fires on save.
 *
 * Origin: writing this suite surfaced a REAL W1205 bug pre-test —
 * TherapeuticGoal.episodeId is REQUIRED, but applyForBeneficiary created
 * goals without it (every apply would have thrown at runtime while all
 * static guards stayed green — the W385 class). The fix (explicit
 * selections.episodeId → active EpisodeOfCare lookup → refuse-to-fabricate
 * skip) is asserted here.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/pathway-bundles-behavioral-wave1212.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let svc;
let Measure;
let GoalBank;
let ClinicalPathwayPlan;
let TherapeuticGoal;
let EpisodeOfCare;
let CareTimeline;

// Slim stand-in for the heavyweight Beneficiary model — the service only
// reads disability.type / category / dateOfBirth / branchId via
// mongoose.model('Beneficiary').
const beneficiaryStubSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    disability: { type: { type: String }, severity: String },
    category: String,
    dateOfBirth: Date,
    branchId: mongoose.Schema.Types.ObjectId,
  },
  { collection: 'beneficiaries_w1209_stub' }
);

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1209-bundles-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  // W954 legacy-hook adapter (Mongoose 9 dropped callback `next`) — MUST be
  // installed before any model file runs its schema.pre(...) calls.
  require('../config/mongoose.plugins');

  mongoose.model('Beneficiary', beneficiaryStubSchema);
  ({ Measure } = require('../domains/goals/models/Measure'));
  GoalBank = require('../models/GoalBank');
  ClinicalPathwayPlan = require('../models/ClinicalPathwayPlan');
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  ({ EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare'));
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));

  svc = require('../services/pathwayBundle.service');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const Beneficiary = () => mongoose.model('Beneficiary');

const yearsAgo = n => {
  const d = new Date();
  // Jan 15 anchors: (a) month-end overflow guard (flaky-test class), and
  // (b) birthday always already passed this year → age is exactly n.
  d.setMonth(0, 15);
  d.setFullYear(d.getFullYear() - n);
  return d;
};

async function seedBeneficiary(overrides = {}) {
  return Beneficiary().create({
    firstName: 'سالم',
    lastName: 'التجريبي',
    disability: { type: 'mental' },
    dateOfBirth: yearsAgo(6),
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

async function seedEpisode(beneficiaryId) {
  return EpisodeOfCare.create({
    beneficiaryId,
    status: 'active',
    startDate: new Date(),
  });
}

async function seedLibrary() {
  const matching = await Measure.create({
    code: 'VINELAND3-W1212',
    name: 'Vineland Adaptive Behavior Scales',
    name_ar: 'فاينلاند للسلوك التكيفي',
    abbreviation: 'VABS-3',
    category: 'adaptive',
    type: 'standardized',
    targetPopulation: ['autism', 'intellectual_disability'],
  });
  // wrong category for the mental bundle — must NOT resolve
  await Measure.create({
    code: 'GMFM-W1212',
    name: 'Gross Motor Function Measure',
    category: 'motor',
    type: 'standardized',
    targetPopulation: ['cerebral_palsy'],
  });
  // matching but retired — must NOT resolve
  await Measure.create({
    code: 'OLD-CARS-W1212',
    name: 'Old CARS',
    category: 'behavioral',
    type: 'standardized',
    targetPopulation: ['autism'],
    status: 'retired',
  });

  const inAge = await GoalBank.create({
    domain: 'BEHAVIORAL',
    category: 'Social Skills',
    description: 'يبادر بالتواصل البصري عند مناداة اسمه في 4 من 5 محاولات',
    targetAgeMin: 4,
    targetAgeMax: 8,
    measurementCriteria: '4 من 5 محاولات',
  });
  const inAge2 = await GoalBank.create({
    domain: 'SPEECH',
    category: 'Requesting',
    description: 'يطلب الأشياء المفضلة باستخدام كلمة واحدة في 80% من الفرص',
    targetAgeMin: 3,
    targetAgeMax: 9,
  });
  // out of age window (beneficiary is 6) — must NOT resolve
  await GoalBank.create({
    domain: 'BEHAVIORAL',
    category: 'Teen Skills',
    description: 'هدف لفئة عمرية أكبر',
    targetAgeMin: 10,
    targetAgeMax: 14,
  });
  return { matching, inAge, inAge2 };
}

beforeEach(async () => {
  await Promise.all([
    Beneficiary().deleteMany({}),
    Measure.deleteMany({}),
    GoalBank.deleteMany({}),
    ClinicalPathwayPlan.deleteMany({}),
    TherapeuticGoal.deleteMany({}),
    EpisodeOfCare.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

describe('W1212 behavioral — suggestForBeneficiary', () => {
  test('resolves the mental bundle against the LIVE library (filters category/status/age)', async () => {
    const ben = await seedBeneficiary();
    const { matching } = await seedLibrary();

    const out = await svc.suggestForBeneficiary(ben._id);

    expect(out.bundle.key).toBe('mental');
    expect(out.bundle.pathwayType).toBe('AUTISM_EARLY_INTERVENTION');
    expect(out.beneficiary.age).toBe(6);

    const measureCodes = out.resolved.measures.map(m => m.code);
    expect(measureCodes).toContain(matching.code);
    expect(measureCodes).not.toContain('GMFM-W1212'); // wrong category
    expect(measureCodes).not.toContain('OLD-CARS-W1212'); // retired

    const goalCats = out.resolved.goalTemplates.map(g => g.category);
    expect(goalCats).toEqual(expect.arrayContaining(['Social Skills', 'Requesting']));
    expect(goalCats).not.toContain('Teen Skills'); // age 6 ∉ [10,14]

    expect(out.existingPathwayId).toBeNull();
    expect(out.notes).toEqual([]);
  });

  test('empty library → refuse-to-fabricate notes, never invented entries', async () => {
    const ben = await seedBeneficiary();
    const out = await svc.suggestForBeneficiary(ben._id);
    expect(out.resolved.measures).toEqual([]);
    expect(out.resolved.goalTemplates).toEqual([]);
    expect(out.notes.length).toBeGreaterThanOrEqual(2);
  });

  test('404 on unknown beneficiary', async () => {
    await expect(svc.suggestForBeneficiary(new mongoose.Types.ObjectId())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('W1212 behavioral — applyForBeneficiary', () => {
  test('happy path: pathway DRAFT from registry stages + R3-compliant goals on the active episode + timeline event', async () => {
    const ben = await seedBeneficiary();
    const episode = await seedEpisode(ben._id);
    const { matching, inAge, inAge2 } = await seedLibrary();

    const result = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: new mongoose.Types.ObjectId(),
      selections: {
        createPathway: true,
        goalTemplateIds: [String(inAge._id), String(inAge2._id)],
        primaryMeasureId: String(matching._id),
      },
    });

    // pathway
    expect(result.created.pathwayPlanId).toBeTruthy();
    const plan = await ClinicalPathwayPlan.findById(result.created.pathwayPlanId).lean();
    expect(plan.status).toBe('DRAFT');
    expect(plan.pathwayType).toBe('AUTISM_EARLY_INTERVENTION');
    expect(plan.currentStageCode).toBe('SCREEN');
    expect(plan.stages.map(s => s.code)).toEqual(['SCREEN', 'BASELINE', 'INTERVENTION', 'REVIEW']);
    expect(String(plan.branchId)).toBe(String(ben.branchId)); // falls back to beneficiary branch

    // goals — saved through the FULL W235 invariant chain
    expect(result.created.goalIds).toHaveLength(2);
    const goal = await TherapeuticGoal.findById(result.created.goalIds[0]).lean();
    expect(goal.status).toBe('draft');
    expect(String(goal.episodeId)).toBe(String(episode._id)); // W1212 bug-fix assertion
    const link = goal.objectives[0].measureLinks[0];
    expect(link.linkType).toBe('PRIMARY');
    expect(String(link.measureId)).toBe(String(matching._id));
    expect(link.measureCode).toBe(matching.code);
    expect(goal.tags).toEqual(expect.arrayContaining(['pathway-bundle', 'mental']));

    // unified-core event
    const events = await CareTimeline.find({ beneficiaryId: ben._id }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('care_plan_created');
    expect(events[0].metadata.source).toBe('pathway-bundle');

    expect(result.skipped).toEqual([]);
  });

  test('idempotency: a second apply never duplicates the active pathway', async () => {
    const ben = await seedBeneficiary();
    await seedEpisode(ben._id);

    const first = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: { createPathway: true, goalTemplateIds: [] },
    });
    expect(first.created.pathwayPlanId).toBeTruthy();

    const second = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: { createPathway: true, goalTemplateIds: [] },
    });
    expect(second.created.pathwayPlanId).toBeNull();
    expect(second.skipped).toHaveLength(1);
    expect(second.skipped[0].item).toBe('pathway:AUTISM_EARLY_INTERVENTION');
    expect(await ClinicalPathwayPlan.countDocuments({ beneficiaryId: ben._id })).toBe(1);
  });

  test('R3 gate: goals selected without a primary measure → skipped, nothing created', async () => {
    const ben = await seedBeneficiary();
    await seedEpisode(ben._id);
    const { inAge } = await seedLibrary();

    const result = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: { createPathway: false, goalTemplateIds: [String(inAge._id)] },
    });

    expect(result.created.goalIds).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/لا هدف بلا مقياس/);
    expect(await TherapeuticGoal.countDocuments({})).toBe(0);
  });

  test('no active episode → goals skipped with an explicit reason (refuse-to-fabricate)', async () => {
    const ben = await seedBeneficiary();
    const { matching, inAge } = await seedLibrary();

    const result = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: {
        createPathway: false,
        goalTemplateIds: [String(inAge._id)],
        primaryMeasureId: String(matching._id),
      },
    });

    expect(result.created.goalIds).toEqual([]);
    expect(result.skipped[0].reason).toMatch(/حلقة رعاية/);
    expect(await TherapeuticGoal.countDocuments({})).toBe(0);
  });

  test('explicit selections.episodeId overrides the lookup', async () => {
    const ben = await seedBeneficiary();
    const episode = await EpisodeOfCare.create({
      beneficiaryId: ben._id,
      status: 'completed', // not active — would NOT be found by the lookup
      startDate: new Date(),
    });
    const { matching, inAge } = await seedLibrary();

    const result = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: {
        createPathway: false,
        goalTemplateIds: [String(inAge._id)],
        primaryMeasureId: String(matching._id),
        episodeId: String(episode._id),
      },
    });

    expect(result.created.goalIds).toHaveLength(1);
    const goal = await TherapeuticGoal.findById(result.created.goalIds[0]).lean();
    expect(String(goal.episodeId)).toBe(String(episode._id));
  });

  test('unknown goal-template ids are reported as skipped, never invented', async () => {
    const ben = await seedBeneficiary();
    await seedEpisode(ben._id);
    const { matching, inAge } = await seedLibrary();
    const ghost = new mongoose.Types.ObjectId();

    const result = await svc.applyForBeneficiary({
      beneficiaryId: ben._id,
      branchId: null,
      actorId: null,
      selections: {
        createPathway: false,
        goalTemplateIds: [String(inAge._id), String(ghost)],
        primaryMeasureId: String(matching._id),
      },
    });

    expect(result.created.goalIds).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].item).toBe(`goalTemplate:${ghost}`);
  });
});
