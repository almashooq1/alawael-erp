'use strict';

/**
 * HikvisionDeviceHealthLog — Wave 96 Phase 1.
 *
 * Time-series of per-device health probes. Written by the health
 * monitor service either reactively (when a heartbeat arrives) or
 * proactively (cron sweep against unresponsive devices). Drives the
 * "Branch Camera Health" dashboard (Phase 1 surface) and feeds
 * downstream alerts.
 *
 * TTL: rows expire 90 days after `ts` — anything older is rolled
 * into branch-level aggregates by Phase 5 analytics.
 *
 * NOTE on collection naming: kept distinct from the generic
 * device_health_log (which is reserved for cross-vendor health rows
 * in later phases). This collection is Hikvision-specific.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const TTL_SECONDS = 90 * 24 * 60 * 60;

const HikvisionDeviceHealthLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionDevice',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    ts: { type: Date, required: true, default: Date.now },

    // Probe outcome
    onlineStatus: {
      type: String,
      enum: reg.DEVICE_STATUSES,
      required: true,
    },

    // Latency between the device's `capturedAt` and our server clock
    // for the latest event. Stable proxy for time drift.
    timeOffsetMs: { type: Number, default: null },

    // Event-delivery lag (receivedAt - capturedAt) averaged over the
    // probe window. Useful to spot back-buffer flooding.
    eventLagMs: { type: Number, default: null },

    // Average ICMP/HTTPS roundtrip in the probe window
    networkLatencyMs: { type: Number, default: null },

    // Device-reported storage usage (percentage 0-100). NVRs typically
    // populate this; cameras may report 0 or null.
    storagePct: { type: Number, default: null, min: 0, max: 100 },

    // Free-form alerts raised during the probe.
    alerts: {
      type: [
        new mongoose.Schema(
          {
            kind: { type: String, required: true, maxlength: 80 },
            severity: {
              type: String,
              enum: ['info', 'warning', 'critical'],
              default: 'warning',
            },
            message: { type: String, default: null, maxlength: 500 },
            ack: { type: Boolean, default: false },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    // Free-form context (cron run id, probe trigger reason, etc.).
    meta: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'hikvision_device_health_logs' }
);

HikvisionDeviceHealthLogSchema.index({ deviceId: 1, ts: -1 });
HikvisionDeviceHealthLogSchema.index({ branchId: 1, ts: -1 });
HikvisionDeviceHealthLogSchema.index({ onlineStatus: 1, ts: -1 });
// TTL — drop rows older than TTL_SECONDS
HikvisionDeviceHealthLogSchema.index({ ts: 1 }, { expireAfterSeconds: TTL_SECONDS });

module.exports =
  mongoose.models.HikvisionDeviceHealthLog ||
  mongoose.model('HikvisionDeviceHealthLog', HikvisionDeviceHealthLogSchema);

module.exports.HikvisionDeviceHealthLogSchema = HikvisionDeviceHealthLogSchema;
module.exports.TTL_SECONDS = TTL_SECONDS;
