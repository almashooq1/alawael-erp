'use strict';

/**
 * ControlledDocument.model.js — World-Class QMS Phase 29 Commit 7.
 *
 * Versioned controlled documents with 21 CFR Part 11 e-signatures.
 *
 * Each document has a list of `versions[]`; the **active** version is
 * the most recent one whose status is `effective`. Older effective
 * versions become `superseded` automatically when a new one is
 * activated.
 *
 * Signatures live on each version and form a hash chain — chaining
 * `prevHash → currentHash` so any tamper attempt invalidates the
 * subsequent links.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { DOCUMENT_STATUSES } = require('../../config/controlled-document.registry');

const signatureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    printedName: { type: String, required: true }, // snapshotted name per §11.50(a)(1)
    role: { type: String, required: true },
    meaning: {
      type: String,
      enum: ['authored', 'reviewed', 'approved', 'witnessed', 'acknowledged'],
      required: true,
    },
    signedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: null }, // optional but recommended
    userAgent: { type: String, default: null },
    // 21 CFR §11.200 — re-auth confirmation. The route layer sets this
    // to true after verifying the user re-entered their credentials.
    reAuthConfirmed: { type: Boolean, default: true },
    // Hash chain — see ControlledDocumentService for the algorithm.
    prevHash: { type: String, default: null },
    currentHash: { type: String, default: null },
    notes: { type: String, default: null },
    // Optional revocation pointer (per §11.10(e) — only mechanism to
    // remove a signature is a forward-pointing revocation).
    revokedByEntryId: { type: Schema.Types.ObjectId, default: null },
    revocationReason: { type: String, default: null },
  },
  { _id: true }
);

const readAcknowledgementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acknowledgedAt: { type: Date, default: Date.now },
    versionNumber: { type: Number, required: true },
  },
  { _id: true }
);

const versionSchema = new Schema(
  {
    versionNumber: { type: Number, required: true },
    bodyHtml: { type: String, default: null }, // rich body for in-app rendering
    bodyMarkdown: { type: String, default: null }, // optional plain markdown
    attachmentUrl: { type: String, default: null }, // external PDF reference
    contentHash: { type: String, required: true }, // SHA-256 of the rendered body
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'draft', required: true },
    effectiveDate: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    supersededByVersionNumber: { type: Number, default: null },
    changeSummary: { type: String, default: null },
    signatures: { type: [signatureSchema], default: [] },
    readAcknowledgements: { type: [readAcknowledgementSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const auditTrailSchema = new Schema(
  {
    action: { type: String, required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    occurredAt: { type: Date, default: Date.now },
    detail: { type: String, default: null },
    targetVersion: { type: Number, default: null },
  },
  { _id: true }
);

const docSchema = new Schema(
  {
    documentNumber: { type: String, unique: true, index: true }, // DOC-YYYY-NNNN
    title: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'policy',
        'sop',
        'procedure',
        'work_instruction',
        'form',
        'training',
        'specification',
        'manual',
      ],
      required: true,
    },
    description: { type: String, default: null },
    department: { type: String, default: null },
    tags: { type: [String], default: [] },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requiredAcknowledgersByRole: { type: [String], default: [] }, // e.g. ['nurse', 'therapist']

    versions: { type: [versionSchema], default: [] },
    activeVersionNumber: { type: Number, default: null },

    auditTrail: { type: [auditTrailSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'controlled_documents' }
);

docSchema.index({ branchId: 1, type: 1 });
docSchema.index({ 'versions.status': 1 });

docSchema.pre('validate', async function () {
  if (!this.documentNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('ControlledDocument');
    const count = await Model.countDocuments({
      documentNumber: { $regex: `^DOC-${year}-` },
    });
    this.documentNumber = `DOC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

/**
 * Compute content-hash for a version body.
 */
function computeContentHash({ bodyHtml = '', bodyMarkdown = '', attachmentUrl = '' } = {}) {
  return crypto
    .createHash('sha256')
    .update(`${bodyHtml}\n----\n${bodyMarkdown}\n----\n${attachmentUrl}`)
    .digest('hex');
}

/**
 * Compute the next link in the signature chain.
 */
function computeSignatureHash({ prevHash, userId, printedName, meaning, signedAt, contentHash }) {
  return crypto
    .createHash('sha256')
    .update(
      [
        prevHash || '',
        String(userId),
        printedName,
        meaning,
        new Date(signedAt).toISOString(),
        contentHash,
      ].join('|')
    )
    .digest('hex');
}

module.exports =
  mongoose.models.ControlledDocument || mongoose.model('ControlledDocument', docSchema);

module.exports.computeContentHash = computeContentHash;
module.exports.computeSignatureHash = computeSignatureHash;
