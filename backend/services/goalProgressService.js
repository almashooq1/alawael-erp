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

// ─── Phase-2: KPI-facing async rollups over GoalProgressEntry / TherapeuticGoal ───

const mongoose = require('mongoose');

function getModels() {
  try {
    return {
      GoalProgressEntry:
        mongoose.models.GoalProgressEntry || require('../models/GoalProgressEntry'),
      TherapeuticGoal:
        mongoose.models.TherapeuticGoal ||
        require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal,
    };
  } catch {
    return {};
  }
}

function sinceDate(windowDays = 30) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

/**
 * Average of the latest progress entry per goal over the window.
 * Used by KPI `rehab.outcomes.goal_progress.pct` → averageProgressPct.
 */
async function summarize(opts = {}) {
  const { GoalProgressEntry } = getModels();
  if (!GoalProgressEntry) return { averageProgressPct: null, goalCount: 0, entriesCount: 0 };

  const query = { recordedAt: { $gte: sinceDate(opts.windowDays ?? 30) } };
  if (opts.beneficiaryId) query.beneficiaryId = opts.beneficiaryId;

  const entries = await GoalProgressEntry.find(query).lean();
  const goalMap = groupByGoal(entries);
  const latestProgress = [];
  for (const [, items] of goalMap) {
    const series = trajectory(items);
    if (series.length) latestProgress.push(series[series.length - 1].progressPercent);
  }

  const averageProgressPct = latestProgress.length
    ? Math.round((latestProgress.reduce((a, b) => a + b, 0) / latestProgress.length) * 10) / 10
    : null;

  return {
    averageProgressPct,
    goalCount: goalMap.size,
    entriesCount: entries.length,
  };
}

/**
 * Percentage of tracked goals marked achieved within the window.
 * Used by KPI `rehab.goals.achievement_rate.pct` → achievedPct.
 */
async function achievementSummary(opts = {}) {
  const { TherapeuticGoal } = getModels();
  if (!TherapeuticGoal) return { achievedPct: null, achieved: 0, total: 0 };

  const baseQ = {};
  if (opts.branchId) baseQ.branchId = opts.branchId;
  if (opts.beneficiaryId) baseQ.beneficiaryId = opts.beneficiaryId;

  const since = sinceDate(opts.windowDays ?? 90);
  const [achieved, total] = await Promise.all([
    TherapeuticGoal.countDocuments({
      ...baseQ,
      status: 'achieved',
      achievedDate: { $gte: since },
    }),
    TherapeuticGoal.countDocuments({
      ...baseQ,
      status: { $in: ['active', 'achieved', 'partially_achieved', 'not_achieved'] },
    }),
  ]);

  return {
    achievedPct: total > 0 ? Math.round((achieved / total) * 1000) / 10 : null,
    achieved,
    total,
  };
}

/**
 * Percentage of goals with no progress entry in `stallDays` (default 21).
 * Used by KPI `rehab.goals.stalled.pct` → stalledPct.
 */
async function trendSummary(opts = {}) {
  const { GoalProgressEntry } = getModels();
  if (!GoalProgressEntry) return { stalledPct: null, stalledCount: 0, totalGoals: 0 };

  const query = { recordedAt: { $gte: sinceDate(opts.windowDays ?? 90) } };
  if (opts.beneficiaryId) query.beneficiaryId = opts.beneficiaryId;

  const entries = await GoalProgressEntry.find(query).lean();
  const goalMap = groupByGoal(entries);
  const asOf = new Date();
  const stallDays = Number(opts.stallDays ?? 21);
  let stalledCount = 0;

  for (const [, items] of goalMap) {
    const series = trajectory(items);
    if (!series.length) continue;
    const last = series[series.length - 1];
    const daysSinceLast = Math.round((asOf - last.recordedAt) / 86400000);
    const v = verdict(series);
    if (v !== 'achieved' && daysSinceLast >= stallDays) stalledCount += 1;
  }

  const totalGoals = goalMap.size;
  return {
    stalledPct: totalGoals > 0 ? Math.round((stalledCount / totalGoals) * 1000) / 10 : null,
    stalledCount,
    totalGoals,
  };
}

/**
 * Mean days from goal startDate to achievedDate for goals closed in the window.
 * Used by KPI `rehab.goals.velocity.mean_days` → meanDays.
 */
async function velocitySummary(opts = {}) {
  const { TherapeuticGoal } = getModels();
  if (!TherapeuticGoal) return { meanDays: null, count: 0 };

  const baseQ = {
    status: 'achieved',
    achievedDate: { $gte: sinceDate(opts.windowDays ?? 180) },
  };
  if (opts.branchId) baseQ.branchId = opts.branchId;
  if (opts.beneficiaryId) baseQ.beneficiaryId = opts.beneficiaryId;

  const goals = await TherapeuticGoal.find(baseQ, 'startDate achievedDate').lean();
  const durations = goals
    .filter(g => g.startDate && g.achievedDate)
    .map(g => Math.round((new Date(g.achievedDate) - new Date(g.startDate)) / 86400000));

  return {
    meanDays: durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null,
    count: durations.length,
  };
}

/**
 * Mean FIM (Functional Independence Measure) delta for goals/outcome entries
 * that carry a FIM-linked outcomeMeasureCode.
 */
async function fimDeltaMean(opts = {}) {
  const { GoalProgressEntry } = getModels();
  if (!GoalProgressEntry) return { deltaMean: null, count: 0 };

  const baseQ = { outcomeMeasureCode: { $in: ['FIM', 'fim', 'functionalIndependence'] } };
  if (opts.branchId) baseQ.branchId = opts.branchId;
  if (opts.beneficiaryId) baseQ.beneficiaryId = opts.beneficiaryId;
  if (opts.windowDays) baseQ.recordedAt = { $gte: sinceDate(opts.windowDays) };

  const entries = await GoalProgressEntry.find(baseQ).lean();
  const byGoal = groupByGoal(entries);
  const deltas = [];
  for (const [, items] of byGoal) {
    const series = trajectory(items);
    if (series.length >= 2) {
      const first = series[0].progressPercent;
      const last = series[series.length - 1].progressPercent;
      deltas.push(last - first);
    }
  }
  return {
    deltaMean: deltas.length
      ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
      : null,
    count: deltas.length,
  };
}

module.exports = {
  THRESHOLDS,
  trajectory,
  verdict,
  detectStalled,
  groupByGoal,
  summarizeByBeneficiary,
  summarize,
  achievementSummary,
  trendSummary,
  velocitySummary,
  fimDeltaMean,
};
