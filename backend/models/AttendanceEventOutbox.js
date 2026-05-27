'use strict';

/**
 * AttendanceEventOutbox — Wave 130.
 *
 * Outbox pattern for decoupled downstream delivery. Every attendance
 * lifecycle moment writes one row here; subscriber jobs poll, invoke
 * their handlers, then mark rows delivered.
 *
 * Wave-18 invariants:
 *   • topic required
 *   • idempotencyKey required + unique
 *   • status ∈ {pending, delivered, failed}
 *   • when status=failed, lastError required (audit trail for the
 *     retry decision)
 *
 * TTL: 90 days (long enough for weekly payroll batch + dead-letter
 * triage; beyond that, audit moves to AuditLog).
 */

const mongoose = require('mongoose');

const TOPICS = [
  'attendance.source-event.persisted',
  'attendance.exception.opened',
  'attendance.exception.resolved',
  'attendance.correction.approved',
  'attendance.correction.rejected',
  'attendance.daily-rollup',
  'attendance.payroll.period-locked',
  'attendance.payroll.period-reopened',
];

const STATUSES = ['pending', 'delivered', 'failed'];

const TTL_SECONDS = 90 * 24 * 60 * 60;

const AttendanceEventOutboxSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, maxlength: 100, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    // Deterministic key: re-emitting the same logical event upserts.
    // Convention: `${topic}|${sourceCollection}|${sourceId}` or for
    // rollups `daily-rollup|${employeeId}|${YYYY-MM-DD}`.
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 300 },

    status: { type: String, enum: STATUSES, default: 'pending', index: true },

    createdAt: { type: Date, required: true, default: Date.now },
    deliveredAt: { type: Date, default: null },
    deliveryAttempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: null, maxlength: 500 },

    // Optional partition key for parallel consumers.
    partitionKey: { type: String, default: null, maxlength: 100, index: true },
  },
  { collection: 'attendance_event_outbox' }
);

AttendanceEventOutboxSchema.index({ status: 1, topic: 1, createdAt: 1 });
AttendanceEventOutboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

AttendanceEventOutboxSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceEventOutboxSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.topic) {
    this.invalidate('topic', 'required');
    ok = false;
  }
  if (!this.idempotencyKey) {
    this.invalidate('idempotencyKey', 'required');
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'failed' && !this.lastError) {
    this.invalidate('lastError', 'required when status=failed');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceEventOutbox ||
  mongoose.model('AttendanceEventOutbox', AttendanceEventOutboxSchema);

module.exports.AttendanceEventOutboxSchema = AttendanceEventOutboxSchema;
module.exports.TOPICS = TOPICS;
module.exports.STATUSES = STATUSES;
module.exports.TTL_SECONDS = TTL_SECONDS;
