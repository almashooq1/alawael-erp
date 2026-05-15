'use strict';

/**
 * AttendanceCorrection — نموذج طلبات تصحيح الحضور
 *
 * Allows employees to request correction of incorrect or missing attendance records
 * (forgotten check-in/out, wrong status, etc.).
 *
 * Workflow: employee submits → HR/manager reviews → approved (attendance record updated)
 *           or rejected (reason provided).
 */
const mongoose = require('mongoose');

const CorrectionSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      required: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null, // null when the entire record is missing
    },

    date: {
      type: Date,
      required: true,
    },

    correctionType: {
      type: String,
      enum: [
        'checkIn', // Forgot / wrong check-in time
        'checkOut', // Forgot / wrong check-out time
        'status', // Status recorded incorrectly (e.g. absent but was present)
        'missingRecord', // No record at all for that day
        'other',
      ],
      required: true,
    },

    // What the employee claims the correct values should be
    requestedCheckIn: { type: String, default: null }, // "HH:MM"
    requestedCheckOut: { type: String, default: null }, // "HH:MM"
    requestedStatus: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'leave', 'remote', 'holiday', null],
      default: null,
    },

    reason: {
      type: String,
      required: true,
      maxlength: 600,
    },

    supportingDocuments: [{ type: String }], // File URLs / paths

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },

    reviewNotes: {
      type: String,
      maxlength: 500,
      default: null,
    },

    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CorrectionSchema.index({ employeeId: 1, date: 1 });
CorrectionSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.AttendanceCorrection || mongoose.model('AttendanceCorrection', CorrectionSchema);
