'use strict';

/**
 * kpi-series.loader.js — Wave 30.
 *
 * Shared loader factory for the two time-series generators:
 *   • anomaly.v1 (Z-score breach detection)
 *   • trend-deviation.v1 (slope reversal / acceleration)
 *
 * Both consume the same ctx shape:
 *
 *   {
 *     series: [{
 *       metricId, metricLabelAr, metricLabelEn,
 *       branchId?, branchLabel?,
 *       unit?, category?,
 *       betterIsHigher?,
 *       points: [{ at, value }],   // chronological ASC
 *     }],
 *     now,
 *   }
 *
 * Query plan per tick:
 *   1. Pick the KPIs we care about (from `metrics` argument or default
 *      taken from drilldown.registry KPIs that have a kpiDefinitionId
 *      mapping)
 *   2. KpiValue.find({ kpiDefinitionId ∈ ids, periodDate >= cutoff })
 *      sorted ASC by periodDate
 *   3. Group by (kpiDefinitionId, branchId) → series.points
 *   4. Hydrate labels from KpiDefinition if available, else use the
 *      `metrics` config's labels, else fall back to the id itself
 *
 * Cap series count + points/series to bound query cost.
 */

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MAX_SERIES = 200; // metric × branch combos per tick
const DEFAULT_MAX_POINTS_PER_SERIES = 60;

/**
 * @param {object} deps
 *   - KpiValue          — Mongoose model (REQUIRED)
 *   - KpiDefinition     — Mongoose model (optional — used to hydrate labels)
 *   - metrics           — Array<{ kpiDefinitionId, metricId?, labelAr?, labelEn?,
 *                                  unit?, category?, betterIsHigher? }>
 *                         If absent, the loader queries the most recently
 *                         active KPI definitions automatically.
 *   - windowDays        — how far back to read points (default 30)
 *   - maxSeries         — cap on number of (metric × branch) combos
 *   - maxPointsPerSeries — cap on points per series
 *   - now, logger
 *
 * Returns `async () => ctx` OR null when KpiValue is missing.
 */
function createKpiSeriesLoader({
  KpiValue,
  KpiDefinition = null,
  metrics = null,
  windowDays = DEFAULT_WINDOW_DAYS,
  maxSeries = DEFAULT_MAX_SERIES,
  maxPointsPerSeries = DEFAULT_MAX_POINTS_PER_SERIES,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (!KpiValue) {
    logger.warn && logger.warn('[kpi-series.loader] KpiValue model required — skipping');
    return null;
  }

  return async function load() {
    const tickAt = now();
    const cutoff = new Date(tickAt.getTime() - windowDays * 86_400_000);

    // ─── 1. Resolve which metrics to query ─────────────────────
    let resolvedMetrics = Array.isArray(metrics) ? metrics.slice() : null;

    if (!resolvedMetrics && KpiDefinition) {
      // Auto-discover: take up to 30 most-recently-touched KPI defs
      try {
        const defs = await KpiDefinition.find({})
          .select('_id name nameAr nameEn category unit betterIsHigher')
          .sort({ updatedAt: -1 })
          .limit(30)
          .lean();
        resolvedMetrics = defs.map(d => ({
          kpiDefinitionId: d._id,
          metricId: String(d._id),
          labelAr: d.nameAr || d.name || String(d._id),
          labelEn: d.nameEn || d.name || String(d._id),
          unit: d.unit || null,
          category: d.category || null,
          betterIsHigher: d.betterIsHigher !== false,
        }));
      } catch (err) {
        logger.warn && logger.warn(`[kpi-series.loader] auto-discover failed: ${err.message}`);
        resolvedMetrics = [];
      }
    }
    if (!resolvedMetrics || resolvedMetrics.length === 0) {
      return { series: [], now: tickAt };
    }

    // Cap defensively
    if (resolvedMetrics.length > maxSeries) {
      resolvedMetrics = resolvedMetrics.slice(0, maxSeries);
    }

    const metricById = new Map();
    for (const m of resolvedMetrics) {
      metricById.set(String(m.kpiDefinitionId), m);
    }
    const kpiDefinitionIds = resolvedMetrics.map(m => m.kpiDefinitionId);

    // ─── 2. Query KpiValue rows ────────────────────────────────
    let rows;
    try {
      rows = await KpiValue.find({
        kpiDefinitionId: { $in: kpiDefinitionIds },
        periodDate: { $gte: cutoff },
      })
        .select('kpiDefinitionId branchId periodDate value')
        .sort({ periodDate: 1 })
        .lean();
    } catch (err) {
      logger.warn && logger.warn(`[kpi-series.loader] kpivalue query failed: ${err.message}`);
      return { series: [], now: tickAt };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { series: [], now: tickAt };
    }

    // ─── 3. Group by (kpiDefinitionId, branchId) ───────────────
    // Use a composite key so the same metric is split per branch.
    const grouped = new Map();
    for (const r of rows) {
      const branchKey = r.branchId ? String(r.branchId) : '__org';
      const key = `${String(r.kpiDefinitionId)}::${branchKey}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          kpiDefinitionId: r.kpiDefinitionId,
          branchId: r.branchId || null,
          points: [],
        });
      }
      const g = grouped.get(key);
      if (g.points.length < maxPointsPerSeries) {
        g.points.push({ at: r.periodDate, value: r.value });
      }
    }

    // Bound total series count per tick
    const seriesEntries = Array.from(grouped.values()).slice(0, maxSeries);

    // ─── 4. Hydrate metric metadata + build the final shape ────
    const series = seriesEntries.map(g => {
      const m = metricById.get(String(g.kpiDefinitionId));
      return {
        metricId: m?.metricId || String(g.kpiDefinitionId),
        metricLabelAr: m?.labelAr || String(g.kpiDefinitionId),
        metricLabelEn: m?.labelEn || String(g.kpiDefinitionId),
        branchId: g.branchId,
        unit: m?.unit || null,
        category: m?.category || 'operational',
        betterIsHigher: m?.betterIsHigher !== false,
        points: g.points, // already sorted ASC by query
      };
    });

    return {
      series,
      now: tickAt,
    };
  };
}

module.exports = {
  createKpiSeriesLoader,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_MAX_SERIES,
  DEFAULT_MAX_POINTS_PER_SERIES,
};
