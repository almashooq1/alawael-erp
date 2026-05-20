'use strict';

/**
 * MeasureReassessmentTask — Wave 214
 *
 * Persistent task created by the reassessment scheduler when a measure's
 * `standardIntervalDays` cadence elapses without a fresh administration
 * for a (beneficiary, measure) pair. Therapists work through the queue;
 * a new admin landing on the same pair automatically closes the task
 * (post-save hook on MeasureApplication).
 *
 * Idempotency contract (partial unique index):
 *   At any moment AT MOST ONE pending task exists per
 *   (beneficiaryId, measureId). The scheduler upserts on each tick;
 *   the index prevents duplicate creation under races.
 *
 * Status flow:
 *   pending → acknowledged → completed
 *                        ↘ cancelled (explicit dismissal w/ reason)
 *   pending → completed (skip ack, via auto-close hook on new admin)
 *   pending → cancelled (e.g. measure deprecated, beneficiary discharged)
 *
 * Counterpart to W206e `assessmentReassessmentSweeper.service.js`
 * (which surfaces transient findings, not persistent tasks). This is
 * persistent because measure reassessment is a recurring clinical
 * obligation that survives across operational cycles.
 *
 * @module domains/goals/models/MeasureReassessmentTask
 */

const mongoose = require('mongoose');

const TASK_STATUSES = ['pending', 'acknowledged', 'completed', 'cancelled'];

const measureReassessmentTaskSchema = new mongoose.Schema(
  {
    // ── Subject ───────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    measureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Measure',
      required: true,
      index: true,
    },
    measureCode: { type: String, required: true },

    // ── Trigger ───────────────────────────────────────────────────
    // Snapshot of WHY this task was created. Frozen for audit; the
    // task remains historically interpretable even if cadence config
    // is later edited on the measure.
    lastApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasureApplication',
    },
    lastApplicationDate: Date,
    standardIntervalDays: Number,
    dueAt: { type: Date, required: true, index: true },
    overdueDays: { type: Number, default: 0 },

    // ── Assignment ────────────────────────────────────────────────
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'pending',
      index: true,
    },

    // ── Acknowledgement / completion / cancellation ───────────────
    acknowledgedAt: Date,
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedByApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasureApplication',
    },
    // When the auto-close hook fires from a new MeasureApplication
    // save, this is set to 'auto'. When a therapist explicitly closes
    // the task via the service API, it's set to 'manual'.
    completionMode: { type: String, enum: ['auto', 'manual'] },
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,

    // ── Free-form context ─────────────────────────────────────────
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'measure_reassessment_tasks',
  }
);

// ─── Indexes ───────────────────────────────────────────────────────

// Idempotency guard: partial unique on the open-task window.
// Prevents two pending tasks for the same (beneficiary, measure)
// under scheduler races. Cancelled / completed records don't count.
measureReassessmentTaskSchema.index(
  { beneficiaryId: 1, measureId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);
// Common query: tasks for a beneficiary, newest first.
measureReassessmentTaskSchema.index({ beneficiaryId: 1, createdAt: -1 });
// Common query: all open tasks for a branch sorted by overdue days.
measureReassessmentTaskSchema.index({ branchId: 1, status: 1, dueAt: 1 });

// ─── Wave-18 invariants ────────────────────────────────────────────

measureReassessmentTaskSchema.pre('validate', function () {
  // completed/cancelled records must carry their respective
  // timestamps — guards against stray status flips bypassing the
  // service-level transition methods.
  if (this.status === 'completed' && !this.completedAt) {
    throw new Error('MeasureReassessmentTask: completedAt required when status=completed');
  }
  if (this.status === 'cancelled' && !this.cancelledAt) {
    throw new Error('MeasureReassessmentTask: cancelledAt required when status=cancelled');
  }
  if (this.status === 'cancelled' && !this.cancellationReason) {
    throw new Error('MeasureReassessmentTask: cancellationReason required when status=cancelled');
  }
});

// ─── Statics ───────────────────────────────────────────────────────

measureReassessmentTaskSchema.statics.findOpenFor = function (beneficiaryId, measureId) {
  return this.findOne({
    beneficiaryId,
    measureId,
    status: 'pending',
  });
};

measureReassessmentTaskSchema.statics.listFor = function (filter = {}) {
  const q = { status: 'pending' };
  if (filter.beneficiaryId) q.beneficiaryId = filter.beneficiaryId;
  if (filter.assigneeId) q.assigneeId = filter.assigneeId;
  if (filter.branchId) q.branchId = filter.branchId;
  if (filter.statusIn) {
    q.status = { $in: filter.statusIn };
  } else if (filter.status) {
    q.status = filter.status;
  }
  return this.find(q).sort({ dueAt: 1 }).lean();
};

const MeasureReassessmentTask =
  mongoose.models.MeasureReassessmentTask ||
  mongoose.model('MeasureReassessmentTask', measureReassessmentTaskSchema);

module.exports = {
  MeasureReassessmentTask,
  measureReassessmentTaskSchema,
  TASK_STATUSES,
};
