'use strict';

/**
 * goal-forecaster.lib.js — Wave 429 (Phase B1 — Outcome Forecasting).
 *
 * Pure-math library that turns a series of measurement scores into a
 * forecast: slope, intercept, R², projected score at a horizon date,
 * and a 95% confidence band. No DB, no I/O, no Mongoose — all callers
 * inject the series.
 *
 * Pairs with W337 (reactive PLATEAU_DETECTED detection) and W339
 * (REGRESSION_DETECTED) by adding a PROACTIVE signal: even when the
 * current series is still trending toward the goal, if the projected
 * value at the goal's target date misses the target, surface it now
 * so the team can intervene before the deadline.
 *
 * Why a separate library:
 *   • Pure math = easy to unit-test in isolation
 *   • Re-usable across producers (forecast sweeper, on-demand admin
 *     query, future "did this goal close on track?" retrospective)
 *   • Drift-guard friendly (no MongoDB, no app boot)
 *
 * Math:
 *   Ordinary least-squares linear regression on (t_i, y_i) where
 *   t_i = days-since-first-observation. Returns slope (units/day),
 *   intercept (units at t=0), residual standard error, R², and
 *   the 95% prediction interval at a future horizon point.
 *
 *   For a single forecast at horizon H (days from t=0):
 *     ŷ_H = intercept + slope * H
 *     SE_H = s * sqrt(1 + 1/n + (H - t̄)² / Σ(t_i - t̄)²)
 *     CI95 = ŷ_H ± 1.96 * SE_H
 *
 *   Slope-acceleration signal (Phase B2 enabler): when the recent half
 *   of the series has slope materially different from the first half,
 *   we surface a "slopeAcceleration" field so producers can decide if
 *   the trend is stable or shifting (a worsening half-on-half slope is
 *   the predictive analogue of W339's reactive regression).
 *
 * Caveats:
 *   • Minimum series length: 3 (need n ≥ 3 for residual SE).
 *     Smaller series → returns { ok: false, reason: 'INSUFFICIENT_DATA' }.
 *   • Horizon < 0 (in the past) → returns the same regression but the
 *     projection at the negative horizon is the model's BACKCAST, not
 *     a future prediction. Caller decides whether that's useful.
 *   • Assumes scores are monotonic in "better" direction. Caller
 *     normalizes inverted scales (e.g. lower-is-better measures) before
 *     calling — see Measure.scoreDirection field per W325 P2.
 */

const Z_95 = 1.96;

/**
 * Run linear regression on a series of {at: Date, score: number}.
 *
 * @param {Array<{at: Date|string, score: number}>} series
 *     Must be at least 3 entries. Will be sorted by `at` ascending
 *     internally — caller can pass in any order.
 * @param {Object} [options]
 * @param {Date|string} [options.horizonAt]
 *     Target date for the forecast. Defaults to (last point + 30 days).
 * @returns {Object}
 *     Either { ok: true, ...forecast } or { ok: false, reason: string }
 */
function forecast(series, options = {}) {
  if (!Array.isArray(series) || series.length < 3) {
    return { ok: false, reason: 'INSUFFICIENT_DATA', n: series?.length || 0 };
  }

  // Normalize + sort ascending by date.
  const points = series
    .map(p => ({ t: new Date(p.at).getTime(), y: Number(p.score) }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);

  if (points.length < 3) {
    return { ok: false, reason: 'INSUFFICIENT_DATA', n: points.length };
  }

  // Re-express t as days-since-first-observation for numerical stability.
  const t0 = points[0].t;
  const xs = points.map(p => (p.t - t0) / (1000 * 60 * 60 * 24));
  const ys = points.map(p => p.y);
  const n = xs.length;

  const tBar = xs.reduce((s, x) => s + x, 0) / n;
  const yBar = ys.reduce((s, y) => s + y, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - tBar;
    sxy += dx * (ys[i] - yBar);
    sxx += dx * dx;
  }

  if (sxx === 0) {
    // All observations at the same date — undefined slope.
    return { ok: false, reason: 'ZERO_VARIANCE_IN_TIME', n };
  }

  const slopePerDay = sxy / sxx;
  const intercept = yBar - slopePerDay * tBar;

  // Residuals + R².
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = intercept + slopePerDay * xs[i];
    const r = ys[i] - yhat;
    ssRes += r * r;
    const dy = ys[i] - yBar;
    ssTot += dy * dy;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Residual standard error. n-2 dof (slope + intercept estimated).
  const s = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Horizon — default 30 days past last observation.
  const lastT = xs[n - 1];
  const horizonAt = options.horizonAt
    ? new Date(options.horizonAt).getTime()
    : points[n - 1].t + 30 * 24 * 60 * 60 * 1000;
  const horizonDays = (horizonAt - t0) / (1000 * 60 * 60 * 24);

  const projected = intercept + slopePerDay * horizonDays;
  const seAtHorizon = s * Math.sqrt(1 + 1 / n + Math.pow(horizonDays - tBar, 2) / sxx);
  const ci95Half = Z_95 * seAtHorizon;

  // Slope-acceleration: split series in half (first ⌊n/2⌋ vs last ⌈n/2⌉)
  // and compare slopes. Returns null when n < 6 (can't compute 2 stable
  // half-slopes). Positive value = trend is accelerating in the "better"
  // direction; negative = decelerating / reversing.
  let slopeAcceleration = null;
  if (n >= 6) {
    const half = Math.floor(n / 2);
    const firstSlope = _slopeFor(xs.slice(0, half), ys.slice(0, half));
    const lastSlope = _slopeFor(xs.slice(half), ys.slice(half));
    if (firstSlope !== null && lastSlope !== null) {
      slopeAcceleration = lastSlope - firstSlope;
    }
  }

  return {
    ok: true,
    n,
    spanDays: lastT,
    slopePerDay,
    slopePerMonth: slopePerDay * 30,
    intercept,
    residualStdError: s,
    r2,
    projected,
    projectedAt: new Date(horizonAt).toISOString(),
    horizonDays,
    ci95: {
      lower: projected - ci95Half,
      upper: projected + ci95Half,
      half: ci95Half,
    },
    slopeAcceleration,
  };
}

function _slopeFor(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const tBar = xs.reduce((s, x) => s + x, 0) / n;
  const yBar = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - tBar;
    sxy += dx * (ys[i] - yBar);
    sxx += dx * dx;
  }
  if (sxx === 0) return null;
  return sxy / sxx;
}

/**
 * Decide whether a forecast misses a goal target.
 *
 * @param {Object} forecastResult — output of forecast(...)
 * @param {Object} goal
 *   @param {number} goal.targetValue — what we're trying to reach
 *   @param {'higher'|'lower'} [goal.direction='higher']
 *     'higher' = improvement means score increases (e.g. GAS).
 *     'lower' = improvement means score decreases (e.g. spasticity scale).
 *   @param {number} [goal.toleranceBand=0]
 *     Buffer around the target — projected within ±tolerance counts as on-track.
 * @returns {{onTrack: boolean, gap: number, severity: 'low'|'medium'|'high'|'critical'}}
 */
function evaluateAgainstTarget(forecastResult, goal) {
  if (!forecastResult || !forecastResult.ok) {
    return { onTrack: null, gap: 0, severity: 'low', reason: 'NO_FORECAST' };
  }
  const dir = goal.direction === 'lower' ? 'lower' : 'higher';
  const tolerance = Math.max(0, Number(goal.toleranceBand) || 0);
  const target = Number(goal.targetValue);
  const projected = forecastResult.projected;

  // Gap = how far below target (for higher-is-better) or above target
  // (for lower-is-better). Positive gap = miss.
  let gap;
  if (dir === 'higher') {
    gap = target - projected;
  } else {
    gap = projected - target;
  }

  const onTrack = gap <= tolerance;
  // Use CI band to grade severity — wider CI = less certain, downgrade
  // severity. A miss whose CI upper bound STILL misses = critical.
  const ciUpperOnTargetSide =
    dir === 'higher' ? forecastResult.ci95.upper : -forecastResult.ci95.lower;
  const targetOnSide = dir === 'higher' ? target : -target;
  const ciMisses = ciUpperOnTargetSide < targetOnSide;

  let severity = 'low';
  if (!onTrack) {
    if (ciMisses) {
      severity = 'critical'; // even the optimistic CI bound misses
    } else if (Math.abs(gap) > 2 * tolerance + 1e-6) {
      severity = 'high';
    } else {
      severity = 'medium';
    }
  }

  return {
    onTrack,
    gap,
    severity,
    projected,
    target,
    direction: dir,
    toleranceBand: tolerance,
    ciMisses,
  };
}

module.exports = {
  forecast,
  evaluateAgainstTarget,
  Z_95,
  _slopeFor, // exported for targeted unit tests
};
