/**
 * Attendance Model — نموذج الحضور والانصراف
 * Proper Mongoose schema replacing the in-memory stub.
 * Data is now persisted to MongoDB.
 */

'use strict';

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'remote'],
      default: 'present',
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    workingHours: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
    },
    department: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      enum: ['manual', 'biometric', 'zkteco', 'camera', 'mobile', 'system'],
      default: 'manual',
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────
attendanceSchema.index({ employeeId: 1, date: -1 }); // core query: employee attendance history
attendanceSchema.index({ date: -1 }); // daily attendance report
attendanceSchema.index({ status: 1 }); // filter by status
attendanceSchema.index({ department: 1, date: -1 }); // department daily report
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true }); // one record per employee per day

// ── Static methods — backward compatibility with the Attendance.memory.js API ──
attendanceSchema.statics.findByEmployeeAndDate = async function (employeeId, date) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(dateStr);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return this.findOne({
    employeeId,
    date: { $gte: startOfDay, $lt: endOfDay },
  }).lean();
};

attendanceSchema.statics.findByEmployeeRange = async function (employeeId, startDate, endDate) {
  return this.find({
    employeeId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  })
    .sort({ date: -1 })
    .lean();
};

attendanceSchema.statics.getStatsByEmployee = async function (employeeId, month) {
  const year = new Date().getFullYear();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const attendances = await this.find({
    employeeId,
    date: { $gte: start, $lte: end },
  }).lean();

  return {
    present: attendances.filter(a => a.status === 'present').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    late: attendances.filter(a => a.status === 'late').length,
    half_day: attendances.filter(a => a.status === 'half_day').length,
    total: attendances.length,
  };
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
