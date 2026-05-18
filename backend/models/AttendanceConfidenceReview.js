'use strict';

/**
 * AttendanceConfidenceReview — Wave 98 Phase 3.
 *
 * A review queue item. Every processed event whose gate decision is
 * REVIEW lands here. Operators (supervisors / HR / security) work
 * through the queue with three actions: approve / reject / escalate.
 *
 * SLA: every queue has a maximum OPEN time. A sweeper transitions
 * OPEN → EXPIRED + bumps the queue (security stays at SECURITY, the
 * other two escalate up the chain). Phase 3 implements `resolve()`
 * + `escalate()` + a `sweepExpired()` worker; full notification
 * routing is the UI wave's job.
 *
 * Wave-18 invariants:
 *   • OPEN/EXPIRED rows: resolverId/resolverNote MUST be null
 *   • APPROVED/REJECTED/ESCALATED rows: resolverId + resolvedAt required
 *   • REJECTED rows additionally require resolverNote (≥1 char)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const AttendanceConfidenceReviewSchema = new mongoose.Schema(
  {
    processedEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionProcessedEvent',
      required: true,
      unique: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    reason: { type: String, enum: reg.REVIEW_REASONS, required: true },
    queue: { type: String, enum: reg.REVIEW_QUEUES, required: true, index: true },

    state: {
      type: String,
      enum: reg.REVIEW_STATES,
      default: reg.REVIEW_STATE.OPEN,
      index: true,
    },

    openedAt: { type: Date, required: true, default: Date.now },
    slaDeadline: { type: Date, default: null },

    resolverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolverRole: { type: String, default: null, maxlength: 100 },
    resolverNote: { type: String, default: null, maxlength: 1000 },
    resolvedAt: { type: Date, default: null },

    // Phase-3 emits a `resultingAttendanceEventId` when an APPROVED
    // review promotes its processed event into a source event.
    resultingAttendanceEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSourceEvent',
      default: null,
    },

    // If escalated, points to the queue we escalated TO. Lets a
    // downstream queue see the chain.
    escalatedToQueue: { type: String, enum: reg.REVIEW_QUEUES, default: null },

    confidence: { type: Number, default: null, min: 0, max: 100 },
  },
  { timestamps: true, collection: 'attendance_confidence_reviews' }
);

AttendanceConfidenceReviewSchema.index({ queue: 1, state: 1, openedAt: 1 });
AttendanceConfidenceReviewSchema.index({ state: 1, slaDeadline: 1 });
AttendanceConfidenceReviewSchema.index({ employeeId: 1, state: 1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
AttendanceConfidenceReviewSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

const RESOLVED_STATES = new Set([
  reg.REVIEW_STATE.APPROVED,
  reg.REVIEW_STATE.REJECTED,
  reg.REVIEW_STATE.ESCALATED,
]);

AttendanceConfidenceReviewSchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.state === reg.REVIEW_STATE.OPEN || this.state === reg.REVIEW_STATE.EXPIRED) {
    if (this.resolverId || this.resolverNote || this.resolvedAt) {
      this.invalidate('resolverId', `${this.state} rows must not carry a resolver`);
      ok = false;
    }
  }

  if (RESOLVED_STATES.has(this.state)) {
    if (!this.resolverId) {
      this.invalidate('resolverId', `${this.state} rows require a resolverId`);
      ok = false;
    }
    if (!this.resolvedAt) {
      this.invalidate('resolvedAt', `${this.state} rows require a resolvedAt`);
      ok = false;
    }
  }

  if (this.state === reg.REVIEW_STATE.REJECTED && !this.resolverNote) {
    this.invalidate('resolverNote', 'rejected rows require a resolverNote');
    ok = false;
  }

  if (this.state === reg.REVIEW_STATE.ESCALATED && !this.escalatedToQueue) {
    this.invalidate('escalatedToQueue', 'escalated rows require escalatedToQueue');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.AttendanceConfidenceReview ||
  mongoose.model('AttendanceConfidenceReview', AttendanceConfidenceReviewSchema);

module.exports.AttendanceConfidenceReviewSchema = AttendanceConfidenceReviewSchema;
