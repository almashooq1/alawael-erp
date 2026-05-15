/**
 * CctvRecording — metadata pointer to a continuous/event recording on the NVR.
 *
 * The actual MP4 lives on the NVR disk. We just track a window we can replay
 * via ISAPI playback URL or proxy.
 */
'use strict';

const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CctvCamera',
      required: true,
      index: true,
    },
    cameraCode: { type: String, required: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },
    nvrId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvNvr' },
    channel: { type: Number },

    kind: {
      type: String,
      enum: ['continuous', 'motion', 'event', 'alarm', 'manual'],
      default: 'continuous',
      index: true,
    },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    durationMs: { type: Number },

    sizeBytes: { type: Number },
    resolution: { type: String },
    fps: { type: Number },
    codec: { type: String },

    storage: {
      backend: { type: String, enum: ['nvr', 's3', 'local'], default: 'nvr' },
      uri: { type: String },
      trackId: { type: Number },
    },

    linkedEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CctvEvent' }],
    linkedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      index: true,
      sparse: true,
    },

    legalHold: { type: Boolean, default: false, index: true },
    retainUntil: { type: Date, index: true },
  },
  { timestamps: true }
);

recordingSchema.index({ cameraId: 1, startTime: -1 });
recordingSchema.index({ branchCode: 1, startTime: -1 });

module.exports = mongoose.models.CctvRecording || mongoose.model('CctvRecording', recordingSchema);
