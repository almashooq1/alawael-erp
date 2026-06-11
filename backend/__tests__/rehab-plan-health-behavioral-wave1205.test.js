'use strict';

/**
 * rehab-plan-health-behavioral-wave1205.test.js — BEHAVIORAL counterpart to the
 * static guards (rehab-plan-health-wave1201 + review-worklist-wave1202).
 *
 * Per the doctrine "pair every static drift guard with a behavioral counterpart":
 * boots a real MongoMemoryServer, seeds CarePlanVersion + TherapeuticGoal docs,
 * and asserts assembleBeneficiaryPlanHealth + reviewWorklist compute the right
 * grade / severity over REAL persisted data (the static tests only prove source
 * shape; only this proves the queries + folding actually work end-to-end).
 *
 * Seeds via collection.insertOne (raw) — the services read via .lean(), so this
 * sidesteps the heavy CarePlanVersion validation/hooks while exercising the real
 * query + grading path.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/rehab-plan-health-behavioral-wave1205.test.js --runInBand
 */

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CarePlanVersion;
let TherapeuticGoal;
let svc;

const oid = () => new mongoose.Types.ObjectId();
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const cpvMod = require('../models/CarePlanVersion');
  CarePlanVersion = cpvMod.CarePlanVersion || cpvMod;
  TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal;
  svc = require('../services/rehabPlanHealth.service');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await CarePlanVersion.collection.deleteMany({});
  await TherapeuticGoal.collection.deleteMany({});
});

async function seedPlan({
  beneficiaryId,
  branchId,
  status = 'approved',
  nextReviewAt,
  planType = 'individual_therapy',
}) {
  await CarePlanVersion.collection.insertOne({
    // Raw insert bypasses mongoose defaults, so the UNIQUE
    // {planId, versionNumber} index (CarePlanVersion.js:432) rejects a second
    // {null,null} pair — the suite broke deterministically once autoIndex
    // built the index (failed CI on main AND on the merged branch).
    planId: new mongoose.Types.ObjectId(),
    versionNumber: 1,
    beneficiaryId,
    branchId,
    status,
    planType,
    reviewSchedule: { nextReviewAt, cadenceWeeks: 12 },
    createdAt: new Date(),
  });
}

async function seedGoal({ beneficiaryId, series = [], target = 80, status = 'active' }) {
  await TherapeuticGoal.collection.insertOne({
    beneficiaryId,
    isDeleted: false,
    status,
    target: { value: target },
    baseline: { value: series[0] != null ? series[0] : null },
    progressHistory: series.map((v, i) => ({ value: v, recordedAt: daysAgo(series.length - i) })),
    objectives: [],
  });
}

describe('rehab-plan-health (W1205) — assembleBeneficiaryPlanHealth (behavioral)', () => {
  test('beneficiary with NO active plan → NO_PLAN, no goals → composite null', async () => {
    const benId = oid();
    const r = await svc.assembleBeneficiaryPlanHealth(benId);
    expect(r.plan).toBeNull();
    expect(r.grade.grade).toBe('NO_PLAN');
    expect(r.grade.composite).toBeNull();
  });

  test('overdue review (≥14d) on a live CarePlanVersion → AT_RISK, plan.source=CarePlanVersion', async () => {
    const benId = oid();
    const branchId = oid();
    await seedPlan({ beneficiaryId: benId, branchId, nextReviewAt: daysAgo(20) });
    await seedGoal({ beneficiaryId: benId, series: [10, 20, 30], target: 80 });
    await seedGoal({ beneficiaryId: benId, series: [], target: 50 });

    const r = await svc.assembleBeneficiaryPlanHealth(benId);
    expect(r.plan).not.toBeNull();
    expect(r.plan.source).toBe('CarePlanVersion');
    expect(r.plan.status).toBe('approved');
    expect(r.grade.signals.reviewOverdueDays).toBeGreaterThanOrEqual(14);
    expect(r.grade.signals.goalCount).toBe(2);
    expect(r.grade.grade).toBe('AT_RISK'); // overdue ≥14 forces AT_RISK
    expect(r.grade.actions.some(a => a.dimension === 'review_cadence')).toBe(true);
  });

  test('a draft (non-live) plan version is NOT treated as the active plan', async () => {
    const benId = oid();
    await seedPlan({
      beneficiaryId: benId,
      branchId: oid(),
      status: 'draft',
      nextReviewAt: daysAgo(5),
    });
    const r = await svc.assembleBeneficiaryPlanHealth(benId);
    expect(r.plan).toBeNull(); // draft is not in CARE_PLAN_VERSION_LIVE_STATUSES
    expect(r.grade.grade).toBe('NO_PLAN');
  });
});

describe('rehab-plan-health (W1205) — reviewWorklist (behavioral)', () => {
  test('classifies live plans by W50 severity, sorted most-overdue-first', async () => {
    const branchId = oid();
    await seedPlan({ beneficiaryId: oid(), branchId, nextReviewAt: daysAgo(20) }); // critical
    await seedPlan({ beneficiaryId: oid(), branchId, nextReviewAt: daysAgo(5) }); // warning
    await seedPlan({ beneficiaryId: oid(), branchId, nextReviewAt: daysAgo(0) }); // info (due today)
    await seedPlan({ beneficiaryId: oid(), branchId, nextReviewAt: daysAhead(10) }); // NOT due → excluded
    await seedPlan({ beneficiaryId: oid(), branchId, status: 'draft', nextReviewAt: daysAgo(30) }); // not live → excluded

    const r = await svc.reviewWorklist({ branchId });
    expect(r.total).toBe(3);
    expect(r.counts).toEqual({ critical: 1, warning: 1, info: 1 });
    // sorted most-overdue-first (descending overdueDays)
    expect(r.items[0].severity).toBe('critical');
    expect(r.items[0].overdueDays).toBeGreaterThanOrEqual(r.items[1].overdueDays);
    expect(r.items[r.items.length - 1].overdueDays).toBeLessThanOrEqual(r.items[0].overdueDays);
  });

  test('only the requested branch is scanned (cross-branch isolation)', async () => {
    const branchA = oid();
    const branchB = oid();
    await seedPlan({ beneficiaryId: oid(), branchId: branchA, nextReviewAt: daysAgo(20) });
    await seedPlan({ beneficiaryId: oid(), branchId: branchB, nextReviewAt: daysAgo(20) });

    const rA = await svc.reviewWorklist({ branchId: branchA });
    expect(rA.total).toBe(1);
    expect(String(rA.branchId)).toBe(String(branchA));
  });

  test('no branchId → empty worklist (no scan-all)', async () => {
    await seedPlan({ beneficiaryId: oid(), branchId: oid(), nextReviewAt: daysAgo(20) });
    const r = await svc.reviewWorklist({});
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });
});
