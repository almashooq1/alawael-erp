'use strict';

/**
 * AttendanceShift — Wave 121.
 *
 * Branch-scoped recurring work pattern for the Enterprise Attendance
 * Platform. Distinct from the legacy `models/Shift.js` (which is a
 * minimal HR scheduling stub) — kept separate so the attendance
 * domain owns its own shift semantics without touching unrelated
 * services.
 *
 * Wave-18 invariants:
 *   • branchId required
 *   • start/end in HH:MM 24h format
 *   • overtimeThreshold ≥ halfDayThreshold (sanity)
 *   • workdays subset of [0..6]
 *   • allowedSources references attendance.registry.SOURCE_KINDS
 */

const mongoose = require('mongoose');
const attReg = require('../intelligence/attendance.registry');

const SHIFT_PATTERN = ['fixed', 'rotating', 'flexible', 'on-call'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const AttendanceShiftSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    code: { type: String, required: true, maxlength: 40 },
    nameAr: { type: String, required: true, maxlength: 100 },

    pattern: { type: String, enum: SHIFT_PATTERN, default: 'fixed' },

    // HH:MM 24h. For 'flexible' shifts these are the EARLIEST/LATEST
    // bounds; the actual expected window is derived per-event from
    // the employee's schedule (Wave 117 v2 hooks).
    start: { type: String, required: true, maxlength: 5 },
    end: { type: String, required: true, maxlength: 5 },

    graceMinutes: { type: Number, default: 10, min: 0, max: 120 },
    halfDayThreshold: { type: Number, default: 240, min: 60 },
    overtimeThreshold: { type: Number, default: 480, min: 60 },

    // 0=Sun..6=Sat (KSA workweek: Sun-Thu typically).
    workdays: { type: [Number], default: [0, 1, 2, 3, 4] },

    // Sources allowed for THIS shift. Empty = all allowed for the
    // employee's role.
    allowedSources: {
      type: [String],
      default: () => [],
      validate: {
        validator(arr) {
          return arr.every(s => attReg.SOURCE_KINDS.includes(s));
        },
        message: 'allowedSources must reference attendance.registry.SOURCE_KINDS',
      },
    },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'attendance_shifts' }
);

AttendanceShiftSchema.index({ branchId: 1, code: 1 }, { unique: true });

AttendanceShiftSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceShiftSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.branchId) {
    this.invalidate('branchId', 'required');
    ok = false;
  }
  if (!TIME_RE.test(this.start || '')) {
    this.invalidate('start', 'must be HH:MM 24h');
    ok = false;
  }
  if (!TIME_RE.test(this.end || '')) {
    this.invalidate('end', 'must be HH:MM 24h');
    ok = false;
  }
  if (this.overtimeThreshold < this.halfDayThreshold) {
    this.invalidate('overtimeThreshold', 'overtimeThreshold must be ≥ halfDayThreshold');
    ok = false;
  }
  if (Array.isArray(this.workdays)) {
    if (this.workdays.some(d => d < 0 || d > 6 || !Number.isInteger(d))) {
      this.invalidate('workdays', 'workdays must be integers in 0..6');
      ok = false;
    }
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceShift || mongoose.model('AttendanceShift', AttendanceShiftSchema);

module.exports.AttendanceShiftSchema = AttendanceShiftSchema;
module.exports.SHIFT_PATTERN = SHIFT_PATTERN;
