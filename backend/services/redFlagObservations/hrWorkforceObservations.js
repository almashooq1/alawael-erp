/**
 * hrWorkforceObservations.js — Phase 11 Commit 3 (4.0.20).
 *
 * One adapter covering four HR-workforce compliance red-flags that
 * all share the "beneficiary → recent-treating therapists" lookup
 * pattern established in cpeObservations/hrCredentialObservations:
 *
 *   hr.leave_balance.overflow_45d
 *     → leaveBalanceOverflowForBeneficiary(beneficiaryId) → { count }
 *
 *   hr.performance_review.overdue_365d
 *     → overdueReviewsForBeneficiary(beneficiaryId) → { count }
 *
 *   hr.probation.review_overdue_7d
 *     → overdueProbationReviewsForBeneficiary(beneficiaryId) → { count }
 *
 *   hr.shift.unassigned_therapist
 *     → therapistsNotOnShiftForBeneficiary(beneficiaryId) → { count }
 *
 * Registered as `hrWorkforceService` in the locator. Why one file for
 * four methods instead of four files? They all read from the SAME
 * recent-therapists set (via SessionAttendance) and the resulting
 * one-shot N+1 lookups benefit from sharing the therapist-id resolution.
 * The method shapes are independent so tests and callers keep working
 * if any one of them changes.
 *
 * Design decisions:
 *
 *   1. Leave-balance check walks the current-year LeaveBalance document
 *      per therapist. Overflow is defined as
 *      `(annual_remaining + carried_over_from_last_year) > OVERFLOW_DAYS`
 *      (default 45) — matches the policy reminder point: at 45 days of
 *      pent-up annual leave the HR team is expected to work with the
 *      employee on a usage plan before the 60-day legal cap
 *      (Saudi Labor Law Art. 111).
 *
 *   2. Performance-review check looks for ANY finalized PerformanceReview
 *      for the therapist whose review_period_end is within the last
 *      365 days. Missing = overdue. `review_type === 'probation'` is
 *      excluded — probation reviews don't satisfy the annual cycle.
 *
 *   3. Probation-review check is the narrower companion: a therapist
 *      whose `probation_end_date` has passed ≥7 days ago AND who has
 *      no PerformanceReview with `review_type: 'probation'` and
 *      `status: 'finalized'` within ±30 days of that probation end.
 *      This enforces the Saudi Labor Law Art. 53 requirement that
 *      probation outcomes be documented before confirmation.
 *
 *   4. Shift-assignment check reads the Shift collection's
 *      `assignedStaff` array. The shift model is a TEMPLATE not a
 *      per-day roster, so this is intentionally narrow: it only asks
 *      "is this therapist listed on ANY active shift?" Therapists who
 *      are treating beneficiaries but are off every active shift
 *      template signal a rota-sync drift (common after transfers).
 *
 *   5. All methods are read-only. Status fields and workflow
 *      transitions are owned elsewhere.
 *
 *   6. All models are optional — a deployment missing any of Leave/
 *      LeaveBalance/PerformanceReview/Shift still gets partial
 *      coverage. The method backing the missing model throws so the
 *      locator surfaces a loud `locator-error` for that specific flag.
 */

'use strict';

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const DEFAULT_SESSION_ATTENDANCE = requireOptional('../../models/SessionAttendance');
const DEFAULT_EMPLOYEE = requireOptional('../../models/HR/Employee');
const DEFAULT_LEAVE_BALANCE = requireOptional('../../models/hr/LeaveBalance');
const DEFAULT_PERFORMANCE_REVIEW = requireOptional('../../models/hr/PerformanceReview');
const DEFAULT_SHIFT = requireOptional('../../models/Shift');

function createHrWorkforceObservations(deps = {}) {
  const SessionAttendance = deps.sessionAttendanceModel || DEFAULT_SESSION_ATTENDANCE;
  const Employee = deps.employeeModel || DEFAULT_EMPLOYEE;
  const LeaveBalance = deps.leaveBalanceModel || DEFAULT_LEAVE_BALANCE;
  const PerformanceReview = deps.performanceReviewModel || DEFAULT_PERFORMANCE_REVIEW;
  const Shift = deps.shiftModel || DEFAULT_SHIFT;

  if (SessionAttendance == null) {
    throw new Error('hrWorkforceObservations: SessionAttendance model is required');
  }
  if (Employee == null) {
    throw new Error('hrWorkforceObservations: Employee (HR) model is required');
  }

  async function recentTherapistIds(beneficiaryId, { now, days }) {
    const since = new Date(now.getTime() - days * MS_PER_DAY);
    return SessionAttendance.distinct('therapistId', {
      beneficiaryId,
      scheduledDate: { $gte: since, $lte: now },
      therapistId: { $ne: null },
    });
  }

  /**
   * Count recent-treating therapists whose current-year leave balance
   * exceeds the overflow threshold (default 45 days). Reads the
   * LeaveBalance document for `new Date(now).getFullYear()`. Missing
   * balance documents are ignored (no ball in play to overflow).
   */
  async function leaveBalanceOverflowForBeneficiary(beneficiaryId, options = {}) {
    if (LeaveBalance == null) {
      throw new Error(
        'hrWorkforceObservations: LeaveBalance model required for leaveBalanceOverflowForBeneficiary'
      );
    }
    const now = options.now instanceof Date ? options.now : new Date();
    const therapistWindowDays =
      typeof options.therapistWindowDays === 'number' ? options.therapistWindowDays : 60;
    const thresholdDays = typeof options.thresholdDays === 'number' ? options.thresholdDays : 45;
    const year = now.getFullYear();

    const therapistIds = await recentTherapistIds(beneficiaryId, {
      now,
      days: therapistWindowDays,
    });
    if (therapistIds.length === 0) return { count: 0 };

    const balances = await LeaveBalance.find(
      { employee_id: { $in: therapistIds }, year, deleted_at: null },
      'employee_id annual_remaining carried_over_from_last_year'
    ).lean();

    const overflowing = new Set();
    for (const b of balances) {
      const totalCarryable = (b.annual_remaining || 0) + (b.carried_over_from_last_year || 0);
      if (totalCarryable > thresholdDays) {
        overflowing.add(String(b.employee_id));
      }
    }

    return { count: overflowing.size };
  }

  /**
   * Count recent-treating therapists without a finalized annual-cycle
   * PerformanceReview in the last N days (default 365). Probation-type
   * reviews do NOT count — they don't satisfy the annual cycle.
   */
  async function overdueReviewsForBeneficiary(beneficiaryId, options = {}) {
    if (PerformanceReview == null) {
      throw new Error(
        'hrWorkforceObservations: PerformanceReview model required for overdueReviewsForBeneficiary'
      );
    }
    const now = options.now instanceof Date ? options.now : new Date();
    const therapistWindowDays =
      typeof options.therapistWindowDays === 'number' ? options.therapistWindowDays : 60;
    const stalenessDays = typeof options.stalenessDays === 'number' ? options.stalenessDays : 365;

    const therapistIds = await recentTherapistIds(beneficiaryId, {
      now,
      days: therapistWindowDays,
    });
    if (therapistIds.length === 0) return { count: 0 };

    const freshCutoff = new Date(now.getTime() - stalenessDays * MS_PER_DAY);

    // Therapists WITH a qualifying recent review:
    const therapistsWithFreshReview = await PerformanceReview.distinct('employee_id', {
      employee_id: { $in: therapistIds },
      status: 'finalized',
      review_type: { $ne: 'probation' },
      review_period_end: { $gte: freshCutoff },
      deleted_at: null,
    });

    const withFresh = new Set(therapistsWithFreshReview.map(String));
    const overdue = therapistIds.filter(id => !withFresh.has(String(id)));

    return { count: overdue.length };
  }

  /**
   * Count recent-treating therapists whose probation_end_date has passed
   * by at least N days (default 7) AND who have no probation-type
   * finalized PerformanceReview within ±30 days of that end date.
   */
  async function overdueProbationReviewsForBeneficiary(beneficiaryId, options = {}) {
    if (PerformanceReview == null) {
      throw new Error(
        'hrWorkforceObservations: PerformanceReview model required for overdueProbationReviewsForBeneficiary'
      );
    }
    const now = options.now instanceof Date ? options.now : new Date();
    const therapistWindowDays =
      typeof options.therapistWindowDays === 'number' ? options.therapistWindowDays : 60;
    const graceDays = typeof options.graceDays === 'number' ? options.graceDays : 7;
    const reviewWindowDays =
      typeof options.reviewWindowDays === 'number' ? options.reviewWindowDays : 30;

    const therapistIds = await recentTherapistIds(beneficiaryId, {
      now,
      days: therapistWindowDays,
    });
    if (therapistIds.length === 0) return { count: 0 };

    const probationCutoff = new Date(now.getTime() - graceDays * MS_PER_DAY);

    const therapistsWithLapsedProbation = await Employee.find(
      {
        _id: { $in: therapistIds },
        probation_end_date: { $ne: null, $lte: probationCutoff },
      },
      '_id probation_end_date'
    ).lean();

    if (therapistsWithLapsedProbation.length === 0) return { count: 0 };

    const overdueTherapists = new Set();
    for (const emp of therapistsWithLapsedProbation) {
      const windowStart = new Date(
        new Date(emp.probation_end_date).getTime() - reviewWindowDays * MS_PER_DAY
      );
      const windowEnd = new Date(
        new Date(emp.probation_end_date).getTime() + reviewWindowDays * MS_PER_DAY
      );
      const probationReview = await PerformanceReview.findOne({
        employee_id: emp._id,
        review_type: 'probation',
        status: 'finalized',
        review_period_end: { $gte: windowStart, $lte: windowEnd },
        deleted_at: null,
      }).lean();
      if (!probationReview) overdueTherapists.add(String(emp._id));
    }

    return { count: overdueTherapists.size };
  }

  /**
   * Count recent-treating therapists who are NOT listed on any active
   * Shift template's `assignedStaff` array. Signals a rota/transfer
   * drift where an employee is delivering sessions off-book.
   */
  async function therapistsNotOnShiftForBeneficiary(beneficiaryId, options = {}) {
    if (Shift == null) {
      throw new Error(
        'hrWorkforceObservations: Shift model required for therapistsNotOnShiftForBeneficiary'
      );
    }
    const now = options.now instanceof Date ? options.now : new Date();
    const therapistWindowDays =
      typeof options.therapistWindowDays === 'number' ? options.therapistWindowDays : 60;

    const therapistIds = await recentTherapistIds(beneficiaryId, {
      now,
      days: therapistWindowDays,
    });
    if (therapistIds.length === 0) return { count: 0 };

    const therapistsOnActiveShift = await Shift.distinct('assignedStaff', {
      assignedStaff: { $in: therapistIds },
      isActive: true,
    });

    const onShift = new Set(therapistsOnActiveShift.map(String));
    const missing = therapistIds.filter(id => !onShift.has(String(id)));

    return { count: missing.length };
  }

  return Object.freeze({
    leaveBalanceOverflowForBeneficiary,
    overdueReviewsForBeneficiary,
    overdueProbationReviewsForBeneficiary,
    therapistsNotOnShiftForBeneficiary,
  });
}

module.exports = { createHrWorkforceObservations };
