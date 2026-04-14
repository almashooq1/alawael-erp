'use strict';

const mongoose = require('mongoose');

const FaceRecognitionDataSchema = new mongoose.Schema(
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
    faceTemplate: {
      embedding: [Number], // 128-dimensional vector
      modelVersion: String,
      quality: Number, // 0-100
      confidence: Number,
      generatedAt: Date,
    },
    biometricSamples: [
      {
        sampleId: String,
        imageUrl: String,
        timestamp: Date,
        quality: Number,
        landmarks: {
          leftEye: { x: Number, y: Number },
          rightEye: { x: Number, y: Number },
          nose: { x: Number, y: Number },
          mouth: { x: Number, y: Number },
        },
        metadata: {
          brightness: Number,
          angle: Number,
          expression: String,
        },
      },
    ],
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED'],
      default: 'PENDING',
    },
    verification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      verifiedAt: Date,
      manualReview: Boolean,
      notes: String,
    },
    enrollmentDate: { type: Date, default: Date.now },
    lastUpdateDate: Date,
    recognitionHistory: [
      {
        timestamp: Date,
        cameraId: String,
        location: String,
        confidence: Number,
        recognized: Boolean,
      },
    ],
  },
  {
    collection: 'face_recognition_data',
    indexes: [{ studentId: 1 }, { enrollmentId: 1 }, { status: 1 }],
  }
);

const FaceRecognitionData =
  mongoose.models.FaceRecognitionData ||
  mongoose.model('FaceRecognitionData', FaceRecognitionDataSchema);

module.exports = FaceRecognitionData;
