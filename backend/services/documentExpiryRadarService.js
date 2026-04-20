/**
 * documentExpiryRadarService — pure math for consolidated expiry alerts.
 *
 * Orthogonal to documentExpiryService (which deals with single-document
 * expiry helpers + notifications). This service unifies expiry signals
 * across multiple sources:
 *   • Document.expiryDate (licenses, policies, certifications)
 *   • EmploymentContract.endDate
 *   • Contract.expiryDate (supplier / vendor contracts)
 *
 * For a Saudi clinic, a missed licence renewal can mean a shutdown.
 * This service feeds the radar dashboard so nothing slips through.
 *
 * Functions:
 *   • classifyWindow(date, asOf)    → expired / critical / warning / ok
 *   • summarize(items)              counts per window + per source
 *   • radarList(items, n)           sorted watchlist (most urgent first)
 *   • byCategory(documents)         per-category expiry breakdown
 *   • upcomingRenewals(items, days) list of renewals in next N days
 *   • detectSurge(items)            alarm when next-30d renewals spike
 *     relative to the 6-month rolling average
 *
 * Accepts pre-normalised items shaped as
 *   { _id, source, category, title, expiryDate, status?, owner? }
 * Route layer normalises raw Document/EmploymentContract/Contract rows.
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Items expiring in the next N days are "critical" — block operations.
  get criticalDays() {
    return envInt('DOC_EXPIRY_CRITICAL_DAYS', 30);
  },
  // Warning zone: critical < window ≤ warning.
  get warningDays() {
    return envInt('DOC_EXPIRY_WARNING_DAYS', 90);
  },
  // Surge alarm: next-30d count must exceed baseline by this % to fire.
  get surgePct() {
    return envFloat('DOC_EXPIRY_SURGE_PCT', 50);
  },
  // Minimum items expiring in rolling 6-month avg to calculate surge.
  get surgeMinBaseline() {
    return envInt('DOC_EXPIRY_SURGE_MIN_BASELINE', 3);
  },
};

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

/**
 * Classify based on signed days-until-expiry.
 *   < 0                 → expired
 *   ≤ criticalDays      → critical
 *   ≤ warningDays       → warning
 *   else                → ok
 */
function classifyWindow(date, asOf = new Date()) {
  if (!date) return 'unknown';
  const days = daysBetween(asOf, date);
  if (days < 0) return 'expired';
  if (days <= THRESHOLDS.criticalDays) return 'critical';
  if (days <= THRESHOLDS.warningDays) return 'warning';
  return 'ok';
}

function summarize(items, asOf = new Date()) {
  const stats = {
    total: 0,
    expired: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    unknown: 0,
    bySource: {},
    thresholds: {
      criticalDays: THRESHOLDS.criticalDays,
      warningDays: THRESHOLDS.warningDays,
    },
  };
  for (const it of items) {
    if (!it) continue;
    stats.total += 1;
    const w = classifyWindow(it.expiryDate, asOf);
    stats[w] += 1;
    const src = it.source || 'other';
    if (!stats.bySource[src]) stats.bySource[src] = { expired: 0, critical: 0, warning: 0, ok: 0 };
    if (w !== 'unknown') stats.bySource[src][w] += 1;
  }
  return stats;
}

function radarList(items, asOf = new Date(), n = 100) {
  return items
    .filter(it => it?.expiryDate)
    .map(it => {
      const window = classifyWindow(it.expiryDate, asOf);
      return {
        _id: it._id,
        source: it.source,
        category: it.category || null,
        title: it.title || '',
        expiryDate:
          it.expiryDate instanceof Date
            ? it.expiryDate.toISOString()
            : new Date(it.expiryDate).toISOString(),
        daysUntilExpiry: daysBetween(asOf, it.expiryDate),
        window,
        status: it.status || null,
        owner: it.owner || null,
      };
    })
    .filter(it => it.window !== 'ok')
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, n);
}

function byCategory(items, asOf = new Date()) {
  const map = new Map();
  for (const it of items) {
    if (!it) continue;
    const key = it.category || 'غير محدّد';
    if (!map.has(key)) {
      map.set(key, {
        category: key,
        total: 0,
        expired: 0,
        critical: 0,
        warning: 0,
        ok: 0,
      });
    }
    const row = map.get(key);
    row.total += 1;
    const w = classifyWindow(it.expiryDate, asOf);
    if (w !== 'unknown') row[w] += 1;
  }
  return [...map.values()].sort((a, b) => b.expired + b.critical - (a.expired + a.critical));
}

function upcomingRenewals(items, days = 30, asOf = new Date()) {
  const endMs = asOf.getTime() + days * 86400000;
  return items
    .filter(it => {
      if (!it?.expiryDate) return false;
      const t = new Date(it.expiryDate).getTime();
      return t >= asOf.getTime() && t <= endMs;
    })
    .map(it => ({
      _id: it._id,
      source: it.source,
      category: it.category,
      title: it.title,
      expiryDate: new Date(it.expiryDate).toISOString(),
      daysUntilExpiry: daysBetween(asOf, it.expiryDate),
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Fires when next-30d renewal load ≥ SURGE_PCT above the next-5-months
 * average. Forward-looking: compares bucket[0] (next 30d) against the
 * average of buckets [1..5] (months 2-6 out). Gated by min-baseline so
 * a tiny clinic doesn't page on 2-vs-3 swings.
 */
function detectSurge(items, asOf = new Date()) {
  const asOfMs = asOf.getTime();
  const buckets = [0, 0, 0, 0, 0, 0]; // 6 forward-looking 30-day buckets
  for (const it of items) {
    if (!it?.expiryDate) continue;
    const t = new Date(it.expiryDate).getTime();
    const days = (t - asOfMs) / 86400000;
    if (days < 0 || days >= 180) continue;
    const bucket = Math.floor(days / 30);
    buckets[bucket] += 1;
  }
  const current = buckets[0];
  const priorBaseline = buckets.slice(1).reduce((a, b) => a + b, 0) / 5;
  if (priorBaseline < THRESHOLDS.surgeMinBaseline) {
    return {
      active: false,
      reason: 'insufficient_baseline',
      current,
      baselineAvg: Math.round(priorBaseline * 10) / 10,
    };
  }
  const jumpPct = Math.round(((current - priorBaseline) / priorBaseline) * 1000) / 10;
  return {
    active: jumpPct >= THRESHOLDS.surgePct,
    current,
    baselineAvg: Math.round(priorBaseline * 10) / 10,
    jumpPct,
    threshold: THRESHOLDS.surgePct,
  };
}

module.exports = {
  THRESHOLDS,
  classifyWindow,
  summarize,
  radarList,
  byCategory,
  upcomingRenewals,
  detectSurge,
};
