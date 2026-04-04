/**
 * ZktecoDevice — أجهزة ZKTeco البيومترية
 * النظام 37: الحضور البيومتري ZKTeco
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const zktecoDeviceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    serialNumber: { type: String, required: true, unique: true, maxlength: 50, index: true },
    model: { type: String, default: null, maxlength: 50 },
    // ZK-X6, ZK-F22, ZK-uFace800
    ipAddress: { type: String, default: null, index: true },
    port: { type: Number, default: 4370 },
    // المنفذ الافتراضي ZKTeco
    status: {
      type: String,
      default: 'offline',
      enum: ['online', 'offline', 'error'],
      index: true,
    },
    location: { type: String, default: null, maxlength: 200 },
    supportFingerprint: { type: Boolean, default: true },
    supportFace: { type: Boolean, default: false },
    supportCard: { type: Boolean, default: true },
    communicationType: {
      type: String,
      default: 'tcp',
      enum: ['tcp', 'udp', 'http'],
    },
    sdkVersion: { type: String, default: null },
    lastSyncAt: { type: Date, default: null },
    lastPingAt: { type: Date, default: null },
    enrolledCount: { type: Number, default: 0 },
    firmwareVersion: { type: String, default: null },
    deviceConfig: { type: Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

zktecoDeviceSchema.index({ status: 1 });
zktecoDeviceSchema.index({ ipAddress: 1 });
zktecoDeviceSchema.index({ serialNumber: 1 });

module.exports = mongoose.model('ZktecoDevice', zktecoDeviceSchema);
