'use strict';

/**
 * regression.js — Wave 219 pure linear regression module.
 *
 * Ordinary-least-squares linear fit y = a + b·x with a 95% confidence
 * interval on the slope. Pure functions only — no DB, no time
 * dependencies. Designed to be called by measureTrendEngine.service
 * once it has assembled the (date, score) data points.
 *
 * Conventions:
 *   • Time axis (x) is expressed in DAYS since the earliest point.
 *     The caller decides how to convert raw dates → days; usually
 *     `(point.date - earliest.date) / 86_400_000`.
 *   • Slope (b) is therefore in units of "score per day". Engine
 *     callers usually multiply by 30 to display "per month".
 *
 * Why we reimplement rather than pull a library:
 *   • OLS + slope CI is ~30 lines — a dependency for this is overkill.
 *   • Test isolation: pure functions + no I/O means we can fixture
 *     against published regression examples (e.g. NIST StRD).
 *   • Version pinning matters here: Wave 211b freezes the algorithm
 *     version into MeasureApplication, and the trend engine refuses
 *     to mix across major bumps. A drifting external lib would
 *     silently change the trend numbers across deploys.
 */

/**
 * Two-tailed Student-t critical value for 95% CI, lookup table for
 * small samples. n ≥ 30 falls back to 1.96 (normal approximation).
 */
const T_TABLE_95 = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  21: 2.08,
  22: 2.074,
  23: 2.069,
  24: 2.064,
  25: 2.06,
  26: 2.056,
  27: 2.052,
  28: 2.048,
  29: 2.045,
};
function _tCrit95(df) {
  if (df <= 0) return null;
  return T_TABLE_95[df] || 1.96;
}

/**
 * Fit y = intercept + slope·x by OLS. Returns null when the data
 * doesn't support a slope (n < 3 or x has zero variance).
 *
 * @param {Array<{x: number, y: number}>} points
 * @returns {Object|null}
 */
function fitLinear(points) {
  if (!Array.isArray(points) || points.length < 3) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  // R²
  const r2 = syy === 0 ? 1 : Math.max(0, Math.min(1, 1 - (syy - slope * sxy) / syy));

  // Residual standard error → standard error of slope
  const df = n - 2;
  const sseSlope = (syy - slope * sxy) / df;
  // sseSlope can be slightly negative due to floating-point — clamp.
  const sSlope = Math.sqrt(Math.max(0, sseSlope) / sxx);

  // 95% CI on slope
  const tCrit = _tCrit95(df);
  const halfWidth = tCrit != null ? tCrit * sSlope : null;
  const ci95 = halfWidth != null ? [slope - halfWidth, slope + halfWidth] : null;

  return {
    slope,
    intercept,
    r2,
    standardError: sSlope,
    ci95,
    n,
    df,
  };
}

/**
 * Build (x, y) points from administration records. x is days since
 * the earliest record's applicationDate; y is totalRawScore.
 *
 * Returns { points, earliestDate } so callers can reconstruct
 * the date scale if they need to.
 */
function buildPoints(admins) {
  if (!Array.isArray(admins) || admins.length === 0) {
    return { points: [], earliestDate: null };
  }
  const cleaned = admins.filter(a => a && a.applicationDate && typeof a.totalRawScore === 'number');
  if (cleaned.length === 0) return { points: [], earliestDate: null };

  const earliestDate = new Date(
    Math.min(...cleaned.map(a => new Date(a.applicationDate).getTime()))
  );
  const earliestMs = earliestDate.getTime();
  const points = cleaned
    .map(a => ({
      x: (new Date(a.applicationDate).getTime() - earliestMs) / 86400000,
      y: a.totalRawScore,
      date: a.applicationDate,
      id: a._id,
    }))
    .sort((a, b) => a.x - b.x);
  return { points, earliestDate };
}

module.exports = { fitLinear, buildPoints };
