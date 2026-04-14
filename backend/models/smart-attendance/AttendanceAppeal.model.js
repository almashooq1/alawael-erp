'use strict';

const mongoose = require('mongoose');

const AttendanceAppealSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmartAttendanceRecord',
      required: true,
    },
    appealReason: {
      category: {
        type: String,
        enum: [
          'ILLNESS',
          'FAMILY_EMERGENCY',
          'TRANSPORTATION',
          'SYSTEM_ERROR',
          'EXEMPTION',
          'OTHER',
        ],
      },
      description: String,
    },
    supportingEvidence: [
      {
        documentType: String,
        documentUrl: String,
        verificationStatus: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        },
        uploadedAt: Date,
      },
    ],
    requestedAction: {
      type: String,
      enum: ['MARK_PRESENT', 'MARK_EXCUSED', 'REMOVE_LATE_FLAG'],
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    reviewProcess: {
      submittedAt: { type: Date, default: Date.now },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      reviewedAt: Date,
      decision: String,
      reviewNotes: String,
      approvalLevel: {
        type: String,
        enum: ['TEACHER', 'COORDINATOR', 'DIRECTOR'],
      },
    },
    validity: {
      expiryDate: Date,
      isValid: Boolean,
    },
  },
  { collection: 'attendance_appeals' }
);

const AttendanceAppeal =
  mongoose.models.AttendanceAppeal || mongoose.model('AttendanceAppeal', AttendanceAppealSchema);

module.exports = AttendanceAppeal;
