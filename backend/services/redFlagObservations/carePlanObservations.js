/**
 * carePlanObservations.js — Beneficiary-360 Commit 15.
 *
 * Adapter for:
 *
 *   operational.care_plan.unsigned.14d
 *     → unsignedOlderThan(beneficiaryId) → { count: <number> }
 *
 * Registered as `carePlanService` in the locator.
 *
 * Design decisions:
 *
 *   1. **Opt-in via `requiresSignature`.** Legacy care plans
 *      created before the red-flag module have
 *      `requiresSignature: false` (the schema default), so they
 *      never trip this flag. Only plans explicitly created with
 *      `requiresSignature: true` (the new CBAHI-conformant path)
 *      are eligible. This is the right call: retrofitting an
 *      alert onto years of historical data would flood every
 *      supervisor dashboard with noise on day one.
 *
 *   2. **Only ACTIVE plans count.** DRAFT means the plan isn't
 *      live yet — asking for a signature is premature. ARCHIVED
 *      means the plan has been superseded; chasing signatures on
 *      retired plans is pointless.
 *
 *   3. **Uses `createdAt` (Mongoose timestamps) as the issue
 *      date**, not `startDate`. Intent: "14 days since the plan
 *      was produced" — the clock starts when someone authored it,
 *      not when it's scheduled to take effect.
 *
 *   4. **Clock + threshold injectable** so the adapter works the
 *      same regardless of which SLA bracket a future flag might
 *      use (7-day, 30-day variants).
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/CarePlan');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createCarePlanObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('carePlanObservations: CarePlan model is required');
  }

  async function unsignedOlderThan(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const daysThreshold = typeof options.daysThreshold === 'number' ? options.daysThreshold : 14;
    const cutoff = new Date(now.getTime() - daysThreshold * MS_PER_DAY);

    const count = await Model.countDocuments({
      beneficiary: beneficiaryId,
      status: 'ACTIVE',
      requiresSignature: true,
      signedAt: null,
      createdAt: { $lte: cutoff },
    });

    return { count };
  }

  return Object.freeze({ unsignedOlderThan });
}

module.exports = { createCarePlanObservations };
