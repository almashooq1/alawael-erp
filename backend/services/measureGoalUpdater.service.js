'use strict';

/**
 * measureGoalUpdater.service.js — Wave 216
 *
 * Auto-updates `TherapeuticGoal.currentProgress` + appends a
 * `progressHistory` entry whenever a new MeasureApplication lands
 * for a (beneficiary, measure) pair that some active goal targets
 * via `objectives[].measureId`.
 *
 * Closes the loop introduced by W211b/W212/W215 (admin records exist
 * with scored values) — without this wire, the goal's currentProgress
 * stayed stale and therapists had to mirror the score manually.
 *
 * Direction handling:
 *   The formula uses goal.baseline.value vs goal.target.value:
 *     - If target > baseline → higher-is-better
 *     - If target < baseline → lower-is-better
 *     - If equal → undefined (skip update — caller intent unclear)
 *   This implicitly mirrors the W210 Measure.scoringDirection without
 *   coupling the goal update to the registry's direction field.
 *
 * Always best-effort — exceptions are logged but never propagate.
 * Primary admin writes must NOT fail because of an audit-trail side
 * effect (same contract as W214's autoCloseFor).
 *
 * Skip rules:
 *   - Correction records (admin.correctionOf set): a correction
 *     retro-fixes an old admin; the goal's history shouldn't gain a
 *     "new" entry. The correction's score is the latest authoritative
 *     value, but if the goal already received the original score,
 *     re-appending would inflate history. (See note in autoCloseFor too.)
 *   - admin.status not in {completed, locked}.
 *   - goal.status not in {active, draft}.
 *   - goal.isDeleted=true.
 *   - goal.target.value missing or === goal.baseline.value.
 *   - admin.totalRawScore not a finite number.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

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
};

function _computeProgress(baselineValue, targetValue, currentValue) {
  if (
    typeof baselineValue !== 'number' ||
    typeof targetValue !== 'number' ||
    typeof currentValue !== 'number'
  )
    return null;
  if (targetValue === baselineValue) return null;
  const direction = targetValue > baselineValue ? 1 : -1;
  const rangeAbs = Math.abs(targetValue - baselineValue);
  const advance = (currentValue - baselineValue) * direction;
  const fraction = advance / rangeAbs;
  // Clamp to [0,100] — over-shoot still counts as 100% achieved.
  return Math.max(0, Math.min(100, Math.round(fraction * 100)));
}

function _ratingFor(progressPercent) {
  if (typeof progressPercent !== 'number') return undefined;
  if (progressPercent >= 100) return 'achieved';
  if (progressPercent >= 75) return 'developing';
  if (progressPercent >= 25) return 'emerging';
  return 'not_attempted';
}

class MeasureGoalUpdaterSvc {
  /**
   * Update all active TherapeuticGoals that target the new admin's
   * measure for this beneficiary. Returns a summary so the caller
   * (the post-save hook) can log telemetry without doing any I/O.
   *
   * @param {Object} input
   * @param {ObjectId} input.beneficiaryId
   * @param {ObjectId} input.measureId
   * @param {number}   input.totalRawScore
   * @param {ObjectId} [input.applicationId]
   * @param {Date}     [input.applicationDate]
   * @param {ObjectId} [input.assessorId]
   */
  async updateGoalsForAdmin(input) {
    try {
      const TherapeuticGoal = M.TherapeuticGoal();
      if (!TherapeuticGoal) return { updated: 0, skipped: 0, reason: 'no_model' };

      const { beneficiaryId, measureId, totalRawScore } = input;
      if (!beneficiaryId || !measureId) return { updated: 0, skipped: 0, reason: 'missing_input' };
      if (typeof totalRawScore !== 'number' || !Number.isFinite(totalRawScore)) {
        return { updated: 0, skipped: 0, reason: 'no_score' };
      }

      // Find active goals where any objective targets this measure.
      const goals = await TherapeuticGoal.find({
        beneficiaryId,
        status: { $in: ['active', 'draft'] },
        isDeleted: { $ne: true },
        'objectives.measureId': measureId,
      });

      let updated = 0;
      let skipped = 0;
      const details = [];

      for (const goal of goals) {
        const baseline = goal.baseline && goal.baseline.value;
        const target = goal.target && goal.target.value;
        const singleProgress = _computeProgress(baseline, target, totalRawScore);
        if (singleProgress === null) {
          skipped++;
          details.push({ goalId: String(goal._id), reason: 'no_progress_math' });
          continue;
        }

        // ─── W236 — Linkage-aware aggregation ─────────────────────
        // When the matched objective has multiple contributing
        // measureLinks (W235), `currentProgress` is the weighted
        // aggregation across all of them — NOT just this single
        // admin's effect. The single-admin progress still goes into
        // progressHistory as the audit trail of what came in.
        //
        // Fallback to single-measure progress when:
        //   - objective has no measureLinks[] (legacy goal)
        //   - only 1 contributing link (no aggregation needed)
        //   - linkage service throws (best-effort)
        let weightedProgress = null;
        let weightedDetails = null;
        try {
          const matchedObjective = (goal.objectives || []).find(
            o =>
              String(o.measureId || '') === String(measureId) ||
              (o.measureLinks || []).some(
                l => String(l.measureId) === String(measureId) && l.status !== 'unlinked'
              )
          );
          if (matchedObjective) {
            const contributing = (matchedObjective.measureLinks || []).filter(
              l => l.linkType !== 'CONTRAINDICATED' && l.status !== 'unlinked'
            );
            if (contributing.length > 1) {
              const linkage = require('./goalMeasureLinkage.service');
              const wp = await linkage.computeWeightedProgress({ goalId: goal._id });
              const objIndex = goal.objectives.indexOf(matchedObjective);
              const objWp = (wp.objectives || []).find(o => o.objectiveIndex === objIndex);
              if (objWp && objWp.score != null) {
                weightedProgress = Math.max(0, Math.min(100, Math.round(objWp.score * 100)));
                weightedDetails = {
                  linkCount: contributing.length,
                  weightedScore: objWp.score,
                  status: objWp.status,
                };
              }
            }
          }
        } catch (err) {
          // best-effort — fall through to single-measure progress
          logger.debug?.('[MeasureGoalUpdater] weighted progress failed: %s', err.message);
        }

        const finalProgress = weightedProgress != null ? weightedProgress : singleProgress;

        goal.progressHistory.push({
          date: input.applicationDate || new Date(),
          value: totalRawScore,
          rating: _ratingFor(finalProgress),
          // W248 — snapshot of currentProgress at this admin time.
          // Powers the trend chart on /therapeutic-goals/[id].
          currentProgressSnapshot: finalProgress,
          recordedBy: input.assessorId || null,
          notes: input.applicationId
            ? `auto-update from MeasureApplication ${input.applicationId}` +
              (weightedDetails ? ` (weighted across ${weightedDetails.linkCount} links)` : '')
            : 'auto-update from new measure administration',
        });
        goal.currentProgress = finalProgress;
        // status auto-flips to 'achieved' via the existing pre-save
        // hook in TherapeuticGoal when currentProgress >= 100.

        try {
          await goal.save();
          updated++;
          details.push({
            goalId: String(goal._id),
            previousProgress: goal.$__.previousValues?.currentProgress,
            newProgress: finalProgress,
            singleMeasureProgress: singleProgress,
            weighted: weightedDetails,
            ratingApplied: _ratingFor(finalProgress),
            achievedNow: finalProgress >= 100,
          });
        } catch (err) {
          skipped++;
          details.push({ goalId: String(goal._id), reason: 'save_failed', error: err.message });
        }
      }

      if (updated || skipped) {
        logger.info(
          '[MeasureGoalUpdater] beneficiary=%s measure=%s score=%s updated=%d skipped=%d',
          String(beneficiaryId),
          String(measureId),
          totalRawScore,
          updated,
          skipped
        );
      }
      return { updated, skipped, details };
    } catch (err) {
      logger.warn('[MeasureGoalUpdater] failed: %s', err.message);
      return { updated: 0, skipped: 0, error: err.message };
    }
  }

  // Exposed for tests + external callers.
  _computeProgress(b, t, c) {
    return _computeProgress(b, t, c);
  }

  _ratingFor(p) {
    return _ratingFor(p);
  }
}

module.exports = new MeasureGoalUpdaterSvc();
