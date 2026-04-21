/**
 * ZktecoDevice — أجهزة ZKTeco البيومترية
 * النظام 37: الحضور البيومتري ZKTeco
 *
 * @deprecated Use backend/models/zktecoDevice.model.js instead.
 * This 53-line schema (mongoose model name: `ZktecoDevice`, lowercase k)
 * is the System-37 legacy model. The canonical 308-line
 * zktecoDevice.model.js (registered as `ZKTecoDevice`, uppercase KT)
 * carries the enterprise enrichments: syncLogs, deviceUsers mapping to
 * Employees, consecutiveFailures, deviceInfo, fingerprint/face counts,
 * connection-health fields.
 *
 * Both models are in production on DIFFERENT collections — this is a
 * real data-fragmentation problem, not just a code duplicate. A merge
 * requires a data-migration script that reconciles rows from the two
 * collections onto one schema. Migration is tracked in
 * docs/technical-debt/consolidation-roadmap.md (Phase 6).
 *
 * Current consumers of this legacy model:
 *   • routes/biometric-attendance.routes.js
 *   • services/zktecoSdk.service.js
 *   • scheduler/kpi-attendance.scheduler.js
 * These must migrate to the canonical model first.
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

module.exports = mongoose.models.ZktecoDevice || mongoose.model('ZktecoDevice', zktecoDeviceSchema);
