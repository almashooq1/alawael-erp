'use strict';
/**
 * AttendanceRecord Model
 * سجل الحضور والانصراف الأساسي
 * Split from attendanceModel.js (Phase 3 refactor)
 */

const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    // معلومات الموظف
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeName: String,
    employeeCode: String,
    department: String,
    position: String,

    // معلومات الحضور
    checkInTime: {
      type: Date,
      required: true,
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number,
    },
    checkInPhoto: String,

    // معلومات الانصراف
    checkOutTime: Date,
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number,
    },
    checkOutPhoto: String,

    // ساعات العمل
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    actualWorkDuration: Number,
    workDuration: Number,
    breakDuration: Number,

    // حالة الحضور
    status: {
      type: String,
      enum: ['حاضر', 'غياب', 'متأخر', 'إجازة', 'عطلة', 'مرض', 'وقت مرن'],
      default: 'حاضر',
    },
    checkInStatus: {
      type: String,
      enum: ['في الوقت', 'متأخر', 'في وقت مبكر'],
      default: 'في الوقت',
    },
    checkOutStatus: {
      type: String,
      enum: ['في الوقت', 'مبكر جداً', 'متأخر جداً'],
      default: 'في الوقت',
    },

    // حسابات التأخير والغياب
    latenessMinutes: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    earlyCheckoutMinutes: Number,
    earlyCheckoutCount: Number,

    // المرفقات والتحقق
    verificationMethod: {
      type: String,
      enum: ['بصمة', 'بطاقة ممغنطة', 'رقم PIN', 'الوجه', 'تطبيق الجوال', 'الحضور اليدوي'],
      default: 'بطاقة ممغنطة',
    },
    biometricId: String,
    faceVerification: Boolean,
    mobileApp: Boolean,
    verified: { type: Boolean, default: false },
    verifiedBy: mongoose.Schema.Types.ObjectId,

    // ملاحظات خاصة
    notes: String,
    manualEntryReason: String,
    manualEntryApprovedBy: mongoose.Schema.Types.ObjectId,

    // الإجازات والعطل
    leaveType: String,
    leaveReason: String,
    leaveApprovedBy: mongoose.Schema.Types.ObjectId,
    leaveApprovalDate: Date,

    // مكافآت وخصومات
    bonusMinutes: Number,
    penaltyMinutes: Number,
    overtimeMinutes: { type: Number, default: 0 },
    overtimeApproved: Boolean,

    // التاريخ والوقت
    date: { type: Date, required: true },
    workDay: String,
    weekNumber: Number,
    monthNumber: Number,
    yearNumber: Number,

    // معلومات الرواتب
    salaryPerDay: Number,
    salaryPerHour: Number,
    overtimeRate: Number,
    overtimeAmount: Number,

    // الحالة الصحية
    healthStatus: String,
    temperature: Number,
    healthCheckCompleted: Boolean,
    healthCheckNotes: String,

    // البيانات الإضافية
    deviceId: String,
    ipAddress: String,
    userAgent: String,
    isWeekend: Boolean,
    isHoliday: Boolean,
    isSpecialDay: Boolean,

    // الأرشفة والحذف
    isArchived: { type: Boolean, default: false },
    deletedAt: Date,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
attendanceRecordSchema.index({ employeeId: 1, date: -1 });
attendanceRecordSchema.index({ date: -1, status: 1 });
attendanceRecordSchema.index({ employeeId: 1, checkInTime: -1 });

// Methods
attendanceRecordSchema.methods.calculateWorkDuration = function () {
  if (this.checkOutTime && this.checkInTime) {
    const duration = (this.checkOutTime - this.checkInTime) / (1000 * 60);
    this.workDuration = Math.round((duration / 60) * 100) / 100;
    return this.workDuration;
  }
  return 0;
};

attendanceRecordSchema.methods.calculateLateness = function () {
  if (this.checkInTime && this.scheduledStartTime) {
    const diff = (this.checkInTime - this.scheduledStartTime) / (1000 * 60);
    if (diff > 0) {
      this.latenessMinutes = Math.round(diff);
      this.checkInStatus = 'متأخر';
      return this.latenessMinutes;
    }
  }
  this.checkInStatus = 'في الوقت';
  return 0;
};

attendanceRecordSchema.methods.calculateOvertimeAmount = function () {
  if (this.overtimeMinutes && this.salaryPerHour && this.overtimeRate) {
    const overtimeHours = this.overtimeMinutes / 60;
    this.overtimeAmount = overtimeHours * this.salaryPerHour * (this.overtimeRate / 100);
    return this.overtimeAmount;
  }
  return 0;
};

const AttendanceRecord =
  mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = AttendanceRecord;
