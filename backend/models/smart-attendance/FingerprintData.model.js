'use strict';

const mongoose = require('mongoose');

const FingerprintDataSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: String,
      unique: true,
    },
    fingerprints: [
      {
        fingerIndex: { type: Number, min: 0, max: 9 }, // 0-9 for ten fingers
        template: {
          minutiae: [
            {
              x: Number,
              y: Number,
              angle: Number,
              type: String, // ridge_ending, bifurcation
            },
          ],
          quality: Number, // 0-100
          imageSize: {
            width: Number,
            height: Number,
          },
        },
        generatedAt: Date,
        enrollmentDevice: String,
        status: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
        },
      },
    ],
    enrollmentDate: { type: Date, default: Date.now },
    lastUpdateDate: Date,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    verifiedAt: Date,
    recognitionHistory: [
      {
        timestamp: Date,
        fingerIndex: Number,
        deviceId: String,
        confidence: Number,
        quality: Number,
        recognized: Boolean,
      },
    ],
    statistics: {
      totalAttempts: { type: Number, default: 0 },
      successfulMatches: { type: Number, default: 0 },
      failedMatches: { type: Number, default: 0 },
      successRate: Number, // percentage
      averageMatchingTime: Number, // milliseconds
    },
  },
  {
    collection: 'fingerprint_data',
    indexes: [{ studentId: 1 }, { enrollmentId: 1 }, { fingerIndex: 1 }],
  }
);

const FingerprintData =
  mongoose.models.FingerprintData || mongoose.model('FingerprintData', FingerprintDataSchema);

module.exports = FingerprintData;
