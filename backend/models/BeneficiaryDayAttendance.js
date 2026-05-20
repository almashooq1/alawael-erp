'use strict';

/**
 * BeneficiaryDayAttendance — Wave 174.
 *
 * Daily rollcall record for day-rehabilitation centers (مركز تأهيل نهاري).
 * One row per (beneficiaryId, date) — distinct from:
 *  • SessionAttendance (per-therapy-session, intra-day)
 *  • BeneficiaryAttendanceRecord (per-course enrollment-based)
 *  • DailyAttendance / DailyAttendanceRecord (employees / HR only)
 *
 * The day-rehab semantics: the beneficiary spends 6-8 hours at the center.
 * Rollcall captures arrival (bus or walk-in), departure, classroom they
 * spent the day in, and the dispositional status (present / absent /
 * excused / late). Therapy sessions inside the day are tracked separately.
 *
 * Wave-18 invariants:
 *   • (beneficiaryId, date) unique
 *   • status ∈ STATUSES
 *   • status=present → checkInTime required
 *   • If checkOutTime is set, it must be after checkInTime
 */

const mongoose = require('mongoose');

const STATUSES = ['present', 'absent', 'late', 'excused', 'sent_home'];

const BeneficiaryDayAttendanceSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: STATUSES, required: true, default: 'absent' },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    arrivedByBus: { type: Boolean, default: false },
    departedByBus: { type: Boolean, default: false },
    busRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      default: null,
    },
    notes: { type: String, default: '', maxlength: 500 },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'beneficiary_day_attendance' }
);

BeneficiaryDayAttendanceSchema.index({ beneficiaryId: 1, date: 1 }, { unique: true });
BeneficiaryDayAttendanceSchema.index({ branchId: 1, date: -1 });
BeneficiaryDayAttendanceSchema.index({ classroomId: 1, date: -1 });
BeneficiaryDayAttendanceSchema.index({ date: -1, status: 1 });

BeneficiaryDayAttendanceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

BeneficiaryDayAttendanceSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'present' && !this.checkInTime) {
    this.invalidate('checkInTime', 'required when status=present');
    ok = false;
  }
  if (this.checkOutTime && this.checkInTime && this.checkOutTime < this.checkInTime) {
    this.invalidate('checkOutTime', 'must be after checkInTime');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.BeneficiaryDayAttendance ||
  mongoose.model('BeneficiaryDayAttendance', BeneficiaryDayAttendanceSchema);

module.exports.STATUSES = STATUSES;
