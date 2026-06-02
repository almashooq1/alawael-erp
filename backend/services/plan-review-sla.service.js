'use strict';

/**
 * plan-review-sla.service.js — Wave 292
 *
 * SLA tracking for CRITICAL PlanReviews opened by the W290 risk
 * auto-trigger. A clinician must acknowledge each CRITICAL review
 * within the SLA window. This service sweeps unacknowledged reviews
 * and raises tiered AiAlerts:
 *
 *   - 24h overdue  → severity=warning, code=PLAN_REVIEW_ACK_OVERDUE_24H
 *   - 48h overdue  → severity=urgent,  code=PLAN_REVIEW_ACK_OVERDUE_48H
 *
 * Idempotency is enforced via PlanReview.slaEscalationLevel (0/1/2)
 * incremented atomically with each alert so re-runs within the same
 * hour cannot double-fire.
 *
 * Branch scope: caller passes an explicit branchId; the service
 * resolves the beneficiaries that live in that branch and only
 * considers PlanReviews whose beneficiary is in scope.
 */

/**
 * @typedef {Object} SlaServiceDeps
 * @property {*} PlanReviewModel  Mongoose model exposing find/updateOne.
 * @property {*} AiAlertModel     Mongoose model exposing create.
 * @property {*} [BeneficiaryModel] Optional — needed if branchId scope used.
 * @property {Object} [logger]    pino-like logger; falls back to console.
 */

class PlanReviewSlaService {
  /** @param {SlaServiceDeps} deps */
  constructor(deps = {}) {
    if (!deps.PlanReviewModel) throw new Error('PlanReviewSlaService: PlanReviewModel required');
    if (!deps.AiAlertModel) throw new Error('PlanReviewSlaService: AiAlertModel required');
    this.PlanReview = deps.PlanReviewModel;
    this.AiAlert = deps.AiAlertModel;
    this.Beneficiary = deps.BeneficiaryModel || null;
    this.auditService = deps.auditService || null; // W295
    this.logger = deps.logger || console;
  }

  /**
   * Acknowledge a single CRITICAL review.
   * @param {Object} args
   * @param {string} args.planReviewId
   * @param {string} args.userId  Actor user id (recorded on the review).
   * @returns {Promise<{ok:boolean, reason?:string, review?:Object}>}
   */
  async acknowledge({ planReviewId, userId }) {
    if (!planReviewId) return { ok: false, reason: 'PLAN_REVIEW_REQUIRED' };
    if (!userId) return { ok: false, reason: 'USER_REQUIRED' };

    const review = await this.PlanReview.findById(planReviewId).lean();
    if (!review) return { ok: false, reason: 'PLAN_REVIEW_NOT_FOUND' };
    if (review.reviewType !== 'CRITICAL') return { ok: false, reason: 'NOT_CRITICAL_REVIEW' };
    if (review.acknowledgedAt) return { ok: false, reason: 'ALREADY_ACKNOWLEDGED' };

    const now = new Date();
    await this.PlanReview.updateOne(
      { _id: planReviewId, acknowledgedAt: null },
      { $set: { acknowledgedAt: now, acknowledgedBy: userId } }
    );
    // W295: append to tamper-evident audit chain (best-effort).
    if (this.auditService) {
      try {
        await this.auditService.recordAck({
          planReviewId,
          beneficiaryId: review.beneficiary,
          actorUserId: userId,
          now,
        });
      } catch (err) {
        this.logger.warn &&
          this.logger.warn('[plan-review-sla] audit record failed', {
            planReviewId: String(planReviewId),
            err: err && err.message,
          });
      }
    }
    return {
      ok: true,
      review: { ...review, acknowledgedAt: now, acknowledgedBy: userId },
    };
  }

  /**
   * Sweep unacknowledged CRITICAL reviews and raise overdue alerts.
   * @param {Object} args
   * @param {string} [args.branchId]    If provided, scopes by branch.
   * @param {Date}   [args.now=new Date()]
   * @param {number} [args.warningHours=24]
   * @param {number} [args.urgentHours=48]
   * @returns {Promise<{checked:number, alertsRaised:number, byLevel:{warn:number,urgent:number}, errors:Array}>}
   */
  async sweep({ branchId, now = new Date(), warningHours = 24, urgentHours = 48 } = {}) {
    const warnCutoff = new Date(now.getTime() - warningHours * 3600_000);
    const _urgentCutoff = new Date(now.getTime() - urgentHours * 3600_000);

    // Fetch all unack'd CRITICAL reviews older than the warning cutoff
    // (a single query for both tiers — we then split by age in JS).
    const candidates = await this.PlanReview.find({
      reviewType: 'CRITICAL',
      acknowledgedAt: null,
      createdAt: { $lte: warnCutoff },
      slaEscalationLevel: { $lt: 2 },
    })
      .select('_id beneficiary carePlan createdAt slaEscalationLevel')
      .lean();

    let inScope = candidates;
    if (branchId && this.Beneficiary && candidates.length) {
      const benIds = [...new Set(candidates.map(c => String(c.beneficiary)))];
      const bens = await this.Beneficiary.find({ _id: { $in: benIds }, branchId })
        .select('_id')
        .lean();
      const benSet = new Set(bens.map(b => String(b._id)));
      inScope = candidates.filter(c => benSet.has(String(c.beneficiary)));
    }

    const errors = [];
    let warn = 0;
    let urgent = 0;

    for (const review of inScope) {
      try {
        const ageMs = now.getTime() - new Date(review.createdAt).getTime();
        const targetLevel = ageMs >= urgentHours * 3600_000 ? 2 : 1;
        if (targetLevel <= review.slaEscalationLevel) continue;

        // Atomic guard: only escalate if level hasn't been bumped by
        // a concurrent sweep. updateOne with a level precondition.
        const upd = await this.PlanReview.updateOne(
          { _id: review._id, slaEscalationLevel: { $lt: targetLevel }, acknowledgedAt: null },
          { $set: { slaEscalationLevel: targetLevel } }
        );
        const matched =
          (upd && (upd.matchedCount || upd.nModified || upd.modifiedCount || upd.n)) || 0;
        if (!matched) continue;

        const severity = targetLevel === 2 ? 'urgent' : 'warning';
        const code =
          targetLevel === 2 ? 'PLAN_REVIEW_ACK_OVERDUE_48H' : 'PLAN_REVIEW_ACK_OVERDUE_24H';
        await this.AiAlert.create({
          alert_type: 'plan_review_sla_breach',
          severity,
          target_type: 'plan_review',
          target_id: review._id,
          message:
            targetLevel === 2
              ? 'مراجعة خطة طارئة لم يتم إقرارها خلال 48 ساعة — تصعيد عاجل'
              : 'مراجعة خطة طارئة لم يتم إقرارها خلال 24 ساعة',
          data: {
            code,
            planReviewId: review._id,
            beneficiaryId: review.beneficiary,
            carePlanId: review.carePlan,
            openedAt: review.createdAt,
            slaHours: targetLevel === 2 ? urgentHours : warningHours,
          },
          created_at: now,
        });

        if (targetLevel === 2) urgent += 1;
        else warn += 1;

        // W295: chain-append SLA_ESCALATED event (best-effort).
        if (this.auditService) {
          try {
            await this.auditService.recordSlaEscalation({
              planReviewId: review._id,
              beneficiaryId: review.beneficiary,
              level: targetLevel,
              payload: { code, openedAt: review.createdAt },
              now,
            });
          } catch (auditErr) {
            this.logger.warn &&
              this.logger.warn('[plan-review-sla] audit record failed', {
                planReviewId: String(review._id),
                err: auditErr && auditErr.message,
              });
          }
        }
      } catch (err) {
        errors.push({ planReviewId: review._id, error: err && err.message });
      }
    }

    return {
      checked: inScope.length,
      alertsRaised: warn + urgent,
      byLevel: { warn, urgent },
      errors,
    };
  }
}

module.exports = { PlanReviewSlaService };
