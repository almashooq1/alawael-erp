/**
 * Attendance Model (HR)
 * Modular, extensible attendance record for HR system
 */
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  checkInTime: { type: Date, required: true },
  checkOutTime: Date,
  checkInLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
  },
  checkOutLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
  },
  checkInPhoto: String,
  checkOutPhoto: String,
  status: {
    type: String,
    enum: ['حاضر', 'غياب', 'متأخر', 'إجازة', 'عطلة', 'مرض', 'وقت مرن'],
    default: 'حاضر',
  },
  latenessMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  notes: String,
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ date: -1, status: 1 });
AttendanceSchema.index({ employeeId: 1, checkInTime: -1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
