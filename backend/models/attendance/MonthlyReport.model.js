'use strict';
/**
 * MonthlyReport Model
 * التقارير الشهرية للحضور
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  year: Number,
  month: Number,

  // الإحصائيات
  totalWorkingDays: Number,
  totalDaysPresent: Number,
  totalDaysAbsent: Number,
  totalDaysLate: Number,
  totalDaysEarlyCheckout: Number,

  // الساعات
  totalWorkHours: Number,
  totalOvertimeHours: Number,
  totalBreakHours: Number,

  // الرواتب
  baseSalary: Number,
  overtimeAmount: Number,
  deductions: Number,
  totalSalary: Number,

  notes: String,
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvalDate: Date,

  createdAt: { type: Date, default: Date.now },
});

monthlyReportSchema.index({ employeeId: 1, year: 1, month: 1 });

const MonthlyReport =
  mongoose.models.MonthlyReport || mongoose.model('MonthlyReport', monthlyReportSchema);

module.exports = MonthlyReport;
