'use strict';

/**
 * AttendanceRetentionPolicy — Wave 133.
 *
 * Configurable per-collection retention rule. Aligns with Saudi PDPL
 * data-minimization + retention principles:
 *   - PII (geo / cardUid / photoRef) on raw events: 90 days
 *     (matches AttendanceSourceEvent TTL)
 *   - Aggregated DailyAttendanceRecord: 7 years (payroll/audit)
 *   - Exception records: 180 days (Wave 123 default)
 *   - Correction requests: 365 days (Wave 128 default)
 *   - Baselines: indefinite while employee active; deleted on
 *     employee-erasure request
 *
 * This model lets a Data Protection Officer override defaults per
 * jurisdiction or per legal-hold case.
 *
 * Wave-18 invariants:
 *   • (collection) unique
 *   • retentionDays ≥ 1
 *   • Either rollupAfter or hardDeleteAfter must be set
 */

const mongoose = require('mongoose');

const COLLECTIONS = [
  'attendance_source_events',
  'daily_attendance_records',
  'attendance_exceptions',
  'attendance_correction_requests',
  'employee_attendance_baselines',
  'attendance_event_outbox',
  'attendance_import_batches',
];

const ACTIONS = ['hard-delete', 'redact-pii', 'archive', 'noop'];

const AttendanceRetentionPolicySchema = new mongoose.Schema(
  {
    collection: { type: String, enum: COLLECTIONS, required: true, unique: true },

    retentionDays: { type: Number, required: true, min: 1, max: 7 * 365 },

    // 'hard-delete' removes rows entirely.
    // 'redact-pii' rewrites geo/cardUid/photoRef to null but keeps
    //    aggregate fields.
    // 'archive' moves the row to a long-term archive collection
    //    (out of scope here — adapter is injected at runtime).
    action: { type: String, enum: ACTIONS, default: 'redact-pii' },

    // Optional legal hold: when set, rows matching legalHoldFilter
    // are never expired by this policy regardless of retentionDays.
    legalHoldFilter: { type: mongoose.Schema.Types.Mixed, default: null },

    // PII fields to redact when action='redact-pii'. Dot-paths.
    piiFields: {
      type: [{ type: String, maxlength: 100 }],
      default: () => [],
    },

    enabled: { type: Boolean, default: true, index: true },

    // Audit who set this policy.
    lastEditedByActorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastEditedByRole: { type: String, default: null, maxlength: 60 },
    notes: { type: String, default: null, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: 'attendance_retention_policies',
    // The `collection` schema field above is intentional — it names the
    // target collection a retention policy applies to. The shadowing of
    // Mongoose's `Schema.prototype.collection` is acceptable here because
    // no caller dereferences `policy.collection` as the Mongoose accessor.
    suppressReservedKeysWarning: true,
  }
);

AttendanceRetentionPolicySchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceRetentionPolicySchema.path('__invariants').validate(function () {
  let ok = true;
  if (!COLLECTIONS.includes(this.collection)) {
    this.invalidate('collection', `must be one of ${COLLECTIONS.join(',')}`);
    ok = false;
  }
  if (typeof this.retentionDays !== 'number' || this.retentionDays < 1) {
    this.invalidate('retentionDays', 'must be ≥ 1');
    ok = false;
  }
  if (!ACTIONS.includes(this.action)) {
    this.invalidate('action', `must be one of ${ACTIONS.join(',')}`);
    ok = false;
  }
  if (this.action === 'redact-pii' && (!this.piiFields || this.piiFields.length === 0)) {
    this.invalidate('piiFields', 'required when action=redact-pii');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceRetentionPolicy ||
  mongoose.model('AttendanceRetentionPolicy', AttendanceRetentionPolicySchema);

module.exports.AttendanceRetentionPolicySchema = AttendanceRetentionPolicySchema;
module.exports.COLLECTIONS = COLLECTIONS;
module.exports.ACTIONS = ACTIONS;
