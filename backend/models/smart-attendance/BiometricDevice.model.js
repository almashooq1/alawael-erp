'use strict';

const mongoose = require('mongoose');

const BiometricDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'FINGERPRINT_SCANNER',
        'IRIS_SCANNER',
        'FACIAL_RECOGNITION',
        'VOICE_ID',
        'MULTI_MODAL',
      ],
      required: true,
    },
    location: {
      building: String,
      gate: String,
      description: String,
    },
    specifications: {
      modelNumber: String,
      manufacturer: String,
      scanningResolution: Number, // DPI for fingerprint
      captureTime: Number, // milliseconds
      templateSize: Number, // bytes
    },
    connectionConfig: {
      port: String, // COM port or IP
      baudRate: Number,
      protocol: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    connectionStatus: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    enrollment: {
      totalEnrolled: { type: Number, default: 0 },
      enrolledStudents: [
        {
          studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
          },
          enrollmentDate: Date,
          quality: Number,
          status: {
            type: String,
            enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
          },
        },
      ],
      templateCount: { type: Number, default: 0 },
    },
    authentication: {
      totalAttempts: { type: Number, default: 0 },
      successfulAuthentications: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 },
      successRate: Number, // percentage
      averageMatchingTime: Number, // milliseconds
      falseAcceptRate: Number, // FAR percentage
      falseRejectRate: Number, // FRR percentage
    },
    quality: {
      minQualityScore: { type: Number, default: 0.85 },
      avgQualityScore: Number,
      qualityThreshold: String,
    },
    maintenance: {
      lastMaintenance: Date,
      maintenanceInterval: Number, // days
      nextMaintenanceDate: Date,
      cleaningRequired: Boolean,
      calibrationNeeded: Boolean,
    },
    statistics: {
      dailyUsage: [
        {
          date: Date,
          usageCount: Number,
          successCount: Number,
          failureCount: Number,
        },
      ],
      monthlyStatistics: {
        totalUses: Number,
        successRate: Number,
        averageWaitTime: Number,
      },
    },
    registeredAt: { type: Date, default: Date.now },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    lastConnected: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'biometric_devices',
    indexes: [{ deviceId: 1 }, { type: 1 }, { status: 1 }, { connectionStatus: 1 }],
  }
);

const BiometricDevice =
  mongoose.models.BiometricDevice || mongoose.model('BiometricDevice', BiometricDeviceSchema);

module.exports = BiometricDevice;
