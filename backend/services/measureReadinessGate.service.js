'use strict';

/**
 * measureReadinessGate.service.js — Wave 223
 * ════════════════════════════════════════════════════════════════════
 * Measure Readiness Gate — blocking decision for downstream actions
 *
 * Two clinical actions cannot meaningfully happen without recent
 * measurement data:
 *
 *   1. Care-plan review (60d/90d/discharge-eve milestones) — the
 *      review re-evaluates progress against active TherapeuticGoals;
 *      stale measurements produce nonsense decisions.
 *
 *   2. Discharge — CBAHI requires an objective discharge measurement
 *      anchored against the baseline. Discharging without a fresh
 *      admin breaks the audit trail.
 *
 * This service answers `is this beneficiary measure-ready?` and returns
 * the per-measure blockers so the UI can show a checklist:
 *
 *   { readyToReview / readyToDischarge: bool,
 *     freshMeasures: [...],
 *     blockedBy: [{ measureId, code, reason, ...detail }],
 *     evaluatedAt }
 *
 * Readiness rules per required measure:
 *   ✓ has a completed|locked MeasureApplication within the freshness
 *     window (default: measure.reassessment.standardIntervalDays)
 *   ✓ has NO pending|acknowledged MeasureReassessmentTask
 *
 * Required measures resolution:
 *   - explicit `requiredMeasureIds` arg wins
 *   - else: pulled from the beneficiary's active TherapeuticGoals'
 *     `objectives[].measureId` (deduped)
 *
 * Layers it does NOT mutate:
 *   - CarePlanReview docs — UI decides whether to soft-warn or hard-block
 *   - MeasureApplication / Task — read-only inspection
 *
 * Blocked reasons (local enum):
 *   NEVER_ADMINISTERED       — no completed admin ever for this measure
 *   ADMIN_STALE              — last admin > freshness window
 *   TASK_OPEN_BREACHED       — pending task at phase=BREACHED
 *   TASK_OPEN_ESCALATED      — pending task at phase=ESCALATED
 *   TASK_OPEN_OVERDUE        — pending task at phase=OVERDUE
 *   TASK_OPEN                — pending task at SCHEDULED|DUE_SOON|DUE_NOW
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const REASON_CODES = Object.freeze({
  NEVER_ADMINISTERED: 'NEVER_ADMINISTERED',
  ADMIN_STALE: 'ADMIN_STALE',
  TASK_OPEN_BREACHED: 'TASK_OPEN_BREACHED',
  TASK_OPEN_ESCALATED: 'TASK_OPEN_ESCALATED',
  TASK_OPEN_OVERDUE: 'TASK_OPEN_OVERDUE',
  TASK_OPEN: 'TASK_OPEN',
  NO_REQUIRED_MEASURES: 'NO_REQUIRED_MEASURES',
});

// Default freshness window when the measure has no explicit cadence.
// 90 days matches the most common standardIntervalDays in the library;
// generous enough to avoid false blocks on measures without cadence
// metadata.
const DEFAULT_FRESHNESS_DAYS = 90;

// ─── Lazy model loaders ────────────────────────────────────────────────
const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
  MeasureReassessmentTask: () => {
    try {
      return mongoose.model('MeasureReassessmentTask');
    } catch {
      try {
        require('../domains/goals/models/MeasureReassessmentTask');
        return mongoose.model('MeasureReassessmentTask');
      } catch {
        return null;
      }
    }
  },
  TherapeuticGoal: () => {
    try {
      return mongoose.model('TherapeuticGoal');
    } catch {
      try {
        require('../domains/goals/models/TherapeuticGoal');
        return mongoose.model('TherapeuticGoal');
      } catch {
        return null;
      }
    }
  },
};

class MeasureReadinessGateSvc {
  /**
   * Evaluate readiness for a care-plan review milestone.
   *
   * @param {Object} args
   * @param {string|ObjectId} args.beneficiaryId
   * @param {Array<string|ObjectId>} [args.requiredMeasureIds]  — explicit override
   * @param {Date}   [args.reviewDate]                          — defaults to now
   * @param {number} [args.freshnessWindowDays]                 — overrides per-measure cadence
   * @returns {Promise<Object>} { readyToReview, freshMeasures, blockedBy, evaluatedAt, requiredMeasureIds }
   */
  async gateCarePlanReview(args = {}) {
    const result = await this._evaluate(args);
    return { ...result, readyToReview: result.blockedBy.length === 0 };
  }

  /**
   * Evaluate readiness for discharge.
   * Identical inspection — just a different output flag — but kept as
   * its own method so future discharge-specific rules (e.g. require
   * discharge-purpose admin, not just any) can land here.
   */
  async gateDischarge(args = {}) {
    const result = await this._evaluate(args);
    return { ...result, readyToDischarge: result.blockedBy.length === 0 };
  }

  /**
   * Convenience: list measures required by active goals, deduped.
   * Useful for the UI to show "what we expect to be fresh" even when
   * the gate isn't called.
   */
  async listRequiredMeasures({ beneficiaryId }) {
    if (!beneficiaryId) {
      throw new Error('[measureReadinessGate] beneficiaryId required');
    }
    const ids = await this._requiredMeasureIdsFromGoals(beneficiaryId);
    if (!ids.length) return [];
    const Measure = M.Measure();
    if (!Measure) return [];
    return Measure.find(
      { _id: { $in: ids } },
      { code: 1, name: 1, name_ar: 1, reassessment: 1, status: 1 }
    ).lean();
  }

  // ── Internals ──────────────────────────────────────────────────────

  async _evaluate({ beneficiaryId, requiredMeasureIds, reviewDate, freshnessWindowDays } = {}) {
    if (!beneficiaryId) {
      throw new Error('[measureReadinessGate] beneficiaryId required');
    }
    const now = reviewDate || new Date();

    // 1. Required measure IDs
    let reqIds;
    if (Array.isArray(requiredMeasureIds) && requiredMeasureIds.length) {
      reqIds = requiredMeasureIds.map(id => new mongoose.Types.ObjectId(String(id)));
    } else {
      reqIds = await this._requiredMeasureIdsFromGoals(beneficiaryId);
    }

    if (reqIds.length === 0) {
      // Nothing to check. We treat "no goals reference measures" as
      // ready — but flag it so the UI can decide whether to soft-warn.
      return {
        beneficiaryId: String(beneficiaryId),
        requiredMeasureIds: [],
        freshMeasures: [],
        blockedBy: [],
        notes: [REASON_CODES.NO_REQUIRED_MEASURES],
        evaluatedAt: now.toISOString(),
      };
    }

    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const Task = M.MeasureReassessmentTask();
    if (!Measure || !MeasureApplication || !Task) {
      throw new Error('[measureReadinessGate] required models unavailable');
    }

    // 2. Pull the measure docs we need (cadence + code + name).
    const measures = await Measure.find(
      { _id: { $in: reqIds } },
      { code: 1, name: 1, name_ar: 1, reassessment: 1, status: 1 }
    ).lean();
    const byId = new Map(measures.map(m => [String(m._id), m]));

    // 3. Latest completed|locked admin per measure for this beneficiary.
    //    One aggregation hits all required measures at once.
    const latestPerMeasure = await MeasureApplication.aggregate([
      {
        $match: {
          beneficiaryId: new mongoose.Types.ObjectId(String(beneficiaryId)),
          measureId: { $in: reqIds },
          status: { $in: ['completed', 'locked'] },
        },
      },
      { $sort: { applicationDate: -1 } },
      {
        $group: {
          _id: '$measureId',
          lastDate: { $first: '$applicationDate' },
          lastApplicationId: { $first: '$_id' },
        },
      },
    ]);
    const lastByMeasure = new Map(
      latestPerMeasure.map(r => [
        String(r._id),
        { lastDate: r.lastDate, lastApplicationId: r.lastApplicationId },
      ])
    );

    // 4. Open tasks (pending|acknowledged) for any of the required measures.
    const openTasks = await Task.find({
      beneficiaryId,
      measureId: { $in: reqIds },
      status: { $in: ['pending', 'acknowledged'] },
    }).lean();
    const taskByMeasure = new Map(openTasks.map(t => [String(t.measureId), t]));

    // 5. Per-measure verdict.
    const freshMeasures = [];
    const blockedBy = [];
    for (const idObj of reqIds) {
      const idStr = String(idObj);
      const measure = byId.get(idStr) || { _id: idObj, code: '?', name: '?' };
      const cadenceDays =
        freshnessWindowDays != null
          ? freshnessWindowDays
          : measure.reassessment?.standardIntervalDays || DEFAULT_FRESHNESS_DAYS;
      const last = lastByMeasure.get(idStr);
      const task = taskByMeasure.get(idStr);

      // Open task wins over freshness — even a "fresh" measure with a
      // pending task is asking to be re-administered before we trust it.
      if (task) {
        const phase = task.phase || 'SCHEDULED';
        const reasonCode =
          phase === 'BREACHED'
            ? REASON_CODES.TASK_OPEN_BREACHED
            : phase === 'ESCALATED'
              ? REASON_CODES.TASK_OPEN_ESCALATED
              : phase === 'OVERDUE'
                ? REASON_CODES.TASK_OPEN_OVERDUE
                : REASON_CODES.TASK_OPEN;
        blockedBy.push({
          measureId: idStr,
          code: measure.code,
          name_ar: measure.name_ar,
          reason: reasonCode,
          taskId: String(task._id),
          taskPhase: phase,
          taskDueAt: task.dueAt,
        });
        continue;
      }

      // No prior admin → blocked.
      if (!last) {
        blockedBy.push({
          measureId: idStr,
          code: measure.code,
          name_ar: measure.name_ar,
          reason: REASON_CODES.NEVER_ADMINISTERED,
          cadenceDays,
        });
        continue;
      }

      // Freshness check.
      const ageDays = (now.getTime() - new Date(last.lastDate).getTime()) / 86400000;
      if (ageDays > cadenceDays) {
        blockedBy.push({
          measureId: idStr,
          code: measure.code,
          name_ar: measure.name_ar,
          reason: REASON_CODES.ADMIN_STALE,
          lastDate: last.lastDate,
          ageDays: Math.floor(ageDays),
          cadenceDays,
        });
        continue;
      }

      // Fresh.
      freshMeasures.push({
        measureId: idStr,
        code: measure.code,
        name_ar: measure.name_ar,
        lastDate: last.lastDate,
        daysSince: Math.floor(ageDays),
        cadenceDays,
      });
    }

    return {
      beneficiaryId: String(beneficiaryId),
      requiredMeasureIds: reqIds.map(String),
      freshMeasures,
      blockedBy,
      evaluatedAt: now.toISOString(),
    };
  }

  /**
   * Pull deduped measureIds from the beneficiary's active goals'
   * objectives.
   */
  async _requiredMeasureIdsFromGoals(beneficiaryId) {
    const TherapeuticGoal = M.TherapeuticGoal();
    if (!TherapeuticGoal) return [];
    try {
      const goals = await TherapeuticGoal.find(
        {
          beneficiaryId,
          status: 'active',
          isDeleted: { $ne: true },
        },
        { objectives: 1 }
      ).lean();
      const ids = new Set();
      for (const g of goals) {
        for (const o of g.objectives || []) {
          if (o.measureId) ids.add(String(o.measureId));
        }
      }
      return [...ids].map(id => new mongoose.Types.ObjectId(id));
    } catch (err) {
      logger.warn('[measureReadinessGate] required-measures lookup failed: %s', err.message);
      return [];
    }
  }
}

const singleton = new MeasureReadinessGateSvc();
module.exports = singleton;
module.exports.REASON_CODES = REASON_CODES;
module.exports.DEFAULT_FRESHNESS_DAYS = DEFAULT_FRESHNESS_DAYS;
