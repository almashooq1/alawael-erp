/**
 * EmployeeShiftAssignment — تعيين الدوامات للموظفين
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const employeeShiftAssignmentSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkShift',
      required: true,
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    assignmentType: {
      type: String,
      default: 'permanent',
      enum: ['permanent', 'temporary'],
    },
    reason: { type: String, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

employeeShiftAssignmentSchema.index({ employeeId: 1, effectiveFrom: 1 });
employeeShiftAssignmentSchema.index({ shiftId: 1, isActive: 1 });

module.exports =
  mongoose.models.EmployeeShiftAssignment ||
  mongoose.model('EmployeeShiftAssignment', employeeShiftAssignmentSchema);
