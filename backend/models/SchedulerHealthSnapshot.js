'use strict';
/**
 * SchedulerHealthSnapshot — Wave 322
 *
 * Per-scheduler durable snapshot of last-known state. Survives process
 * restarts so the in-process `intelligence/scheduler-registry` Map can be
 * rehydrated on boot and the `/api/ops/schedulers/health` probe doesn't
 * misreport every freshly-restarted process as `never-run`.
 *
 * One row per scheduler key (unique). Upserted by the registry on every
 * `recordRun(...)`; read once at boot by `startup/schedulerSnapshotsBootstrap.js`.
 */

const mongoose = require('mongoose');

const SchedulerHealthSnapshotSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, enum: ['ok', 'failed', null], default: null },
    lastError: { type: String, default: null, maxlength: 500 },
    lastDurationMs: { type: Number, default: null },
    runs: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'scheduler_health_snapshots' }
);

// W956 — async (Mongoose-9 native); no longer depends on the legacy-hook shim.
SchedulerHealthSnapshotSchema.pre('save', async function preSave() {
  this.updatedAt = new Date();
});

module.exports =
  mongoose.models.SchedulerHealthSnapshot ||
  mongoose.model('SchedulerHealthSnapshot', SchedulerHealthSnapshotSchema);
