'use strict';

const mongoose = require('mongoose');

const AttendanceViaCameraSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    cameraId: {
      type: String,
      ref: 'CameraDevice',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['FACE_RECOGNITION', 'FINGERPRINT', 'RFID', 'THERMAL'],
      default: 'FACE_RECOGNITION',
    },
    biometricData: {
      confidence: Number, // 0-1
      quality: Number, // 0-100
      matchingTime: Number, // milliseconds
      templateId: String,
      overallScore: Number, // 0-100
    },
    evidence: {
      snapshotUrl: String,
      videoClipUrl: String,
      processingTime: Number, // milliseconds
      frameNumber: Number,
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
    verification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED'],
        default: 'PENDING',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      verifiedAt: Date,
      reviewNotes: String,
    },
    linkToAttendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmartAttendanceRecord',
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: 'attendance_via_camera',
    indexes: [
      { studentId: 1, timestamp: -1 },
      { cameraId: 1, timestamp: -1 },
      { 'location.coordinates': '2dsphere' },
    ],
  }
);

const AttendanceViaCamera =
  mongoose.models.AttendanceViaCamera ||
  mongoose.model('AttendanceViaCamera', AttendanceViaCameraSchema);

module.exports = AttendanceViaCamera;
