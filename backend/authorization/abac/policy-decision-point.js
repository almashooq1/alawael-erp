/**
 * ABAC Policy Decision Point (PDP).
 *
 * Evaluates a request against registered policies.
 * Combination algorithm: deny-overrides.
 *
 * See backend/authorization/abac/README.md
 * See docs/architecture/decisions/005-canonical-role-hierarchy.md
 */

'use strict';

const PERMIT = 'permit';
const DENY = 'deny';
const NOT_APPLICABLE = 'not_applicable';

/**
 * @typedef {Object} Subject
 * @property {string} userId
 * @property {string[]} roles          canonical role names
 * @property {string} [defaultBranchId]
 * @property {string[]} [accessibleBranches]
 * @property {string} [department]
 * @property {boolean} [mfaVerified]
 * @property {string[]} [linkedBeneficiaries]
 */

/**
 * @typedef {Object} Resource
 * @property {string} type
 * @property {string} [id]
 * @property {string} [branchId]
 * @property {string} [ownerId]
 * @property {string} [assignedTherapistId]
 * @property {string[]} [caseTeam]
 * @property {'normal'|'sensitive'|'restricted'} [confidentialityLevel]
 * @property {string} [status]
 * @property {Date} [createdAt]
 * @property {Date} [signedAt]
 * @property {string} [signedBy]
 */

/**
 * @typedef {Object} Environment
 * @property {Date} [time]
 * @property {string} [ip]
 * @property {'corp-managed'|'byod'|'unknown'} [deviceTrust]
 * @property {boolean} [emergencyFlag]
 */

/**
 * @typedef {Object} Decision
 * @property {'permit'|'deny'|'not_applicable'} effect
 * @property {string} [reason]
 * @property {string[]} [matchedPolicies]
 * @property {string} [denyingPolicy]
 */

class PolicyDecisionPoint {
  constructor() {
    /** @type {Array<{id: string, applies: Function, evaluate: Function}>} */
    this.policies = [];
  }

  /** Register one policy. */
  register(policy) {
    if (!policy || typeof policy.applies !== 'function' || typeof policy.evaluate !== 'function') {
      throw new Error('ABAC policy must have applies() and evaluate() functions');
    }
    if (!policy.id) throw new Error('ABAC policy must have id');
    this.policies.push(policy);
    return this;
  }

  /** Register an array of policies. */
  registerAll(list) {
    for (const p of list) this.register(p);
    return this;
  }

  /**
   * Evaluate a request. Returns a single Decision.
   *
   * @param {{ subject: Subject, action: string, resource: Resource, env?: Environment }} ctx
   * @returns {Decision}
   */
  evaluate(ctx) {
    const env = ctx.env || { time: new Date() };
    const context = { ...ctx, env };

    const matched = [];
    let permitFound = false;
    let denyDecision = null;

    for (const policy of this.policies) {
      let applies = false;
      try {
        applies = !!policy.applies(context);
      } catch (err) {
        // Policy threw while matching — treat as not-applicable but log.
        // In a real system, emit a metric/alert.
        continue;
      }
      if (!applies) continue;

      matched.push(policy.id);

      let decision;
      try {
        decision = policy.evaluate(context);
      } catch (err) {
        // Policy threw while deciding → fail closed (deny).
        denyDecision = {
          effect: DENY,
          reason: `policy_error:${policy.id}:${err.message}`,
          denyingPolicy: policy.id,
          matchedPolicies: matched,
        };
        break;
      }

      if (!decision) continue;
      if (decision.effect === DENY) {
        denyDecision = {
          effect: DENY,
          reason: decision.reason || 'denied',
          denyingPolicy: policy.id,
          matchedPolicies: matched,
        };
        break; // deny-overrides — short-circuit
      }
      if (decision.effect === PERMIT) {
        permitFound = true;
      }
    }

    if (denyDecision) return denyDecision;
    if (permitFound) {
      return { effect: PERMIT, matchedPolicies: matched };
    }
    return {
      effect: NOT_APPLICABLE,
      reason: matched.length ? 'no_policy_permitted' : 'no_applicable_policy',
      matchedPolicies: matched,
    };
  }
}

module.exports = {
  PolicyDecisionPoint,
  PERMIT,
  DENY,
  NOT_APPLICABLE,
};
