/**
 * DailyAttendance — ملخص الحضور اليومي
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyAttendanceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    shiftId: { type: Schema.Types.ObjectId, ref: 'WorkShift', default: null },
    workDate: { type: Date, required: true, index: true }, // تاريخ العمل
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: {
      type: String,
      default: 'pending',
      enum: [
        'present',
        'absent',
        'late',
        'half_day',
        'leave',
        'holiday',
        'weekend',
        'remote',
        'pending',
      ],
      index: true,
    },
    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    workedMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    isHoliday: { type: Boolean, default: false },
    isWeekend: { type: Boolean, default: false },
    leaveType: {
      type: String,
      default: null,
      enum: [
        'annual',
        'sick',
        'emergency',
        'maternity',
        'paternity',
        'study',
        'hajj',
        'unpaid',
        null,
      ],
    },
    leaveRequestId: { type: Schema.Types.ObjectId, ref: 'LeaveRequest', default: null },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isProcessed: { type: Boolean, default: false, index: true },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// سجل واحد لكل موظف يومياً
dailyAttendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });
dailyAttendanceSchema.index({ workDate: 1, status: 1 });
dailyAttendanceSchema.index({ employeeId: 1, workDate: 1 });
dailyAttendanceSchema.index({ status: 1 });
dailyAttendanceSchema.index({ isProcessed: 1 });

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
