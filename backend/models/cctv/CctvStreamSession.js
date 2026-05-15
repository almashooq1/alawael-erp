/**
 * CctvStreamSession — active HLS proxy session for a viewer.
 *
 * When a user clicks "live view", an HLS session is born:
 *   RTSP (camera) → ffmpeg → /tmp/hls/{sessionId}/*.m3u8 → viewer
 *
 * We bound sessions by grant + concurrency cap + idle timeout.
 */
'use strict';

const mongoose = require('mongoose');

const streamSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CctvCamera',
      required: true,
      index: true,
    },
    branchCode: { type: String, required: true, uppercase: true, index: true },
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvAccessGrant', sparse: true },

    streamType: { type: String, enum: ['live', 'playback'], default: 'live' },
    protocol: { type: String, enum: ['hls', 'webrtc', 'mjpeg'], default: 'hls' },
    streamUrl: { type: String },
    playbackRange: { from: Date, to: Date },

    watermark: {
      enabled: { type: Boolean, default: true },
      text: { type: String },
    },

    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    lastHeartbeatAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['starting', 'active', 'idle', 'ended', 'failed'],
      default: 'starting',
      index: true,
    },
    failureReason: { type: String },

    bytesServed: { type: Number, default: 0 },
    segmentsServed: { type: Number, default: 0 },

    sourceIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

streamSessionSchema.index({ userId: 1, status: 1 });
streamSessionSchema.index({ cameraId: 1, status: 1 });
streamSessionSchema.index({ lastHeartbeatAt: 1 });

module.exports =
  mongoose.models.CctvStreamSession || mongoose.model('CctvStreamSession', streamSessionSchema);
