/**
 * goalProgressObservations.js — Beneficiary-360 Commit 28.
 *
 * Adapter for:
 *
 *   clinical.progress.regression.significant
 *     → deltaVsBaseline(beneficiaryId) →
 *       { deltaPct: <number|null> }
 *     Condition: `deltaPct <= -20` → flag raised.
 *
 * Registered as `goalProgressService` in the locator. Reads the
 * new `GoalProgressSnapshot` time-series.
 *
 * Design decisions:
 *
 *   1. **Per-goal baseline selection.** For each goal the
 *      beneficiary has snapshots for, we pick:
 *        • **baseline** = most recent snapshot on-or-before
 *          `now - 30 days` (fallback: earliest snapshot in the
 *          30-day window if no pre-window snapshot exists)
 *        • **current** = most recent snapshot within the window
 *
 *   2. **Delta is absolute percentage-point difference.** Rehab
 *      progress is measured in % (0–100); a drop from 80% to
 *      60% is a -20 pp drop. NOT relative (not `(60-80)/80` =
 *      -25%). The registry's `<= -20` condition assumes
 *      percentage-point units.
 *
 *   3. **MIN across goals** (most negative = worst regression).
 *      A beneficiary whose motor goal dropped 25pp and whose
 *      speech goal gained 5pp has `deltaPct: -25` — the worst-
 *      regressed goal sets the alarm.
 *
 *   4. **Goals identified by `goalId` when present, else by
 *      `goalName`.** Legacy records without `goalId` still track
 *      over time via their name.
 *
 *   5. **Null when insufficient data.** A goal with only one
 *      snapshot can't yield a delta — skip it. If ALL goals
 *      skip, return `null` — the `<=` comparison against null
 *      stays false and the flag stays clear.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/GoalProgressSnapshot');

const MS_PER_DAY = 24 * 3600 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createGoalProgressObservations(deps = {}) {
  const Model = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.GoalProgressSnapshot);
  if (Model == null) {
    throw new Error('goalProgressObservations: GoalProgressSnapshot model is required');
  }

  // Group snapshots by goal identity. `goalId` (if present) takes
  // precedence; fallback is `goalName`. Serialize the key for Map.
  function keyOf(row) {
    return row.goalId ? `id:${String(row.goalId)}` : `nm:${row.goalName}`;
  }

  async function deltaVsBaseline(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const windowDays =
      typeof options.windowDays === 'number' ? options.windowDays : DEFAULT_WINDOW_DAYS;
    const windowStart = new Date(now.getTime() - windowDays * MS_PER_DAY);

    // One DB round-trip: pull every snapshot up to `now`. In-memory
    // grouping + selection. For a typical beneficiary (a dozen
    // goals × a few months of snapshots), the dataset is small.
    const rows = await Model.find(
      { beneficiaryId, measuredAt: { $lte: now } },
      'goalId goalName progressPct measuredAt'
    ).lean();

    if (rows.length === 0) return { deltaPct: null };

    const byGoal = new Map();
    for (const r of rows) {
      const k = keyOf(r);
      if (!byGoal.has(k)) byGoal.set(k, []);
      byGoal.get(k).push(r);
    }

    const deltas = [];
    for (const snapshots of byGoal.values()) {
      snapshots.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
      // Pick baseline: most recent on-or-before windowStart.
      let baseline = null;
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (new Date(snapshots[i].measuredAt) <= windowStart) {
          baseline = snapshots[i];
          break;
        }
      }
      // Fallback: the EARLIEST in-window snapshot.
      const inWindow = snapshots.filter(s => new Date(s.measuredAt) > windowStart);
      if (baseline == null) {
        if (inWindow.length < 2) continue; // need two distinct points
        baseline = inWindow[0];
      }
      // Current: the latest snapshot (must be strictly after baseline).
      const current = snapshots[snapshots.length - 1];
      if (new Date(current.measuredAt).getTime() === new Date(baseline.measuredAt).getTime()) {
        continue; // same observation → no delta possible
      }
      const delta = current.progressPct - baseline.progressPct;
      deltas.push(Math.round(delta * 100) / 100);
    }

    if (deltas.length === 0) return { deltaPct: null };
    return { deltaPct: Math.min(...deltas) };
  }

  return Object.freeze({ deltaVsBaseline });
}

module.exports = { createGoalProgressObservations };
