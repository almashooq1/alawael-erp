/**
 * vaccinationObservations.js — Beneficiary-360 Commit 24.
 *
 * Adapter for:
 *
 *   clinical.vaccination.overdue.60d
 *     → dueStatusForBeneficiary(beneficiaryId) →
 *       { overdueCount: <number> }
 *     Condition: `overdueCount >= 1` → flag raised.
 *
 * Registered as `vaccinationService` in the locator. Reads the new
 * `Vaccination` collection.
 *
 * Design decisions:
 *
 *   1. **"Overdue" = scheduled AND due-date older than 60 days.**
 *      Past the grace window AND still `status: 'scheduled'` (not
 *      given, not medically skipped, not guardian-refused). The
 *      60-day window is baked in to match the flag's windowDays;
 *      `options.graceDays` allows override for tests / future
 *      variants.
 *
 *   2. **Only the `scheduled` status triggers.** `administered`
 *      rows are done. `skipped` reflects a clinical decision.
 *      `refused` is a guardian choice — another flag
 *      (not in scope) can monitor refusal rates.
 *
 *   3. **No dedup by vaccine type.** Each dose is its own record,
 *      so three overdue MMR boosters count as three overdue —
 *      that's a stronger compliance signal than collapsing them.
 *
 *   4. **Null / missing dueDate protected.** The Mongoose schema
 *      requires dueDate, so production data is safe; the query
 *      shape still tolerates nullable data imported from legacy
 *      sources.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/Vaccination');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createVaccinationObservations(deps = {}) {
  const Vaccination = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.Vaccination);
  if (Vaccination == null) {
    throw new Error('vaccinationObservations: Vaccination model is required');
  }

  async function dueStatusForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const graceDays = typeof options.graceDays === 'number' ? options.graceDays : 60;
    const cutoff = new Date(now.getTime() - graceDays * MS_PER_DAY);

    const overdueCount = await Vaccination.countDocuments({
      beneficiaryId,
      status: 'scheduled',
      dueDate: { $ne: null, $lt: cutoff },
    });

    return { overdueCount };
  }

  return Object.freeze({ dueStatusForBeneficiary });
}

module.exports = { createVaccinationObservations };
