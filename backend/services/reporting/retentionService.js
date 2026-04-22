/**
 * retentionService.js — purges (or archives) delivery rows older than
 * the catalog's per-report `retention.days`.
 *
 * Phase 10 Commit 6.
 *
 * Default mode is HARD DELETE (smaller footprint, meets PDPL
 * "right to be forgotten" better). For confidential reports subject
 * to regulatory retention (e.g. 7 years for discharge summaries and
 * board packs), the catalog already sets `retention.days: 2555` so
 * those rows simply aren't eligible yet.
 *
 * The service operates on one `reportId` at a time so big tenants
 * don't churn indexes with a single wide delete. A `dryRun` flag
 * returns candidates without deleting — used by the ops dashboard for
 * "what will be purged tonight?" previews.
 */

'use strict';

const DEFAULT_BATCH = 500;

/**
 * Compute the cutoff Date for a single catalog entry.
 */
function cutoffFor(report, { now = new Date() } = {}) {
  if (!report || !report.retention || !report.retention.days) return null;
  return new Date(new Date(now).getTime() - report.retention.days * 24 * 3600 * 1000);
}

/**
 * Find rows eligible for purge for the given report id.
 * A row is eligible only if its status is TERMINAL (READ / ESCALATED /
 * CANCELLED). Active rows are protected — we never race retention
 * against delivery.
 */
async function findExpired(
  DeliveryModel,
  report,
  { now = new Date(), limit = DEFAULT_BATCH } = {}
) {
  if (!report) return [];
  const cutoff = cutoffFor(report, { now });
  if (!cutoff) return [];
  const Model = DeliveryModel.model || DeliveryModel;
  const rows = await Model.find({
    reportId: report.id,
    status: { $in: ['READ', 'ESCALATED', 'CANCELLED'] },
    createdAt: { $lt: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit);
  return rows || [];
}

/**
 * Delete one row. Prefers `deleteOne()` on the document instance, falls
 * back to `remove()` (older mongoose). Callers can swap in a soft-
 * delete hook by providing `onPurge(row)` — if it returns a falsy
 * value, the row is left alone.
 */
async function purgeOne(delivery, { onPurge } = {}) {
  if (!delivery) return false;
  if (typeof onPurge === 'function') {
    const ok = await onPurge(delivery);
    if (!ok) return false;
  } else {
    if (typeof delivery.deleteOne === 'function') {
      await delivery.deleteOne();
    } else if (typeof delivery.remove === 'function') {
      await delivery.remove();
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Run retention across the entire catalog.
 *
 * @param {Object} deps
 * @param {Object} deps.DeliveryModel
 * @param {Object} deps.catalog
 * @param {Function} [deps.onPurge]   override per-row; return true to confirm delete
 * @param {boolean}  [deps.dryRun]    if true, returns counts without deleting
 * @param {Object}   [deps.eventBus]
 * @param {Object}   [deps.logger]
 * @param {Date}     [deps.now]
 * @returns {Promise<{ scanned: number, purged: number, byReport: Object, errors: string[] }>}
 */
async function runRetentionSweep({
  DeliveryModel,
  catalog,
  onPurge,
  dryRun = false,
  eventBus,
  logger = console,
  now,
} = {}) {
  if (!DeliveryModel || !catalog) {
    throw new Error('runRetentionSweep: DeliveryModel + catalog required');
  }
  const summary = { scanned: 0, purged: 0, byReport: {}, errors: [] };
  const reports =
    (typeof catalog.enabled === 'function' ? catalog.enabled() : catalog.REPORTS) || [];
  for (const report of reports) {
    let expired;
    try {
      expired = await findExpired(DeliveryModel, report, { now });
    } catch (err) {
      summary.errors.push(`findExpired(${report.id}): ${err.message}`);
      continue;
    }
    summary.scanned += expired.length;
    summary.byReport[report.id] = { candidates: expired.length, purged: 0 };
    if (dryRun || !expired.length) continue;
    for (const row of expired) {
      try {
        const ok = await purgeOne(row, { onPurge });
        if (ok) {
          summary.purged++;
          summary.byReport[report.id].purged++;
          if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('report.delivery.purged', {
              deliveryId: String(row._id || row.id),
              reportId: row.reportId,
            });
          }
        }
      } catch (err) {
        summary.errors.push(`purge ${row._id || row.id}: ${err.message}`);
      }
    }
  }
  if (logger.info) {
    logger.info(`[retention] scanned=${summary.scanned} purged=${summary.purged} dryRun=${dryRun}`);
  }
  return summary;
}

module.exports = {
  DEFAULT_BATCH,
  cutoffFor,
  findExpired,
  purgeOne,
  runRetentionSweep,
};
