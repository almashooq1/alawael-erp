'use strict';
/**
 * DddSessionManager Model
 * Auto-extracted from services/dddSessionManager.js
 */
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId },

    /* Device info */
    device: {
      fingerprint: String,
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'api', 'unknown'],
        default: 'unknown',
      },
      os: String,
      browser: String,
      name: String,
    },

    /* Network */
    ip: String,
    geo: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },

    /* Status */
    status: {
      type: String,
      enum: ['active', 'idle', 'expired', 'terminated', 'locked'],
      default: 'active',
      index: true,
    },

    /* Timing */
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    idleTimeoutMinutes: { type: Number, default: 30 },
    absoluteTimeoutHours: { type: Number, default: 12 },

    /* Token tracking */
    tokenHash: String,
    refreshTokenHash: String,

    /* Termination */
    terminatedAt: Date,
    terminatedBy: { type: mongoose.Schema.Types.ObjectId },
    terminationReason: String,

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ 'device.fingerprint': 1, userId: 1 });

const DDDSession = mongoose.models.DDDSession || mongoose.model('DDDSession', sessionSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Session Configuration
   ═══════════════════════════════════════════════════════════════════════ */
const SESSION_DEFAULTS = {
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 12,
  maxConcurrentSessions: 3,
  enableDeviceTracking: true,
  enableGeoTracking: false,
  alertOnNewDevice: true,
  alertOnNewLocation: true,
};

const DEVICE_TYPES = ['desktop', 'mobile', 'tablet', 'api', 'unknown'];

/* ═══════════════════════════════════════════════════════════════════════
   3. Device Fingerprinting
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDSession,
};
