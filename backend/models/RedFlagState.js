/**
 * RedFlagState.js — Mongoose model for beneficiary red-flag state.
 *
 * Beneficiary-360 Foundation Commit 6. The persistent sibling of the
 * in-memory `redFlagStateStore`. A single collection holds both
 * active flag records and cooldown records, discriminated by the
 * `status` field. This keeps transitions (delete active + insert
 * cooldown) inside one collection without needing a cross-collection
 * transaction.
 *
 * Design decisions:
 *
 *   1. Unique compound index on (beneficiaryId, flagId, status) —
 *      guarantees at most one active and one cooldown record per
 *      (beneficiary, flag) pair. Concurrent writers racing to raise
 *      the same flag hit a duplicate-key error that the store
 *      translates into "stillRaised".
 *
 *   2. `observedValue` is Mixed — flags may emit numbers, booleans,
 *      strings, or small objects. The evaluator stores them
 *      verbatim; we don't try to typecheck this field at the model
 *      layer (the registry + evaluator already validated shape).
 *
 *   3. `raisedAt` / `lastObservedAt` / `resolvedAt` / `cooldownUntil`
 *      are real Date instances in Mongo but callers get ISO strings
 *      — normalized by the store before return to match the
 *      in-memory adapter's contract.
 *
 *   4. No TTL on cooldown records — a long-ago-resolved flag still
 *      enforces its cooldown if that cooldown is still ticking; but
 *      an expired cooldown becomes a no-op naturally because the
 *      `cooldownUntil > now` check fails. A background cleaner can
 *      delete expired cooldown rows later without affecting
 *      semantics.
 *
 *   5. `strict: true` so unknown fields are rejected — protects
 *      against silently storing garbage from malformed verdicts.
 */

'use strict';

const mongoose = require('mongoose');

const RedFlagStateSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: String, required: true, index: true },
    flagId: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'cooldown'],
      required: true,
    },

    // ─── Active-flag fields ──────────────────────────────────────
    severity: { type: String, enum: ['critical', 'warning', 'info'] },
    domain: { type: String },
    blocking: { type: Boolean, default: false },
    raisedAt: { type: Date },
    lastObservedAt: { type: Date },
    observedValue: { type: mongoose.Schema.Types.Mixed },

    // ─── Cooldown-record fields ──────────────────────────────────
    resolvedAt: { type: Date },
    cooldownUntil: { type: Date },

    // ─── Audit (populated on manual / auto resolution) ───────────
    resolvedBy: { type: String },
    resolution: { type: String },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'red_flag_states',
  }
);

// Unique per (beneficiary, flag, status) — at most 1 active + 1 cooldown.
RedFlagStateSchema.index({ beneficiaryId: 1, flagId: 1, status: 1 }, { unique: true });

// Common query: "all active flags for this beneficiary"
RedFlagStateSchema.index({ beneficiaryId: 1, status: 1 });

// Avoid "OverwriteModelError" in watch mode / repeat requires.
module.exports = mongoose.models.RedFlagState || mongoose.model('RedFlagState', RedFlagStateSchema);
