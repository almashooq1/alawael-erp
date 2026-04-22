/**
 * progressEngine.js — statistical layer over Goal + GoalProgress.
 *
 * Phase 9 Commit 11. Pure-function engine answering the four
 * outcome-tracking questions the UI / scheduler / red-flag system
 * need to answer about any in-flight goal:
 *
 *   1. What direction is progress moving?  → computeTrend()
 *   2. Will we hit the target on time?     → computeVelocity()
 *   3. Has mastery been achieved?          → isMastered()
 *   4. How many consecutive regressions?   → consecutiveRegressed()
 *
 * All functions operate on plain data — a goal object with
 * `baseline`, `target`, `startDate`, `targetDate`, and an array of
 * progress entries `{ recordedAt, measuredValue, rating }`. No
 * mongoose, no DB, no async. That makes every function a candidate
 * for caching, batch rollups, and red-flag trigger sources without
 * plumbing concerns.
 *
 * Also exposes the contract the `clinical.goal.stalled.21d` +
 * `clinical.goal.regression.consecutive_2` red-flags declare —
 * registering this engine under the locator name `goalProgressService`
 * in a future commit will activate both flags.
 */

'use strict';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Trend thresholds — tuned to the registry's clinical expectations.
// A stalled trend is the "no meaningful movement" signal used by the
// `clinical.goal.stalled.21d` red-flag's companion evaluator.
const STALL_VARIANCE_THRESHOLD = 0.02; // coefficient of variation
const IMPROVEMENT_SLOPE_RATIO = 0.05; // slope ≥ 5% of target range
const DECLINE_SLOPE_RATIO = -0.05; // slope ≤ −5% of target range

const PROGRESS_TRENDS = Object.freeze(['IMPROVING', 'STABLE', 'DECLINING', 'STALLED']);

// ─── Helpers ───────────────────────────────────────────────────────

function byRecordedAtAsc(a, b) {
  return new Date(a.recordedAt) - new Date(b.recordedAt);
}

function numericSeries(entries) {
  return entries
    .filter(e => typeof e.measuredValue === 'number' && Number.isFinite(e.measuredValue))
    .sort(byRecordedAtAsc)
    .map(e => e.measuredValue);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return s / (arr.length - 1);
}

/**
 * Simple linear regression slope (y on index x). Returns 0 for
 * series with fewer than 2 points.
 */
function linearSlope(series) {
  const n = series.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function range(goal) {
  const b = Number(goal.baseline);
  const t = Number(goal.target);
  if (!Number.isFinite(b) || !Number.isFinite(t)) return null;
  return t - b;
}

// ─── 1. Trend ──────────────────────────────────────────────────────

/**
 * Classify a progress series as IMPROVING / STABLE / DECLINING /
 * STALLED. Needs at least 2 entries to do anything interesting;
 * fewer → STALLED (insufficient signal).
 *
 * The "stalled" verdict specifically catches flat lines — zero
 * variance across ≥3 entries — which is how we distinguish "holding
 * steady on purpose" (STABLE) from "no improvement despite sessions"
 * (STALLED, the dangerous one).
 */
function computeTrend(goal, entries = []) {
  const series = numericSeries(entries);
  if (series.length < 2) return 'STALLED';

  const targetRange = range(goal);
  if (!targetRange || targetRange === 0) {
    // No target range to normalise against — infer from series itself
    const fallbackRange = Math.max(...series) - Math.min(...series) || 1;
    return slopeToTrend(linearSlope(series), fallbackRange, series);
  }
  return slopeToTrend(linearSlope(series), Math.abs(targetRange), series);
}

function slopeToTrend(slope, normRange, series) {
  // Flat line detection first — beats slope (which is 0 anyway).
  if (series.length >= 3) {
    const m = mean(series);
    const cv = m === 0 ? 0 : Math.sqrt(variance(series)) / Math.abs(m);
    if (cv < STALL_VARIANCE_THRESHOLD && Math.abs(slope) < 1e-9) return 'STALLED';
  }
  const ratio = slope / normRange;
  if (ratio >= IMPROVEMENT_SLOPE_RATIO) return 'IMPROVING';
  if (ratio <= DECLINE_SLOPE_RATIO) return 'DECLINING';
  return 'STABLE';
}

// ─── 2. Velocity ───────────────────────────────────────────────────

/**
 * Compute the rate at which the beneficiary is closing the gap
 * between baseline and target, and project whether the current
 * pace will meet targetDate.
 *
 * @returns {{
 *   ratePerDay: number,
 *   currentValue: number,
 *   percentToTarget: number,
 *   daysRemaining: number|null,
 *   projectedCompletionDays: number|null,
 *   onTrack: boolean|null,
 * }}
 */
function computeVelocity(goal, entries = [], now = new Date()) {
  const sorted = entries.slice().sort(byRecordedAtAsc);
  const latest = sorted[sorted.length - 1];
  const currentValue = latest ? Number(latest.measuredValue) : Number(goal.baseline);
  const targetRange = range(goal);

  let percentToTarget = 0;
  if (targetRange && targetRange !== 0) {
    percentToTarget = ((currentValue - Number(goal.baseline)) / targetRange) * 100;
    // Clamp — values outside [0,100] happen when the baseline is exceeded
    // either direction; clamp for reporting but keep raw ratePerDay honest.
    percentToTarget = Math.max(0, Math.min(100, percentToTarget));
  }

  let ratePerDay = 0;
  if (sorted.length >= 2) {
    const first = sorted[0];
    const days = (new Date(latest.recordedAt) - new Date(first.recordedAt)) / MS_PER_DAY;
    if (days > 0) {
      ratePerDay = (Number(latest.measuredValue) - Number(first.measuredValue)) / days;
    }
  }

  let daysRemaining = null;
  let projectedCompletionDays = null;
  let onTrack = null;
  if (goal.targetDate) {
    daysRemaining = Math.max(0, Math.floor((new Date(goal.targetDate) - now) / MS_PER_DAY));
    if (targetRange && ratePerDay !== 0) {
      const remainingValue = Number(goal.target) - currentValue;
      const rate =
        (targetRange > 0 && ratePerDay > 0) || (targetRange < 0 && ratePerDay < 0)
          ? Math.abs(ratePerDay)
          : 0;
      if (rate > 0) {
        projectedCompletionDays = Math.ceil(Math.abs(remainingValue) / rate);
        onTrack = projectedCompletionDays <= daysRemaining;
      } else {
        projectedCompletionDays = null;
        onTrack = false;
      }
    } else if (percentToTarget >= 100) {
      onTrack = true;
      projectedCompletionDays = 0;
    }
  }

  return {
    ratePerDay: Number(ratePerDay.toFixed(4)),
    currentValue,
    percentToTarget: Number(percentToTarget.toFixed(1)),
    daysRemaining,
    projectedCompletionDays,
    onTrack,
  };
}

// ─── 3. Mastery ────────────────────────────────────────────────────

/**
 * Basic mastery check: the last N entries all meet-or-exceed target
 * (for higher-is-better goals) or at-or-below target (for lower-is-
 * better goals, inferred when baseline > target).
 *
 * The goal's masteryCriteria string is *advisory* — it's free text
 * meant for humans; callers supply `{ consecutiveRequired }` when
 * they want stricter logic. Default is 3 (industry standard for
 * educational/therapeutic mastery claims).
 */
function isMastered(goal, entries = [], { consecutiveRequired = 3 } = {}) {
  const sorted = entries.slice().sort(byRecordedAtAsc);
  if (sorted.length < consecutiveRequired) return false;
  const tail = sorted.slice(-consecutiveRequired);
  const target = Number(goal.target);
  const baseline = Number(goal.baseline);
  const higherIsBetter = target >= baseline;

  return tail.every(e => {
    const v = Number(e.measuredValue);
    if (!Number.isFinite(v)) return false;
    return higherIsBetter ? v >= target : v <= target;
  });
}

// ─── 4. Consecutive regressions (red-flag feed) ────────────────────

/**
 * Count back-to-back REGRESSED progress ratings from the newest entry
 * backward. Exposed on an object whose shape matches the trigger
 * source declared by `clinical.goal.regression.consecutive_2`
 * (method: 'consecutiveRatings', path: 'regressedStreak').
 */
function consecutiveRegressed(entries = []) {
  const sorted = entries.slice().sort(byRecordedAtAsc);
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i].rating || '').toUpperCase() === 'REGRESSED') streak++;
    else break;
  }
  return { regressedStreak: streak };
}

/**
 * Days since the most recent progress entry. Matches the red-flag
 * `clinical.goal.stalled.21d` trigger contract (method:
 * 'daysSinceLastProgress', path: 'daysSince').
 */
function daysSinceLastProgress(entries = [], now = new Date()) {
  if (!entries || entries.length === 0) {
    return { daysSince: Number.POSITIVE_INFINITY, latestAt: null };
  }
  const sorted = entries.slice().sort(byRecordedAtAsc);
  const latest = sorted[sorted.length - 1];
  const latestAt = new Date(latest.recordedAt);
  const days = Math.floor((now - latestAt) / MS_PER_DAY);
  return { daysSince: Math.max(0, days), latestAt };
}

// ─── Red-flag trigger-source shape ─────────────────────────────────

/**
 * Build an object that satisfies the two red-flag trigger contracts
 * declared in config/red-flags.registry.js Commit 3, over a function
 * that fetches progress entries for a given goalId.
 *
 * Register with the locator:
 *   locator.register('goalProgressService',
 *     buildGoalProgressTriggerSource({ fetchEntries }));
 */
function buildGoalProgressTriggerSource({ fetchEntries } = {}) {
  if (typeof fetchEntries !== 'function') {
    throw new Error(
      'progressEngine.buildGoalProgressTriggerSource: fetchEntries({goalId}) is required'
    );
  }
  return {
    async consecutiveRatings(goalId) {
      const entries = await fetchEntries({ goalId });
      return consecutiveRegressed(entries || []);
    },
    async daysSinceLastProgress(goalId) {
      const entries = await fetchEntries({ goalId });
      return daysSinceLastProgress(entries || []);
    },
  };
}

module.exports = {
  PROGRESS_TRENDS,
  computeTrend,
  computeVelocity,
  isMastered,
  consecutiveRegressed,
  daysSinceLastProgress,
  buildGoalProgressTriggerSource,
  // internals exposed for tests
  _linearSlope: linearSlope,
  _mean: mean,
  _variance: variance,
};
