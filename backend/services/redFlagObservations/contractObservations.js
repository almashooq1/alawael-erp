/**
 * contractObservations.js — Beneficiary-360 Commit 27.
 *
 * Adapter for:
 *
 *   operational.contract.expiring.30d
 *     → beneficiaryContracts(beneficiaryId) →
 *       { daysToExpiry: <number|null> }
 *     Condition: `daysToExpiry <= 30` → flag raised.
 *
 * Registered as `contractService` in the locator. Reads the new
 * `BeneficiaryContract` collection.
 *
 * Design decisions:
 *
 *   1. **MIN daysToExpiry across active contracts.** The most
 *      urgent one sets the alarm — a beneficiary with two active
 *      contracts where one expires in 5 days gets flagged at 5,
 *      not at the average or the max.
 *
 *   2. **Null when no active contracts.** A family without a
 *      service agreement is either mid-enrollment or post-
 *      discharge — different from "soon to expire" — so we
 *      return null and let the flag stay clear. A dedicated
 *      "missing contract" flag belongs elsewhere.
 *
 *   3. **Already-expired contracts reported as negative days.**
 *      `endDate < now` gives a negative number, which still
 *      satisfies `<= 30` and trips the flag — the most urgent
 *      scenario. Clamping to 0 would hide the staleness.
 *
 *   4. **Active status only.** Expired/renewed/terminated are
 *      lifecycle-closed; the flag only cares about currently-
 *      live agreements.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/BeneficiaryContract');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createContractObservations(deps = {}) {
  const Model = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.BeneficiaryContract);
  if (Model == null) {
    throw new Error('contractObservations: BeneficiaryContract model is required');
  }

  async function beneficiaryContracts(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const rows = await Model.find({ beneficiaryId, status: 'active' }, 'endDate')
      .sort({ endDate: 1 })
      .lean();

    if (rows.length === 0) return { daysToExpiry: null };

    const soonest = rows[0];
    if (!soonest.endDate) return { daysToExpiry: null };
    const diffMs = new Date(soonest.endDate).getTime() - now.getTime();
    return { daysToExpiry: Math.floor(diffMs / MS_PER_DAY) };
  }

  return Object.freeze({ beneficiaryContracts });
}

module.exports = { createContractObservations };
