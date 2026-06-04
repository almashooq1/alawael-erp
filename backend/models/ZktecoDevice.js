/**
 * ZktecoLegacyDevice — أجهزة ZKTeco البيومترية (النظام 37 القديم)
 *
 * @deprecated Use backend/models/zktecoDevice.model.js instead.
 * This 53-line schema is the System-37 legacy model. W851/W852 renamed its
 * mongoose model name from `ZktecoDevice` → `ZktecoLegacyDevice` (Pattern D)
 * to clear the ADR-032 case-variant collision with the canonical
 * `ZKTecoDevice` (uppercase KT) registered by zktecoDevice.model.js. The
 * physical collection is pinned to `zktecodevices` (its historical default)
 * so NO data migration is required for this rename — existing rows keep
 * resolving through the same collection.
 *
 * The canonical 308-line zktecoDevice.model.js (collection `zkteco_devices`)
 * carries the enterprise enrichments: syncLogs, deviceUsers mapping to
 * Employees, consecutiveFailures, deviceInfo, fingerprint/face counts,
 * connection-health fields. A full DATA consolidation onto the canonical
 * collection still requires the operator-run merge script
 * (scripts/migrations/zkteco-device-merge.js --execute) + DB access — see
 * docs/technical-debt/consolidation-roadmap.md (Phase 6). That is separate
 * from this code-level rename.
 *
 * Current consumers of this legacy model:
 *   • routes/biometric-attendance.routes.js
 *   • services/zktecoSdk.service.js
 *   • scheduler/kpi-attendance.scheduler.js
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
  // Pattern D (W852): pin collection to the legacy default so the model
  // rename (ZktecoDevice → ZktecoLegacyDevice) does NOT move existing data.
  { timestamps: true, collection: 'zktecodevices' }
);

// REMOVED DUPLICATES: status / ipAddress / serialNumber already have field-level index:true

module.exports =
  mongoose.models.ZktecoLegacyDevice || mongoose.model('ZktecoLegacyDevice', zktecoDeviceSchema);
