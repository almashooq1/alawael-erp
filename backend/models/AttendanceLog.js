/**
 * AttendanceLog — سجلات الحضور والانصراف الخام
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceLogSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    deviceId: { type: Schema.Types.ObjectId, ref: 'ZktecoDevice', default: null, index: true },
    deviceUserId: { type: Number, default: null }, // رقم المستخدم في الجهاز
    punchTime: { type: Date, required: true, index: true },
    punchType: {
      type: String,
      default: 'checkin',
      enum: ['checkin', 'checkout', 'break_start', 'break_end'],
      index: true,
    },
    verificationMethod: {
      type: String,
      default: 'fingerprint',
      enum: ['fingerprint', 'face', 'card', 'pin', 'mobile'],
    },
    status: {
      type: String,
      default: 'normal',
      enum: ['normal', 'late', 'early_leave', 'absent'],
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationName: { type: String, default: null },
    isWithinGeofence: { type: Boolean, default: null },
    isMobile: { type: Boolean, default: false },
    isManual: { type: Boolean, default: false },
    manualBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    manualReason: { type: String, default: null },
    isSynced: { type: Boolean, default: true, index: true },
    rawData: { type: String, default: null },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceLogSchema.index({ employeeId: 1, punchTime: 1 });
attendanceLogSchema.index({ punchTime: 1 });
attendanceLogSchema.index({ punchType: 1 });
attendanceLogSchema.index({ deviceId: 1, punchTime: 1 });
attendanceLogSchema.index({ isSynced: 1 });

module.exports =
  mongoose.models.AttendanceLog || mongoose.model('AttendanceLog', attendanceLogSchema);
