'use strict';

/**
 * LlmAnomalySnapshot — Wave 144.
 *
 * Persisted record of one LLM-anomaly-detector run. Drives the trend
 * chart on /ai/llm-anomalies/history + answers "did the situation
 * improve after we acted?" for LLM cost/fallback investigations.
 *
 * Mirrors HikvisionAnomalySnapshot (Wave 114) one-to-one in shape so
 * operators see consistent affordances across the two anomaly
 * verticals. Compact items only (id/kind/severity); the verbose
 * `details` payload from the detector is dropped at write-time to
 * keep the collection bounded (~1KB/row at 10-min cadence ≈ 4.3MB
 * over the 30-day TTL).
 *
 * Wave-18 invariants:
 *   • recordedAt required
 *   • summary.total === items.length
 *   • summary.{critical,warning,info} must sum to summary.total
 *   • items[].id non-empty (deterministic dedup key)
 */

const mongoose = require('mongoose');
const {
  ANOMALY_KINDS,
  ANOMALY_SEVERITIES,
} = require('../intelligence/llm-anomaly-detector.service');

const TTL_SECONDS = 30 * 24 * 60 * 60;

const LlmAnomalySnapshotSchema = new mongoose.Schema(
  {
    recordedAt: { type: Date, required: true, default: Date.now },

    // Source: 'scheduler' (10-min interval) | 'manual' (operator) | 'startup'
    source: {
      type: String,
      enum: ['scheduler', 'manual', 'startup'],
      default: 'scheduler',
      index: true,
    },

    items: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true, maxlength: 200 },
            kind: { type: String, required: true, enum: ANOMALY_KINDS },
            severity: { type: String, required: true, enum: ANOMALY_SEVERITIES },
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

    durationMs: { type: Number, default: null, min: 0 },

    meta: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'llm_anomaly_snapshots' }
);

LlmAnomalySnapshotSchema.index({ recordedAt: -1 });
LlmAnomalySnapshotSchema.index({ source: 1, recordedAt: -1 });
LlmAnomalySnapshotSchema.index({ recordedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

LlmAnomalySnapshotSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

LlmAnomalySnapshotSchema.path('__invariants').validate(function () {
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
  mongoose.models.LlmAnomalySnapshot ||
  mongoose.model('LlmAnomalySnapshot', LlmAnomalySnapshotSchema);

module.exports.LlmAnomalySnapshotSchema = LlmAnomalySnapshotSchema;
module.exports.TTL_SECONDS = TTL_SECONDS;
