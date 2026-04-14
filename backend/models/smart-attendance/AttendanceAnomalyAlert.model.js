'use strict';

const mongoose = require('mongoose');

const AttendanceAnomalyAlertSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    anomalyType: {
      type: String,
      enum: [
        'DEVICE_SHARING',
        'IMPOSSIBLE_TRAVEL',
        'LOCATION_MISMATCH',
        'REPEATED_TARDINESS',
        'UNAUTHORIZED_LOCATION',
        'BIOMETRIC_FAILURE',
        'SPOOFING_ATTEMPT',
        'TIME_MANIPULATION',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    description: String,
    detectionTime: Date,
    evidence: {
      previousRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SmartAttendanceRecord',
      },
      currentRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SmartAttendanceRecord',
      },
      distance: Number, // km
      timeDifference: Number, // minutes
      location1: String,
      location2: String,
    },
    status: {
      type: String,
      enum: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'FALSE_ALARM'],
      default: 'DETECTED',
    },
    actionTaken: String,
    notificationsAlertSent: {
      security: Boolean,
      admin: Boolean,
      parent: Boolean,
    },
    resolvedAt: Date,
    resolution: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'attendance_anomaly_alerts' }
);

const AttendanceAnomalyAlert =
  mongoose.models.AttendanceAnomalyAlert ||
  mongoose.model('AttendanceAnomalyAlert', AttendanceAnomalyAlertSchema);

module.exports = AttendanceAnomalyAlert;
