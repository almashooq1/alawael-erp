/**
 * GoalProgressSnapshot.js — Time-series of rehab-goal progress.
 *
 * Beneficiary-360 Commit 28. Powers
 * `clinical.progress.regression.significant`.
 *
 * The existing `CarePlan.goals` sub-document carries a single
 * current `progress` percentage — it's the clinician's latest
 * estimate. To detect regression we need HISTORY: how did
 * progress move over the last 30 days? This collection captures
 * one snapshot per measurement, keyed to goal and beneficiary,
 * so the adapter can compute baseline-to-current deltas.
 *
 * Design decisions:
 *
 *   1. **One row per measurement, append-only in practice.**
 *      Edit-corrections should create a successor row (new
 *      measurement at a new time) rather than rewrite an old
 *      row. That keeps the history auditable.
 *
 *   2. **`goalId` + `goalName`.** Foreign-key to the CarePlan
 *      goal when available, but store the name alongside so old
 *      snapshots don't go mystery-data after a care-plan revision
 *      renames the goal.
 *
 *   3. **`progressPct` is a percentage (0–100).** Clamping is
 *      not enforced at the schema — the clinical intent can
 *      require values like 110 (exceeded target) and the
 *      adapter handles this fine.
 *
 *   4. **`measuredAt` is the observational time.** The adapter
 *      queries by this field; `createdAt` is preserved only for
 *      audit traceability.
 */

'use strict';

const mongoose = require('mongoose');

const goalProgressSnapshotSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    // Identify the goal being measured. `goalId` is optional so
    // observations imported from legacy paper forms without a
    // care-plan linkage still track.
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    goalName: { type: String, required: true, trim: true },
    progressPct: { type: Number, required: true },
    measuredAt: { type: Date, required: true, index: true },
    measuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, collection: 'goal_progress_snapshots' }
);

// Primary query: most recent snapshot per (beneficiary, goal).
goalProgressSnapshotSchema.index({
  beneficiaryId: 1,
  goalId: 1,
  measuredAt: -1,
});
// Fallback query when `goalId` is null — key on name.
goalProgressSnapshotSchema.index({
  beneficiaryId: 1,
  goalName: 1,
  measuredAt: -1,
});

const GoalProgressSnapshot =
  mongoose.models.GoalProgressSnapshot ||
  mongoose.model('GoalProgressSnapshot', goalProgressSnapshotSchema);

module.exports = { GoalProgressSnapshot };
