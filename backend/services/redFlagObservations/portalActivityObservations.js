/**
 * portalActivityObservations.js — Beneficiary-360 Commit 18.
 *
 * Adapter for:
 *
 *   family.portal.inactive.90d
 *     → guardianLastLogin(beneficiaryId) →
 *       { daysSinceLogin: <number|null> }
 *
 * Registered as `portalActivityService` in the locator. Reads from
 * `Guardian` (each guardian has `lastLoginAt` and a `beneficiaries:
 * [ObjectId]` array).
 *
 * Design decisions:
 *
 *   1. **Min across guardians.** A beneficiary can have multiple
 *      guardians (parent + grandparent + primary caregiver). Only
 *      the MOST RECENT login matters for "family is engaged" —
 *      if even one guardian logged in yesterday, the family is
 *      active. Taking MIN across guardians yields that semantic.
 *
 *   2. **Never-logged-in → sentinel 9999.** A guardian with
 *      `lastLoginAt: null` has never used the portal. We treat
 *      them as "forever inactive" via a large sentinel so the
 *      flag fires when ALL guardians have never logged in. Using
 *      a concrete number (not Infinity or null) keeps the
 *      evaluator's numeric comparison path simple.
 *
 *   3. **No guardians → null.** A beneficiary with zero linked
 *      guardians is a data/admission issue, not a family-
 *      engagement alert. Returning null keeps the flag quiet; a
 *      separate flag can catch unlinked beneficiaries.
 *
 *   4. **Verified accounts only.** `accountStatus: 'verified'`
 *      gates the query. Unverified/blocked guardians can't log
 *      in anyway — counting their (always null) timestamps would
 *      fire the flag on families who did the right thing by
 *      blocking a stale account.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/Guardian');

const MS_PER_DAY = 24 * 3600 * 1000;
const NEVER_LOGGED_IN_SENTINEL = 9999;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createPortalActivityObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('portalActivityObservations: Guardian model is required');
  }

  async function guardianLastLogin(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const guardians = await Model.find(
      { beneficiaries: beneficiaryId, accountStatus: 'verified' },
      'lastLoginAt'
    ).lean();

    if (guardians.length === 0) return { daysSinceLogin: null };

    const dayCounts = guardians.map(g => {
      if (g.lastLoginAt == null) return NEVER_LOGGED_IN_SENTINEL;
      const diffMs = now.getTime() - new Date(g.lastLoginAt).getTime();
      return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
    });

    return { daysSinceLogin: Math.min(...dayCounts) };
  }

  return Object.freeze({ guardianLastLogin });
}

module.exports = {
  createPortalActivityObservations,
  NEVER_LOGGED_IN_SENTINEL,
};
