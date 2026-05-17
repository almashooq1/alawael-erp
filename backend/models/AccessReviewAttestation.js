'use strict';

/**
 * AccessReviewAttestation — Wave 38.
 *
 * Canonical evidence record for the User Access Review &
 * Recertification Program. Every attestation across all 7 review
 * types (quarterly / privileged / branch / hq / dormant / mover /
 * high-risk) lands here.
 *
 * The hash chain (priorAttestationHash → currentHash) forms a Merkle
 * log per target user — tampering with any attestation breaks the
 * chain at that point. `anchorTxId` commits the leaf to AnchorLedger
 * (we have the blockchain anchor infrastructure from Wave 17
 * `project_blockchain_certificates_2026-05-03`) for external
 * tamper-evidence.
 *
 * Cross-field invariants use the Wave-18 virtual-path validator
 * pattern — `pre('validate')` with `this.invalidate()` doesn't
 * reliably propagate in our Mongoose 9 setup.
 *
 * Indexes:
 *   • (cycleId, reviewType)     — completion dashboard
 *   • (targetUserId, signedAt DESC)  — per-target audit timeline
 *   • (reviewerId, signedAt DESC)    — per-reviewer activity
 *   • (cycleId, decision)       — cycle close report
 *   • (decision, signedAt DESC) — REVOKE-rate analytics
 *
 * Branch scope: attestations are intentionally GLOBAL — the program
 * itself spans branches (HQ recerts include cross-branch reviewers).
 * Authorization at the route layer (Wave 39) gates reads instead of
 * the schema plugin.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/access-review.registry');

const AccessReviewAttestationSchema = new mongoose.Schema(
  {
    cycleId: { type: String, required: true, index: true, maxlength: 100 },
    reviewType: {
      type: String,
      enum: reg.REVIEW_TYPES,
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewerRole: { type: String, required: true, maxlength: 100 },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetRole: { type: String, required: true, maxlength: 100 },
    targetScope: { type: String, required: true, maxlength: 50 },
    criteriaAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    decision: {
      type: String,
      enum: reg.DECISIONS,
      required: true,
      index: true,
    },
    justificationAr: { type: String, default: null, maxlength: 4000 },
    justificationEn: { type: String, default: null, maxlength: 4000 },
    evidenceLinks: {
      type: [{ type: String, maxlength: 500 }],
      default: () => [],
    },
    signedAt: { type: Date, required: true, default: Date.now },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },
    coSignerNafathIds: {
      type: [{ type: String, maxlength: 200 }],
      default: () => [],
    },
    priorAttestationHash: { type: String, default: null, maxlength: 128 },
    currentHash: { type: String, required: true, maxlength: 128 },
    anchorTxId: { type: String, default: null, maxlength: 200 },
    remediationCorrelationId: { type: String, default: null, maxlength: 100 },
  },
  { timestamps: true, collection: 'access_review_attestations' }
);

// Indexes
AccessReviewAttestationSchema.index({ cycleId: 1, reviewType: 1 });
AccessReviewAttestationSchema.index({ targetUserId: 1, signedAt: -1 });
AccessReviewAttestationSchema.index({ reviewerId: 1, signedAt: -1 });
AccessReviewAttestationSchema.index({ cycleId: 1, decision: 1 });
AccessReviewAttestationSchema.index({ decision: 1, signedAt: -1 });

// ─── Cross-field invariants (Wave-18 virtual-path pattern) ─────────
//
// `pre('validate')` with `next(new Error(...))` swallows the message
// under our Mongoose 9 setup. Synchronous validator on a virtual
// path is the reliable pattern.

AccessReviewAttestationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

const TYPES_REQUIRING_COSIGNERS = new Set([
  reg.REVIEW_TYPE.PRIVILEGED,
  reg.REVIEW_TYPE.HQ,
  reg.REVIEW_TYPE.HIGH_RISK,
]);

const DECISIONS_REQUIRING_JUSTIFICATION = new Set([
  reg.DECISION.REVISE,
  reg.DECISION.REVOKE,
  reg.DECISION.ESCALATE,
  reg.DECISION.ROTATE,
]);

AccessReviewAttestationSchema.path('__invariants').validate(function () {
  let ok = true;

  // REVOKE / REVISE / ESCALATE / ROTATE require at least one bilingual
  // justification — silent state changes are forbidden.
  if (
    DECISIONS_REQUIRING_JUSTIFICATION.has(this.decision) &&
    !this.justificationAr &&
    !this.justificationEn
  ) {
    this.invalidate(
      'justificationAr',
      `${this.decision} decisions require justificationAr or justificationEn`
    );
    ok = false;
  }

  // Privileged / HQ / high-risk attestations require at least one
  // cosigner Nafath ID — single-eye review is forbidden.
  if (TYPES_REQUIRING_COSIGNERS.has(this.reviewType)) {
    if (!Array.isArray(this.coSignerNafathIds) || this.coSignerNafathIds.length < 1) {
      this.invalidate(
        'coSignerNafathIds',
        `${this.reviewType} attestations require at least 1 cosigner`
      );
      ok = false;
    }
  }

  // Hash chain — currentHash must differ from priorAttestationHash
  // (otherwise an attestation could re-anchor the same evidence and
  // create a fake audit row).
  if (this.priorAttestationHash && this.priorAttestationHash === this.currentHash) {
    this.invalidate('currentHash', 'currentHash must differ from priorAttestationHash');
    ok = false;
  }

  // Self-attestation guard — reviewer cannot equal target. The
  // service layer also enforces this, but defence-in-depth.
  if (
    this.reviewerId &&
    this.targetUserId &&
    String(this.reviewerId) === String(this.targetUserId)
  ) {
    this.invalidate('reviewerId', 'reviewer cannot be the target of the attestation');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.AccessReviewAttestation ||
  mongoose.model('AccessReviewAttestation', AccessReviewAttestationSchema);

module.exports.AccessReviewAttestationSchema = AccessReviewAttestationSchema;
