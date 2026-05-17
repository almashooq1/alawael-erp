'use strict';

/**
 * branch-scoped-models.registry.js — Wave 35.
 *
 * The canonical list of models that MUST have `branchScopePlugin`
 * attached to their schema. The CI drift test
 * (`branch-scope-adoption-wave35.test.js`) walks this registry and
 * verifies adoption on each entry — fails the build if any model in
 * the list has lost the plugin (regression detector).
 *
 * Adding a new entry here is the operational signal that:
 *   1. The model's reads need branch isolation (Constitution §8)
 *   2. The model's schema MUST .plugin(branchScopePlugin, ...) at
 *      definition time
 *   3. Routes consuming the model MUST pass `actor` via
 *      .setOptions({ actor: req.actor }) OR explicitly opt-out
 *      via SYSTEM_BYPASS (audit-logged)
 *
 * Wave 35 baseline — 3 entries (the Wave-27 branch-scoped
 * productivity models). Future waves add high-risk models
 * (Beneficiary, Invoice, Employee, CarePlan, etc.) one-by-one as
 * each is migrated.
 *
 * The registry is data, not behavior — it doesn't enforce anything
 * at runtime; the DRIFT TEST is the enforcement point.
 */

/**
 * Each entry:
 *   - modulePath  — require path relative to backend root
 *   - reason      — why this model needs branch isolation
 *   - addedInWave — when adoption happened (audit trail)
 *   - requireActor — whether the plugin should enforce 'actor' presence
 *                    (false = back-compat mode; flip to true once
 *                     callers are migrated)
 */
const BRANCH_SCOPED_MODELS = Object.freeze([
  {
    modulePath: 'models/Productivity/Annotation',
    reason: 'KPI annotations carry PII context per branch (PDPL Art.13)',
    addedInWave: 35,
    requireActor: false,
  },
  {
    modulePath: 'models/Productivity/HandoffNote',
    reason:
      'Shift handoff notes contain subject + branch context — direct PHI exposure if unscoped',
    addedInWave: 35,
    requireActor: false,
  },
  {
    modulePath: 'models/Productivity/FollowUp',
    reason: 'Operator accountability ledger — branch-scoped reads expected',
    addedInWave: 35,
    requireActor: false,
  },
]);

// Helper for the drift test: load each registered model and check
// plugin adoption. We export the list raw + a hydration helper so
// the test can introspect.
function loadRegistered() {
  const out = [];
  for (const entry of BRANCH_SCOPED_MODELS) {
    let mod = null;
    let loadError = null;
    try {
      // Resolve relative to backend root
      const path = require('path').resolve(__dirname, '..', entry.modulePath);
      mod = require(path);
    } catch (err) {
      loadError = err.message;
    }
    out.push({ ...entry, model: mod, loadError });
  }
  return out;
}

module.exports = {
  BRANCH_SCOPED_MODELS,
  loadRegistered,
};
