'use strict';

/**
 * HikvisionCameraChannel — Wave 96 Phase 1.
 *
 * Channel-level configuration under a Hikvision device. One physical
 * camera may expose multiple channels (entry/exit, multi-lens, etc.);
 * each channel maps to a zone, a direction, and a recognition mode.
 *
 * `attendanceEligible=false` means events from this channel are NEVER
 * promoted into attendance source events — useful for surveillance
 * cameras parked in restricted areas where employee passage is normal
 * but irrelevant to time-attendance.
 *
 * Indexes:
 *   • (deviceId, channelNo) — unique per device
 *   • (zoneId)              — zone-level dashboards
 *   • (attendanceEligible)  — fast filter for attendance pipeline
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionCameraChannelSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionDevice',
      required: true,
      index: true,
    },
    channelNo: { type: Number, required: true, min: 1, max: 999 },

    streamUrl: { type: String, default: null, maxlength: 500 },
    resolution: { type: String, default: null, maxlength: 20 }, // e.g. "1920x1080"
    fps: { type: Number, default: null, min: 1, max: 120 },

    zoneId: { type: String, required: true, maxlength: 64, index: true },
    gateId: { type: String, default: null, maxlength: 64 },
    direction: {
      type: String,
      enum: reg.CHANNEL_DIRECTIONS,
      default: reg.CHANNEL_DIRECTION.BIDIRECTIONAL,
    },

    attendanceEligible: { type: Boolean, default: false, index: true },
    recognitionMode: {
      type: String,
      enum: reg.RECOGNITION_MODES,
      default: reg.RECOGNITION_MODE.SURVEILLANCE,
    },

    notes: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hikvision_camera_channels' }
);

HikvisionCameraChannelSchema.index({ deviceId: 1, channelNo: 1 }, { unique: true });

// ─── Cross-field invariants ──────────────────────────────────────
HikvisionCameraChannelSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionCameraChannelSchema.path('__invariants').validate(function () {
  let ok = true;

  // Attendance-eligible channels MUST run face recognition — a
  // surveillance-mode channel cannot produce attendance events.
  if (this.attendanceEligible && this.recognitionMode === reg.RECOGNITION_MODE.SURVEILLANCE) {
    this.invalidate(
      'recognitionMode',
      'attendanceEligible channels cannot run in "surveillance" mode'
    );
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionCameraChannel ||
  mongoose.model('HikvisionCameraChannel', HikvisionCameraChannelSchema);

module.exports.HikvisionCameraChannelSchema = HikvisionCameraChannelSchema;
