'use strict';

/**
 * AttendanceAuditChain — Wave 134.
 *
 * Append-only hash-chained ledger over every state-changing
 * attendance action. Each entry contains:
 *   - prevHash: hash of the previous entry (Merkle-ish chain head)
 *   - payloadHash: sha256 over the canonical action payload
 *   - hash: sha256(prevHash || payloadHash || sequence || actorId || at)
 *
 * Verifying integrity = recompute hash from prev and inputs; any
 * tamper anywhere in history is detectable because all downstream
 * hashes will mismatch.
 *
 * Wave-18 invariants:
 *   • (sequence) unique + monotonically increasing
 *   • hash + payloadHash + prevHash required
 *   • action ∈ ACTIONS
 *
 * TTL: none — audit chain is permanent. Pruning would defeat the
 * purpose. Use Wave 133 retention policy for PII redaction inside
 * payloads if needed (but the hash chain itself remains intact —
 * redacted payload yields a separate "redacted" entry).
 */

const mongoose = require('mongoose');

const ACTIONS = [
  'source-event-persisted',
  'source-event-rejected',
  'reconciliation-run',
  'reconciliation-overridden',
  'exception-emitted',
  'exception-resolved',
  'exception-dismissed',
  'correction-created',
  'correction-approved',
  'correction-rejected',
  'correction-withdrawn',
  'payroll-period-locked',
  'payroll-period-reopened',
  'payroll-override-executed',
  'privacy-export',
  'privacy-erasure',
  'retention-applied',
  'card-issued',
  'card-replaced',
  'card-suspended',
];

const GENESIS_HASH = '0'.repeat(64);

const AttendanceAuditChainSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true, unique: true, index: true },

    action: { type: String, enum: ACTIONS, required: true, index: true },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    actorRole: { type: String, default: null, maxlength: 60 },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadHash: { type: String, required: true, maxlength: 128 },

    prevHash: { type: String, required: true, maxlength: 128 },
    hash: { type: String, required: true, unique: true, maxlength: 128 },

    occurredAt: { type: Date, required: true, default: Date.now, index: true },

    // Set to true by the verifier when this entry has been confirmed
    // intact in the last sweep. Helps the operator UI surface stale
    // verifications without re-running the whole chain.
    lastVerifiedAt: { type: Date, default: null },
  },
  { collection: 'attendance_audit_chain' }
);

AttendanceAuditChainSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceAuditChainSchema.path('__invariants').validate(function () {
  let ok = true;
  if (typeof this.sequence !== 'number' || this.sequence < 0) {
    this.invalidate('sequence', 'must be ≥ 0');
    ok = false;
  }
  if (!ACTIONS.includes(this.action)) {
    this.invalidate('action', `must be one of ${ACTIONS.join(',')}`);
    ok = false;
  }
  if (!this.payloadHash) {
    this.invalidate('payloadHash', 'required');
    ok = false;
  }
  if (!this.prevHash) {
    this.invalidate('prevHash', 'required');
    ok = false;
  }
  if (!this.hash) {
    this.invalidate('hash', 'required');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceAuditChain ||
  mongoose.model('AttendanceAuditChain', AttendanceAuditChainSchema);

module.exports.AttendanceAuditChainSchema = AttendanceAuditChainSchema;
module.exports.ACTIONS = ACTIONS;
module.exports.GENESIS_HASH = GENESIS_HASH;
