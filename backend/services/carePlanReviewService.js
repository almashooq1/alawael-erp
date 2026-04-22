/**
 * carePlanReviewService.js — review-cycle service for the Rehab
 * Program Engine.
 *
 * Phase 9 Commit 9. Dual purpose:
 *
 *   1. **Red-flag trigger source** — the
 *      `operational.care_plan.review.overdue` flag registered in
 *      Phase-9 Commit 3 declares
 *        trigger.source.service = 'carePlanReviewService'
 *        trigger.source.method  = 'daysPastReviewDate'
 *        trigger.source.path    = 'daysPast'
 *      The red-flag engine calls this service via the locator; any
 *      caller wishing to evaluate the flag must register the service
 *      with the locator first.
 *
 *   2. **KPI feed** — `summarize()` powers
 *      `rehab.care_plan.review.ontime.pct`.
 *
 * Dependency injection: the factory accepts `{ carePlanModel,
 * planReviewModel }` so tests can substitute in-memory fakes.
 * Models default to requires when omitted — production callers just
 * do `createCarePlanReviewService()` without args.
 */

'use strict';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Grace window — reviews recorded within this many days after the
// scheduled date still count as "on-time". 14 days matches the
// red-flag's critical-upgrade threshold + the CBAHI 8.7 tolerance.
const ON_TIME_GRACE_DAYS = 14;

function daysBetween(a, b) {
  return Math.floor((b - a) / MS_PER_DAY);
}

function createCarePlanReviewService(deps = {}) {
  const carePlanModel = deps.carePlanModel || safeRequire('../models/CarePlan');
  const planReviewModel = deps.planReviewModel || safeRequire('../models/PlanReview');
  const now = () => (deps.now ? deps.now() : new Date());

  if (!carePlanModel) {
    throw new Error('carePlanReviewService: carePlanModel is required');
  }

  /**
   * Days the beneficiary's active CarePlan is past its scheduled
   * reviewDate. Returns 0 when on-time or no plan. The red-flag
   * engine reads `path: 'daysPast'` from the response.
   *
   * @param {string|ObjectId} beneficiaryId
   * @returns {Promise<{daysPast:number, carePlanId:string|null, reviewDate:Date|null}>}
   */
  async function daysPastReviewDate(beneficiaryId) {
    if (!beneficiaryId) {
      return { daysPast: 0, carePlanId: null, reviewDate: null };
    }
    const plan = await carePlanModel
      .findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' })
      .sort({ reviewDate: 1 })
      .lean();

    if (!plan || !plan.reviewDate) {
      return { daysPast: 0, carePlanId: null, reviewDate: null };
    }
    const delta = daysBetween(new Date(plan.reviewDate), now());
    return {
      daysPast: Math.max(0, delta),
      carePlanId: String(plan._id),
      reviewDate: plan.reviewDate,
    };
  }

  /**
   * Upcoming reviews within a rolling window. Used by the admin
   * dashboard to show "plans reviewed in the next 30 days".
   */
  async function upcomingReviews({ windowDays = 30 } = {}) {
    const from = now();
    const to = new Date(from.getTime() + windowDays * MS_PER_DAY);
    return carePlanModel
      .find({
        status: 'ACTIVE',
        reviewDate: { $gte: from, $lte: to },
      })
      .sort({ reviewDate: 1 })
      .lean();
  }

  /**
   * KPI feed for `rehab.care_plan.review.ontime.pct`. Walks every
   * CarePlan whose scheduled reviewDate fell inside the window, and
   * checks whether a PlanReview was recorded within the grace period.
   */
  async function summarize({ windowDays = 90 } = {}) {
    if (!planReviewModel) {
      return { onTimePct: null, scheduled: 0, reviewed: 0, missed: 0 };
    }
    const endDate = now();
    const startDate = new Date(endDate.getTime() - windowDays * MS_PER_DAY);

    const plans = await carePlanModel
      .find({ reviewDate: { $gte: startDate, $lte: endDate } })
      .lean();

    if (plans.length === 0) {
      return { onTimePct: null, scheduled: 0, reviewed: 0, missed: 0 };
    }

    let onTime = 0;
    let late = 0;
    for (const plan of plans) {
      const scheduled = new Date(plan.reviewDate);
      const graceEnd = new Date(scheduled.getTime() + ON_TIME_GRACE_DAYS * MS_PER_DAY);
      const review = await planReviewModel
        .findOne({
          carePlan: plan._id,
          reviewDate: { $gte: scheduled, $lte: graceEnd },
        })
        .lean();
      if (review) onTime++;
      else late++;
    }

    const onTimePct = plans.length > 0 ? (onTime / plans.length) * 100 : 0;
    return {
      onTimePct: Number(onTimePct.toFixed(1)),
      scheduled: plans.length,
      reviewed: onTime,
      missed: late,
      windowDays,
      graceDays: ON_TIME_GRACE_DAYS,
    };
  }

  /**
   * Record a review event. Pushes forward the CarePlan.reviewDate
   * if a nextReviewDate is supplied — keeps the two stores in sync.
   */
  async function recordReview(input) {
    if (!planReviewModel) {
      throw new Error('carePlanReviewService.recordReview: planReviewModel required');
    }
    const {
      carePlanId,
      beneficiaryId,
      reviewDate,
      reviewType = 'SCHEDULED',
      attendees = [],
      goalsAchieved = 0,
      goalsPartial = 0,
      goalsUnmet = 0,
      progressRating,
      summary,
      newGoalIds = [],
      retiredGoalIds = [],
      planAdjustments = [],
      nextReviewDate,
      recordedBy,
    } = input || {};

    if (!carePlanId) throw new Error('carePlanId is required');
    if (!beneficiaryId) throw new Error('beneficiaryId is required');
    if (!nextReviewDate) throw new Error('nextReviewDate is required');

    const plan = await carePlanModel.findById(carePlanId).lean();
    const addresses = plan && plan.reviewDate ? plan.reviewDate : null;

    const review = await planReviewModel.create({
      carePlan: carePlanId,
      beneficiary: beneficiaryId,
      reviewDate: reviewDate || now(),
      reviewType,
      addressesScheduledDate: addresses,
      attendees,
      familyAttended: attendees.some(a => a && (a.role || '').toLowerCase().includes('guardian')),
      goalsAchieved,
      goalsPartial,
      goalsUnmet,
      progressRating,
      summary,
      newGoalIds,
      retiredGoalIds,
      planAdjustments,
      nextReviewDate,
      recordedBy,
    });

    // Roll the CarePlan forward. Non-fatal if update fails — the
    // review record is what drives compliance reporting.
    try {
      await carePlanModel.updateOne({ _id: carePlanId }, { $set: { reviewDate: nextReviewDate } });
    } catch {
      // intentional: review already persisted
    }

    return review;
  }

  return {
    daysPastReviewDate,
    upcomingReviews,
    summarize,
    recordReview,
    // constants exposed for tests
    _ON_TIME_GRACE_DAYS: ON_TIME_GRACE_DAYS,
  };
}

function safeRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

module.exports = {
  createCarePlanReviewService,
  ON_TIME_GRACE_DAYS,
};
