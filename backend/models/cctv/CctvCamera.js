/**
 * CctvCamera — كاميرا CCTV (Hikvision)
 *
 * Represents a single physical camera mounted at a branch. The camera is
 * accessed either directly (its own IP) or via its parent NVR/DVR channel.
 *
 * Lifecycle: provisioned → online ↔ offline ↔ degraded → retired
 */
'use strict';

const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },
    nvrId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvNvr', index: true },
    channel: { type: Number, min: 1, max: 256 },

    name_ar: { type: String, required: true },
    name_en: { type: String },

    location: {
      area: { type: String },
      floor: { type: String },
      room: { type: String },
      isPublic: { type: Boolean, default: true },
      isSensitive: { type: Boolean, default: false },
      coordinates: { lat: Number, lng: Number },
    },

    model: { type: String },
    firmware: { type: String },
    serialNumber: { type: String, index: true, sparse: true },
    macAddress: { type: String, lowercase: true, sparse: true },

    ip: { type: String, required: true },
    port: { type: Number, default: 80 },
    rtspPort: { type: Number, default: 554 },
    httpsPort: { type: Number, default: 443 },

    auth: {
      username: { type: String, default: 'admin' },
      passwordRef: { type: String },
      protocol: { type: String, enum: ['digest', 'basic'], default: 'digest' },
    },

    streams: [
      {
        type: { type: String, enum: ['main', 'sub', 'third'], default: 'main' },
        rtspPath: { type: String },
        resolution: { type: String },
        fps: { type: Number },
        codec: { type: String, enum: ['h264', 'h265', 'mjpeg'], default: 'h265' },
        bitrateKbps: { type: Number },
      },
    ],

    capabilities: {
      ptz: { type: Boolean, default: false },
      audio: { type: Boolean, default: false },
      twoWayAudio: { type: Boolean, default: false },
      motionDetection: { type: Boolean, default: true },
      tampering: { type: Boolean, default: true },
      lineCrossing: { type: Boolean, default: false },
      intrusion: { type: Boolean, default: false },
      faceDetection: { type: Boolean, default: false },
      anpr: { type: Boolean, default: false },
      thermal: { type: Boolean, default: false },
      smartIR: { type: Boolean, default: true },
      onboardStorage: { type: Boolean, default: false },
    },

    purpose: {
      type: String,
      enum: ['general', 'safety', 'access_control', 'parking', 'parent_portal', 'compliance'],
      default: 'general',
    },

    status: {
      type: String,
      enum: ['provisioned', 'online', 'offline', 'degraded', 'retired'],
      default: 'provisioned',
      index: true,
    },
    lastSeenAt: { type: Date, index: true },
    lastHealthCheck: { type: Date },
    consecutiveFailures: { type: Number, default: 0 },

    pdpl: {
      retentionDays: { type: Number, default: 30 },
      parentConsentRequired: { type: Boolean, default: false },
      watermarkRequired: { type: Boolean, default: true },
      auditAllViews: { type: Boolean, default: true },
    },

    tags: [{ type: String }],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

cameraSchema.index({ branchCode: 1, status: 1 });
cameraSchema.index({ branchCode: 1, 'capabilities.faceDetection': 1 });
cameraSchema.index({ nvrId: 1, channel: 1 }, { unique: true, sparse: true });

cameraSchema.methods.markOnline = function () {
  this.status = 'online';
  this.lastSeenAt = new Date();
  this.consecutiveFailures = 0;
};

cameraSchema.methods.markOffline = function () {
  this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
  if (this.consecutiveFailures >= 3) this.status = 'offline';
  else this.status = 'degraded';
};

module.exports = mongoose.models.CctvCamera || mongoose.model('CctvCamera', cameraSchema);
