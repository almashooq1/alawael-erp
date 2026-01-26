const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true, // Efficient date searching
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused', 'leave'],
      default: 'present',
    },
    notes: String,
    location: {
      lat: Number,
      lng: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance records for the same employee on the same day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Reuse compiled model in watch/test environments to avoid OverwriteModelError
module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
