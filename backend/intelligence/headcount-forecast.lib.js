/**
 * headcount-forecast.lib.js — pure workforce supply-planning math (W1203).
 *
 * Given a current headcount, an attrition rate, a target, and a horizon, projects
 * survivors and the hiring need to reach the target. All pure (no DB, no Date).
 *
 * Model (deliberately simple + explainable — it drives recruitment budget, so each
 * number must be defensible):
 *   - survivors after N periods = current × (1 − attrition)^N   (compound retention)
 *   - attritionLosses           = current − survivors
 *   - growthHires               = max(0, target − current)
 *   - replacementHires          = attritionLosses  (offset what you lose; first-order —
 *                                 second-order attrition of NEW hires is ignored and
 *                                 flagged in `assumptions`, so plans stay conservative)
 *   - totalHiringNeed           = growthHires + replacementHires
 *   - gapToTargetNoAction       = target − survivors  (shortfall if you hire nothing)
 */

'use strict';

function clampPct(p) {
  const v = Number(p);
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 100) return 100;
  return v;
}
function clampInt(n, min, max) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
function round(n) {
  return Math.round(Number(n) || 0);
}

/**
 * @param {object} p
 * @param {number} p.current        current headcount (≥0)
 * @param {number} p.target         target headcount at end of horizon (≥0)
 * @param {number} p.attritionRatePct  per-period attrition % (0-100)
 * @param {number} p.periods        horizon length (1-10)
 */
function forecastHeadcount({ current, target, attritionRatePct, periods } = {}) {
  const cur = Math.max(0, round(current));
  const tgt = Math.max(0, round(target == null ? current : target));
  const a = clampPct(attritionRatePct) / 100;
  const n = clampInt(periods == null ? 1 : periods, 1, 10);

  // per-period survivor trajectory (period 0 = now)
  const trajectory = [{ period: 0, headcount: cur }];
  let hc = cur;
  for (let t = 1; t <= n; t++) {
    hc = hc * (1 - a);
    trajectory.push({ period: t, headcount: round(hc) });
  }
  const survivors = round(cur * Math.pow(1 - a, n));
  const attritionLosses = Math.max(0, cur - survivors);
  const growthHires = Math.max(0, tgt - cur);
  const replacementHires = attritionLosses;
  const totalHiringNeed = growthHires + replacementHires;
  const gapToTargetNoAction = tgt - survivors;

  return {
    current: cur,
    target: tgt,
    periods: n,
    attritionRatePct: clampPct(attritionRatePct),
    survivors,
    attritionLosses,
    growthHires,
    replacementHires,
    totalHiringNeed,
    gapToTargetNoAction,
    annualHiringPace: round(totalHiringNeed / n),
    trajectory,
    assumptions: [
      'compound retention: survivors = current × (1−attrition)^periods',
      'replacement = first-order attrition only (new hires not re-attrited — conservative)',
    ],
  };
}

/** Roll several department/branch forecasts into an org total. */
function rollupPlans(forecasts) {
  const sum = (key) => (forecasts || []).reduce((a, f) => a + (Number(f && f[key]) || 0), 0);
  return {
    units: (forecasts || []).length,
    current: sum('current'),
    target: sum('target'),
    survivors: sum('survivors'),
    growthHires: sum('growthHires'),
    replacementHires: sum('replacementHires'),
    totalHiringNeed: sum('totalHiringNeed'),
  };
}

module.exports = { clampPct, clampInt, round, forecastHeadcount, rollupPlans };
