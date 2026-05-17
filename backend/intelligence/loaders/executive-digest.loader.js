'use strict';

/**
 * executive-digest.loader.js — Wave 32.
 *
 * Real data loader for the `executive-digest.v1` generator (Wave 25).
 * Computes week-vs-week comparisons for the configured set of
 * strategic KPIs, producing the comparisons[] shape:
 *
 *   {
 *     comparisons: [{
 *       kpiId,        // catalog id (e.g. 'kpi.beneficiary.active_count')
 *       labelAr, labelEn,
 *       unit?, betterIsHigher?,
 *       current,      // avg/sum of this week's KpiValue rows
 *       previous,     // avg/sum of previous week's rows
 *     }],
 *     now,
 *   }
 *
 * Strategy:
 *   1. Caller supplies `metrics: [{ kpiDefinitionId, ... }]` — the
 *      6 strategic KPIs the executive digest covers.
 *   2. For each metric, query KpiValue for the LAST 14 days, partition
 *      into "this week" (last 7) and "previous week" (8-14 days ago),
 *      reduce each to a single number via the configured aggregator
 *      (default: average — works for percent/ratio KPIs; sum works
 *      for count KPIs).
 *   3. Skip metrics with no data in either week (can't compare).
 *
 * Idempotent across the orchestrator tick: same KpiValue rows in →
 * same comparisons out (executive-digest generator dedups by `week`).
 */

const DEFAULT_AGGREGATOR = 'avg';

function startOfWeekAgo(daysAgo, now) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function aggregate(values, mode) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (mode === 'sum') return values.reduce((a, b) => a + b, 0);
  if (mode === 'last') return values[values.length - 1];
  // default: average
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * @param {object} deps
 *   - KpiValue          — Mongoose model (REQUIRED)
 *   - metrics           — array of metric configs (REQUIRED): each
 *                          { kpiDefinitionId, labelAr, labelEn, unit?,
 *                            betterIsHigher?, aggregator? }
 *   - aggregatorDefault — used when a metric doesn't declare its own
 *   - now, logger
 */
function createExecutiveDigestLoader({
  KpiValue = null,
  metrics = null,
  aggregatorDefault = DEFAULT_AGGREGATOR,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (!KpiValue) {
    logger.warn && logger.warn('[executive-digest.loader] KpiValue model required — skipping');
    return null;
  }
  if (!Array.isArray(metrics) || metrics.length === 0) {
    logger.warn && logger.warn('[executive-digest.loader] no metrics configured — skipping');
    return null;
  }

  return async function load() {
    const tickAt = now();
    const thisWeekStart = startOfWeekAgo(7, tickAt);
    const prevWeekStart = startOfWeekAgo(14, tickAt);
    // boundary: rows >= prevWeekStart AND < tickAt

    let rows;
    try {
      rows = await KpiValue.find({
        kpiDefinitionId: { $in: metrics.map(m => m.kpiDefinitionId) },
        periodDate: { $gte: prevWeekStart, $lt: tickAt },
      })
        .select('kpiDefinitionId periodDate value')
        .sort({ periodDate: 1 })
        .lean();
    } catch (err) {
      logger.warn && logger.warn(`[executive-digest.loader] query failed: ${err.message}`);
      return { comparisons: [], now: tickAt };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { comparisons: [], now: tickAt };
    }

    // Group + partition: per metric → { thisWeek[], prevWeek[] }
    const buckets = new Map();
    for (const m of metrics) buckets.set(String(m.kpiDefinitionId), { thisWeek: [], prevWeek: [] });
    for (const r of rows) {
      const b = buckets.get(String(r.kpiDefinitionId));
      if (!b) continue;
      if (new Date(r.periodDate) >= thisWeekStart) {
        b.thisWeek.push(Number(r.value));
      } else {
        b.prevWeek.push(Number(r.value));
      }
    }

    const comparisons = [];
    for (const m of metrics) {
      const b = buckets.get(String(m.kpiDefinitionId));
      const mode = m.aggregator || aggregatorDefault;
      const current = aggregate(b.thisWeek, mode);
      const previous = aggregate(b.prevWeek, mode);
      // Generator needs BOTH numbers to compute pctChange; skip when
      // either week is empty.
      if (current === null || previous === null) continue;
      comparisons.push({
        kpiId: m.kpiId || String(m.kpiDefinitionId),
        labelAr: m.labelAr || String(m.kpiDefinitionId),
        labelEn: m.labelEn || String(m.kpiDefinitionId),
        unit: m.unit || null,
        betterIsHigher: m.betterIsHigher !== false,
        current,
        previous,
      });
    }

    return { comparisons, now: tickAt };
  };
}

module.exports = {
  createExecutiveDigestLoader,
  DEFAULT_AGGREGATOR,
  _internal: { startOfWeekAgo, aggregate },
};
