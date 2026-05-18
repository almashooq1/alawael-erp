'use strict';

/**
 * sod.lib.js — Wave 89 canonical unification (closes U2 from the
 * Wave-87 Canonical Domain Unification Architect analysis).
 *
 * Replaces seven parallel separation-of-duties implementations that
 * drifted apart across the platform, each with its own REASON spelling:
 *
 *   • models/BeneficiaryLifecycleTransition.js (Mongoose validator —
 *     invalidate('approvals', '...') with a free-form message)
 *   • intelligence/care-plan.service.js (REASON.SELF_APPROVAL_FORBIDDEN)
 *   • services/hr/hrChangeRequestService.js ('self_approval_forbidden')
 *   • services/finance/expenseApprovalService.js (Error with code
 *     'SOD_SELF_APPROVAL')
 *   • intelligence/access-review.service.js ('SELF_ATTESTATION')
 *   • intelligence/authz.registry.js (policies invoice-self-approval +
 *     pricing-self-approval — kept; the lib provides the runtime check)
 *   • intelligence/access-review.registry.js ACTOR_BUNDLE_CONFLICTS
 *     (different concept — handled via checkActorBundleConflict)
 *
 * Design principles:
 *   1. DOMAIN-AGNOSTIC — actor + priorActors are abstract identifiers;
 *      the lib doesn't care if they're userId / reviewerId / approverId.
 *   2. CANONICAL REASON — every refusal returns REASON.SELF_APPROVAL_FORBIDDEN
 *      from the Wave-89 reason-codes.registry. Callers may wrap it in
 *      their own legacy-spelling alias for back-compat but the lib never
 *      emits a non-canonical code.
 *   3. NEVER THROWS — returns structured { ok, reason, detail } so each
 *      caller can map to its own HTTP / Mongoose / Error shape.
 *   4. SAFE STRING COMPARE — ObjectId / string / number all normalised
 *      via String() before equality check (Mongoose populates as ObjectId,
 *      raw inputs come as string — both must compare equal).
 *
 * Public API:
 *
 *   checkSeparationOfDuties({
 *     actorId,                  // the person attempting the new action
 *     priorActorIds = [],       // prior participants — usually requester +
 *                               // co-signers; lib refuses if actorId matches
 *                               // ANY of these
 *     priorActorId,             // convenience for the single-prior case
 *     allowSelf = false,        // escape hatch — when explicitly true the
 *                               // check is a no-op (use only for legitimate
 *                               // single-actor flows like author saving own
 *                               // draft)
 *   }) → { ok: true } | { ok: false, reason, detail, conflictingPriorActorId }
 *
 *   checkActorBundleConflict({
 *     heldRoles,                // roles the actor holds
 *     conflictBundles,          // [[roleA, roleB], ...] — ANY pair both held
 *                               // triggers refusal; from registry
 *   }) → { ok: true } | { ok: false, reason, detail, conflictingBundle }
 */

const reasons = require('./reason-codes.registry');

function _eq(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

function _toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function checkSeparationOfDuties({
  actorId,
  priorActorIds = [],
  priorActorId = null,
  allowSelf = false,
} = {}) {
  if (allowSelf === true) return { ok: true };
  if (actorId === null || actorId === undefined || actorId === '') {
    return {
      ok: false,
      reason: reasons.REASON_CODES.ACTOR_REQUIRED,
      detail: 'actorId is required for separation-of-duties check',
    };
  }

  const allPrior = [..._toArray(priorActorIds), ..._toArray(priorActorId)].filter(
    v => v !== null && v !== undefined && v !== ''
  );

  for (const prior of allPrior) {
    if (_eq(actorId, prior)) {
      return {
        ok: false,
        reason: reasons.REASON_CODES.SELF_APPROVAL_FORBIDDEN,
        detail: 'actor cannot also be a prior participant on this decision',
        conflictingPriorActorId: String(prior),
      };
    }
  }

  return { ok: true };
}

function checkActorBundleConflict({ heldRoles = [], conflictBundles = [] } = {}) {
  const held = new Set(_toArray(heldRoles).map(r => String(r)));

  for (const bundle of conflictBundles) {
    const bundleArr = _toArray(bundle).map(r => String(r));
    if (bundleArr.length < 2) continue;
    const allHeld = bundleArr.every(r => held.has(r));
    if (allHeld) {
      return {
        ok: false,
        reason: reasons.REASON_CODES.ACTOR_BUNDLE_CONFLICT,
        detail: `actor holds a conflicting role bundle: ${bundleArr.join(' + ')}`,
        conflictingBundle: bundleArr,
      };
    }
  }

  return { ok: true };
}

module.exports = {
  checkSeparationOfDuties,
  checkActorBundleConflict,
};
