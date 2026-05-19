'use strict';

/**
 * AttendanceCorrectionRequest — Wave 128.
 *
 * Employee-initiated request to correct a missed or incorrect
 * attendance event. Routed to the branch manager / HR admin
 * approval queue. On approval, a supervisor-override event is
 * emitted by the service (T4 tier, requires evidence).
 *
 * Wave-18 invariants:
 *   • requesterId required
 *   • kind ∈ REQUEST_KINDS
 *   • status ∈ STATUSES
 *   • Terminal statuses {approved, rejected, withdrawn} require
 *     decidedAt + decidedByActorId for approve/reject (withdrawn
 *     uses the original requester)
 *   • Approve transitions: SoD — approverId !== requesterId
 *
 * TTL: 365 days for audit.
 */

const mongoose = require('mongoose');

const REQUEST_KINDS = [
  'missing-checkin',
  'missing-checkout',
  'edit-time',
  'remote-day',
  'add-leave-day',
];

const STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

const TTL_SECONDS = 365 * 24 * 60 * 60;

const AttendanceCorrectionRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    requesterRole: { type: String, default: null, maxlength: 60 },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    kind: { type: String, enum: REQUEST_KINDS, required: true, index: true },

    targetDate: { type: Date, required: true, index: true },

    requestedEventTime: { type: Date, default: null },
    requestedEventKind: { type: String, default: null, maxlength: 20 },

    reasonAr: { type: String, required: true, maxlength: 500 },

    evidence: {
      photoRef: { type: String, default: null, maxlength: 300 },
      witnessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
      },
      notes: { type: String, default: null, maxlength: 1000 },
    },

    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
      index: true,
    },

    submittedAt: { type: Date, required: true, default: Date.now },
    decidedAt: { type: Date, default: null },
    decidedByActorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    decidedByRole: { type: String, default: null, maxlength: 60 },
    approverNote: { type: String, default: null, maxlength: 500 },

    // Set to the emitted AttendanceSourceEvent._id when approved.
    resultingEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSourceEvent',
      default: null,
    },
  },
  { timestamps: true, collection: 'attendance_correction_requests' }
);

AttendanceCorrectionRequestSchema.index({ status: 1, branchId: 1, submittedAt: -1 });
AttendanceCorrectionRequestSchema.index({ requesterId: 1, submittedAt: -1 });
AttendanceCorrectionRequestSchema.index({ submittedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

AttendanceCorrectionRequestSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceCorrectionRequestSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.requesterId) {
    this.invalidate('requesterId', 'required');
    ok = false;
  }
  if (!REQUEST_KINDS.includes(this.kind)) {
    this.invalidate('kind', `must be one of ${REQUEST_KINDS.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'approved' || this.status === 'rejected') {
    if (!this.decidedAt || !this.decidedByActorId) {
      this.invalidate('decidedAt', `required when status=${this.status}`);
      ok = false;
    }
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceCorrectionRequest ||
  mongoose.model('AttendanceCorrectionRequest', AttendanceCorrectionRequestSchema);

module.exports.AttendanceCorrectionRequestSchema = AttendanceCorrectionRequestSchema;
module.exports.REQUEST_KINDS = REQUEST_KINDS;
module.exports.STATUSES = STATUSES;
module.exports.TTL_SECONDS = TTL_SECONDS;
