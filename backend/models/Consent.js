/**
 * Consent.js — Beneficiary consent records.
 *
 * Beneficiary-360 Commit 19. Stand-alone model for the forms a
 * guardian signs on behalf of a beneficiary: treatment consent,
 * data-sharing (PDPL), photography, trips, research participation.
 *
 * Design decisions:
 *
 *   1. **Append-only by convention.** Applications don't MUTATE a
 *      consent to "revoke" it — they SET `revokedAt` + `revokedReason`
 *      and the history (who signed, when, what for) stays intact.
 *      The UI still lets a guardian withdraw consent; the database
 *      just never loses the prior state.
 *
 *   2. **Optional `expiresAt`.** Many centers require annual
 *      re-consent for certain types. An absent `expiresAt` means
 *      the grant doesn't auto-expire; a present value means the
 *      flag treats it as inactive once `now > expiresAt`.
 *
 *   3. **`REQUIRED_TYPES` is a code-level constant**, not per-
 *      branch config. CBAHI + PDPL require treatment consent and
 *      data-sharing consent universally. Centers that want to
 *      mark ADDITIONAL types as required can extend via config
 *      later; the two defaults are non-negotiable.
 *
 *   4. **Index on `(beneficiaryId, type, grantedAt desc)`** so the
 *      adapter's "latest active" lookup is a single indexed scan,
 *      not a collection-scan per flag evaluation.
 */

'use strict';

const mongoose = require('mongoose');

const CONSENT_TYPES = Object.freeze([
  'treatment',
  'photography',
  'data_sharing',
  'trip',
  'research',
]);

// Consent types required for standard clinical care. Missing any of
// these trips compliance.consent.required.missing.
const REQUIRED_TYPES = Object.freeze(['treatment', 'data_sharing']);

const consentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: CONSENT_TYPES,
      required: true,
    },
    // Which guardian signed it. Optional because some legacy
    // paper-to-digital imports may have only the file pointer.
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    grantedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
    // Pointers to the signed artifact — hashed signature + stored
    // PDF. Both are free-form strings so the storage layer can
    // evolve (S3, local disk, ZATCA-compliant vault) without a
    // schema migration.
    signatureRef: { type: String, default: null },
    documentRef: { type: String, default: null },
  },
  { timestamps: true, collection: 'consents' }
);

// Primary lookup: latest records of this type for this beneficiary.
consentSchema.index({ beneficiaryId: 1, type: 1, grantedAt: -1 });

const Consent = mongoose.models.Consent || mongoose.model('Consent', consentSchema);

module.exports = { Consent, CONSENT_TYPES, REQUIRED_TYPES };
