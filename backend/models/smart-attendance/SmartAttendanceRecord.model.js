'use strict';

const mongoose = require('mongoose');

const SmartAttendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
    },
    duration: {
      type: Number, // minutes
    },
    method: {
      type: String,
      enum: ['biometric', 'rfid', 'mobile', 'manual', 'face_recognition', 'qr_code'],
      default: 'biometric',
    },
    location: {
      building: String,
      gate: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    deviceInfo: {
      deviceId: String,
      ipAddress: String,
      deviceType: String,
      macAddress: String,
    },
    evidence: {
      photo: String,
      video: String,
      timestamp: Date,
    },
    healthData: {
      temperature: Number,
      status: {
        type: String,
        enum: ['NORMAL', 'FEVER', 'UNWELL', 'QUARANTINE'],
        default: 'NORMAL',
      },
      heartRate: Number,
      notes: String,
    },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT', 'EXCUSED', 'LATE'],
      default: 'CHECKED_IN',
    },
    flags: {
      isLate: Boolean,
      lateDuration: Number, // minutes
      isEarlyCheckOut: Boolean,
      isAnomalous: Boolean,
    },
    verification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      biometricScore: Number, // 0-100
      confidence: Number,
    },
    notifications: {
      sentToParent: Boolean,
      sentToTeacher: Boolean,
      sentToAdmin: Boolean,
      sentAt: Date,
    },
    anomalies: [
      {
        type: String,
        enum: [
          'IMPOSSIBLE_TRAVEL',
          'DEVICE_MISUSE',
          'DUPLICATE_DEVICE',
          'REPEATED_TARDINESS',
          'HEALTH_ALERT',
          'LOCATION_MISMATCH',
          'BIOMETRIC_FAIL',
        ],
      },
    ],
    notes: String,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'smart_attendance_records',
    indexes: [
      { studentId: 1, date: 1 },
      { classId: 1, date: 1 },
      { checkInTime: 1 },
      { 'location.coordinates': '2dsphere' },
      { createdAt: -1 },
    ],
  }
);

const SmartAttendanceRecord =
  mongoose.models.SmartAttendanceRecord ||
  mongoose.model('SmartAttendanceRecord', SmartAttendanceRecordSchema);

module.exports = SmartAttendanceRecord;
