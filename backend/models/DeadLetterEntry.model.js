/**
 * DeadLetterEntry — persistent row for a failed external-integration call
 * that the AclClient parked after exhausting every retry.
 *
 * Indexed for the two dashboard queries:
 *   1. "show me all parked entries for integration X"
 *   2. "show me the oldest still-parked entries overall" (replay worker)
 *
 * Payload + headers have already been PII-redacted before they get here —
 * the redaction happens in AclClient before the park() call.
 */

'use strict';

const mongoose = require('mongoose');

const STATUSES = ['parked', 'replaying', 'resolved', 'discarded'];

const DeadLetterEntrySchema = new mongoose.Schema(
  {
    _id: { type: String },
    integration: { type: String, required: true, index: true },
    operation: { type: String, default: null },
    method: { type: String, default: null },
    endpoint: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    headers: { type: mongoose.Schema.Types.Mixed, default: null },
    idempotencyKey: { type: String, default: null, index: true },
    correlationId: { type: String, default: null, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: STATUSES, default: 'parked', index: true },
    replayCount: { type: Number, default: 0 },
    resolvedAt: { type: Number, default: null },
    discardedAt: { type: Number, default: null },
    discardReason: { type: String, default: null },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  { _id: false, versionKey: false, collection: 'deadLetterEntries' }
);

DeadLetterEntrySchema.index({ integration: 1, status: 1, createdAt: -1 });
DeadLetterEntrySchema.index({ status: 1, updatedAt: 1 });

const DeadLetterEntry =
  mongoose.models.DeadLetterEntry || mongoose.model('DeadLetterEntry', DeadLetterEntrySchema);

module.exports = DeadLetterEntry;
module.exports.STATUSES = STATUSES;
