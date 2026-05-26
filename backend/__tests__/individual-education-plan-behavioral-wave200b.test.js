'use strict';

/**
 * individual-education-plan-behavioral-wave200b.test.js — behavioral coverage
 * for W200b IndividualEducationPlan (IEP/IFSP).
 *
 * Annual special-education plan required by وزارة التعليم السعودية. One plan
 * per (beneficiaryId, planYear). Wave-18 invariants on the __invariants
 * validator:
 *   1. (beneficiaryId, planYear) unique
 *   2. planType='IFSP' → studentAgeMonths ≤ 36 (children under 3 only)
 *   3. status='signed' → at least one signature
 *   4. status='active' → must have at least one signature (was signed first)
 *   5. effectiveStartDate < effectiveEndDate (when both set)
 *
 * Plus: goal/service subdoc required fields + 3 virtuals (goalsCount,
 * masteredGoalsCount, isSigned).
 *
 * Per CLAUDE.md doctrine — 27× application across W38 + W39 + W41 + W191b +
 * W193b + W200b + W356-W470. Third entry from Clinical-operations batch.
 * Closes the last NAMED safety-critical model in BEHAVIORAL_TEST_COVERAGE_
 * BACKLOG.md Clinical-ops list.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/individual-education-plan-behavioral-wave200b.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let IEP;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w200b-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  IEP = require('../models/IndividualEducationPlan');
  await IEP.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await IEP.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function basePlan(overrides = {}) {
  return {
    beneficiaryId: oid(),
    planType: 'IEP',
    planYear: 2026,
    ...overrides,
  };
}

function validGoal(extra = {}) {
  return {
    domain: 'academic',
    text: 'Read 5 grade-appropriate sight words with 80% accuracy',
    criteria: '4/5 trials across 3 consecutive sessions',
    ...extra,
  };
}

function validService(extra = {}) {
  return {
    name: 'Speech Therapy',
    frequencyPerWeek: 2,
    durationMinutes: 30,
    ...extra,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W200b behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new IEP({ ...basePlan(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without planYear', async () => {
    const p = new IEP({ ...basePlan(), planYear: undefined });
    await expect(p.save()).rejects.toThrow(/planYear/);
  });

  it('REJECTS planYear < 2020', async () => {
    const p = new IEP(basePlan({ planYear: 2010 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS planYear > 2050', async () => {
    const p = new IEP(basePlan({ planYear: 2060 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES baseline IEP draft + defaults populate', async () => {
    const doc = await IEP.create(basePlan());
    expect(doc.planType).toBe('IEP');
    expect(doc.status).toBe('draft');
    expect(doc.goals).toEqual([]);
    expect(doc.services).toEqual([]);
    expect(doc.signatures).toEqual([]);
  });
});

// ─── 2. Uniqueness — one plan per beneficiary per year ────────────────

describe('W200b behavioral — (beneficiaryId, planYear) UNIQUE compound index', () => {
  it('REJECTS duplicate (beneficiaryId, planYear) combination', async () => {
    const benId = oid();
    await IEP.create(basePlan({ beneficiaryId: benId, planYear: 2026 }));
    await expect(IEP.create(basePlan({ beneficiaryId: benId, planYear: 2026 }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('ALLOWS same beneficiary across different planYears', async () => {
    const benId = oid();
    const a = await IEP.create(basePlan({ beneficiaryId: benId, planYear: 2025 }));
    const b = await IEP.create(basePlan({ beneficiaryId: benId, planYear: 2026 }));
    expect(a.planYear).toBe(2025);
    expect(b.planYear).toBe(2026);
  });

  it('ALLOWS different beneficiaries in same planYear', async () => {
    const a = await IEP.create(basePlan({ beneficiaryId: oid(), planYear: 2026 }));
    const b = await IEP.create(basePlan({ beneficiaryId: oid(), planYear: 2026 }));
    expect(a._id).not.toEqual(b._id);
  });
});

// ─── 3. Enum validation ───────────────────────────────────────────────

describe('W200b behavioral — planType enum', () => {
  it('SAVES planType=IEP', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IEP' }));
    expect(doc.planType).toBe('IEP');
  });

  it('SAVES planType=IFSP when student is under 3', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IFSP', studentAgeMonths: 24 }));
    expect(doc.planType).toBe('IFSP');
  });

  it('REJECTS invalid planType', async () => {
    const p = new IEP(basePlan({ planType: 'PEP' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W200b behavioral — status enum (6 lifecycle states)', () => {
  for (const valid of ['draft', 'team_review', 'completed', 'archived']) {
    it(`SAVES status='${valid}' (no extra invariant)`, async () => {
      const doc = await IEP.create(basePlan({ beneficiaryId: oid(), status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('REJECTS invalid status', async () => {
    const p = new IEP(basePlan({ status: 'in_limbo' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wave-18: IFSP age constraint (children under 3) ───────────────

describe('W200b behavioral — IFSP age constraint (≤36 months)', () => {
  it('REJECTS IFSP for child >36 months old', async () => {
    const p = new IEP(basePlan({ planType: 'IFSP', studentAgeMonths: 48 }));
    await expect(p.save()).rejects.toThrow(/IFSP is for children under 3 years/);
  });

  it('SAVES IFSP at exactly 36 months (boundary)', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IFSP', studentAgeMonths: 36 }));
    expect(doc.planType).toBe('IFSP');
  });

  it('SAVES IFSP for 24-month-old child', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IFSP', studentAgeMonths: 24 }));
    expect(doc.studentAgeMonths).toBe(24);
  });

  it('SAVES IFSP when studentAgeMonths is null (unknown)', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IFSP' }));
    expect(doc.planType).toBe('IFSP');
  });

  it('IEP plan type accepts any age (school-age + older)', async () => {
    const doc = await IEP.create(basePlan({ planType: 'IEP', studentAgeMonths: 120 }));
    expect(doc.studentAgeMonths).toBe(120);
  });
});

// ─── 5. Wave-18: signed/active status requires signatures ─────────────

describe('W200b behavioral — signed/active require signatures', () => {
  it('REJECTS status=signed without signatures', async () => {
    const p = new IEP(basePlan({ status: 'signed' }));
    await expect(p.save()).rejects.toThrow(/at least one signature required to mark as signed/);
  });

  it('REJECTS status=active without signatures', async () => {
    const p = new IEP(basePlan({ status: 'active' }));
    await expect(p.save()).rejects.toThrow(/plan must be signed before activation/);
  });

  it('SAVES status=signed with one signature', async () => {
    const doc = await IEP.create(
      basePlan({
        status: 'signed',
        signatures: [{ role: 'parent', name: 'أبو المستفيد' }],
      })
    );
    expect(doc.status).toBe('signed');
    expect(doc.signatures).toHaveLength(1);
  });

  it('SAVES status=active with multiple signatures', async () => {
    const doc = await IEP.create(
      basePlan({
        status: 'active',
        signatures: [
          { role: 'parent', name: 'أبو المستفيد' },
          { role: 'teacher', name: 'Teacher A' },
          { role: 'therapist', name: 'Therapist B' },
        ],
      })
    );
    expect(doc.status).toBe('active');
  });

  it('SAVES status=draft without signatures (intermediate state)', async () => {
    const doc = await IEP.create(basePlan({ status: 'draft' }));
    expect(doc.signatures).toEqual([]);
  });
});

// ─── 6. Wave-18: effective date range sanity ──────────────────────────

describe('W200b behavioral — effective date range', () => {
  it('REJECTS effectiveStartDate >= effectiveEndDate', async () => {
    const start = new Date('2026-09-01');
    const end = new Date('2026-08-01'); // before start
    const p = new IEP(basePlan({ effectiveStartDate: start, effectiveEndDate: end }));
    await expect(p.save()).rejects.toThrow(/end date must be after start date/);
  });

  it('REJECTS equal start/end dates', async () => {
    const same = new Date('2026-09-01');
    const p = new IEP(basePlan({ effectiveStartDate: same, effectiveEndDate: same }));
    await expect(p.save()).rejects.toThrow(/end date must be after start date/);
  });

  it('SAVES valid start < end range', async () => {
    const doc = await IEP.create(
      basePlan({
        effectiveStartDate: new Date('2026-09-01'),
        effectiveEndDate: new Date('2027-06-30'),
      })
    );
    expect(doc.effectiveStartDate).toBeInstanceOf(Date);
  });

  it('SAVES with only effectiveStartDate (no end yet)', async () => {
    const doc = await IEP.create(basePlan({ effectiveStartDate: new Date('2026-09-01') }));
    expect(doc.effectiveStartDate).toBeInstanceOf(Date);
  });
});

// ─── 7. Subdoc: Goal required fields + domain enum ────────────────────

describe('W200b behavioral — goal subdoc', () => {
  it('REJECTS goal without domain', async () => {
    const p = new IEP(basePlan({ goals: [{ text: 'Read 5 words', criteria: '4/5 trials' }] }));
    await expect(p.save()).rejects.toThrow(/domain/);
  });

  it('REJECTS goal without text', async () => {
    const p = new IEP(basePlan({ goals: [{ domain: 'academic', criteria: '4/5 trials' }] }));
    await expect(p.save()).rejects.toThrow(/text/);
  });

  it('REJECTS goal without criteria', async () => {
    const p = new IEP(
      basePlan({
        goals: [{ domain: 'academic', text: 'Read 5 words' }],
      })
    );
    await expect(p.save()).rejects.toThrow(/criteria/);
  });

  it('REJECTS invalid domain enum', async () => {
    const p = new IEP(basePlan({ goals: [validGoal({ domain: 'astrology' })] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with goals across all 8 valid domains', async () => {
    const goals = [
      'academic',
      'communication',
      'social_emotional',
      'motor',
      'self_care',
      'behavior',
      'cognitive',
      'pre_vocational',
    ].map(d => validGoal({ domain: d, text: `${d} goal` }));
    const doc = await IEP.create(basePlan({ goals }));
    expect(doc.goals).toHaveLength(8);
  });

  it('REJECTS invalid goal status enum', async () => {
    const p = new IEP(basePlan({ goals: [validGoal({ status: 'questioning' })] }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 8. Subdoc: Service required fields + bounds ──────────────────────

describe('W200b behavioral — service subdoc', () => {
  it('REJECTS service without name', async () => {
    const p = new IEP(basePlan({ services: [{ frequencyPerWeek: 2 }] }));
    await expect(p.save()).rejects.toThrow(/name/);
  });

  it('REJECTS service without frequencyPerWeek', async () => {
    const p = new IEP(basePlan({ services: [{ name: 'Speech Therapy' }] }));
    await expect(p.save()).rejects.toThrow(/frequencyPerWeek/);
  });

  it('REJECTS frequencyPerWeek > 20', async () => {
    const p = new IEP(basePlan({ services: [validService({ frequencyPerWeek: 25 })] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS durationMinutes > 240', async () => {
    const p = new IEP(basePlan({ services: [validService({ durationMinutes: 300 })] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES service with full schedule', async () => {
    const doc = await IEP.create(
      basePlan({
        services: [
          validService({ name: 'Speech Therapy', frequencyPerWeek: 2, durationMinutes: 30 }),
          validService({ name: 'OT', frequencyPerWeek: 1, durationMinutes: 60 }),
        ],
      })
    );
    expect(doc.services).toHaveLength(2);
  });
});

// ─── 9. Virtuals ──────────────────────────────────────────────────────

describe('W200b behavioral — virtuals (goalsCount, masteredGoalsCount, isSigned)', () => {
  it('goalsCount = 0 with empty goals[]', async () => {
    const doc = await IEP.create(basePlan());
    expect(doc.goalsCount).toBe(0);
  });

  it('goalsCount = N with N goals', async () => {
    const doc = await IEP.create(
      basePlan({
        goals: [
          validGoal({ status: 'not_started' }),
          validGoal({ status: 'in_progress' }),
          validGoal({ status: 'mastered' }),
        ],
      })
    );
    expect(doc.goalsCount).toBe(3);
  });

  it('masteredGoalsCount counts only mastered status', async () => {
    const doc = await IEP.create(
      basePlan({
        goals: [
          validGoal({ status: 'mastered' }),
          validGoal({ status: 'mastered' }),
          validGoal({ status: 'in_progress' }),
          validGoal({ status: 'not_started' }),
        ],
      })
    );
    expect(doc.masteredGoalsCount).toBe(2);
  });

  it('isSigned=false with empty signatures', async () => {
    const doc = await IEP.create(basePlan());
    expect(doc.isSigned).toBe(false);
  });

  it('isSigned=true with at least one signature', async () => {
    const doc = await IEP.create(
      basePlan({
        status: 'signed',
        signatures: [{ role: 'parent', name: 'أبو المستفيد' }],
      })
    );
    expect(doc.isSigned).toBe(true);
  });
});

// ─── 10. Indexes + collection ─────────────────────────────────────────

describe('W200b behavioral — indexes + collection', () => {
  it('beneficiaryId+planYear is UNIQUE', async () => {
    const indexes = await IEP.collection.indexes();
    const compound = indexes.find(i => Object.keys(i.key).join('+') === 'beneficiaryId+planYear');
    expect(compound).toBeDefined();
    expect(compound.unique).toBe(true);
  });

  it('declares status+nextReviewDate compound index for review-sweeper', async () => {
    const indexes = await IEP.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('status+nextReviewDate');
  });

  it('uses canonical collection name individual_education_plans', () => {
    expect(IEP.collection.collectionName).toBe('individual_education_plans');
  });
});

// ─── 11. End-to-end annual IEP lifecycle ──────────────────────────────

describe('W200b behavioral — full draft → signed → active lifecycle', () => {
  it('records IEP from draft through team_review → signed → active', async () => {
    const benId = oid();

    // 1. Draft created at planning meeting
    const plan = await IEP.create({
      beneficiaryId: benId,
      branchId: oid(),
      planType: 'IEP',
      planYear: 2026,
      studentAgeMonths: 96, // 8 years old
      primaryDisability: 'Autism Spectrum Disorder',
      strengths: 'Strong visual learner; loves music; verbal communication emerging',
      challenges: 'Difficulty with peer interaction; sensitivity to loud noises',
      parentInput: 'Family hopes to see improved peer engagement and sight-word reading',
      goals: [
        validGoal({ domain: 'academic', text: 'Read 25 grade-level sight words' }),
        validGoal({ domain: 'communication', text: 'Initiate 3 social greetings per session' }),
      ],
      services: [
        validService({ name: 'Speech Therapy', frequencyPerWeek: 2 }),
        validService({ name: 'OT', frequencyPerWeek: 1, durationMinutes: 45 }),
      ],
      status: 'draft',
    });
    expect(plan.status).toBe('draft');
    expect(plan.goalsCount).toBe(2);

    // 2. Move to team_review (no extra invariants)
    plan.status = 'team_review';
    await plan.save();
    expect(plan.status).toBe('team_review');

    // 3. Sign — multiple signatures captured
    plan.signatures = [
      { role: 'parent', name: 'والد المستفيد' },
      { role: 'teacher', name: 'Teacher A' },
      { role: 'therapist', name: 'Therapist B' },
      { role: 'supervisor', name: 'Supervisor X', nafathRequestId: 'NAFATH-12345' },
    ];
    plan.status = 'signed';
    await plan.save();
    expect(plan.isSigned).toBe(true);
    expect(plan.signatures).toHaveLength(4);

    // 4. Activate — effective dates set
    plan.status = 'active';
    plan.effectiveStartDate = new Date('2026-09-01');
    plan.effectiveEndDate = new Date('2027-06-30');
    plan.nextReviewDate = new Date('2026-12-01');
    await plan.save();
    expect(plan.status).toBe('active');

    // 5. Mid-year review — record review event, mark a goal mastered
    plan.reviewHistory.push({
      reviewDate: new Date('2026-12-01'),
      summary: 'Sight-word goal nearing mastery; social greeting in progress',
      attendees: ['parent', 'teacher', 'therapist'],
    });
    plan.goals[0].status = 'mastered';
    await plan.save();

    const reloaded = await IEP.findById(plan._id);
    expect(reloaded.masteredGoalsCount).toBe(1);
    expect(reloaded.reviewHistory).toHaveLength(1);
  });
});
