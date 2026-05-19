'use strict';

/**
 * AttendanceException — Wave 123.
 *
 * One row per detected exception. Multi-fielded so the UI can:
 *   - list by owner (branch_manager triages their own queue)
 *   - filter by severity (critical first)
 *   - dedup by dedupKey (re-runs of the detector don't multiply)
 *   - track lifecycle (open → acknowledged → resolved/dismissed/escalated)
 *
 * Wave-18 invariants:
 *   • kind ∈ EXCEPTION_KINDS
 *   • severity ∈ EXCEPTION_SEVERITIES
 *   • status ∈ EXCEPTION_STATUSES
 *   • dedupKey required (deterministic)
 *   • resolution.actorId required for status ∈ {resolved, dismissed, escalated}
 *
 * TTL: 180 days (long enough for quarterly compliance audits).
 */

const mongoose = require('mongoose');
const attReg = require('../intelligence/attendance.registry');

const TTL_SECONDS = 180 * 24 * 60 * 60;

const AttendanceExceptionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: attReg.EXCEPTION_KINDS, required: true, index: true },
    severity: {
      type: String,
      enum: attReg.EXCEPTION_SEVERITIES,
      required: true,
      index: true,
    },
    ownerRole: { type: String, required: true, maxlength: 60 },

    // Subject — may be employee-scoped, branch-scoped, or both.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    shiftDate: { type: Date, default: null, index: true },

    // Deterministic dedup key built via attReg.exceptionDedupKey().
    // Unique index → re-runs of the detector update the existing row
    // instead of inserting duplicates.
    dedupKey: { type: String, required: true, unique: true, maxlength: 300 },

    summaryAr: { type: String, required: true, maxlength: 500 },

    // Free-form context populated by the detector. Treated as opaque
    // by the route layer; the UI parses it per-kind.
    details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // Links to AttendanceSourceEvent rows that triggered this. Allows
    // the operator to click through to the underlying evidence.
    evidenceEventIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSourceEvent' }],
      default: () => [],
    },

    // Lifecycle
    status: {
      type: String,
      enum: attReg.EXCEPTION_STATUSES,
      default: attReg.EXCEPTION_STATUS.OPEN,
      index: true,
    },
    detectedAt: { type: Date, required: true, default: Date.now, index: true },
    detectorRunId: { type: String, default: null, maxlength: 80 },

    resolution: {
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      actorRole: { type: String, default: null, maxlength: 60 },
      decidedAt: { type: Date, default: null },
      note: { type: String, default: null, maxlength: 500 },
      escalatedToRole: { type: String, default: null, maxlength: 60 },
    },
  },
  { timestamps: true, collection: 'attendance_exceptions' }
);

AttendanceExceptionSchema.index({ status: 1, severity: 1, detectedAt: -1 });
AttendanceExceptionSchema.index({ branchId: 1, status: 1 });
AttendanceExceptionSchema.index({ ownerRole: 1, status: 1, detectedAt: -1 });
AttendanceExceptionSchema.index({ detectedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

AttendanceExceptionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceExceptionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.kind || !attReg.EXCEPTION_KINDS.includes(this.kind)) {
    this.invalidate('kind', 'must be a known EXCEPTION_KIND');
    ok = false;
  }
  if (!this.severity || !attReg.EXCEPTION_SEVERITIES.includes(this.severity)) {
    this.invalidate('severity', 'must be a known EXCEPTION_SEVERITY');
    ok = false;
  }
  if (!this.dedupKey) {
    this.invalidate('dedupKey', 'required');
    ok = false;
  }
  // Resolved / dismissed / escalated → require resolution.actorId.
  if (
    this.status === attReg.EXCEPTION_STATUS.RESOLVED ||
    this.status === attReg.EXCEPTION_STATUS.DISMISSED ||
    this.status === attReg.EXCEPTION_STATUS.ESCALATED
  ) {
    if (!this.resolution || !this.resolution.actorId) {
      this.invalidate('resolution.actorId', `required when status=${this.status}`);
      ok = false;
    }
  }
  // Escalated must say where it went.
  if (this.status === attReg.EXCEPTION_STATUS.ESCALATED && !this.resolution.escalatedToRole) {
    this.invalidate('resolution.escalatedToRole', 'required when status=escalated');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceException ||
  mongoose.model('AttendanceException', AttendanceExceptionSchema);

module.exports.AttendanceExceptionSchema = AttendanceExceptionSchema;
module.exports.TTL_SECONDS = TTL_SECONDS;
