'use strict';

/**
 * complaintsHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Adapter over the Complaint model producing:
 *
 *   getSlaRate({ branchId, from, to }) => 0..1 | null
 *
 * Per-priority SLA (hours) mirrors the existing
 * complaintsAnalyticsService convention:
 *
 *   critical → 24h,  high → 72h,  medium → 168h (7d),  low → 336h (14d)
 *
 * Returns `null` when there are no resolved complaints in the
 * window — distinguishes "nothing to measure" from "100% failed".
 */

const SLA_HOURS = Object.freeze({
  critical: 24,
  high: 72,
  medium: 168,
  low: 336,
});

const RESOLVED_STATUSES = Object.freeze(['resolved', 'closed']);

function createComplaintsHealthAdapter({ model, logger = console } = {}) {
  if (!model) throw new Error('complaintsHealthAdapter: model is required');

  async function getSlaRate({ branchId, from, to } = {}) {
    const filter = {
      deleted_at: null,
      status: { $in: [...RESOLVED_STATUSES] },
      resolvedAt: { $ne: null },
    };
    if (branchId) filter.branchId = branchId;
    if (from || to) {
      filter.createdAt = filter.createdAt || {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    let docs;
    try {
      docs = await model.find(filter).limit(2000);
    } catch (err) {
      logger.warn(`[complaintsAdapter] query failed: ${err.message}`);
      return null;
    }
    if (!docs.length) return null;

    let onTime = 0;
    let total = 0;
    for (const d of docs) {
      if (!d.createdAt || !d.resolvedAt) continue;
      total++;
      const slaH = SLA_HOURS[d.priority] ?? SLA_HOURS.medium;
      const hours = (d.resolvedAt.getTime() - d.createdAt.getTime()) / 3600000;
      if (hours <= slaH) onTime++;
    }
    if (!total) return null;
    return onTime / total;
  }

  return { getSlaRate };
}

module.exports = {
  createComplaintsHealthAdapter,
  SLA_HOURS,
  RESOLVED_STATUSES,
};
