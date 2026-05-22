'use strict';

/**
 * IncidentAuditChain — Wave 277i (Pass 1: model + service foundation).
 *
 * Append-only hash-chained ledger over every state-changing
 * incident-lifecycle action. Mirrors the AttendanceAuditChain (W134)
 * design. Each entry contains:
 *   - prevHash    : hash of the previous entry (chain head)
 *   - payloadHash : sha256 over the canonical action payload
 *   - hash        : sha256(prevHash || payloadHash || sequence ||
 *                          actorId || occurredAt || action)
 *
 * Verifying integrity = recompute hash from prev and inputs; any
 * tamper anywhere in history is detectable because all downstream
 * hashes mismatch. The first failing sequence is reported so the
 * operator can investigate.
 *
 * Why incidents specifically?
 *   Adverse-event records anchor regulatory audits (Saudi MOH, JCI).
 *   The W277b MFA gates already prevent a compromised admin from
 *   editing the row via the API — but they don't prevent direct
 *   database mutation, an insider with DB credentials, or a backup
 *   restore that quietly rolls back state. The audit chain provides
 *   tamper-evidence: even if a row is mutated outside the API, the
 *   verifier surfaces it on next sweep.
 *
 * Wave-18 invariants:
 *   • (sequence) unique + monotonically increasing
 *   • hash + payloadHash + prevHash required
 *   • action ∈ ACTIONS
 *
 * TTL: NONE — audit chain is permanent. Pruning would defeat the
 * purpose. Long-term PII redaction inside payloads is acceptable —
 * the chain itself stays intact because redaction yields a separate
 * "redacted" entry, not an edit of the prior row.
 */

const mongoose = require('mongoose');

const ACTIONS = [
  // Pass 1 covers the W277b 5 terminals + create. Pass 2 may add
  // 'comment-added', 'attachment-added' if those are deemed audit-
  // worthy (probably yes for forensic trace, but separate review).
  'incident-created',
  'incident-status-changed',
  'incident-assigned',
  'incident-responder-added',
  'incident-escalated',
  'incident-resolved',
  'incident-closed',
  'incident-archived',
  'incident-deleted',
  'incident-updated', // generic field update via PUT /:id
];

const GENESIS_HASH = '0'.repeat(64);

const IncidentAuditChainSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true, unique: true, index: true },

    action: { type: String, enum: ACTIONS, required: true, index: true },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    actorRole: { type: String, default: null, maxlength: 60 },

    // The incident being acted upon. Indexed so a per-incident
    // "show me the full audit trail of this row" query is cheap.
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

    // Set by the verifier when this entry has been confirmed intact
    // in the last sweep. Helps the operator UI surface stale
    // verifications without re-running the whole chain.
    lastVerifiedAt: { type: Date, default: null },
  },
  { collection: 'incident_audit_chain' }
);

IncidentAuditChainSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

IncidentAuditChainSchema.path('__invariants').validate(function () {
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
  mongoose.models.IncidentAuditChain ||
  mongoose.model('IncidentAuditChain', IncidentAuditChainSchema);

module.exports.IncidentAuditChainSchema = IncidentAuditChainSchema;
module.exports.ACTIONS = ACTIONS;
module.exports.GENESIS_HASH = GENESIS_HASH;
