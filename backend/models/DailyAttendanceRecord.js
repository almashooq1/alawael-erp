'use strict';

/**
 * DailyAttendanceRecord — Wave 131.
 *
 * The CANONICAL per-employee-per-day attendance record. Wave 99
 * introduced ReconciliationCase for resolving conflicting in/out
 * events; Wave 131 extends that to a full unified record consumable
 * by Payroll/HR/KPI directly — one row per (employeeId, shiftDate)
 * regardless of how many source events fed it.
 *
 * Wave-18 invariants:
 *   • (employeeId, shiftDate) unique
 *   • status ∈ STATUSES
 *   • status=closed → workedMinutes finite and ≥ 0
 *   • status=closed → both checkIn and checkOut populated OR
 *     attendanceType=remote-day/leave
 *   • contributingSources is non-empty whenever any event exists
 *
 * TTL: none — payroll/HR need historical records indefinitely.
 *      Old records archive via separate Wave 133 retention policy.
 */

const mongoose = require('mongoose');

const STATUSES = ['open', 'partial', 'closed', 'overridden', 'locked'];
const ATTENDANCE_TYPES = ['on-site', 'remote-day', 'leave', 'absent', 'partial-day', 'overtime'];

const SelectedEventSchema = new mongoose.Schema(
  {
    sourceEventId: { type: mongoose.Schema.Types.ObjectId, default: null },
    source: { type: String, required: true, maxlength: 40 },
    tierLabel: { type: String, default: null, maxlength: 10 },
    confidence: { type: Number, default: null, min: 0, max: 100 },
    eventTime: { type: Date, required: true },
    flags: { type: [String], default: () => [] },
  },
  { _id: false }
);

const DailyAttendanceRecordSchema = new mongoose.Schema(
  {
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
    shiftDate: { type: Date, required: true, index: true },

    status: { type: String, enum: STATUSES, default: 'open', index: true },
    attendanceType: { type: String, enum: ATTENDANCE_TYPES, default: 'on-site' },

    checkIn: { type: SelectedEventSchema, default: null },
    checkOut: { type: SelectedEventSchema, default: null },

    workedMinutes: { type: Number, default: null, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    halfDay: { type: Boolean, default: false },

    // Every source that contributed (even suppressed/redundant ones).
    contributingSources: { type: [String], default: () => [] },
    // All flags across all events (deduplicated).
    aggregatedFlags: { type: [String], default: () => [] },
    // Highest trust tier seen.
    bestTierLabel: { type: String, default: null, maxlength: 10 },

    // Cross-reference to Wave 99 case if reconciler raised one.
    reconciliationCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Reasons used by downstream consumers to short-circuit.
    requiresReview: { type: Boolean, default: false, index: true },
    reviewReasons: { type: [String], default: () => [] },

    lastReconciledAt: { type: Date, default: null },
    reconcilerVersion: { type: String, default: 'v131', maxlength: 20 },
  },
  { timestamps: true, collection: 'daily_attendance_records' }
);

DailyAttendanceRecordSchema.index({ employeeId: 1, shiftDate: 1 }, { unique: true });
DailyAttendanceRecordSchema.index({ branchId: 1, shiftDate: -1 });
DailyAttendanceRecordSchema.index({ requiresReview: 1, shiftDate: -1 });

DailyAttendanceRecordSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DailyAttendanceRecordSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.employeeId) {
    this.invalidate('employeeId', 'required');
    ok = false;
  }
  if (!this.shiftDate) {
    this.invalidate('shiftDate', 'required');
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'closed') {
    const isPhysical =
      this.attendanceType === 'on-site' ||
      this.attendanceType === 'partial-day' ||
      this.attendanceType === 'overtime';
    if (isPhysical && (!this.checkIn || !this.checkOut)) {
      this.invalidate('checkIn', 'check-in and check-out required for closed physical days');
      ok = false;
    }
    if (this.workedMinutes == null || this.workedMinutes < 0) {
      this.invalidate('workedMinutes', 'required and non-negative for closed records');
      ok = false;
    }
  }
  return ok;
});

module.exports =
  mongoose.models.DailyAttendanceRecord ||
  mongoose.model('DailyAttendanceRecord', DailyAttendanceRecordSchema);

module.exports.DailyAttendanceRecordSchema = DailyAttendanceRecordSchema;
module.exports.STATUSES = STATUSES;
module.exports.ATTENDANCE_TYPES = ATTENDANCE_TYPES;
