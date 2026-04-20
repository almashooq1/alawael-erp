/**
 * goalProgressService — pure math over GoalProgressEntry records.
 *
 * Computes:
 *   • trajectory(entries)       — sorted-by-date series with delta + days
 *   • verdict(series)           — improving / steady / stalled / achieved /
 *                                 declining / insufficient
 *   • detectStalled(byGoal, asOf?) — list of goals with no progress
 *                                    movement in `OPS_STALL_DAYS` (default 30)
 *   • summarizeByBeneficiary(entries) — counts + avg progress + stalled
 *
 * Same architectural pattern as outcomeService and sessionAttendanceService:
 * pure JS, no DB, fully unit-testable.
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}
function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

const THRESHOLDS = {
  // No movement for this many days → 'stalled' verdict + watchlist entry.
  get stallDays() {
    return envInt('GOAL_STALL_DAYS', 30);
  },
  // Below this absolute change between first and last → 'steady'.
  get steadyBand() {
    return envFloat('GOAL_STEADY_BAND', 5);
  },
  // Min entries needed for a verdict beyond 'insufficient'.
  get minEntries() {
    return envInt('GOAL_MIN_ENTRIES', 2);
  },
  // Achievement threshold — at or above counts as 'achieved'.
  get achievedAt() {
    return envInt('GOAL_ACHIEVED_AT', 100);
  },
};

function trajectory(entries) {
  const sorted = (entries || [])
    .filter(e => e && Number.isFinite(Number(e.progressPercent)) && e.recordedAt)
    .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const series = [];
  for (const e of sorted) {
    const prev = series[series.length - 1];
    const cur = {
      recordedAt: new Date(e.recordedAt),
      progressPercent: Number(e.progressPercent),
      delta: prev ? Math.round((Number(e.progressPercent) - prev.progressPercent) * 10) / 10 : 0,
      daysSincePrev: prev
        ? Math.round((new Date(e.recordedAt) - prev.recordedAt) / 86400000)
        : null,
      sessionId: e.sessionId ? String(e.sessionId) : null,
      note: e.note || null,
    };
    series.push(cur);
  }
  return series;
}

function verdict(series) {
  if (!series || series.length < THRESHOLDS.minEntries) return 'insufficient';
  const last = series[series.length - 1];
  if (last.progressPercent >= THRESHOLDS.achievedAt) return 'achieved';
  const first = series[0];
  const totalDelta = last.progressPercent - first.progressPercent;
  if (Math.abs(totalDelta) < THRESHOLDS.steadyBand) return 'steady';
  return totalDelta > 0 ? 'improving' : 'declining';
}

/**
 * Identify stalled goals — last entry was > stallDays ago AND verdict
 * isn't 'achieved'. Caller passes a Map<goalId, entries[]>.
 *
 * @param {Map<string, Array>} byGoal
 * @param {Date} asOf — defaults to new Date()
 * @returns {Array<{goalId, lastRecordedAt, daysSinceLast, lastProgress}>}
 */
function detectStalled(byGoal, asOf = new Date()) {
  const stalled = [];
  for (const [goalId, entries] of byGoal) {
    const series = trajectory(entries);
    if (series.length === 0) continue;
    const v = verdict(series);
    if (v === 'achieved') continue;
    const last = series[series.length - 1];
    const daysSinceLast = Math.round((asOf - last.recordedAt) / 86400000);
    if (daysSinceLast >= THRESHOLDS.stallDays) {
      stalled.push({
        goalId,
        lastRecordedAt: last.recordedAt,
        daysSinceLast,
        lastProgress: last.progressPercent,
        verdict: v,
      });
    }
  }
  return stalled.sort((a, b) => b.daysSinceLast - a.daysSinceLast);
}

function groupByGoal(entries) {
  const m = new Map();
  for (const e of entries) {
    const id = String(e.goalId);
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(e);
  }
  return m;
}

/**
 * Per-beneficiary rollup: how many goals tracked, average current
 * progress, count by verdict, stalled count.
 */
function summarizeByBeneficiary(entries) {
  const goalMap = groupByGoal(entries);
  const verdictCounts = {
    achieved: 0,
    improving: 0,
    steady: 0,
    declining: 0,
    stalled: 0,
    insufficient: 0,
  };
  const finalProgress = [];
  for (const [, items] of goalMap) {
    const series = trajectory(items);
    if (series.length === 0) continue;
    const v = verdict(series);
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
    finalProgress.push(series[series.length - 1].progressPercent);
  }
  const stalled = detectStalled(goalMap);
  // detectStalled is its own bucket for the watchlist; also reflect into counts.
  for (const s of stalled) {
    // A stalled goal's verdict was already counted (improving/steady/etc).
    // We override here so the totals reflect the operational view.
    const v = s.verdict;
    if (verdictCounts[v] > 0) verdictCounts[v] -= 1;
    verdictCounts.stalled += 1;
  }
  return {
    totalGoals: goalMap.size,
    avgProgress:
      finalProgress.length > 0
        ? Math.round((finalProgress.reduce((a, b) => a + b, 0) / finalProgress.length) * 10) / 10
        : null,
    verdictCounts,
    stalled: stalled.length,
  };
}

module.exports = {
  THRESHOLDS,
  trajectory,
  verdict,
  detectStalled,
  groupByGoal,
  summarizeByBeneficiary,
};
