'use strict';

/**
 * goalMeasureLinkage.service.js — Wave 235
 * ════════════════════════════════════════════════════════════════════
 * Goal-Measure Linkage Service
 *
 * Manages the embedded `objectives[].measureLinks[]` array on
 * TherapeuticGoal — the rich linkage between an objective and the
 * measures that quantify its progress. Pairs with the pure rules layer
 * in backend/measures/linkage/rules.js for decision logic.
 *
 * Service surface:
 *
 *   createLink({ goalId, objectiveIndex, ...linkFields, actor })
 *     → push new link with `linkedBy=actor` + idempotent stateHistory
 *
 *   reviewLink({ goalId, objectiveIndex, linkIndex, verdict, notes, actor })
 *     → append reviewHistory entry, refresh lastReviewedAt
 *     → SoD: first review requires reviewer ≠ linkedBy
 *
 *   unlinkLink({ goalId, objectiveIndex, linkIndex, reason, actor })
 *     → status='unlinked' + audit
 *     → SoD: unlinker ≠ linker
 *
 *   computeWeightedProgress({ goalId, interpretations? })
 *     → per-objective weighted score (uses rules.weightedProgress).
 *     → If `interpretations` omitted, calls W232 interpreter for each
 *       contributing measure.
 *
 *   suggestModifications({ goalId, objectiveIndex })
 *     → bundles modify/addSecondary/unlink/closeAchieved/closeFailed
 *       recommendations from rules layer.
 *
 *   dueForReview({ branchId?, withinDays? })
 *     → flat list of (goal, objective, link) where nextLinkReviewAt
 *       falls within the window.
 *
 *   findOrphanedMeasures({ branchId? })
 *     → measures with 0 active links — archival candidates.
 *
 *   findOverloadedMeasures({ branchId?, threshold=50 })
 *     → measures linked to > threshold goals — concentration risk.
 *
 * SoD enforcement (caller-side, same pattern as W220/W227):
 *   • first review: reviewer ≠ linkedBy
 *   • unlink: unlinker ≠ linkedBy
 *   • link rationale required at creation (≥10 chars, schema-enforced)
 *
 * Reviews never delete or edit history — append-only. Schema
 * pre-validate enforces invariants on every save (PRIMARY count,
 * weight sum, etc.) so the service can't accidentally create an
 * invalid state.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const rules = require('../measures/linkage/rules');

const REASON_CODES = Object.freeze({
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  OBJECTIVE_NOT_FOUND: 'OBJECTIVE_NOT_FOUND',
  LINK_NOT_FOUND: 'LINK_NOT_FOUND',
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  RATIONALE_REQUIRED: 'RATIONALE_REQUIRED',
  SOD_SELF_REVIEW_FORBIDDEN: 'SOD_SELF_REVIEW_FORBIDDEN',
  SOD_SELF_UNLINK_FORBIDDEN: 'SOD_SELF_UNLINK_FORBIDDEN',
  LINK_ALREADY_UNLINKED: 'LINK_ALREADY_UNLINKED',
  MEASURE_NOT_FOUND: 'MEASURE_NOT_FOUND',
  UNLINK_REASON_REQUIRED: 'UNLINK_REASON_REQUIRED',
});

const M = {
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
};

function _loadInterpreter() {
  try {
    return require('./measureProgressInterpreter.service');
  } catch {
    return null;
  }
}

function _err(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

class GoalMeasureLinkageSvc {
  /**
   * Create a new measureLink on an objective.
   */
  async createLink({
    goalId,
    objectiveIndex,
    measureId,
    linkType,
    expectedTarget,
    weight,
    reviewIntervalDays,
    mcidExpectation,
    interventionRefs,
    evidenceThreshold,
    linkRationale,
    actor,
  } = {}) {
    if (!goalId) throw _err('[goalMeasureLinkage] goalId required', 'GOAL_NOT_FOUND');
    if (!actor?.userId) {
      throw _err('[goalMeasureLinkage] actor.userId required', REASON_CODES.ACTOR_REQUIRED);
    }
    if (!linkRationale || String(linkRationale).trim().length < 10) {
      throw _err(
        '[goalMeasureLinkage] linkRationale ≥ 10 chars required',
        REASON_CODES.RATIONALE_REQUIRED
      );
    }
    if (!Array.isArray(interventionRefs) || interventionRefs.length < 1) {
      // Schema enforces this too but fail fast with a clearer message.
      if (linkType !== 'CONTRAINDICATED') {
        throw _err('[goalMeasureLinkage] interventionRefs (≥1) required', 'VALIDATION_FAILED');
      }
    }

    const Goal = M.TherapeuticGoal();
    const Measure = M.Measure();
    if (!Goal || !Measure) throw _err('[goalMeasureLinkage] models unavailable');
    const goal = await Goal.findById(goalId);
    if (!goal) throw _err(`goal not found: ${goalId}`, REASON_CODES.GOAL_NOT_FOUND);
    const obj = goal.objectives?.[objectiveIndex];
    if (!obj) {
      throw _err(`objective index ${objectiveIndex} not found`, REASON_CODES.OBJECTIVE_NOT_FOUND);
    }

    // Resolve measureCode + default review interval.
    const measure = await Measure.findById(measureId, {
      code: 1,
      reassessment: 1,
    }).lean();
    if (!measure) throw _err(`measure not found: ${measureId}`, REASON_CODES.MEASURE_NOT_FOUND);

    const reviewInterval = reviewIntervalDays ?? measure.reassessment?.standardIntervalDays ?? 90;
    const nextReview = new Date(Date.now() + reviewInterval * 86400000);

    const newLink = {
      measureId: new mongoose.Types.ObjectId(String(measureId)),
      measureCode: measure.code,
      linkType,
      expectedTarget,
      weight: typeof weight === 'number' ? weight : 1,
      reviewIntervalDays: reviewInterval,
      nextLinkReviewAt: nextReview,
      mcidExpectation,
      interventionRefs: interventionRefs || [],
      evidenceThreshold: evidenceThreshold || {},
      linkedAt: new Date(),
      linkedBy: actor.userId,
      linkRationale: String(linkRationale).trim(),
      status: 'active',
    };

    obj.measureLinks = obj.measureLinks || [];
    obj.measureLinks.push(newLink);
    await goal.save();

    const createdIndex = obj.measureLinks.length - 1;
    return {
      goalId: String(goal._id),
      objectiveIndex,
      linkIndex: createdIndex,
      link: obj.measureLinks[createdIndex].toObject
        ? obj.measureLinks[createdIndex].toObject()
        : obj.measureLinks[createdIndex],
    };
  }

  /**
   * Append a review-history entry. SoD: first review reviewer ≠ linkedBy.
   *
   * W247 — optional `expectedTarget` payload. When provided AND
   * verdict='modify_target', updates the link's expectedTarget alongside
   * the review entry. For other verdicts the field is ignored
   * (the schema still has the prior value). Refusing to update on
   * other verdicts keeps the review-history readable: a status flip
   * to under_review without a target change is still a valid review
   * outcome (clinician can defer the actual edit).
   */
  async reviewLink({
    goalId,
    objectiveIndex,
    linkIndex,
    verdict,
    notes,
    actor,
    interpretationCategorySnapshot,
    expectedTarget,
  } = {}) {
    if (!actor?.userId) {
      throw _err('[goalMeasureLinkage] actor.userId required', REASON_CODES.ACTOR_REQUIRED);
    }
    const Goal = M.TherapeuticGoal();
    if (!Goal) throw _err('[goalMeasureLinkage] model unavailable');
    const goal = await Goal.findById(goalId);
    if (!goal) throw _err('goal not found', REASON_CODES.GOAL_NOT_FOUND);
    const obj = goal.objectives?.[objectiveIndex];
    if (!obj) throw _err('objective not found', REASON_CODES.OBJECTIVE_NOT_FOUND);
    const link = obj.measureLinks?.[linkIndex];
    if (!link) throw _err('link not found', REASON_CODES.LINK_NOT_FOUND);

    // SoD — first review must be by a different actor than the linker.
    if (
      (!link.reviewHistory || link.reviewHistory.length === 0) &&
      link.linkedBy &&
      String(link.linkedBy) === String(actor.userId)
    ) {
      throw _err(
        '[goalMeasureLinkage] first review must be by a different actor than linkedBy (SoD)',
        REASON_CODES.SOD_SELF_REVIEW_FORBIDDEN
      );
    }

    const now = new Date();
    link.reviewHistory = link.reviewHistory || [];
    link.reviewHistory.push({
      reviewedAt: now,
      reviewedBy: actor.userId,
      verdict,
      notes,
      interpretationCategorySnapshot,
    });
    link.lastReviewedAt = now;
    link.lastReviewedBy = actor.userId;

    // verdict-driven status transitions
    if (verdict === 'continue') {
      link.status = 'active';
      const interval = link.reviewIntervalDays || 90;
      link.nextLinkReviewAt = new Date(now.getTime() + interval * 86400000);
    } else if (verdict === 'flag') {
      link.status = 'flagged';
    } else if (verdict === 'unlink') {
      // The actual unlink is a separate call (carries reason); flag for now.
      link.status = 'under_review';
    } else if (verdict === 'modify_target' || verdict === 'add_secondary') {
      // Caller is expected to follow up with an explicit update — set under_review.
      link.status = 'under_review';
    }

    // W247 — apply expectedTarget edits when verdict is modify_target.
    if (verdict === 'modify_target' && expectedTarget && typeof expectedTarget === 'object') {
      link.expectedTarget = link.expectedTarget || {};
      if (expectedTarget.value != null) link.expectedTarget.value = expectedTarget.value;
      if (expectedTarget.direction) link.expectedTarget.direction = expectedTarget.direction;
      if (expectedTarget.changeFromBaseline != null) {
        link.expectedTarget.changeFromBaseline = expectedTarget.changeFromBaseline;
      }
      if (expectedTarget.achievedByDate) {
        link.expectedTarget.achievedByDate = new Date(expectedTarget.achievedByDate);
      }
    }

    await goal.save();
    return {
      goalId: String(goal._id),
      objectiveIndex,
      linkIndex,
      link: link.toObject ? link.toObject() : link,
    };
  }

  /**
   * Unlink. SoD: unlinker ≠ linkedBy.
   */
  async unlinkLink({ goalId, objectiveIndex, linkIndex, reason, actor } = {}) {
    if (!actor?.userId) {
      throw _err('[goalMeasureLinkage] actor.userId required', REASON_CODES.ACTOR_REQUIRED);
    }
    if (!reason || !String(reason).trim()) {
      throw _err(
        '[goalMeasureLinkage] unlink reason required',
        REASON_CODES.UNLINK_REASON_REQUIRED
      );
    }
    const Goal = M.TherapeuticGoal();
    const goal = await Goal.findById(goalId);
    if (!goal) throw _err('goal not found', REASON_CODES.GOAL_NOT_FOUND);
    const obj = goal.objectives?.[objectiveIndex];
    if (!obj) throw _err('objective not found', REASON_CODES.OBJECTIVE_NOT_FOUND);
    const link = obj.measureLinks?.[linkIndex];
    if (!link) throw _err('link not found', REASON_CODES.LINK_NOT_FOUND);
    if (link.status === 'unlinked') {
      throw _err('already unlinked', REASON_CODES.LINK_ALREADY_UNLINKED);
    }
    if (link.linkedBy && String(link.linkedBy) === String(actor.userId)) {
      throw _err(
        '[goalMeasureLinkage] unlinker must differ from linkedBy (SoD)',
        REASON_CODES.SOD_SELF_UNLINK_FORBIDDEN
      );
    }
    link.status = 'unlinked';
    link.unlinkedAt = new Date();
    link.unlinkedBy = actor.userId;
    link.unlinkReason = reason;
    // weight=0 so it doesn't break the sum invariant; remaining links must re-balance.
    // We DON'T auto-rebalance — pre-validate will catch and force the caller to re-balance
    // explicitly (audit trail of weight changes is more important than convenience).
    link.weight = 0;
    // BUT — pre-validate filters out unlinked from contributing set, so sum is computed
    // over remaining links. If the unlink leaves the objective with 0 contributing links,
    // that's allowed (objective becomes "no active measure" — review needed).
    await goal.save();
    return {
      goalId: String(goal._id),
      objectiveIndex,
      linkIndex,
      link: link.toObject ? link.toObject() : link,
    };
  }

  /**
   * W248 — return the goal's currentProgress history as a time series.
   * Reads `progressHistory[]` populated by W216 measureGoalUpdater
   * (which W236 + W248 enhanced to include weighted score + snapshot).
   *
   * Each entry: { date, value (raw admin score), rating (band),
   *               currentProgressSnapshot (0-100 percent at this time),
   *               notes }.
   *
   * Legacy entries lack `currentProgressSnapshot` (pre-W248); those
   * are still returned so consumers see full history but charts should
   * filter `.filter(p => p.currentProgressSnapshot != null)`.
   */
  async progressHistory({ goalId } = {}) {
    if (!goalId) throw _err('[goalMeasureLinkage] goalId required', REASON_CODES.GOAL_NOT_FOUND);
    const Goal = M.TherapeuticGoal();
    if (!Goal) throw _err('[goalMeasureLinkage] model unavailable');
    const goal = await Goal.findById(goalId, { progressHistory: 1, title: 1, currentProgress: 1 }).lean();
    if (!goal) throw _err('goal not found', REASON_CODES.GOAL_NOT_FOUND);
    const history = (goal.progressHistory || [])
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(p => ({
        date: p.date,
        value: p.value,
        rating: p.rating,
        currentProgressSnapshot:
          typeof p.currentProgressSnapshot === 'number' ? p.currentProgressSnapshot : null,
        notes: p.notes,
      }));
    return {
      goalId: String(goal._id),
      title: goal.title,
      currentProgress: goal.currentProgress ?? null,
      history,
    };
  }

  /**
   * Compute weighted progress for one or all objectives in a goal.
   * If `interpretations` not provided, fetches them per-link via the
   * W232 interpreter (lazy import).
   */
  async computeWeightedProgress({ goalId, interpretations } = {}) {
    const Goal = M.TherapeuticGoal();
    const goal = await Goal.findById(goalId).lean();
    if (!goal) throw _err('goal not found', REASON_CODES.GOAL_NOT_FOUND);

    const interpreter = _loadInterpreter();
    const out = [];

    for (let objIdx = 0; objIdx < (goal.objectives || []).length; objIdx++) {
      const obj = goal.objectives[objIdx];
      const allLinks = obj.measureLinks || [];
      // W243 — enrich contributing entries with their origIndex into the
      // un-filtered measureLinks[] so the UI can call reviewLink/unlinkLink
      // with the correct linkIndex slot. Plain object form so rules.js can
      // read _origIndex without Mongoose subdoc magic.
      const contributing = [];
      for (let i = 0; i < allLinks.length; i++) {
        const l = allLinks[i];
        if (l.linkType === 'CONTRAINDICATED' || l.status === 'unlinked') continue;
        const obj_ = typeof l.toObject === 'function' ? l.toObject() : { ...l };
        obj_._origIndex = i;
        contributing.push(obj_);
      }
      let interpretationsMap = interpretations;
      if (!interpretationsMap && interpreter) {
        interpretationsMap = new Map();
        for (const link of contributing) {
          try {
            const interp = await interpreter.interpret({
              beneficiaryId: goal.beneficiaryId,
              measureRef: link.measureId,
              options: { includeRawDeltas: true, includeSignals: true },
            });
            interpretationsMap.set(String(link.measureId), interp);
          } catch (err) {
            logger.debug?.(
              '[goalMeasureLinkage] interpret failed for %s: %s',
              link.measureCode,
              err.message
            );
          }
        }
      }
      const result = rules.weightedProgress(contributing, interpretationsMap || new Map());
      out.push({
        objectiveIndex: objIdx,
        title: obj.title,
        ...result,
      });
    }

    return { goalId: String(goal._id), objectives: out };
  }

  /**
   * Bundle of recommendations for one objective. Returns the four
   * decision verdicts so the UI can render whichever the clinician
   * needs to see.
   */
  async suggestModifications({ goalId, objectiveIndex } = {}) {
    const Goal = M.TherapeuticGoal();
    const Measure = M.Measure();
    const goal = await Goal.findById(goalId).lean();
    if (!goal) throw _err('goal not found', REASON_CODES.GOAL_NOT_FOUND);
    const obj = goal.objectives?.[objectiveIndex];
    if (!obj) throw _err('objective not found', REASON_CODES.OBJECTIVE_NOT_FOUND);
    const contributing = (obj.measureLinks || []).filter(
      l => l.linkType !== 'CONTRAINDICATED' && l.status !== 'unlinked'
    );
    if (contributing.length === 0) {
      return {
        goalId: String(goal._id),
        objectiveIndex,
        suggestions: {
          modify: null,
          addSecondary: null,
          unlink: [],
          closeAchieved: null,
          closeFailed: null,
        },
      };
    }
    const primary = contributing.find(l => l.linkType === 'PRIMARY');
    const interpreter = _loadInterpreter();
    const interpretationsMap = new Map();
    if (interpreter) {
      for (const link of contributing) {
        try {
          const interp = await interpreter.interpret({
            beneficiaryId: goal.beneficiaryId,
            measureRef: link.measureId,
            options: { includeRawDeltas: true, includeSignals: true },
          });
          interpretationsMap.set(String(link.measureId), interp);
        } catch (_) {
          // ignore — decision functions handle missing interpretations
        }
      }
    }
    const primaryInterp = primary && interpretationsMap.get(String(primary.measureId));

    const allFlagged = contributing.every(l => l.status === 'flagged');
    const ctx = {
      historyCount: primaryInterp?.references?.historyCount ?? 0,
      plannedDurationDays: this._plannedDurationDays(goal),
      plateauDays: this._plateauDays(primaryInterp),
      allLinksFlagged: allFlagged,
      baselineLocked: !!primaryInterp?.references?.baselineApplicationId,
    };

    const modify = primary ? rules.modifyDecision(primary, primaryInterp, ctx) : null;
    const addSecondary = primary ? rules.addSecondaryDecision(primary, primaryInterp) : null;

    // unlink recommendations per link
    const unlinkRecs = [];
    for (const link of contributing) {
      const measure = await Measure.findById(link.measureId, { status: 1, supersededBy: 1 }).lean();
      const rec = rules.unlinkDecision(link, measure, { status: goal.status });
      if (rec.recommend) unlinkRecs.push({ linkIndex: contributing.indexOf(link), ...rec });
    }

    const closeAchieved = rules.closeAchievedDecision(goal, contributing, interpretationsMap);
    const closeFailed = rules.closeFailedDecision(goal, contributing, interpretationsMap, {
      daysAtFailing: this._daysAtFailingScore(goal),
      modifyAttempts: this._countModifyAttempts(obj),
    });

    return {
      goalId: String(goal._id),
      objectiveIndex,
      suggestions: { modify, addSecondary, unlink: unlinkRecs, closeAchieved, closeFailed },
    };
  }

  /**
   * Cross-goal list — links whose nextLinkReviewAt falls within the
   * given window. Powers the "review due" queue + admin/ops dashboard.
   */
  async dueForReview({ branchId, withinDays = 7 } = {}) {
    const Goal = M.TherapeuticGoal();
    const cutoff = new Date(Date.now() + withinDays * 86400000);
    const match = {
      isDeleted: { $ne: true },
      'objectives.measureLinks.nextLinkReviewAt': { $lte: cutoff },
      'objectives.measureLinks.status': { $in: ['active', 'flagged', 'under_review'] },
    };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(String(branchId));
    const goals = await Goal.find(match, {
      title: 1,
      beneficiaryId: 1,
      branchId: 1,
      'objectives.title': 1,
      'objectives.measureLinks': 1,
    }).lean();
    const out = [];
    for (const g of goals) {
      (g.objectives || []).forEach((obj, objIdx) => {
        (obj.measureLinks || []).forEach((link, linkIdx) => {
          if (!link.nextLinkReviewAt || link.nextLinkReviewAt > cutoff) return;
          if (!['active', 'flagged', 'under_review'].includes(link.status)) return;
          out.push({
            goalId: String(g._id),
            goalTitle: g.title,
            beneficiaryId: String(g.beneficiaryId),
            branchId: g.branchId ? String(g.branchId) : null,
            objectiveIndex: objIdx,
            objectiveTitle: obj.title,
            linkIndex: linkIdx,
            measureCode: link.measureCode,
            linkType: link.linkType,
            status: link.status,
            nextLinkReviewAt: link.nextLinkReviewAt,
          });
        });
      });
    }
    return out.sort((a, b) => new Date(a.nextLinkReviewAt) - new Date(b.nextLinkReviewAt));
  }

  /**
   * Reverse-lookup: which goals reference this measure?
   */
  async goalsForMeasure({ measureId, includeUnlinked = false } = {}) {
    if (!measureId) throw _err('[goalMeasureLinkage] measureId required');
    const Goal = M.TherapeuticGoal();
    const match = {
      isDeleted: { $ne: true },
      'objectives.measureLinks.measureId': new mongoose.Types.ObjectId(String(measureId)),
    };
    const goals = await Goal.find(match, {
      title: 1,
      beneficiaryId: 1,
      branchId: 1,
      status: 1,
      objectives: 1,
    }).lean();
    const out = [];
    for (const g of goals) {
      (g.objectives || []).forEach((obj, objIdx) => {
        (obj.measureLinks || []).forEach((link, linkIdx) => {
          if (String(link.measureId) !== String(measureId)) return;
          if (!includeUnlinked && link.status === 'unlinked') return;
          out.push({
            goalId: String(g._id),
            goalTitle: g.title,
            goalStatus: g.status,
            beneficiaryId: String(g.beneficiaryId),
            branchId: g.branchId ? String(g.branchId) : null,
            objectiveIndex: objIdx,
            linkIndex: linkIdx,
            linkType: link.linkType,
            linkStatus: link.status,
            weight: link.weight,
          });
        });
      });
    }
    return out;
  }

  // ── Internals ──────────────────────────────────────────────────────

  _plannedDurationDays(goal) {
    if (!goal.startDate || !goal.targetDate) return 180;
    return Math.max(
      30,
      Math.round(
        (new Date(goal.targetDate).getTime() - new Date(goal.startDate).getTime()) / 86400000
      )
    );
  }

  _plateauDays(interpretation) {
    // Best-effort — W232 doesn't always carry plateau-span. Falls back
    // to days-since-baseline when interpretation is PLATEAU.
    if (!interpretation) return 0;
    if (interpretation.category !== 'PLATEAU') return 0;
    return interpretation.numbers?.daysSinceBaseline ?? 0;
  }

  _daysAtFailingScore(goal) {
    // Computed externally (separate audit log of weighted scores)
    // — for now, expose 0 unless a caller sets it. Future wave could
    // persist a goalProgressLedger.
    return goal._daysAtFailingScore ?? 0;
  }

  _countModifyAttempts(objective) {
    if (!Array.isArray(objective.measureLinks)) return 0;
    let n = 0;
    for (const link of objective.measureLinks) {
      for (const r of link.reviewHistory || []) {
        if (r.verdict === 'modify_target') n += 1;
      }
    }
    return n;
  }
}

const singleton = new GoalMeasureLinkageSvc();
module.exports = singleton;
module.exports.REASON_CODES = REASON_CODES;
module.exports._rules = rules;
