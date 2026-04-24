/**
 * redFlagGuard.js — Beneficiary-360 Foundation Commit 3c.
 *
 * Pure pre-flight checks that consume the state store and enforce
 * the "blocking flag halts clinical action" invariant declared in
 * the registry (see Commit 1, response.blocking). The guard is
 * side-effect-free — it reads from the store, returns a verdict
 * object, and lets the caller decide how to respond (HTTP 409,
 * modal dialog, scheduler reject, etc).
 *
 * Design decisions:
 *
 *   1. The guard is the ONLY consumer that reads `record.blocking`.
 *      Callers never scan the store themselves. This keeps the
 *      "what counts as blocking" definition in one place, and the
 *      registry invariant (`blocking ⇒ critical`) is the
 *      single source of truth.
 *
 *   2. The result shape is stable and purposely minimal:
 *        { allowed: boolean, blockingFlags: [...] }
 *      Callers format their own error payloads from this —
 *      HTTP 409 with Arabic messages, scheduler toast, etc.
 *
 *   3. Emergency override is explicit. `canStartSession(..., {
 *      emergency: true })` always returns `allowed: true` but
 *      echoes the blockingFlags it would have rejected, so the
 *      override path is still auditable in logs.
 */

'use strict';

/**
 * Determine whether a clinical action (session start, medication
 * administration, trip sign-out, ...) is allowed for the given
 * beneficiary given currently-raised red flags.
 *
 * @param {string} beneficiaryId
 * @param {object} store  A state store exposing getAllActive(bId)
 * @param {object} [opts]
 * @param {boolean} [opts.emergency=false]
 *   When true, returns `allowed: true` even if blocking flags are
 *   raised. The blocking flags still appear in the verdict so the
 *   caller can log/record the override.
 * @returns {{
 *   allowed: boolean,
 *   blockingFlags: Array<object>,
 *   emergencyOverride: boolean
 * }}
 */
function canStartSession(beneficiaryId, store, opts = {}) {
  if (beneficiaryId == null || beneficiaryId === '') {
    throw new Error('redFlagGuard: beneficiaryId is required');
  }
  if (store == null || typeof store.getAllActive !== 'function') {
    throw new Error('redFlagGuard: store with getAllActive() is required');
  }
  const emergency = opts.emergency === true;
  const active = store.getAllActive(beneficiaryId);
  const blocking = active.filter(r => r && r.blocking === true);
  return {
    allowed: emergency || blocking.length === 0,
    blockingFlags: blocking,
    emergencyOverride: emergency && blocking.length > 0,
  };
}

module.exports = { canStartSession };
