'use strict';
/**
 * risk-plan-review.service.js — Wave 290.
 *
 * Closes the loop between W288 risk escalation alerts and the existing
 * clinical PlanReview workflow (Phase-9 C2). When the Risk Sweeper
 * raises an alert (`RISK_TIER_ESCALATED` or `RISK_TIER_FIRST_CRITICAL`),
 * this service:
 *
 *   1. Looks up the beneficiary's active CarePlan (legacy `CarePlan`
 *      model — the one `PlanReview.carePlan` references).
 *   2. If no active plan → returns `{created:false, reason:'NO_ACTIVE_CARE_PLAN'}`
 *      so the operational dashboard can flag "high-risk beneficiary
 *      without a current plan" (often the real issue).
 *   3. If a CRITICAL review was already recorded today for this plan
 *      → idempotent skip (`reason:'ALREADY_TRIGGERED_TODAY'`).
 *   4. Otherwise creates a `PlanReview` of type `CRITICAL` with a
 *      machine-readable summary that names the risk score, tier,
 *      top factors, and source sweepRunId — so the reviewer has the
 *      whole context without leaving the screen.
 *
 * Failures never propagate to the sweeper; the alert stands either way.
 */

const TIER_AR = { low: 'منخفض', moderate: 'متوسط', high: 'مرتفع', critical: 'حرج' };

function startOfUtcDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfUtcDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function defaultNextReviewDate(now = new Date()) {
  // 7 days out — operational convention for CRITICAL reviews. Far enough
  // that the team can prepare, near enough that it isn't ignored.
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

function buildSummary({ profile, tierDelta, sweepRunId }) {
  const tierAr = TIER_AR[profile.overallTier] || profile.overallTier;
  const factors = (profile.topFactors || [])
    .slice(0, 3)
    .map(f => f.label || f.code)
    .filter(Boolean)
    .join('، ');
  const transitionAr =
    tierDelta === 'first'
      ? 'تسجيل أول درجة خطورة حرجة'
      : `ارتفاع تلقائي إلى درجة الخطورة "${tierAr}"`;
  const head = `مراجعة عاجلة بسبب ${transitionAr} (${profile.overallScore}/100).`;
  const body = factors ? ` أهم العوامل: ${factors}.` : '';
  const tail = ` [مصدر: ${sweepRunId}]`;
  return head + body + tail;
}

/**
 * @typedef {Object} PlanReviewDeps
 * @property {import('mongoose').Model} CarePlanModel - legacy CarePlan (`careplans` collection)
 * @property {import('mongoose').Model} PlanReviewModel
 * @property {{info:Function, warn:Function, error:Function}} [logger]
 */

class RiskPlanReviewService {
  /** @param {PlanReviewDeps} deps */
  constructor(deps) {
    if (!deps) throw new Error('RiskPlanReviewService: deps required');
    if (!deps.CarePlanModel) throw new Error('RiskPlanReviewService: CarePlanModel required');
    if (!deps.PlanReviewModel) throw new Error('RiskPlanReviewService: PlanReviewModel required');
    this.CarePlan = deps.CarePlanModel;
    this.PlanReview = deps.PlanReviewModel;
    this.logger = deps.logger || { info() {}, warn() {}, error() {} };
  }

  /**
   * Hook entrypoint matching RiskSweeperService.onAlertRaised contract.
   * @param {{alertId:any, ben:object, profile:object, tierDelta:string, code:string, sweepRunId:string, now?:Date}} ctx
   * @returns {Promise<{created:boolean, reason?:string, planReviewId?:any, carePlanId?:any}>}
   */
  async triggerOnEscalation(ctx) {
    const { ben, profile, tierDelta, sweepRunId, now = new Date() } = ctx || {};
    if (!ben || !ben._id) return { created: false, reason: 'BENEFICIARY_REQUIRED' };

    // ── 1. Locate active care plan ────────────────────────────────────
    const plan = await this.CarePlan.findOne({
      beneficiary: ben._id,
      status: 'ACTIVE',
    })
      .select('_id beneficiary status')
      .lean();
    if (!plan) {
      this.logger.info('[risk-plan-review] no active care plan; skipping', {
        beneficiaryId: String(ben._id),
      });
      return { created: false, reason: 'NO_ACTIVE_CARE_PLAN' };
    }

    // ── 2. Idempotency: a CRITICAL review created today wins. ─────────
    const existing = await this.PlanReview.findOne({
      carePlan: plan._id,
      beneficiary: ben._id,
      reviewType: 'CRITICAL',
      createdAt: { $gte: startOfUtcDay(now), $lte: endOfUtcDay(now) },
    })
      .select('_id')
      .lean();
    if (existing) {
      return {
        created: false,
        reason: 'ALREADY_TRIGGERED_TODAY',
        planReviewId: existing._id,
        carePlanId: plan._id,
      };
    }

    // ── 3. Create the review. ─────────────────────────────────────────
    try {
      const review = await this.PlanReview.create({
        carePlan: plan._id,
        beneficiary: ben._id,
        reviewDate: now,
        reviewType: 'CRITICAL',
        addressesScheduledDate: now,
        summary: buildSummary({ profile, tierDelta, sweepRunId }),
        nextReviewDate: defaultNextReviewDate(now),
        planAdjustments: [],
      });
      this.logger.info('[risk-plan-review] CRITICAL review created', {
        beneficiaryId: String(ben._id),
        carePlanId: String(plan._id),
        planReviewId: String(review._id),
        sweepRunId,
        tierDelta,
        tier: profile.overallTier,
      });
      return {
        created: true,
        reason: 'PLAN_REVIEW_TRIGGERED_BY_RISK',
        planReviewId: review._id,
        carePlanId: plan._id,
      };
    } catch (err) {
      this.logger.error('[risk-plan-review] create failed', {
        beneficiaryId: String(ben._id),
        carePlanId: String(plan._id),
        err: err && err.message,
      });
      return { created: false, reason: 'CREATE_FAILED', error: err && err.message };
    }
  }
}

module.exports = {
  RiskPlanReviewService,
  // Exported for tests + downstream consumers.
  buildSummary,
  defaultNextReviewDate,
  startOfUtcDay,
  endOfUtcDay,
};
