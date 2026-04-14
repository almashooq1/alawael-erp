'use strict';
/**
 * EmployeeAttendanceProfile Model
 * بيانات الموظفين الحضورية
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const employeeAttendanceProfileSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // معلومات مسجل الحضور
  biometricDeviceId: String,
  cardNumber: String,
  pinCode: String,
  faceId: String,
  fingerprintId: String,

  // إعدادات الحضور
  allowedCheckInRange: {
    before: Number,
    after: Number,
  },
  allowedLocationRadius: Number,
  allowGPSCheckIn: Boolean,
  allowPhotoVerification: Boolean,
  allowBiometricCheckIn: Boolean,

  // سياسة التأخير
  latenessPenalty: {
    minutes: Number,
    penaltyMinutes: Number,
    maxLatePerMonth: Number,
    action: String,
  },

  // الحضور الدقيق
  totalAttendanceDays: Number,
  totalAbsentDays: Number,
  totalLateDays: Number,
  attendancePercentage: Number,

  notes: String,
  activeStatus: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const EmployeeAttendanceProfile =
  mongoose.models.EmployeeAttendanceProfile ||
  mongoose.model('EmployeeAttendanceProfile', employeeAttendanceProfileSchema);

module.exports = EmployeeAttendanceProfile;
