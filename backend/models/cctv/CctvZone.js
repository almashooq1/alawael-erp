/**
 * CctvZone — intrusion/region-of-interest zones per camera.
 *
 * Pushed to the camera via ISAPI (Smart/LineDetection, FieldDetection).
 * Mirrored locally so we can also evaluate rules in our own analytics.
 */
'use strict';

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CctvCamera',
      required: true,
      index: true,
    },
    branchCode: { type: String, required: true, uppercase: true, index: true },

    name_ar: { type: String, required: true },
    name_en: { type: String },

    kind: {
      type: String,
      enum: ['line', 'field', 'mask', 'count_line', 'entry', 'exit'],
      required: true,
    },

    polygon: [{ x: Number, y: Number }],
    direction: { type: String, enum: ['in', 'out', 'both'], default: 'both' },

    rules: [
      {
        eventType: { type: String, required: true },
        objectTypes: [{ type: String, enum: ['person', 'vehicle', 'bag', 'unknown'] }],
        minSizePct: { type: Number, default: 0 },
        timeWindowSec: { type: Number },
        threshold: { type: Number, default: 1 },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        action: {
          type: String,
          enum: ['log_only', 'alert', 'siren', 'lockdown'],
          default: 'alert',
        },
      },
    ],

    schedule: [
      {
        daysOfWeek: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
        hoursLocal: { from: String, to: String },
        armed: { type: Boolean, default: true },
      },
    ],

    deviceSync: {
      syncedAt: { type: Date },
      syncState: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
      remoteId: { type: String },
    },

    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

zoneSchema.index({ cameraId: 1, enabled: 1 });

module.exports = mongoose.models.CctvZone || mongoose.model('CctvZone', zoneSchema);
