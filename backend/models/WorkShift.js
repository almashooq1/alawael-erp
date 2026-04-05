/**
 * WorkShift — جداول الدوام
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const workShiftSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, required: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, maxlength: 30, index: true },
    // morning, evening, night, flexible
    shiftType: {
      type: String,
      default: 'fixed',
      enum: ['fixed', 'flexible', 'open'],
      index: true,
    },
    startTime: { type: String, default: null },
    // HH:MM:SS — وقت البداية
    endTime: { type: String, default: null },
    // HH:MM:SS — وقت النهاية
    durationHours: { type: Number, default: 8 },
    breakMinutes: { type: Number, default: 60 },
    graceInMinutes: { type: Number, default: 15 },
    // سماح الدخول
    graceOutMinutes: { type: Number, default: 15 },
    // سماح الخروج
    overtimeAfterMinutes: { type: Number, default: 30 },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    // 0=أحد...6=سبت
    allowEarlyCheckin: { type: Boolean, default: true },
    maxEarlyCheckinMinutes: { type: Number, default: 30 },
    allowRemoteWork: { type: Boolean, default: false },
    hourlyRate: { type: Number, default: null },
    isRamadanShift: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workShiftSchema.index({ shiftType: 1 });
workShiftSchema.index({ isActive: 1 });
workShiftSchema.index({ code: 1 });

module.exports = mongoose.models.WorkShift || mongoose.model('WorkShift', workShiftSchema);
