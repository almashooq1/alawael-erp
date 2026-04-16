/**
 * consentCheck — single predicate used throughout the codebase before
 * processing personal data for a consent-based purpose.
 *
 * For non-consent lawful bases (contract, legal_obligation, vital_interest,
 * legitimate_interest), callers should NOT invoke consentCheck — instead,
 * they document the lawful basis in the relevant service.
 */

'use strict';

const { PURPOSES } = require('./consent.model');

/**
 * @param {object} deps
 * @param {object} deps.ConsentModel  Mongoose model for Consent
 * @returns {(subjectType: string, subjectId: string, purpose: string) => Promise<{ allowed: boolean, reason: string, consentId?: any }>}
 */
function makeConsentCheck({ ConsentModel }) {
  if (!ConsentModel) throw new Error('consentCheck: ConsentModel dependency required');
  return async function consentCheck(subjectType, subjectId, purpose) {
    if (!PURPOSES.includes(purpose)) {
      return { allowed: false, reason: 'invalid_purpose' };
    }
    const latest = await ConsentModel.latestFor(subjectType, subjectId, purpose);
    if (!latest) return { allowed: false, reason: 'no_consent_record' };
    if (latest.state !== 'granted') {
      return { allowed: false, reason: `consent_${latest.state}`, consentId: latest._id };
    }
    if (latest.expiresAt && latest.expiresAt.getTime() < Date.now()) {
      return { allowed: false, reason: 'consent_expired', consentId: latest._id };
    }
    return { allowed: true, reason: 'granted', consentId: latest._id };
  };
}

module.exports = { makeConsentCheck };
