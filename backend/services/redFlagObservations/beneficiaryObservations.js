/**
 * beneficiaryObservations.js — Beneficiary-360 Commits 12 + 14.
 *
 * Reads the Beneficiary model directly to power flags that depend
 * on intrinsic profile data:
 *
 *   clinical.puberty.consent_review.due (Commit 12)
 *     → ageTransitionTo(beneficiaryId) → { age: <number> }
 *     The flag fires when `age === 13` exactly, triggering an
 *     annual consent-review task window. It's an info-level flag
 *     (SLA 30 days) so noise from borderline calculations is
 *     bounded.
 *
 *   compliance.disability_card.expired (Commit 14)
 *     → disabilityCardStatus(beneficiaryId) → { daysToExpiry: <number|null> }
 *     Negative when expired, 0 on the exact expiry day, positive
 *     while valid, null when no card is on file. The flag's
 *     `<= 0` operator treats null as "flag clear" — beneficiaries
 *     without a card on file don't trip the flag (they need a
 *     different, issue-oriented flag which isn't in scope here).
 *
 * Design decisions:
 *
 *   1. Age is computed from `dateOfBirth` against an injectable
 *      `now`. Birthdays are evaluated by calendar comparison
 *      (month + day), not floor-division of days — a beneficiary
 *      born Feb 29 has a deterministic age on non-leap years
 *      (treated as Feb 28 under the same rule Mongoose-stored
 *      dates use after round-tripping).
 *
 *   2. Missing or invalid `dateOfBirth` returns `{ age: null }`.
 *      Downstream `==` comparisons against null return false in
 *      the evaluator, so a missing DOB cannot spuriously raise
 *      the flag.
 *
 *   3. Beneficiary id can be provided as an ObjectId, a string,
 *      or anything `findById` accepts. Tests and callers don't
 *      need to coerce.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/Beneficiary');

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const MS_PER_DAY = 24 * 3600 * 1000;

function computeAge(dobDate, now) {
  if (!(dobDate instanceof Date) || Number.isNaN(dobDate.getTime())) return null;
  if (!(now instanceof Date)) now = new Date();
  let age = now.getFullYear() - dobDate.getFullYear();
  const monthDiff = now.getMonth() - dobDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dobDate.getDate())) {
    age--;
  }
  return age;
}

function createBeneficiaryObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('beneficiaryObservations: Beneficiary model is required');
  }

  async function ageTransitionTo(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const doc = await Model.findById(beneficiaryId, 'dateOfBirth').lean();
    if (doc == null || doc.dateOfBirth == null) return { age: null };
    const dob = doc.dateOfBirth instanceof Date ? doc.dateOfBirth : new Date(doc.dateOfBirth);
    return { age: computeAge(dob, now) };
  }

  /**
   * Days until disability card expiry. Negative means expired.
   * Null (not present) when no card is on file — the flag treats
   * null-comparison as "not tripped", so beneficiaries without a
   * card don't raise this particular flag.
   */
  async function disabilityCardStatus(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const doc = await Model.findById(beneficiaryId, 'disability').lean();
    const expiry = doc && doc.disability ? doc.disability.cardExpiryDate : null;
    if (!expiry) return { daysToExpiry: null };
    const expiryDate = expiry instanceof Date ? expiry : new Date(expiry);
    if (Number.isNaN(expiryDate.getTime())) return { daysToExpiry: null };
    const days = Math.floor((expiryDate.getTime() - now.getTime()) / MS_PER_DAY);
    return { daysToExpiry: days };
  }

  return Object.freeze({ ageTransitionTo, disabilityCardStatus });
}

module.exports = { createBeneficiaryObservations, _computeAge: computeAge };
