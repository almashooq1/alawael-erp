'use strict';
/**
 * LeaveBalance Model
 * رصيد الإجازات السنوية
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  year: { type: Number, required: true },

  // الإجازات السنوية
  annualLeaveAllocation: { type: Number, default: 30 },
  annualLeaveUsed: { type: Number, default: 0 },
  annualLeaveRemaining: { type: Number, default: 30 },
  annualLeavePending: Number,

  // الإجازات المرضية
  sickLeaveAllocation: { type: Number, default: 15 },
  sickLeaveUsed: { type: Number, default: 0 },
  sickLeaveRemaining: { type: Number, default: 15 },

  // الإجازات الاستثنائية
  exceptionalLeaveAllocation: { type: Number, default: 5 },
  exceptionalLeaveUsed: { type: Number, default: 0 },
  exceptionalLeaveRemaining: { type: Number, default: 5 },

  // أيام العطل الرسمية
  publicHolidaysCount: Number,
  approvedLeaveCount: Number,

  // الرصيد المتراكم
  carryForwardDays: Number,
  carryForwardDate: Date,

  lastModifiedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const LeaveBalance =
  mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
