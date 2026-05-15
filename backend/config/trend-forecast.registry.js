'use strict';

/**
 * trend-forecast.registry.js — World-Class QMS Phase 29 Commit 14.
 *
 * Lightweight time-series forecasting helpers. We deliberately keep
 * the math simple + transparent (linear regression + Holt-Winters
 * single-exponential smoothing) so a quality manager can defend the
 * forecast in front of an auditor.
 *
 * No external dependencies — all math runs in pure JS.
 */

/**
 * Ordinary least squares — returns slope, intercept, predicted value
 * at any future x, and an R² goodness-of-fit.
 *
 * @param {Array<number>} ys — observed values at sequential x = 0..n-1
 */
function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return null;
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  // R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = slope * xs[i] + intercept;
    ssRes += (ys[i] - yHat) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return {
    slope,
    intercept,
    r2,
    predict(x) {
      return slope * x + intercept;
    },
  };
}

/**
 * Simple exponential smoothing for one-step-ahead forecasting. Alpha
 * is the smoothing factor (0-1); 0.3 is a sensible default.
 */
function exponentialSmooth(ys, alpha = 0.3) {
  if (!ys || ys.length === 0) return [];
  const out = [ys[0]];
  for (let i = 1; i < ys.length; i++) {
    out.push(alpha * ys[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

/**
 * Detect a step-change in the level of a series using the CUSUM
 * (cumulative sum) algorithm. Returns null or the index of the first
 * point flagged as out-of-control.
 *
 * Industry-standard CUSUM with target = mean(referenceWindow),
 * H = 5σ, k = 0.5σ (Page 1954).
 */
function detectLevelShift(ys, { referenceWindow = 10 } = {}) {
  if (!ys || ys.length < referenceWindow + 1) return null;
  const ref = ys.slice(0, referenceWindow);
  const mean = ref.reduce((a, b) => a + b, 0) / ref.length;
  const sd = Math.sqrt(ref.reduce((a, b) => a + (b - mean) ** 2, 0) / ref.length);
  if (sd === 0) return null;
  const k = 0.5 * sd;
  const H = 5 * sd;
  let cuPos = 0;
  let cuNeg = 0;
  for (let i = referenceWindow; i < ys.length; i++) {
    cuPos = Math.max(0, cuPos + ys[i] - mean - k);
    cuNeg = Math.min(0, cuNeg + ys[i] - mean + k);
    if (cuPos > H) return { index: i, direction: 'up' };
    if (cuNeg < -H) return { index: i, direction: 'down' };
  }
  return null;
}

/**
 * Forecast the next `horizon` points using linear-regression trend +
 * one-step exponential smoothing for the level. Returns forecast values
 * plus a simple ± confidence band based on residual standard deviation.
 */
function forecast(ys, { horizon = 3, alpha = 0.3 } = {}) {
  if (!ys || ys.length < 3) return null;
  const lr = linearRegression(ys);
  if (!lr) return null;
  // residual stddev for confidence band
  const residuals = ys.map((v, i) => v - lr.predict(i));
  const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const sdRes = Math.sqrt(residuals.reduce((a, b) => a + (b - meanRes) ** 2, 0) / residuals.length);
  const points = [];
  for (let h = 1; h <= horizon; h++) {
    const t = ys.length - 1 + h;
    const yHat = lr.predict(t);
    points.push({
      index: t,
      forecast: yHat,
      lower95: yHat - 1.96 * sdRes,
      upper95: yHat + 1.96 * sdRes,
    });
  }
  return {
    slope: lr.slope,
    intercept: lr.intercept,
    r2: lr.r2,
    sdRes,
    points,
    smoothed: exponentialSmooth(ys, alpha),
  };
}

module.exports = {
  linearRegression,
  exponentialSmooth,
  detectLevelShift,
  forecast,
};
