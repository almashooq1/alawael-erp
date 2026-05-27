'use strict';

/**
 * LlmTelemetryCall — Wave 134 / LLM ops persistence.
 *
 * Append-only record of one LLM service call (or its degraded
 * equivalent: cache hit / rejection / failure). Complements Wave 126
 * in-memory rolling buffer — in-memory for sub-hour ops queries,
 * this collection for week-plus analysis + restart-survival +
 * BI/dashboard export.
 *
 * PDPL posture:
 *   - 30-day TTL via Mongo TTL index on `at`. Older calls are
 *     deleted automatically.
 *   - No prompt content stored — only metadata (service name,
 *     source, intent label, token counts, latency, success flag,
 *     failure reason). Prompts may carry PII; outputs may carry
 *     clinical detail (forbidden-content guard, Wave 122).
 *
 * Wave-18 invariants:
 *   - `at` required + indexed (TTL + query)
 *   - `serviceName` required + indexed (per-service queries)
 *   - `source` ∈ {llm, cache, reject, unknown}
 *   - `success` boolean required
 *   - `tokensIn`, `tokensOut` ≥ 0
 *
 * Writes are fire-and-forget from the lib (Wave 128 telemetry
 * factory accepts an optional model + a logger; failures are
 * warn-logged but never block the LLM call's response path).
 */

const mongoose = require('mongoose');

const TTL_SECONDS = 30 * 24 * 60 * 60;

const LlmTelemetryCallSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    serviceName: { type: String, required: true, maxlength: 64, index: true },
    source: {
      type: String,
      enum: ['llm', 'cache', 'reject', 'unknown'],
      required: true,
    },
    intent: { type: String, maxlength: 80, default: null },
    tokensIn: { type: Number, default: 0, min: 0 },
    tokensOut: { type: Number, default: 0, min: 0 },
    elapsedMs: { type: Number, default: 0, min: 0 },
    success: { type: Boolean, required: true },
    reason: { type: String, maxlength: 80, default: null },
    // Cost snapshot captured at write-time using the per-service
    // rates active when the call happened. Storing $ keeps the
    // collection self-contained — re-priced totals can be recomputed
    // from tokensIn/Out if rates change.
    costUsd: { type: Number, default: 0, min: 0 },
  },
  {
    // No timestamps (createdAt/updatedAt) — `at` is the canonical
    // time. Saves ~30 bytes/row.
    timestamps: false,
  }
);

// TTL: 30-day window via `at`. Mongo's TTL monitor sweeps once/minute.
LlmTelemetryCallSchema.index({ at: 1 }, { expireAfterSeconds: TTL_SECONDS });
// Compound index for per-service time-range queries (most common
// dashboard query).
LlmTelemetryCallSchema.index({ serviceName: 1, at: -1 });
// Reason-based queries (e.g. "all TIMEOUT failures last week").
LlmTelemetryCallSchema.index({ serviceName: 1, reason: 1, at: -1 });

module.exports =
  mongoose.models.LlmTelemetryCall || mongoose.model('LlmTelemetryCall', LlmTelemetryCallSchema);
