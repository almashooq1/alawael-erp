'use strict';

/**
 * trainingHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Adapter over TrainingCompliance producing:
 *
 *   getMandatoryCompletionRate({ branchId }) => 0..1 | null
 *
 * Rate = completed / (completed + pending + overdue)
 *
 * Waived records are excluded from the denominator — waivers
 * shouldn't help OR hurt the score.
 *
 * Returns `null` when the branch has no mandatory training
 * records at all (distinguishes "no data" from "0% complete").
 */

const COMPLETED_STATUSES = Object.freeze(['completed']);
const PENDING_STATUSES = Object.freeze(['pending', 'overdue']);
const WAIVED_STATUSES = Object.freeze(['waived']);

function createTrainingHealthAdapter({ model, logger = console } = {}) {
  if (!model) throw new Error('trainingHealthAdapter: model is required');

  async function getMandatoryCompletionRate({ branchId } = {}) {
    const filter = {};
    if (branchId) filter.branchId = branchId;

    let docs;
    try {
      docs = await model.find(filter).limit(5000);
    } catch (err) {
      logger.warn(`[trainingAdapter] query failed: ${err.message}`);
      return null;
    }

    let completed = 0;
    let denominator = 0;
    for (const d of docs) {
      if (!d || !d.status) continue;
      if (WAIVED_STATUSES.includes(d.status)) continue;
      denominator++;
      if (COMPLETED_STATUSES.includes(d.status)) completed++;
    }
    if (!denominator) return null;
    return completed / denominator;
  }

  return { getMandatoryCompletionRate };
}

module.exports = {
  createTrainingHealthAdapter,
  COMPLETED_STATUSES,
  PENDING_STATUSES,
  WAIVED_STATUSES,
};
