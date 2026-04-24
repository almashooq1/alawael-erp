/**
 * anomalyDetector.service.js — Tier 2 statistical anomaly
 * detection for dashboard KPIs.
 *
 * Phase 18 Commit 6.
 *
 * Pure functions. Given a series of historical `{ t, v }` points
 * and the current value, returns a verdict:
 *
 *   {
 *     anomaly:       boolean,
 *     severity:      'info' | 'warning' | 'critical' | null,
 *     zScore:        number | null,
 *     direction:     'above' | 'below' | null,
 *     baseline:      { ewma, stdev, n },
 *     seasonal:      { baseline, matches } | null,
 *     reason:        string,  // human-readable explanation
 *   }
 *
 * Design rules:
 *
 *   1. **Never throws**. Every edge case (too-few points, zero
 *      variance, non-numeric inputs) returns a non-anomaly verdict
 *      with an explicit `reason`.
 *
 *   2. **Bounded lookback**. The detector reads at most the last
 *      `maxPoints` values so memory stays O(maxPoints) even on
 *      hourly KPIs.
 *
 *   3. **EWMA baseline** (Exponentially Weighted Moving Average).
 *      `alpha` defaults to 0.3 — enough weight on the recent past
 *      to catch real drift without flipping on a single tick.
 *
 *   4. **Seasonal comparison** (optional). If the series has a
 *      reasonable number of matching same-period points (same
 *      hour-of-day or day-of-week), we compare the current value
 *      to that subset's mean as a secondary signal. The final
 *      verdict uses whichever signal trips first.
 *
 *   5. **Severity thresholds**:
 *        |z| < warnZ  →  not anomalous
 *        warnZ ≤ |z| < critZ → warning
 *        |z| ≥ critZ → critical
 *      Operators can tune `warnZ` / `critZ` per KPI if they want.
 *
 *   6. **All time-math happens in UTC**. The seasonal bucketing
 *      uses `getUTCHours` / `getUTCDay` so results are stable
 *      across host timezones.
 */

'use strict';

const DEFAULT_OPTIONS = Object.freeze({
  alpha: 0.3,
  warnZ: 2.5,
  critZ: 3.5,
  minPoints: 8,
  maxPoints: 90,
  seasonalMinMatches: 4,
  seasonal: 'hour', // 'hour' | 'dow' | null
});

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function toTimestampMs(t) {
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const d = Date.parse(t);
    return Number.isNaN(d) ? null : d;
  }
  if (t instanceof Date) return t.getTime();
  return null;
}

function cleanSeries(points) {
  if (!Array.isArray(points)) return [];
  const out = [];
  for (const p of points) {
    if (!p || !isFiniteNumber(p.v)) continue;
    const ts = toTimestampMs(p.t);
    if (ts === null) continue;
    out.push({ t: ts, v: p.v });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

function ewmaStats(values, alpha) {
  // Computes the EWMA and the unbiased sample stdev of the
  // residuals (value - ewma at that step). Returns null stats
  // when there is not enough variance to compute a z-score.
  if (!values.length) return { ewma: null, stdev: null, n: 0 };
  let ewma = values[0];
  const residuals = [0];
  for (let i = 1; i < values.length; i += 1) {
    const r = values[i] - ewma;
    residuals.push(r);
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  // Sample stdev of residuals (skip index 0).
  const body = residuals.slice(1);
  if (!body.length) return { ewma, stdev: null, n: values.length };
  const mean = body.reduce((s, x) => s + x, 0) / body.length;
  const variance = body.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, body.length - 1);
  const stdev = Math.sqrt(variance);
  return { ewma, stdev, n: values.length };
}

function seasonalBucket(ts, mode) {
  const d = new Date(ts);
  if (mode === 'dow') return d.getUTCDay();
  if (mode === 'hour') return d.getUTCHours();
  return null;
}

function seasonalStats(series, nowTs, mode) {
  if (!mode) return null;
  const bucket = seasonalBucket(nowTs, mode);
  const matches = series.filter(p => seasonalBucket(p.t, mode) === bucket);
  if (!matches.length) return { baseline: null, stdev: null, matches: 0, bucket };
  const mean = matches.reduce((s, p) => s + p.v, 0) / matches.length;
  const variance =
    matches.reduce((s, p) => s + (p.v - mean) ** 2, 0) / Math.max(1, matches.length - 1);
  const stdev = Math.sqrt(variance);
  return { baseline: mean, stdev, matches: matches.length, bucket };
}

function verdictSeverity(z, { warnZ, critZ }) {
  const abs = Math.abs(z);
  if (abs >= critZ) return 'critical';
  if (abs >= warnZ) return 'warning';
  return null;
}

/**
 * Main entry point. `series` is an array of `{ t, v }` points
 * (timestamps may be ISO strings, Date, or ms). `currentValue` is
 * the latest numeric reading. `clock.now()` defaults to `Date.now()`.
 */
function detectAnomaly({
  kpiId,
  series = [],
  currentValue,
  options = {},
  clock = { now: () => Date.now() },
} = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!isFiniteNumber(currentValue)) {
    return {
      kpiId: kpiId || null,
      anomaly: false,
      severity: null,
      zScore: null,
      direction: null,
      baseline: { ewma: null, stdev: null, n: 0 },
      seasonal: null,
      reason: 'current_value_missing',
    };
  }

  const cleaned = cleanSeries(series).slice(-opts.maxPoints);
  if (cleaned.length < opts.minPoints) {
    return {
      kpiId: kpiId || null,
      anomaly: false,
      severity: null,
      zScore: null,
      direction: null,
      baseline: { ewma: null, stdev: null, n: cleaned.length },
      seasonal: null,
      reason: `insufficient_history:${cleaned.length}/${opts.minPoints}`,
    };
  }

  // EWMA + residual stdev over the series.
  const values = cleaned.map(p => p.v);
  const { ewma, stdev, n } = ewmaStats(values, opts.alpha);
  const baseline = { ewma, stdev, n };

  // Seasonal stats.
  const nowTs = clock.now();
  const seasonal = seasonalStats(cleaned, nowTs, opts.seasonal);

  // Primary signal: z-score on EWMA residual.
  let zScore = null;
  let direction = null;
  let reason = 'ok';

  if (stdev && stdev > 0) {
    zScore = (currentValue - ewma) / stdev;
    direction = zScore > 0 ? 'above' : 'below';
  } else {
    // Fallback to seasonal if available.
    if (
      seasonal &&
      seasonal.baseline != null &&
      seasonal.stdev &&
      seasonal.stdev > 0 &&
      seasonal.matches >= opts.seasonalMinMatches
    ) {
      zScore = (currentValue - seasonal.baseline) / seasonal.stdev;
      direction = zScore > 0 ? 'above' : 'below';
      reason = 'seasonal_only:no_ewma_variance';
    } else {
      return {
        kpiId: kpiId || null,
        anomaly: false,
        severity: null,
        zScore: null,
        direction: null,
        baseline,
        seasonal,
        reason: 'zero_variance',
      };
    }
  }

  const severity = verdictSeverity(zScore, opts);

  // Secondary seasonal check — if we already have an EWMA verdict,
  // cross-check against seasonal for the `seasonal_agreement` reason.
  if (
    severity &&
    seasonal &&
    seasonal.baseline != null &&
    seasonal.stdev &&
    seasonal.matches >= opts.seasonalMinMatches
  ) {
    const seasonalZ = (currentValue - seasonal.baseline) / seasonal.stdev;
    if (Math.sign(seasonalZ) === Math.sign(zScore) && Math.abs(seasonalZ) >= opts.warnZ) {
      reason = 'seasonal_agreement';
    }
  }

  return {
    kpiId: kpiId || null,
    anomaly: Boolean(severity),
    severity,
    zScore,
    direction,
    baseline,
    seasonal,
    reason: severity ? reason : 'within_expected_range',
  };
}

module.exports = {
  detectAnomaly,
  DEFAULT_OPTIONS,
  _internals: {
    cleanSeries,
    ewmaStats,
    seasonalStats,
    seasonalBucket,
    verdictSeverity,
  },
};
