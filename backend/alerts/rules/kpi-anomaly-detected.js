/**
 * Rule: statistically-detected KPI anomaly (Wave 5).
 *
 * Bridges the Tier-2 EWMA anomaly detector (which has lived in
 * services/anomalyDetector.service.js since Phase 18 C6 but never
 * fired an actual alert) into the alerts engine. The detector
 * already produces a structured verdict per KPI; this rule simply
 * yields one finding per (kpiId, scope) tuple where the verdict
 * crosses the warning/critical threshold.
 *
 * Dependency: ctx.kpiHistoryStore must be an in-memory rolling
 * history store (services/kpiHistoryStore.service.js) wired into
 * the scheduler at boot. When the store is absent the rule
 * silently returns [] so the engine keeps running without it.
 *
 * Severity contract:
 *   detector severity → rule severity
 *   ───────────────────────────────────
 *   warning           → 'warning'
 *   critical          → 'high'   (we reserve `critical` for
 *                                  Wave-3 lifecycle alerts so
 *                                  the inbox tiering stays sane)
 */

'use strict';

const { detectAnomaly } = require('../../services/anomalyDetector.service');

const MIN_HISTORY_POINTS = 8;

function severityFromDetector(detectorSeverity) {
  if (detectorSeverity === 'critical') return 'high';
  if (detectorSeverity === 'warning') return 'warning';
  return null;
}

function formatVerdict(verdict, scope) {
  const z = verdict.zScore != null ? verdict.zScore.toFixed(2) : '?';
  const dir = verdict.direction === 'above' ? 'ارتفاع' : 'انخفاض';
  const scopePart = scope ? ` — ${typeof scope === 'string' ? scope : JSON.stringify(scope)}` : '';
  return `${dir} غير اعتيادي لمؤشر ${verdict.kpiId}${scopePart} (z=${z})`;
}

module.exports = {
  id: 'kpi-anomaly-detected',
  severity: 'warning',
  category: 'operational',
  description: 'Statistical anomaly detected on a KPI series (EWMA / seasonal)',

  async evaluate(ctx) {
    const store = ctx && ctx.kpiHistoryStore;
    if (!store || typeof store.list !== 'function') return [];

    const now = ctx.now || new Date();
    const clock = { now: () => (now instanceof Date ? now.getTime() : Number(now) || Date.now()) };
    const opts = ctx.anomalyOptions || {};

    let entries;
    try {
      entries = store.list();
    } catch {
      return [];
    }
    if (!Array.isArray(entries) || entries.length === 0) return [];

    const findings = [];
    for (const entry of entries) {
      if (!entry || !Array.isArray(entry.points) || entry.points.length < MIN_HISTORY_POINTS)
        continue;

      const currentPoint = entry.points[entry.points.length - 1];
      if (!currentPoint || typeof currentPoint.v !== 'number') continue;

      const verdict = detectAnomaly({
        kpiId: entry.kpiId,
        series: entry.points.slice(0, -1), // baseline excludes current
        currentValue: currentPoint.v,
        options: opts[entry.kpiId] || {},
        clock,
      });

      if (!verdict.anomaly) continue;
      const sev = severityFromDetector(verdict.severity);
      if (!sev) continue;

      // Each (kpiId, scope) tuple produces at most one finding per
      // tick. The engine's compound-key dedup (`ruleId::key`) then
      // collapses repeats across ticks.
      const scopeKey =
        entry.scope == null
          ? ''
          : typeof entry.scope === 'string'
            ? entry.scope
            : JSON.stringify(entry.scope);

      findings.push({
        key: `kpi-anomaly:${entry.kpiId}::${scopeKey}`,
        subject: { type: 'Kpi', id: entry.kpiId, scope: entry.scope || null },
        // Severity bubbles up to the dispatcher via the engine's
        // top-level `rule.severity`, but we also attach it to the
        // finding's metadata so the route layer can render the
        // sharper detector-derived value in the UI.
        message: formatVerdict(verdict, entry.scope),
        metadata: {
          detectorSeverity: verdict.severity,
          zScore: verdict.zScore,
          direction: verdict.direction,
          reason: verdict.reason,
          baselineN: verdict.baseline ? verdict.baseline.n : null,
          seasonalMatches: verdict.seasonal ? verdict.seasonal.matches : null,
        },
      });
    }

    return findings;
  },
};
