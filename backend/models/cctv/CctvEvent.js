/**
 * CctvEvent — حدث كاميرا (motion/tampering/AI/line-cross/intrusion/face/anpr/...)
 *
 * Ingested either via:
 *   • Hikvision event push (HTTP POST from NVR/camera)
 *   • Periodic ISAPI poll on Subscribe Notification channel
 *   • Our own AI analytics layer (post-processing of snapshots)
 *
 * Designed for high write throughput. Hot indexes only.
 */
'use strict';

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CctvCamera',
      required: true,
      index: true,
    },
    cameraCode: { type: String, required: true, index: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },

    type: {
      type: String,
      enum: [
        'motion',
        'tampering',
        'video_loss',
        'video_blind',
        'line_crossing',
        'intrusion',
        'region_entry',
        'region_exit',
        'loitering',
        'object_left',
        'object_taken',
        'face_detected',
        'face_match',
        'face_unknown',
        'anpr_plate',
        'crowd_density',
        'people_count',
        'ppe_violation',
        'fall_detected',
        'fight_detected',
        'fire_smoke',
        'audio_alarm',
        'tampering_alarm',
        'storage_full',
        'disk_failure',
        'camera_offline',
        'camera_online',
        'unknown',
      ],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },

    source: {
      type: String,
      enum: ['hikvision_push', 'isapi_poll', 'ai_analytic', 'manual'],
      default: 'hikvision_push',
    },

    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date },
    durationMs: { type: Number },

    snapshot: {
      url: { type: String },
      storageKey: { type: String },
      width: { type: Number },
      height: { type: Number },
    },

    payload: { type: mongoose.Schema.Types.Mixed },

    geometry: {
      x: { type: Number },
      y: { type: Number },
      width: { type: Number },
      height: { type: Number },
      polygon: [{ x: Number, y: Number }],
    },

    aiResult: {
      label: { type: String },
      confidence: { type: Number, min: 0, max: 1 },
      attributes: { type: mongoose.Schema.Types.Mixed },
      faceIdentityId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvFaceIdentity' },
      plate: { type: String, uppercase: true },
    },

    relatedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      index: true,
      sparse: true,
    },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvAlert', index: true, sparse: true },

    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },

    retainUntil: { type: Date, index: true },
  },
  { timestamps: true }
);

eventSchema.index({ branchCode: 1, type: 1, startedAt: -1 });
eventSchema.index({ cameraId: 1, startedAt: -1 });
eventSchema.index({ severity: 1, acknowledgedAt: 1 });
eventSchema.index({ retainUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.CctvEvent || mongoose.model('CctvEvent', eventSchema);
