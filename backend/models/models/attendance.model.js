/**
 * Attendance Model - نموذج الحضور والغياب
 */

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date,
    required: true,
  },
  checkOutTime: {
    type: Date,
  },
  location: {
    type: String,
    enum: ['office', 'remote', 'external'],
    default: 'office',
  },
  device: {
    type: String,
    enum: ['mobile', 'biometric', 'web', 'manual'],
    default: 'mobile',
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early_leave', 'on_leave'],
    default: 'present',
  },
  workHours: {
    type: Number,
    default: 0,
  },
  overtime: {
    type: Number,
    default: 0,
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// الفهارس المركبة
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
