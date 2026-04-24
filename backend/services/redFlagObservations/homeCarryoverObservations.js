/**
 * homeCarryoverObservations.js — Beneficiary-360 Commit 25.
 *
 * Adapter for:
 *
 *   family.home_carryover.missing.14d
 *     → lastEntryForBeneficiary(beneficiaryId) →
 *       { daysSinceEntry: <number> }
 *     Condition: `daysSinceEntry >= 14` → flag raised.
 *
 * Registered as `homeCarryoverService` in the locator. Reads the
 * new `HomeCarryoverEntry` collection.
 *
 * Design decisions:
 *
 *   1. **No entries → sentinel 9999.** A beneficiary whose family
 *      has never logged carry-over is the clearest form of
 *      disengagement. The flag is `info`-severity with a 7-day
 *      SLA — the cost of firing on freshly-admitted beneficiaries
 *      is low, and triggering a case-manager reach-out to new
 *      families is a feature, not a bug.
 *
 *   2. **Latest-only lookup.** The flag only asks "how long since
 *      the last entry?" — we don't scan the history. The
 *      `(beneficiaryId, loggedAt desc)` index makes this a single
 *      bounded query.
 *
 *   3. **Clock injection** through `options.now` for deterministic
 *      tests (matches every other Beneficiary-360 adapter).
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/HomeCarryoverEntry');

const MS_PER_DAY = 24 * 3600 * 1000;
const NO_ENTRIES_SENTINEL = 9999;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createHomeCarryoverObservations(deps = {}) {
  const Model = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.HomeCarryoverEntry);
  if (Model == null) {
    throw new Error('homeCarryoverObservations: HomeCarryoverEntry model is required');
  }

  async function lastEntryForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const latest = await Model.findOne({ beneficiaryId }, 'loggedAt').sort({ loggedAt: -1 }).lean();

    if (!latest || !latest.loggedAt) {
      return { daysSinceEntry: NO_ENTRIES_SENTINEL };
    }
    const diffMs = now.getTime() - new Date(latest.loggedAt).getTime();
    return {
      daysSinceEntry: Math.max(0, Math.floor(diffMs / MS_PER_DAY)),
    };
  }

  return Object.freeze({ lastEntryForBeneficiary });
}

module.exports = {
  createHomeCarryoverObservations,
  NO_ENTRIES_SENTINEL,
};
