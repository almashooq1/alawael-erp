'use strict';

/**
 * care-plan-plateau-detector.scheduler.js — Wave 50.
 *
 * Periodic scheduler that runs the Wave-44 progress reviewer against
 * every active approved plan and emits actionable Insights when:
 *
 *   • holisticVerdict ∈ { revise_plan, new_plan, discharge_readiness }
 *   • any goal triggers regression / plateau ≥ 6 weeks
 *   • any safety event linked to a goal
 *
 * Pure scheduler: caller drives `runOnce()`. The scheduler does NOT
 * mutate plans — it emits insights/notifications. The author + supervisor
 * still decide whether to open a revision flow.
 *
 * Data flow:
 *
 *   plan → collectSignals(planVersionId)         (DI hook)
 *        → progressReviewer.reviewPlan(...)
 *        → if action_required: notifier + insight emitter
 *
 * Returns:
 *   {
 *     scanned, reviewed,
 *     verdicts: { continue_plan, revise_plan, new_plan, discharge_readiness },
 *     triggersEmitted: int,
 *     insightsEmitted: int,
 *     errors: []
 *   }
 */

const progressReviewer = require('./care-plan-progress-reviewer.service');

const DEFAULTS = Object.freeze({
  limitPerRun: 100,
  eligibleStatuses: ['approved', 'saved_to_record', 'family_notification_sent'],
  cadenceWeeksFallback: 4,
});

function _dedupeKey(planVersionId, verdict) {
  return `care-plan.plateau-detector.${planVersionId}.${verdict}`;
}

/**
 * @param {object} deps
 *   - planVersionModel       Mongoose model
 *   - collectSignals         async (planVersionId) → { goalSignals, aggregateAttendance }
 *   - notifier               { send: async(...) }
 *   - insightEmitter         optional { emit: async({ insight }) }
 *   - resolveAudienceForRole optional
 *   - logger
 *   - now                    () → Date
 *   - metrics                optional { incPlateauOutcome(verdict), observeGoalsAtRisk(count) }
 */
function createPlateauDetectorScheduler({
  planVersionModel = null,
  collectSignals = null,
  notifier = null,
  insightEmitter = null,
  resolveAudienceForRole = null,
  logger = console,
  now = () => new Date(),
  metrics = null,
} = {}) {
  if (!planVersionModel) {
    throw new Error('plateau-detector.scheduler: planVersionModel is required');
  }
  if (typeof collectSignals !== 'function') {
    throw new Error('plateau-detector.scheduler: collectSignals(planVersionId) is required');
  }

  async function _resolveAudience(role, branchId) {
    if (typeof resolveAudienceForRole !== 'function') return [];
    try {
      return (await resolveAudienceForRole(role, branchId)) || [];
    } catch (_) {
      return [];
    }
  }

  async function runOnce({ limit = DEFAULTS.limitPerRun } = {}) {
    const t = now();
    const summary = {
      scanned: 0,
      reviewed: 0,
      verdicts: {
        continue_plan: 0,
        revise_plan: 0,
        new_plan: 0,
        discharge_readiness: 0,
      },
      triggersEmitted: 0,
      insightsEmitted: 0,
      errors: [],
      ranAt: t.toISOString(),
    };

    // Query candidates: approved+ plans whose last progress review was
    // longer ago than their cadenceWeeks (or never reviewed).
    let candidates = [];
    try {
      const cursor = planVersionModel.find({
        status: { $in: DEFAULTS.eligibleStatuses },
      });
      if (cursor && typeof cursor.limit === 'function') {
        candidates = await cursor.limit(limit).lean();
      } else if (cursor && typeof cursor.exec === 'function') {
        candidates = await cursor.exec();
      } else if (Array.isArray(cursor)) {
        candidates = cursor;
      } else if (cursor && typeof cursor.then === 'function') {
        candidates = await cursor;
      }
    } catch (err) {
      summary.errors.push({ phase: 'query', message: err.message });
      return summary;
    }

    candidates = Array.isArray(candidates) ? candidates : [];
    summary.scanned = candidates.length;

    for (const pv of candidates) {
      // Cadence gate: don't re-review more often than cadenceWeeks.
      const cadenceWeeks = Number(pv.reviewSchedule?.cadenceWeeks) || DEFAULTS.cadenceWeeksFallback;
      const lastReview =
        pv.metadata && pv.metadata.lastPlateauReviewAt
          ? new Date(pv.metadata.lastPlateauReviewAt)
          : pv.approvedAt
            ? new Date(pv.approvedAt)
            : null;
      if (lastReview && t.getTime() - lastReview.getTime() < (cadenceWeeks * 7 * 86400000) / 2) {
        // Run at half-cadence (twice per review cycle is safe + not noisy)
        continue;
      }

      let signals;
      try {
        signals = await collectSignals(pv._id || pv.planVersionId);
      } catch (err) {
        summary.errors.push({
          phase: 'collect_signals',
          planVersionId: String(pv._id),
          message: err.message,
        });
        continue;
      }
      if (!signals || !Array.isArray(signals.goalSignals)) continue;

      const review = progressReviewer.reviewPlan({
        goalSignals: signals.goalSignals,
        planReviewDueAt: pv.reviewSchedule?.nextReviewAt,
        aggregateAttendance: signals.aggregateAttendance,
        now: t,
      });

      summary.reviewed += 1;
      summary.verdicts[review.holisticVerdict] =
        (summary.verdicts[review.holisticVerdict] || 0) + 1;

      if (metrics && typeof metrics.incPlateauOutcome === 'function') {
        metrics.incPlateauOutcome(review.holisticVerdict);
      }

      const atRiskCount = review.counts.revise + review.counts.escalate;
      if (metrics && typeof metrics.observeGoalsAtRisk === 'function') {
        metrics.observeGoalsAtRisk(atRiskCount);
      }

      // Emit triggers / insights only when action required
      const actionRequired =
        review.holisticVerdict !== 'continue_plan' || review.triggers.length > 0;
      if (!actionRequired) continue;

      // 1. Notify supervisor inbox
      const audience = [];
      if (pv.authorId)
        audience.push({ userId: String(pv.authorId), channel: 'inbox', role: 'therapist' });
      if (pv.reviewerId)
        audience.push({
          userId: String(pv.reviewerId),
          channel: 'inbox',
          role: 'clinical_supervisor',
        });
      if (review.counts.escalate > 0) {
        const branch = await _resolveAudience('branch_manager', String(pv.branchId || ''));
        audience.push(
          ...branch.map(b => ({ ...b, role: 'branch_manager', channel: 'inbox+push' }))
        );
      }

      if (notifier && typeof notifier.send === 'function') {
        try {
          await notifier.send({
            event: 'care-plan.plateau-detector.action_required',
            audience,
            payload: {
              planVersionId: String(pv._id),
              planId: pv.planId,
              holisticVerdict: review.holisticVerdict,
              triggerCount: review.triggers.length,
              atRiskGoalCount: atRiskCount,
              dischargeReady: review.dischargeReadiness.ready,
            },
            dedupeKey: _dedupeKey(String(pv._id), review.holisticVerdict),
          });
        } catch (err) {
          summary.errors.push({
            phase: 'notify',
            planVersionId: String(pv._id),
            message: err.message,
          });
        }
      }

      summary.triggersEmitted += review.triggers.length;

      // 2. Emit Insight (Wave 18 platform) if emitter wired
      if (insightEmitter && typeof insightEmitter.emit === 'function') {
        try {
          await insightEmitter.emit({
            insight: {
              kind: 'care-plan.plateau-detected',
              severity: review.counts.escalate > 0 ? 'high' : 'medium',
              beneficiaryId: String(pv.beneficiaryId || ''),
              branchId: String(pv.branchId || ''),
              planVersionId: String(pv._id),
              summary: `Plan v${pv.versionNumber}: ${review.holisticVerdict}`,
              evidenceRefs: signals.goalSignals.map(g => ({ kind: 'measure', refId: g.goalId })),
              actionRecommended: review.holisticVerdict,
              dischargeReady: review.dischargeReadiness.ready,
              triggerKinds: review.triggers.map(tr => tr.kind),
            },
          });
          summary.insightsEmitted += 1;
        } catch (err) {
          summary.errors.push({
            phase: 'insight_emit',
            planVersionId: String(pv._id),
            message: err.message,
          });
        }
      }

      // 3. Stamp lastPlateauReviewAt
      try {
        if (typeof pv.save === 'function') {
          pv.metadata = { ...(pv.metadata || {}), lastPlateauReviewAt: t };
          await pv.save();
        } else if (typeof planVersionModel.updateOne === 'function') {
          await planVersionModel.updateOne(
            { _id: pv._id },
            { $set: { 'metadata.lastPlateauReviewAt': t } }
          );
        }
      } catch (err) {
        logger.warn && logger.warn(`[plateau] stamp failed: ${err.message}`);
      }
    }

    return summary;
  }

  return Object.freeze({ runOnce });
}

module.exports = {
  createPlateauDetectorScheduler,
  DEFAULTS,
};
