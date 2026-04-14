'use strict';
/**
 * Attendance models barrel export
 * Re-exports all 7 models from their individual files.
 * Usage: const { AttendanceRecord, Leave } = require('../models/attendance/index');
 */

const AttendanceRecord = require('./AttendanceRecord.model');
const Schedule = require('./Schedule.model');
const Leave = require('./Leave.model');
const LeaveBalance = require('./LeaveBalance.model');
const EmployeeAttendanceProfile = require('./EmployeeAttendanceProfile.model');
const Absence = require('./Absence.model');
const MonthlyReport = require('./MonthlyReport.model');

module.exports = {
  AttendanceRecord,
  Schedule,
  Leave,
  LeaveBalance,
  EmployeeAttendanceProfile,
  Absence,
  MonthlyReport,
};
