'use strict';

/**
 * capaHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Adapter over the legacy CorrectivePreventiveAction model
 * producing:
 *
 *   getClosureSlaRate({ branchId, from, to }) => 0..1 | null
 *
 * A CAPA counts as "closed within SLA" when both of:
 *   • `implementation.actualCompletionDate` is set
 *   • actualCompletionDate ≤ implementation.targetCompletionDate
 *
 * Caveat: the legacy CAPA schema has no `branchId` field.
 * Passing `branchId` to this adapter is accepted but currently
 * ignored — the metric is org-wide. When Phase 14 later adds
 * branch scoping to CAPA, this adapter will pick it up without
 * signature change.
 *
 * Returns `null` when the window holds no completed CAPAs.
 */

function createCapaHealthAdapter({ model, logger = console } = {}) {
  if (!model) throw new Error('capaHealthAdapter: model is required');

  async function getClosureSlaRate({ from, to } = {}) {
    const filter = {
      'implementation.actualCompletionDate': { $ne: null },
    };
    if (from || to) {
      filter['implementation.actualCompletionDate'] = {
        ...filter['implementation.actualCompletionDate'],
      };
      if (from) filter['implementation.actualCompletionDate'].$gte = new Date(from);
      if (to) filter['implementation.actualCompletionDate'].$lte = new Date(to);
    }

    let docs;
    try {
      docs = await model.find(filter).limit(2000);
    } catch (err) {
      logger.warn(`[capaAdapter] query failed: ${err.message}`);
      return null;
    }
    if (!docs.length) return null;

    let onTime = 0;
    let total = 0;
    for (const d of docs) {
      const target = d.implementation?.targetCompletionDate;
      const actual = d.implementation?.actualCompletionDate;
      if (!actual) continue;
      total++;
      // If no target was set, we can't assess — count as on-time
      // (missing data shouldn't drag the metric down).
      if (!target) {
        onTime++;
        continue;
      }
      if (actual.getTime() <= target.getTime()) onTime++;
    }
    if (!total) return null;
    return onTime / total;
  }

  return { getClosureSlaRate };
}

module.exports = { createCapaHealthAdapter };
