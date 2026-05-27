'use strict';

/**
 * HikvisionAnomalySnapshot — Wave 114.
 *
 * Persisted record of one anomaly-detector run. Drives the trend
 * chart on /hikvision/anomalies + powers "did the situation improve
 * after we acted?" questions for the operational review.
 *
 * Structure mirrors the detector's `detect()` output but with an
 * indexable `recordedAt`. We DON'T persist the full anomaly objects
 * verbatim — only counts + the list of {kind, severity, id}. This
 * keeps the collection bounded (~1KB per row at 10-min cadence ≈
 * 4.3MB/month uncompressed).
 *
 * TTL: 30 days. Anything older rolls to aggregate summaries by
 * Wave 115+ (TBD).
 *
 * Wave-18 invariants:
 *   • recordedAt required
 *   • summary.total === items.length
 *   • summary.{critical,warning,info} must sum to summary.total
 *   • items[].id non-empty (deterministic dedup key)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const TTL_SECONDS = 30 * 24 * 60 * 60;

const HikvisionAnomalySnapshotSchema = new mongoose.Schema(
  {
    recordedAt: { type: Date, required: true, default: Date.now },

    // Source: 'scheduler' (cron job) | 'manual' (operator) | 'startup'
    source: {
      type: String,
      enum: ['scheduler', 'manual', 'startup'],
      default: 'scheduler',
      index: true,
    },

    // Compact items — kind/severity/id only. Diagnostic `details`
    // payload is left out to keep snapshots small; if an operator
    // needs to drill into a historical anomaly, they re-run detect()
    // on the live snapshot (rarely useful past a few hours anyway).
    items: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true, maxlength: 200 },
            kind: { type: String, required: true, enum: reg.ANOMALY_KINDS },
            severity: { type: String, required: true, enum: reg.ANOMALY_SEVERITIES },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    summary: {
      total: { type: Number, required: true, min: 0 },
      critical: { type: Number, required: true, min: 0 },
      warning: { type: Number, required: true, min: 0 },
      info: { type: Number, required: true, min: 0 },
    },

    // How long the detection took (ms) — useful for ops cost tracking.
    durationMs: { type: Number, default: null, min: 0 },

    // Free-form meta from the detector (e.g. cron run id from the
    // scheduler). Treated as opaque.
    meta: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'hikvision_anomaly_snapshots' }
);

// Time-series queries are always anchored on recordedAt.
HikvisionAnomalySnapshotSchema.index({ recordedAt: -1 });
HikvisionAnomalySnapshotSchema.index({ source: 1, recordedAt: -1 });
// TTL — drop rows older than TTL_SECONDS.
HikvisionAnomalySnapshotSchema.index({ recordedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

// ─── Wave-18 invariants ────────────────────────────────────────
HikvisionAnomalySnapshotSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionAnomalySnapshotSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!this.recordedAt) {
    this.invalidate('recordedAt', 'required');
    ok = false;
  }

  const items = Array.isArray(this.items) ? this.items : [];
  const s = this.summary || {};

  if (s.total !== items.length) {
    this.invalidate('summary.total', `expected ${items.length} (items.length), got ${s.total}`);
    ok = false;
  }

  const sevSum = (s.critical || 0) + (s.warning || 0) + (s.info || 0);
  if (sevSum !== s.total) {
    this.invalidate('summary', `severity counts (${sevSum}) must equal total (${s.total})`);
    ok = false;
  }

  for (const [i, it] of items.entries()) {
    if (!it.id) {
      this.invalidate(`items.${i}.id`, 'required');
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionAnomalySnapshot ||
  mongoose.model('HikvisionAnomalySnapshot', HikvisionAnomalySnapshotSchema);

module.exports.HikvisionAnomalySnapshotSchema = HikvisionAnomalySnapshotSchema;
module.exports.TTL_SECONDS = TTL_SECONDS;
