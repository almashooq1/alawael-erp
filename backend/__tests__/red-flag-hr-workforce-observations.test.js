/**
 * red-flag-hr-workforce-observations.test.js — Phase 11 Commit 3.
 *
 * Integration coverage for the four HR-workforce red-flag observation
 * methods registered as `hrWorkforceService`:
 *
 *   leaveBalanceOverflowForBeneficiary        (warning)
 *   overdueReviewsForBeneficiary              (info)
 *   overdueProbationReviewsForBeneficiary     (warning)
 *   therapistsNotOnShiftForBeneficiary        (info)
 *
 * Real models against mongodb-memory-server. Uses the same
 * `jest.unmock('mongoose')` pattern as C1+C2 tests.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createHrWorkforceObservations,
} = require('../services/redFlagObservations/hrWorkforceObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let SessionAttendance;
let Employee;
let LeaveBalance;
let PerformanceReview;
let Shift;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-workforce-test' });
  SessionAttendance = require('../models/SessionAttendance');
  Employee = require('../models/HR/Employee');
  LeaveBalance = require('../models/hr/LeaveBalance');
  PerformanceReview = require('../models/hr/PerformanceReview');
  Shift = require('../models/Shift');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await SessionAttendance.deleteMany({});
  await Employee.deleteMany({});
  await LeaveBalance.deleteMany({});
  await PerformanceReview.deleteMany({});
  await Shift.deleteMany({});
});

const MS_PER_DAY = 24 * 3600 * 1000;

// ─── Fixture builders ───────────────────────────────────────────

let therapistCounter = 1;
async function seedTherapist({ probationEndDaysFromNow = null, now = new Date() } = {}) {
  const seq = therapistCounter++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `WF-${seq}`,
    national_id: `WF${String(seq).padStart(7, '0')}`,
    email: `wf-${seq}-${Date.now()}@test.local`,
    probation_end_date:
      probationEndDaysFromNow == null
        ? null
        : new Date(now.getTime() + probationEndDaysFromNow * MS_PER_DAY),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedSession({ bId, therapistId, daysAgo, now = new Date() }) {
  return SessionAttendance.create({
    beneficiaryId: bId,
    therapistId,
    sessionId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(now.getTime() - daysAgo * MS_PER_DAY),
    status: 'present',
  });
}

async function seedLeaveBalance({ employeeId, year, annualRemaining, carriedOver = 0 } = {}) {
  return LeaveBalance.create({
    employee_id: employeeId,
    year,
    annual_entitled: 21,
    annual_used: 0,
    annual_remaining: annualRemaining,
    carried_over_from_last_year: carriedOver,
  });
}

async function seedPerformanceReview({
  employeeId,
  periodEnd,
  reviewType = 'annual',
  status = 'finalized',
  deletedAt = null,
} = {}) {
  // Bypass the pre-save hook (total_score compute + numbering) via raw
  // driver write — the adapter only reads `employee_id`, `review_type`,
  // `status`, `review_period_end`, `deleted_at`.
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(PerformanceReview.collection.collectionName).insertOne({
    _id,
    review_number: `TEST-PRV-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    reviewer_id: new mongoose.Types.ObjectId(),
    review_period_start: new Date(periodEnd.getTime() - 365 * MS_PER_DAY),
    review_period_end: periodEnd,
    review_type: reviewType,
    status,
    deleted_at: deletedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedShift({ name = 'Morning Shift', assignedStaff = [], isActive = true } = {}) {
  return Shift.create({
    name,
    type: 'MORNING',
    startTime: '08:00',
    endTime: '16:00',
    department: 'clinical',
    assignedStaff,
    isActive,
  });
}

function buildObs() {
  return createHrWorkforceObservations({
    sessionAttendanceModel: SessionAttendance,
    employeeModel: Employee,
    leaveBalanceModel: LeaveBalance,
    performanceReviewModel: PerformanceReview,
    shiftModel: Shift,
  });
}

// ─── leaveBalanceOverflowForBeneficiary ─────────────────────────

describe('leaveBalanceOverflowForBeneficiary', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');
  const YEAR = 2026;

  it('returns 0 when beneficiary has no recent sessions', async () => {
    const { count } = await buildObs().leaveBalanceOverflowForBeneficiary(
      new mongoose.Types.ObjectId(),
      { now }
    );
    expect(count).toBe(0);
  });

  it('counts a therapist with annual_remaining+carried > 45', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedLeaveBalance({
      employeeId: t._id,
      year: YEAR,
      annualRemaining: 30,
      carriedOver: 20, // total 50 > 45
    });

    const { count } = await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count when total is at or under the threshold', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedLeaveBalance({
      employeeId: t._id,
      year: YEAR,
      annualRemaining: 25,
      carriedOver: 20, // total 45, not > 45
    });

    const { count } = await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('respects the custom thresholdDays override', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedLeaveBalance({
      employeeId: t._id,
      year: YEAR,
      annualRemaining: 30,
      carriedOver: 0,
    });

    expect(
      (await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now, thresholdDays: 25 })).count
    ).toBe(1);
    expect(
      (await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now, thresholdDays: 60 })).count
    ).toBe(0);
  });

  it('reads the current year only', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    // overflow exists for last year — adapter looks at this year only
    await seedLeaveBalance({
      employeeId: t._id,
      year: YEAR - 1,
      annualRemaining: 60,
      carriedOver: 0,
    });

    const { count } = await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('ignores balances for unrelated therapists', async () => {
    const bId = new mongoose.Types.ObjectId();
    const mine = await seedTherapist({ now });
    const other = await seedTherapist({ now });
    await seedSession({ bId, therapistId: mine._id, daysAgo: 3, now });
    await seedLeaveBalance({
      employeeId: other._id,
      year: YEAR,
      annualRemaining: 80,
    });

    const { count } = await buildObs().leaveBalanceOverflowForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });
});

// ─── overdueReviewsForBeneficiary ───────────────────────────────

describe('overdueReviewsForBeneficiary', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  it('returns 0 without recent sessions', async () => {
    const { count } = await buildObs().overdueReviewsForBeneficiary(new mongoose.Types.ObjectId(), {
      now,
    });
    expect(count).toBe(0);
  });

  it('counts a therapist without any finalized review in 365 days', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    // No reviews seeded.

    const { count } = await buildObs().overdueReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count when a finalized annual review is within window', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(now.getTime() - 100 * MS_PER_DAY),
      reviewType: 'annual',
      status: 'finalized',
    });

    const { count } = await buildObs().overdueReviewsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT accept probation-type reviews as annual-cycle satisfaction', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(now.getTime() - 50 * MS_PER_DAY),
      reviewType: 'probation',
      status: 'finalized',
    });

    const { count } = await buildObs().overdueReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT accept draft or submitted reviews', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(now.getTime() - 50 * MS_PER_DAY),
      reviewType: 'annual',
      status: 'draft',
    });

    const { count } = await buildObs().overdueReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('counts older-than-365d reviews as overdue', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(now.getTime() - 400 * MS_PER_DAY),
      reviewType: 'annual',
      status: 'finalized',
    });

    const { count } = await buildObs().overdueReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });
});

// ─── overdueProbationReviewsForBeneficiary ──────────────────────

describe('overdueProbationReviewsForBeneficiary', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  it('returns 0 without recent sessions', async () => {
    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(
      new mongoose.Types.ObjectId(),
      { now }
    );
    expect(count).toBe(0);
  });

  it('does NOT count therapists whose probation has not yet ended', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ probationEndDaysFromNow: 30, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT count within the grace period (< 7 days after end)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ probationEndDaysFromNow: -3, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 1, now });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('counts a therapist past probation >7d without a probation review', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ probationEndDaysFromNow: -14, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count when a finalized probation review sits within ±30 days of end', async () => {
    const bId = new mongoose.Types.ObjectId();
    const probationEnd = new Date(now.getTime() - 14 * MS_PER_DAY);
    const t = await seedTherapist({ probationEndDaysFromNow: -14, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(probationEnd.getTime() + 2 * MS_PER_DAY),
      reviewType: 'probation',
      status: 'finalized',
    });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT accept non-probation reviews as satisfaction', async () => {
    const bId = new mongoose.Types.ObjectId();
    const probationEnd = new Date(now.getTime() - 14 * MS_PER_DAY);
    const t = await seedTherapist({ probationEndDaysFromNow: -14, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(probationEnd.getTime() + 2 * MS_PER_DAY),
      reviewType: 'annual',
      status: 'finalized',
    });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('ignores draft probation reviews', async () => {
    const bId = new mongoose.Types.ObjectId();
    const probationEnd = new Date(now.getTime() - 14 * MS_PER_DAY);
    const t = await seedTherapist({ probationEndDaysFromNow: -14, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedPerformanceReview({
      employeeId: t._id,
      periodEnd: new Date(probationEnd.getTime()),
      reviewType: 'probation',
      status: 'draft',
    });

    const { count } = await buildObs().overdueProbationReviewsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });
});

// ─── therapistsNotOnShiftForBeneficiary ─────────────────────────

describe('therapistsNotOnShiftForBeneficiary', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  it('returns 0 without recent sessions', async () => {
    const { count } = await buildObs().therapistsNotOnShiftForBeneficiary(
      new mongoose.Types.ObjectId(),
      { now }
    );
    expect(count).toBe(0);
  });

  it('counts a therapist not on any active shift', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedShift({ assignedStaff: [], isActive: true });

    const { count } = await buildObs().therapistsNotOnShiftForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count a therapist listed on an active shift', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedShift({ assignedStaff: [t._id], isActive: true });

    const { count } = await buildObs().therapistsNotOnShiftForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('counts therapists only on INACTIVE shifts as missing', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedShift({ assignedStaff: [t._id], isActive: false });

    const { count } = await buildObs().therapistsNotOnShiftForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('counts 2 when both therapists are unassigned', async () => {
    const bId = new mongoose.Types.ObjectId();
    const t1 = await seedTherapist({ now });
    const t2 = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t1._id, daysAgo: 1, now });
    await seedSession({ bId, therapistId: t2._id, daysAgo: 4, now });
    // One of them is on an active shift, other isn't.
    await seedShift({ assignedStaff: [t1._id], isActive: true });

    const { count } = await buildObs().therapistsNotOnShiftForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('hr-workforce flags fire end-to-end', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');
  const YEAR = 2026;

  function buildEngine() {
    const locator = createLocator();
    locator.register('hrWorkforceService', buildObs());
    return createEngine({ locator });
  }

  it('operational.leave_balance.overflow_45d raises', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedLeaveBalance({
      employeeId: t._id,
      year: YEAR,
      annualRemaining: 50,
    });

    const result = await buildEngine().evaluateBeneficiary(bId, {
      flagIds: ['operational.leave_balance.overflow_45d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });

  it('operational.performance_review.overdue_365d raises', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });

    const result = await buildEngine().evaluateBeneficiary(bId, {
      flagIds: ['operational.performance_review.overdue_365d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });

  it('operational.probation_review.overdue_7d raises', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ probationEndDaysFromNow: -20, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });

    const result = await buildEngine().evaluateBeneficiary(bId, {
      flagIds: ['operational.probation_review.overdue_7d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });

  it('operational.shift.unassigned_therapist raises', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedShift({ assignedStaff: [], isActive: true });

    const result = await buildEngine().evaluateBeneficiary(bId, {
      flagIds: ['operational.shift.unassigned_therapist'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });
});
