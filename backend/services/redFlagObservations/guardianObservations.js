/**
 * guardianObservations.js — Beneficiary-360 Commit 21.
 *
 * Adapter for:
 *
 *   compliance.custody.order.stale
 *     → custodyOrderStatus(beneficiaryId) →
 *       { daysSinceRefresh: <number|null> }
 *
 * Registered as `guardianService` in the locator. Distinct from
 * `portalActivityService` (which also reads Guardian but for
 * login activity) — keeping per-concern adapters separate lets the
 * registry wire each flag to its own named service with no
 * coincidental coupling.
 *
 * Design decisions:
 *
 *   1. **MAX across guardians** — the compliance rule is "every
 *      guardian needs a current order"; one stale guardian creates
 *      the audit finding. Returning MAX surfaces the oldest one
 *      so the flag fires when ANY guardian is over 365 days.
 *
 *   2. **Never-refreshed → sentinel 9999.** Same pattern as the
 *      portal-login adapter. A legacy Guardian record with null
 *      `custodyOrderRefreshedAt` is treated as "very stale"
 *      rather than "fine to ignore" — the absence of a refresh
 *      date IS the compliance gap.
 *
 *   3. **No guardians linked → null.** Keeps the flag quiet for
 *      admission-phase beneficiaries; a different (issue-oriented)
 *      flag would catch unlinked beneficiaries.
 *
 *   4. **Verified accounts only.** Blocked / unverified guardians
 *      aren't factored into the check — their custody status is
 *      irrelevant because they can't exercise guardianship
 *      through the system.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/Guardian');

const MS_PER_DAY = 24 * 3600 * 1000;
const NEVER_REFRESHED_SENTINEL = 9999;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createGuardianObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('guardianObservations: Guardian model is required');
  }

  async function custodyOrderStatus(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const guardians = await Model.find(
      { beneficiaries: beneficiaryId, accountStatus: 'verified' },
      'custodyOrderRefreshedAt'
    ).lean();

    if (guardians.length === 0) return { daysSinceRefresh: null };

    const dayCounts = guardians.map(g => {
      if (g.custodyOrderRefreshedAt == null) return NEVER_REFRESHED_SENTINEL;
      const diffMs = now.getTime() - new Date(g.custodyOrderRefreshedAt).getTime();
      return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
    });

    return { daysSinceRefresh: Math.max(...dayCounts) };
  }

  return Object.freeze({ custodyOrderStatus });
}

module.exports = {
  createGuardianObservations,
  NEVER_REFRESHED_SENTINEL,
};
