'use strict';

/**
 * ClinicalAttendanceDiscrepancy — Wave 136.
 *
 * Detects mismatches between a therapist's recorded attendance
 * (DailyAttendanceRecord from Wave 131) and their CLINICAL session
 * obligations (scheduled therapy sessions). Healthcare-critical:
 *
 *   - GHOST-PRESENCE: therapist signed in but had ≥1 scheduled
 *     session and no session was completed
 *   - PHANTOM-SESSION: a session was marked completed but therapist
 *     never signed in that day
 *   - LATE-FOR-SESSION: signed in AFTER the session start time
 *   - SHIFT-MISMATCH: signed in on a day with no scheduled sessions
 *
 * Each discrepancy carries the underlying refs so the operator can
 * investigate. Resolution: HR_admin or clinical_director marks it
 * acknowledged/resolved/dismissed (same lifecycle pattern as
 * AttendanceException from Wave 123).
 *
 * Wave-18 invariants:
 *   • (employeeId, sessionDate, kind) dedup-key unique
 *   • severity ∈ SEVERITIES
 *   • status ∈ STATUSES; terminal statuses require resolution.actorId
 *
 * TTL: 180 days (quarterly clinical-audit window).
 */

const mongoose = require('mongoose');

const KINDS = [
  'ghost-presence', // signed in, no session done
  'phantom-session', // session done, no sign-in
  'late-for-session',
  'shift-mismatch',
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'];

const TTL_SECONDS = 180 * 24 * 60 * 60;

const ClinicalAttendanceDiscrepancySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, required: true, index: true },
    severity: { type: String, enum: SEVERITIES, required: true, index: true },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sessionDate: { type: Date, required: true, index: true },

    // Deterministic dedup key built from (kind, employeeId, sessionDate, extra).
    dedupKey: { type: String, required: true, unique: true, maxlength: 300 },

    // Underlying evidence — these allow the operator to click through.
    dailyRecordId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sessionIds: { type: [mongoose.Schema.Types.ObjectId], default: () => [] },

    summaryAr: { type: String, required: true, maxlength: 500 },
    details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    status: { type: String, enum: STATUSES, default: 'open', index: true },
    detectedAt: { type: Date, required: true, default: Date.now, index: true },

    resolution: {
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      actorRole: { type: String, default: null, maxlength: 60 },
      decidedAt: { type: Date, default: null },
      note: { type: String, default: null, maxlength: 500 },
    },
  },
  { timestamps: true, collection: 'clinical_attendance_discrepancies' }
);

ClinicalAttendanceDiscrepancySchema.index({ status: 1, severity: 1, detectedAt: -1 });
ClinicalAttendanceDiscrepancySchema.index({ employeeId: 1, sessionDate: -1 });
ClinicalAttendanceDiscrepancySchema.index({ detectedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

ClinicalAttendanceDiscrepancySchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

ClinicalAttendanceDiscrepancySchema.path('__invariants').validate(function () {
  let ok = true;
  if (!KINDS.includes(this.kind)) {
    this.invalidate('kind', `must be one of ${KINDS.join(',')}`);
    ok = false;
  }
  if (!SEVERITIES.includes(this.severity)) {
    this.invalidate('severity', `must be one of ${SEVERITIES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (
    (this.status === 'resolved' || this.status === 'dismissed') &&
    (!this.resolution || !this.resolution.actorId)
  ) {
    this.invalidate('resolution.actorId', `required when status=${this.status}`);
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.ClinicalAttendanceDiscrepancy ||
  mongoose.model('ClinicalAttendanceDiscrepancy', ClinicalAttendanceDiscrepancySchema);

module.exports.ClinicalAttendanceDiscrepancySchema = ClinicalAttendanceDiscrepancySchema;
module.exports.KINDS = KINDS;
module.exports.SEVERITIES = SEVERITIES;
module.exports.STATUSES = STATUSES;
