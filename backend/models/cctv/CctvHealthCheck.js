/**
 * CctvHealthCheck — periodic health probe result for a camera or NVR.
 *
 * Written by the healthMonitor service every N minutes. We keep ~7 days of
 * history per device, then roll up to daily aggregates and TTL the rest.
 */
'use strict';

const mongoose = require('mongoose');

const healthCheckSchema = new mongoose.Schema(
  {
    targetKind: { type: String, enum: ['camera', 'nvr'], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },

    checkedAt: { type: Date, default: Date.now, index: true },

    reachable: { type: Boolean, required: true },
    httpStatus: { type: Number },
    rtspStatus: { type: String, enum: ['ok', 'unreachable', 'auth_failed', 'timeout', 'unknown'] },

    latencyMs: { type: Number },
    deviceInfo: {
      uptime: { type: Number },
      cpu: { type: Number },
      memory: { type: Number },
      tempC: { type: Number },
    },
    storage: {
      totalGB: { type: Number },
      freeGB: { type: Number },
      healthState: { type: String, enum: ['healthy', 'warning', 'critical', 'unknown'] },
    },
    streamStats: {
      bitrateKbps: { type: Number },
      fpsActual: { type: Number },
      packetLoss: { type: Number },
    },

    issues: [{ code: String, message: String, severity: String }],

    retainUntil: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  { timestamps: false }
);

healthCheckSchema.index({ targetKind: 1, targetId: 1, checkedAt: -1 });
healthCheckSchema.index({ retainUntil: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.CctvHealthCheck || mongoose.model('CctvHealthCheck', healthCheckSchema);
