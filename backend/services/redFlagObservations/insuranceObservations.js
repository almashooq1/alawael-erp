/**
 * insuranceObservations.js — Beneficiary-360 Commit 18.
 *
 * Adapter for:
 *
 *   financial.insurance.coverage.exhausted
 *     → coverageUsageForBeneficiary(beneficiaryId) →
 *       { remainingCoveragePct: <number|null> }
 *
 * Registered as `insuranceService` in the locator. Reads from the
 * existing `InsurancePolicy` model (beneficiaryId-indexed).
 *
 * Design decisions:
 *
 *   1. **Min across active policies.** A beneficiary may carry
 *      more than one active policy (e.g. primary employer + spouse
 *      secondary). The most-depleted one is what matters for the
 *      "coverage running out" alert; reporting the MIN makes the
 *      flag fire as soon as ANY policy is near exhaustion.
 *
 *   2. **Null for uninsured.** No active policies → `null`, which
 *      the evaluator's `<= 5` treats as clear. Uninsured is a
 *      different issue (admission/eligibility concern) that
 *      deserves its own flag, not this one.
 *
 *   3. **Unlimited plans = 100%.** `coverageLimit: null` on the
 *      model means uncapped — never exhausts, never fires.
 *
 *   4. **Zero-limit sentinel.** A policy with `coverageLimit === 0`
 *      is data corruption; we SKIP it rather than divide by zero
 *      or falsely fire the flag.
 *
 *   5. **Clamp to 0–100.** `usedCoverage > coverageLimit` can
 *      happen mid-batch between claim submission and adjudication;
 *      we clamp so the flag doesn't report -3% (confusing) or
 *      120% (meaningless).
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/InsurancePolicy');

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createInsuranceObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('insuranceObservations: InsurancePolicy model is required');
  }

  async function coverageUsageForBeneficiary(beneficiaryId) {
    const policies = await Model.find(
      { beneficiaryId, status: 'active' },
      'coverageLimit usedCoverage'
    ).lean();

    if (policies.length === 0) return { remainingCoveragePct: null };

    const percentages = [];
    for (const p of policies) {
      if (p.coverageLimit == null) {
        // Unlimited plan — contributes 100% (never exhausts).
        percentages.push(100);
        continue;
      }
      if (p.coverageLimit === 0) continue; // corrupt row — skip
      const used = typeof p.usedCoverage === 'number' ? p.usedCoverage : 0;
      const remaining = Math.max(0, p.coverageLimit - used);
      const pct = (remaining / p.coverageLimit) * 100;
      percentages.push(Math.min(100, Math.max(0, pct)));
    }
    if (percentages.length === 0) return { remainingCoveragePct: null };
    const rounded = Math.round(Math.min(...percentages) * 100) / 100;
    return { remainingCoveragePct: rounded };
  }

  return Object.freeze({ coverageUsageForBeneficiary });
}

module.exports = { createInsuranceObservations };
