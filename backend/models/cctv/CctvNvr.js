/**
 * CctvNvr — Network Video Recorder (Hikvision DS-9xxx / DS-7xxx series).
 *
 * One NVR per branch typically. Holds 8-128 channels.
 */
'use strict';

const mongoose = require('mongoose');

const nvrSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    branchCode: { type: String, required: true, uppercase: true, index: true },
    name_ar: { type: String, required: true },
    name_en: { type: String },

    model: { type: String, required: true },
    firmware: { type: String },
    serialNumber: { type: String },
    channelsTotal: { type: Number, required: true },
    channelsUsed: { type: Number, default: 0 },

    ip: { type: String, required: true },
    port: { type: Number, default: 80 },
    rtspPort: { type: Number, default: 554 },
    httpsPort: { type: Number, default: 443 },
    isapiBase: { type: String },

    auth: {
      username: { type: String, default: 'admin' },
      passwordRef: { type: String },
      protocol: { type: String, enum: ['digest', 'basic'], default: 'digest' },
    },

    storage: {
      totalGB: { type: Number },
      usedGB: { type: Number },
      retentionDays: { type: Number, default: 30 },
      raidLevel: {
        type: String,
        enum: ['none', 'raid0', 'raid1', 'raid5', 'raid10'],
        default: 'raid5',
      },
      healthState: { type: String, enum: ['healthy', 'warning', 'critical'], default: 'healthy' },
    },

    eventPush: {
      enabled: { type: Boolean, default: true },
      webhookSecret: { type: String },
      lastPushAt: { type: Date },
    },

    status: {
      type: String,
      enum: ['provisioned', 'online', 'offline', 'degraded', 'retired'],
      default: 'provisioned',
      index: true,
    },
    lastSeenAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

nvrSchema.index({ branchCode: 1, status: 1 });

module.exports = mongoose.models.CctvNvr || mongoose.model('CctvNvr', nvrSchema);
