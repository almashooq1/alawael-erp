'use strict';

/**
 * HikvisionJobRun — Wave 108.
 *
 * One record per execution of a registered scheduler job. Drives the
 * status UI, audit-trail for the cron orchestrator, and feeds the
 * recent-runs panel on /hikvision/sync.
 *
 * Locking semantics:
 *   - A new run starts only when the LATEST run for jobId is in a
 *     terminal state (succeeded / failed / skipped) OR is `running`
 *     but older than JOB_DEFAULTS.LOCK_TIMEOUT_MS (force-release).
 *   - The scheduler service is the only writer; routes are read-only.
 *
 * Wave-18 invariants:
 *   • jobId ∈ JOB_IDS
 *   • trigger ∈ JOB_TRIGGERS
 *   • status ∈ JOB_STATUSES
 *   • startedAt required
 *   • status=succeeded → finishedAt set + result non-null
 *   • status=failed    → finishedAt set + error.message non-empty
 *   • status=skipped   → reason non-empty
 *   • status=running   → finishedAt null
 *
 * TTL: rows expire after 30 days — old run history is dropped to keep
 * the collection bounded. The recent-N retention is enforced by the
 * service writer (HISTORY_RETAIN_RUNS) for the UI hot path.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const TTL_SECONDS = 30 * 24 * 60 * 60;

const HikvisionJobRunSchema = new mongoose.Schema(
  {
    jobId: { type: String, enum: reg.JOB_IDS, required: true, index: true },

    trigger: {
      type: String,
      enum: reg.JOB_TRIGGERS,
      required: true,
      default: reg.JOB_TRIGGER.CRON,
    },

    // Who/what initiated the run. For CRON: 'scheduler'. For MANUAL:
    // the userId. For STARTUP: 'boot'.
    initiator: { type: String, default: 'scheduler', maxlength: 120 },

    status: {
      type: String,
      enum: reg.JOB_STATUSES,
      required: true,
      default: reg.JOB_STATUS.PENDING,
      index: true,
    },

    // Lifecycle timestamps
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null, min: 0 },

    // Why a run was skipped (matches REASON codes when known).
    reason: { type: String, default: null, maxlength: 200 },

    // Free-form payload from the job handler. Treated as opaque by
    // the scheduler — the UI parses it per-jobId.
    result: { type: mongoose.Schema.Types.Mixed, default: null },

    // Structured error payload when status=failed.
    error: {
      message: { type: String, default: null, maxlength: 1000 },
      stack: { type: String, default: null, maxlength: 4000 },
      code: { type: String, default: null, maxlength: 80 },
    },

    // Optional run-time options passed by the caller (e.g. dry-run).
    args: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'hikvision_job_runs' }
);

// Lookup: latest run per job → status panel.
HikvisionJobRunSchema.index({ jobId: 1, startedAt: -1 });
// Lookup: running jobs (lock candidates).
HikvisionJobRunSchema.index({ status: 1, jobId: 1, startedAt: -1 });
// TTL: drop rows older than TTL_SECONDS.
HikvisionJobRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

// ─── Wave-18 invariants ────────────────────────────────────────
HikvisionJobRunSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionJobRunSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!this.startedAt) {
    this.invalidate('startedAt', 'startedAt is required');
    ok = false;
  }

  if (this.status === reg.JOB_STATUS.SUCCEEDED) {
    if (!this.finishedAt) {
      this.invalidate('finishedAt', 'succeeded runs require finishedAt');
      ok = false;
    }
    if (this.result === null || this.result === undefined) {
      this.invalidate('result', 'succeeded runs require result payload');
      ok = false;
    }
  }

  if (this.status === reg.JOB_STATUS.FAILED) {
    if (!this.finishedAt) {
      this.invalidate('finishedAt', 'failed runs require finishedAt');
      ok = false;
    }
    if (!this.error || !this.error.message) {
      this.invalidate('error', 'failed runs require error.message');
      ok = false;
    }
  }

  if (this.status === reg.JOB_STATUS.SKIPPED && !this.reason) {
    this.invalidate('reason', 'skipped runs require reason');
    ok = false;
  }

  if (this.status === reg.JOB_STATUS.RUNNING && this.finishedAt) {
    this.invalidate('finishedAt', 'running runs must have finishedAt = null');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionJobRun || mongoose.model('HikvisionJobRun', HikvisionJobRunSchema);

module.exports.HikvisionJobRunSchema = HikvisionJobRunSchema;
module.exports.TTL_SECONDS = TTL_SECONDS;
