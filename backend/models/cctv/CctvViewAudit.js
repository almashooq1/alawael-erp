/**
 * CctvViewAudit — PDPL Article 13: every view of footage is logged.
 *
 * Watching live, requesting a playback URL, downloading a clip, or viewing
 * a snapshot all generate a row here. Append-only.
 */
'use strict';

const mongoose = require('mongoose');

const viewAuditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String },
    userRole: { type: String },
    branchCode: { type: String, required: true, uppercase: true, index: true },

    cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvCamera', index: true },
    cameraCode: { type: String },
    nvrId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvNvr' },

    action: {
      type: String,
      enum: [
        'live_start',
        'live_stop',
        'snapshot_view',
        'snapshot_download',
        'playback_view',
        'playback_download',
        'clip_export',
        'ptz_control',
        'config_change',
        'access_denied',
      ],
      required: true,
      index: true,
    },

    timeRange: {
      from: { type: Date },
      to: { type: Date },
    },

    purpose: { type: String },
    consentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvAccessGrant' },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
      sparse: true,
    },

    sourceIp: { type: String },
    userAgent: { type: String },
    sessionId: { type: String },

    success: { type: Boolean, default: true, index: true },
    failureReason: { type: String },
  },
  { timestamps: true }
);

viewAuditSchema.index({ userId: 1, createdAt: -1 });
viewAuditSchema.index({ cameraId: 1, createdAt: -1 });
viewAuditSchema.index({ branchCode: 1, action: 1, createdAt: -1 });

module.exports = mongoose.models.CctvViewAudit || mongoose.model('CctvViewAudit', viewAuditSchema);
