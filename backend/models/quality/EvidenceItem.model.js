'use strict';

/**
 * EvidenceItem — Phase 13 Commit 2 (4.0.56).
 *
 * Atomic compliance-evidence record. Designed to answer the
 * inspector question: "show me, with proof, that control X was
 * operating on date Y" — in one row, with an integrity hash, a
 * validity window, a retention policy, and a supersession chain.
 *
 * Design decisions:
 *
 *   1. **Polymorphic source** — `sourceModule + sourceRef` back-links
 *      to whatever produced the evidence without a hard FK. Keeps
 *      the vault decoupled from 13 upstream modules.
 *
 *   2. **Multi-control mapping** — `controlIds[]` + `regulationRefs[]`
 *      because one artifact (e.g. a fire-drill report) often
 *      satisfies multiple controls across multiple standards
 *      (CBAHI.FMS.07 + JCI.FMS.11 + MOH.SAFE.03).
 *
 *   3. **Integrity via hash** — the service computes sha256/sha512
 *      from the uploaded body and stores it here. Later verification
 *      re-hashes and compares. Format-validated via
 *      registry.isValidHash before save.
 *
 *   4. **Retention-aware destruction** — `destroyAfter` is populated
 *      from the retention policy at ingest. A future worker (Phase
 *      13 C11) will purge past-destroy items respecting legal holds.
 *
 *   5. **Supersession chain** — replacing an item sets its status to
 *      `superseded` and links to the new item via `supersededBy`.
 *      The new item keeps a `supersedes` pointer back. Chain stays
 *      immutable.
 *
 *   6. **Signature trail** — `signatures[]` can hold multiple
 *      detached signatures (e.g. Quality Director + Medical Director
 *      both signing a policy attestation).
 *
 *   7. **Legal hold** — `legalHold` overrides any auto-destruction.
 *      Set when evidence is relevant to an open investigation,
 *      complaint, or regulator request.
 *
 *   8. **Soft-delete** via `deleted_at` — evidence is almost never
 *      hard-deleted; the cadastre is itself an audit artifact.
 */

const mongoose = require('mongoose');
const {
  EVIDENCE_TYPES,
  EVIDENCE_STATUSES,
  SOURCE_MODULES,
  HASH_ALGORITHMS,
  DEFAULT_HASH_ALGORITHM,
  STORAGE_CLASSES,
  RETENTION_POLICIES,
  isValidHash,
} = require('../../config/evidence.registry');

// ── sub-schemas ────────────────────────────────────────────────────

const regulationRefSchema = new mongoose.Schema(
  {
    standard: { type: String, required: true }, // e.g. "cbahi", "iso_9001"
    clause: { type: String, required: true }, // e.g. "9.3.2", "FMS.07"
    version: { type: String, default: null }, // e.g. "2022"
  },
  { _id: false }
);

const fileRefSchema = new mongoose.Schema(
  {
    storageClass: {
      type: String,
      enum: STORAGE_CLASSES,
      default: 'inline',
      required: true,
    },
    storageKey: { type: String, default: null }, // path / s3 key / external URL
    filename: { type: String, default: null },
    mimeType: { type: String, default: null },
    sizeBytes: { type: Number, default: null, min: 0 },
    hashAlgorithm: {
      type: String,
      enum: HASH_ALGORITHMS,
      default: DEFAULT_HASH_ALGORITHM,
    },
    hash: { type: String, default: null }, // hex digest
  },
  { _id: false }
);

const signatureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nameSnapshot: { type: String, default: null },
    role: { type: String, required: true },
    signedAt: { type: Date, required: true, default: Date.now },
    signatureHash: { type: String, default: null },
    intent: { type: String, default: 'approval' }, // approval | witness | review
  },
  { _id: false }
);

const retentionAlertSchema = new mongoose.Schema(
  {
    window: { type: Number, required: true },
    firedAt: { type: Date, required: true },
  },
  { _id: false }
);

const retentionSchema = new mongoose.Schema(
  {
    policy: {
      type: String,
      required: true,
      validate: {
        validator: v => Object.prototype.hasOwnProperty.call(RETENTION_POLICIES, v),
        message: props => `unknown retention policy "${props.value}"`,
      },
    },
    destroyAfter: { type: Date, required: true },
    legalHold: { type: Boolean, default: false },
    legalHoldReason: { type: String, default: null },
    alertsFired: { type: [retentionAlertSchema], default: [] },
  },
  { _id: false }
);

// ── main schema ────────────────────────────────────────────────────

const evidenceItemSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // EV-2026-000001
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    type: { type: String, enum: EVIDENCE_TYPES, required: true },
    status: {
      type: String,
      enum: EVIDENCE_STATUSES,
      default: 'valid',
      index: true,
    },

    // Cross-regulation mapping
    controlIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceControl' }],
      default: [],
      index: true,
    },
    regulationRefs: { type: [regulationRefSchema], default: [] },

    // Source (polymorphic backlink)
    sourceModule: { type: String, enum: SOURCE_MODULES, required: true },
    sourceRef: {
      collection: { type: String, default: null },
      docId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    // Storage + integrity
    file: { type: fileRefSchema, default: () => ({}) },

    // Lifecycle
    collectedAt: { type: Date, required: true, default: Date.now },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, default: null }, // null = perpetual until superseded

    // Retention
    retention: { type: retentionSchema, required: true },

    // Approval / signature trail
    signatures: { type: [signatureSchema], default: [] },

    // Supersession chain
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'EvidenceItem', default: null },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EvidenceItem', default: null },
    supersededAt: { type: Date, default: null },

    // Revocation (before natural expiry)
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revokedReason: { type: String, default: null },

    // Scope
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

    tags: { type: [String], default: [] },
    notes: { type: String, default: null },

    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── indexes ────────────────────────────────────────────────────────

evidenceItemSchema.index({ sourceModule: 1, 'sourceRef.collection': 1, 'sourceRef.docId': 1 });
evidenceItemSchema.index({ 'regulationRefs.standard': 1, 'regulationRefs.clause': 1 });
evidenceItemSchema.index({ validUntil: 1, status: 1 });
evidenceItemSchema.index({ 'retention.destroyAfter': 1, 'retention.legalHold': 1 });
evidenceItemSchema.index({ branchId: 1, status: 1, type: 1 });
evidenceItemSchema.index({ deleted_at: 1 });

// ── validators ─────────────────────────────────────────────────────

evidenceItemSchema.path('file').validate(function (file) {
  // If a hash is present, it must be well-formed for the declared algorithm.
  if (file && file.hash != null && !isValidHash(file.hash, file.hashAlgorithm)) {
    this.invalidate('file.hash', 'hash format does not match algorithm');
    return false;
  }
  return true;
});

// ── auto-numbering ─────────────────────────────────────────────────

evidenceItemSchema.pre('validate', async function () {
  if (this.code) return;
  const year = (this.collectedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('EvidenceItem');
  const count = await Model.countDocuments({ code: { $regex: `^EV-${year}-` } });
  this.code = `EV-${year}-${String(count + 1).padStart(6, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

evidenceItemSchema.virtual('isTerminal').get(function () {
  return ['superseded', 'revoked'].includes(this.status);
});

evidenceItemSchema.set('toJSON', { virtuals: true });
evidenceItemSchema.set('toObject', { virtuals: true });

// ── export ─────────────────────────────────────────────────────────

const EvidenceItem =
  mongoose.models.EvidenceItem || mongoose.model('EvidenceItem', evidenceItemSchema);

module.exports = EvidenceItem;
