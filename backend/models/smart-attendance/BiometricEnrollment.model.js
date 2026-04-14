'use strict';

const mongoose = require('mongoose');

const BiometricEnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    enrollmentStatus: {
      type: String,
      enum: ['PENDING', 'INCOMPLETE', 'COMPLETED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
    },
    biometricData: {
      fingerprint: {
        enrolled: Boolean,
        template: Buffer,
        quality: Number,
        enrollmentDate: Date,
        fingers: [String], // Which fingers are enrolled
      },
      faceRecognition: {
        enrolled: Boolean,
        faceVector: [Number],
        embedding: Buffer,
        photoUrl: String,
        enrollmentDate: Date,
        qualityScore: Number,
      },
      iris: {
        enrolled: Boolean,
        template: Buffer,
        enrollmentDate: Date,
      },
      voiceId: {
        enrolled: Boolean,
        voiceSample: String,
        enrollmentDate: Date,
      },
    },
    rfidCard: {
      cardId: String,
      issuedDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'LOST', 'EXPIRED'],
      },
    },
    enrollmentHistory: [
      {
        date: Date,
        method: String,
        status: String,
        notes: String,
      },
    ],
    enrollmentProcessStatus: {
      step: Number,
      completionPercentage: Number,
      nextStep: String,
      requiredActions: [String],
    },
    enrolledAt: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'biometric_enrollments' }
);

const BiometricEnrollment =
  mongoose.models.BiometricEnrollment ||
  mongoose.model('BiometricEnrollment', BiometricEnrollmentSchema);

module.exports = BiometricEnrollment;
