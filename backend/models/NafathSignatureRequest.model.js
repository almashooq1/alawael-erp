/**
 * NafathSignatureRequest — persistent record of a request to have a
 * document signed via the Saudi Nafath digital identity service.
 *
 * This is distinct from NafathRequest (the SSO/login flow). A signature
 * request binds:
 *   - a document (IRP / Contract / Consent / Policy / Generic)
 *   - a cryptographic hash of that document's final rendered form
 *   - the signer's national ID
 *   - a lifecycle: REQUESTED → PENDING → APPROVED | REJECTED | EXPIRED
 *
 * On APPROVED the adapter returns a JWS (signed JWT) that asserts the signer
 * applied their Nafath identity signature to the stated document hash at the
 * stated time. That JWS + the document + a signature manifest form the
 * evidence package that a court / PDPL auditor can replay to prove
 * authenticity.
 *
 * Indexes support the three hot queries:
 *   1. "show me pending signature requests" (admin dashboard)
 *   2. "did this document get signed, and when?" (per-document lookup)
 *   3. "everything this signer has signed for us" (per-national-id history)
 */

'use strict';

const mongoose = require('mongoose');

const DOCUMENT_TYPES = ['IRP', 'Contract', 'Consent', 'Policy', 'Invoice', 'Generic'];
const STATUSES = ['REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ERROR'];

const NafathSignatureRequestSchema = new mongoose.Schema(
  {
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    documentHash: { type: String, required: true }, // sha256 of the rendered PDF bytes
    documentHashAlgo: { type: String, default: 'sha256' },
    purpose: { type: String, default: 'sign' }, // sign | approve | acknowledge

    signerNationalId: { type: String, required: true, index: true },
    signerRole: { type: String, default: null }, // guardian | employee | manager | auditor
    signerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    transactionId: { type: String, required: true, unique: true },
    randomNumber: { type: String, required: true },

    status: { type: String, enum: STATUSES, default: 'REQUESTED', index: true },
    mode: { type: String, enum: ['mock', 'live'], default: 'mock' },

    expiresAt: { type: Date, required: true },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // Signature artifacts returned by Nafath on APPROVED
    signatureJws: { type: String, default: null }, // raw JWS from Nafath
    signatureAlgo: { type: String, default: null }, // e.g. RS256
    signerAttributes: {
      fullName: String,
      dateOfBirth: Date,
      nationality: String,
      gender: String,
    },

    // Audit trail
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ipHash: { type: String, default: null },
    userAgent: { type: String, default: null },
    errorMessage: { type: String, default: null },

    // For idempotency of the request itself: if two callers submit the same
    // (documentHash, signerNationalId, purpose) triple within a short window
    // we reuse the transactionId instead of creating a second one.
    requestFingerprint: { type: String, index: true, default: null },
  },
  { timestamps: true, collection: 'nafathSignatureRequests' }
);

NafathSignatureRequestSchema.index({ status: 1, expiresAt: 1 });
NafathSignatureRequestSchema.index({ documentType: 1, documentId: 1, status: 1 });

NafathSignatureRequestSchema.methods.isResolved = function () {
  return ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ERROR'].includes(this.status);
};

const NafathSignatureRequest =
  mongoose.models.NafathSignatureRequest ||
  mongoose.model('NafathSignatureRequest', NafathSignatureRequestSchema);

module.exports = NafathSignatureRequest;
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.STATUSES = STATUSES;
