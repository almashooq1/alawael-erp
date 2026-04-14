'use strict';

const mongoose = require('mongoose');

const CameraDeviceSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      building: String,
      gate: String,
      description: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    type: {
      type: String,
      enum: ['IP_CAMERA', 'USB_CAMERA', 'RTSP_CAMERA', 'THERMAL_CAMERA'],
      default: 'IP_CAMERA',
    },
    connectionConfig: {
      ipAddress: String,
      rtspUrl: String,
      port: Number,
      protocol: String,
    },
    specifications: {
      resolution: String, // 480p, 720p, 1080p, 4K
      fps: Number,
      lens: String,
      sensorType: String,
      viewAngle: Number,
    },
    capabilities: [
      {
        type: String,
        enum: ['FACE_RECOGNITION', 'MOTION_DETECTION', 'THERMAL_IMAGING', 'NIGHT_VISION'],
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE'],
      default: 'ACTIVE',
    },
    connectionStatus: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    calibration: {
      brightness: { type: Number, default: 1.0 },
      contrast: { type: Number, default: 1.0 },
      saturation: { type: Number, default: 1.0 },
      hueRotation: { type: Number, default: 0 },
      calibratedAt: Date,
    },
    health: {
      uptime: Number, // milliseconds
      frameDropRate: { type: Number, default: 0 },
      errorCount: { type: Number, default: 0 },
      lastHealthCheck: Date,
      cpuUsage: Number, // percentage
      diskUsage: Number, // percentage
    },
    recording: {
      enabled: Boolean,
      storage: {
        type: String,
        enum: ['LOCAL', 'CLOUD', 'NAS'],
      },
      retention: Number, // days
      quality: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'MAXIMUM'],
      },
    },
    faceDetection: {
      enabled: Boolean,
      confidence: { type: Number, default: 0.95 },
      processInterval: Number, // milliseconds
      detectUnknownFaces: Boolean,
      sendAlert: Boolean,
    },
    statistics: {
      facesDetected: { type: Number, default: 0 },
      recognitions: { type: Number, default: 0 },
      successRate: Number, // percentage
      totalFramesProcessed: { type: Number, default: 0 },
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
    collection: 'camera_devices',
    indexes: [{ cameraId: 1 }, { location: '2dsphere' }, { status: 1 }, { connectionStatus: 1 }],
  }
);

const CameraDevice =
  mongoose.models.CameraDevice || mongoose.model('CameraDevice', CameraDeviceSchema);

module.exports = CameraDevice;
