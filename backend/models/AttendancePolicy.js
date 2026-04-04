/**
 * AttendancePolicy — سياسات الحضور والانصراف
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendancePolicySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, required: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, maxlength: 50 },
    lateDeductionMinutes: { type: Number, default: 0 }, // خصم لكل دقيقة تأخير
    absenceDeductionHours: { type: Number, default: 8 }, // خصم ساعات للغياب
    deductLateFromSalary: { type: Boolean, default: false },
    maxMonthlyLateMinutes: { type: Number, default: 60 },
    maxMonthlyAbsences: { type: Number, default: 3 },
    notifyManagerOnLate: { type: Boolean, default: true },
    notifyManagerOnAbsence: { type: Boolean, default: true },
    notificationDelayMinutes: { type: Number, default: 30 },
    requireMedicalAfterDays: { type: Boolean, default: true },
    medicalRequiredAfterDays: { type: Number, default: 2 },
    allowMobileAttendance: { type: Boolean, default: true },
    geofenceRadiusKm: { type: Number, default: 0.1 },
    geofenceCoordinates: { type: Schema.Types.Mixed, default: null }, // { lat, lng }
    applySaudiLaborLaw: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attendancePolicySchema.index({ isDefault: 1 });
attendancePolicySchema.index({ isActive: 1 });

module.exports = mongoose.model('AttendancePolicy', attendancePolicySchema);
