'use strict';

const mongoose = require('mongoose');

const AttendanceSummaryReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    reportPeriod: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'SEMESTER', 'ANNUAL'],
    },
    periodDates: {
      startDate: Date,
      endDate: Date,
    },
    summary: {
      totalSchoolDays: Number,
      presentDays: Number,
      absentDays: Number,
      excusedAbsentDays: Number,
      lateDays: Number,
      earlyDepartureDays: Number,
      attendancePercentage: Number,
    },
    indicators: {
      status: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR', 'CRITICAL'],
      },
      impactsAcademicStanding: Boolean,
      impactsMentionOnCertificate: Boolean,
      affectsPromotion: Boolean,
    },
    recommendations: [String],
    parentNotification: {
      sent: Boolean,
      sentAt: Date,
      method: String,
      acknowledged: Boolean,
    },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { collection: 'attendance_summary_reports' }
);

const AttendanceSummaryReport =
  mongoose.models.AttendanceSummaryReport ||
  mongoose.model('AttendanceSummaryReport', AttendanceSummaryReportSchema);

module.exports = AttendanceSummaryReport;
