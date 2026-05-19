'use strict';

/**
 * AttendanceShiftAssignment — Wave 121.
 *
 * Effective-dated link between an employee and an AttendanceShift.
 * Multiple assignments per employee over time; the active one at
 * any moment is the row whose [effectiveFrom, effectiveTo) range
 * contains the query date.
 *
 * Wave-18 invariants:
 *   • employeeId + shiftId required
 *   • effectiveFrom required
 *   • effectiveTo (when set) > effectiveFrom
 */

const mongoose = require('mongoose');

const AttendanceShiftAssignmentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceShift',
      required: true,
      index: true,
    },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: { type: Date, default: null, index: true }, // null = open-ended
    note: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: true, collection: 'attendance_shift_assignments' }
);

// Hot path: "what is employee X's shift on day D?"
AttendanceShiftAssignmentSchema.index({ employeeId: 1, effectiveFrom: -1 });

AttendanceShiftAssignmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceShiftAssignmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.employeeId) {
    this.invalidate('employeeId', 'required');
    ok = false;
  }
  if (!this.shiftId) {
    this.invalidate('shiftId', 'required');
    ok = false;
  }
  if (!this.effectiveFrom) {
    this.invalidate('effectiveFrom', 'required');
    ok = false;
  }
  if (
    this.effectiveTo &&
    this.effectiveFrom &&
    new Date(this.effectiveTo).getTime() <= new Date(this.effectiveFrom).getTime()
  ) {
    this.invalidate('effectiveTo', 'must be > effectiveFrom');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceShiftAssignment ||
  mongoose.model('AttendanceShiftAssignment', AttendanceShiftAssignmentSchema);

module.exports.AttendanceShiftAssignmentSchema = AttendanceShiftAssignmentSchema;
