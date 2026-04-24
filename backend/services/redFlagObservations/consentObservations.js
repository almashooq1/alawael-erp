/**
 * consentObservations.js — Beneficiary-360 Commit 19.
 *
 * Adapter for two CRITICAL + blocking flags:
 *
 *   clinical.consent.treatment.missing_pre_session
 *     → activeForBeneficiary(beneficiaryId) → { treatmentActive: boolean }
 *     Condition: `treatmentActive === false` → flag raised.
 *
 *   compliance.consent.required.missing
 *     → missingRequiredForBeneficiary(beneficiaryId) → { missingCount: number }
 *     Condition: `missingCount >= 1` → flag raised.
 *
 * Registered as `consentService` in the locator.
 *
 * Design decisions:
 *
 *   1. **Opt-in via `Beneficiary.consentTrackingEnabled`.** Both
 *      flags are CRITICAL + blocking — if they fire broadly on day
 *      one, every session at every center halts. To avoid that,
 *      the adapter short-circuits to a safe "all clear" reply for
 *      any beneficiary whose tracking flag is false. Centers flip
 *      it to true per beneficiary as they complete the digital
 *      consent capture.
 *
 *   2. **"Active" = granted in the past, not revoked, not expired.**
 *      A `grantedAt` in the future is ignored (you can't be active
 *      before you're granted). `expiresAt === null` means never
 *      expires.
 *
 *   3. **Two-model dependency.** Both Consent and Beneficiary must
 *      be resolvable for this adapter to work. The factory throws
 *      at creation time if either is missing — bootstrap registers
 *      this service only when BOTH models load.
 */

'use strict';

const DEFAULT_CONSENT_EXPORTS = requireOptional('../../models/Consent');
const DEFAULT_BENEFICIARY_MODEL = requireOptional('../../models/Beneficiary');

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createConsentObservations(deps = {}) {
  const Consent = deps.consentModel || (DEFAULT_CONSENT_EXPORTS && DEFAULT_CONSENT_EXPORTS.Consent);
  const Beneficiary = deps.beneficiaryModel || DEFAULT_BENEFICIARY_MODEL;
  const requiredTypes = deps.requiredTypes ||
    (DEFAULT_CONSENT_EXPORTS && DEFAULT_CONSENT_EXPORTS.REQUIRED_TYPES) || [
      'treatment',
      'data_sharing',
    ];

  if (Consent == null) {
    throw new Error('consentObservations: Consent model is required');
  }
  if (Beneficiary == null) {
    throw new Error('consentObservations: Beneficiary model is required');
  }

  async function isTrackingEnabled(beneficiaryId) {
    const doc = await Beneficiary.findById(beneficiaryId, 'consentTrackingEnabled').lean();
    return doc != null && doc.consentTrackingEnabled === true;
  }

  function activeConsentQuery(beneficiaryId, type, now) {
    return {
      beneficiaryId,
      type,
      grantedAt: { $lte: now },
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };
  }

  async function activeForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    // Tracking disabled → declare treatment active so the blocking
    // flag stays quiet until the center enables the beneficiary.
    if (!(await isTrackingEnabled(beneficiaryId))) {
      return { treatmentActive: true };
    }
    const existing = await Consent.findOne(
      activeConsentQuery(beneficiaryId, 'treatment', now),
      '_id'
    ).lean();
    return { treatmentActive: existing != null };
  }

  async function missingRequiredForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    if (!(await isTrackingEnabled(beneficiaryId))) {
      return { missingCount: 0 };
    }
    const activeTypes = await Consent.distinct('type', {
      beneficiaryId,
      type: { $in: requiredTypes },
      grantedAt: { $lte: now },
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    });
    const missing = requiredTypes.filter(t => !activeTypes.includes(t));
    return { missingCount: missing.length };
  }

  return Object.freeze({
    activeForBeneficiary,
    missingRequiredForBeneficiary,
  });
}

module.exports = { createConsentObservations };
