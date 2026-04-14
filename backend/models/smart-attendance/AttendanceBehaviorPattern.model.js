'use strict';

const mongoose = require('mongoose');

const AttendanceBehaviorPatternSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    academicYear: String,
    semester: String,
    period: {
      startDate: Date,
      endDate: Date,
      daysAnalyzed: Number,
    },
    statistics: {
      totalDays: Number,
      presentDays: Number,
      absentDays: Number,
      lateArrivals: Number,
      earlyDepartures: Number,
      excusedAbsences: Number,
      attendanceRate: Number, // percentage
    },
    patterns: {
      dayOfWeekPattern: {
        Monday: { present: Number, rate: Number },
        Tuesday: { present: Number, rate: Number },
        Wednesday: { present: Number, rate: Number },
        Thursday: { present: Number, rate: Number },
        Friday: { present: Number, rate: Number },
      },
      cyclicalPattern: {
        type: String,
        enum: ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'NONE', 'RANDOM'],
      },
      seasonalTrend: String,
      typicalArrivalTime: String,
      averageLateDuration: Number, // minutes
    },
    risks: {
      riskLevel: {
        type: String,
        enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
        default: 'LOW',
      },
      riskScore: Number, // 0-100
      dropoutProbability: Number, // 0-1
      factors: [String],
    },
    predictions: {
      nextWeekAttendanceRate: Number,
      nextMonthAttendanceRate: Number,
      likelyAbsentDays: [String], // Dates
      recommendedInterventions: [String],
    },
    trends: {
      direction: {
        type: String,
        enum: ['IMPROVING', 'DECLINING', 'STABLE'],
      },
      changeRate: Number, // percentage change
      negativeTriggersIdentified: [String],
    },
    lastAnalyzedAt: { type: Date, default: Date.now },
  },
  { collection: 'attendance_behavior_patterns' }
);

const AttendanceBehaviorPattern =
  mongoose.models.AttendanceBehaviorPattern ||
  mongoose.model('AttendanceBehaviorPattern', AttendanceBehaviorPatternSchema);

module.exports = AttendanceBehaviorPattern;
