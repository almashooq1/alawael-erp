'use strict';

/**
 * authz.service.js — Wave 31.
 *
 * Operationalises the 5-layer decision model from the Authorization
 * Constitution (Wave 31 doc §2). Every access decision passes
 * through 5 layers; ALL must allow, ANY denies. The decision result
 * is always explainable (machine-readable `reason` + applied layer).
 *
 *   Layer 1 — IDENTITY     session valid + not suspended
 *   Layer 2 — RBAC         actor's role holds the permission code
 *   Layer 3 — SCOPE        resource.branchId ∈ actor.scopedBranchIds
 *   Layer 4 — POLICY       attribute checks (sensitivity, status, ...)
 *   Layer 5 — SoD / TEMPORAL  no toxic-combination violation
 *
 * Composes with [[governance-auditability-2026-05-17]] (Wave 26)
 * for permission resolution, [[role-profiles-2026-05-17]] (Wave 23)
 * for role→group, and this wave's authz.registry for SoD + scope.
 *
 * See `docs/blueprint/35-authorization-constitution.md`.
 */

const DefaultAuthzRegistry = require('./authz.registry');
const DefaultGovService = require('./governance.service');

const DENIAL_LAYER = Object.freeze({
  IDENTITY: 1,
  RBAC: 2,
  SCOPE: 3,
  POLICY: 4,
  SOD: 5,
});

/**
 * @param {object} opts
 *   - authzRegistry      — defaults to ./authz.registry
 *   - governanceService  — wave 26 governance instance (for hasPermission)
 *   - policyRules        — array of additional ABAC rules (optional)
 *   - logger             — console-compatible
 */
function createAuthzService({
  authzRegistry = DefaultAuthzRegistry,
  governanceService = null,
  policyRules = [],
  now = () => new Date(),
  logger = console,
} = {}) {
  void logger;
  const gov = governanceService || DefaultGovService.createGovernanceService({ logger });

  // ─── Layer 1 — Identity ──────────────────────────────────

  function identityCheck(actor) {
    if (!actor) {
      return { allow: false, reason: 'NO_ACTOR' };
    }
    if (!actor.userId && !actor.isServiceAccount) {
      return { allow: false, reason: 'NO_USER_ID' };
    }
    if (actor.suspended === true) {
      return { allow: false, reason: 'USER_SUSPENDED' };
    }
    if (actor.sessionInvalid === true) {
      return { allow: false, reason: 'SESSION_INVALID' };
    }
    if (actor.roles && actor.roles.length === 0 && !actor.isServiceAccount) {
      return { allow: false, reason: 'NO_ROLES' };
    }
    return { allow: true };
  }

  // ─── Layer 2 — RBAC ──────────────────────────────────────

  function rbacCheck(actor, action) {
    if (!action) return { allow: false, reason: 'NO_ACTION' };
    // governance.hasPermission expects a single canonical role string.
    // When the actor holds MULTIPLE roles, ANY one granting the
    // permission is sufficient (union semantics).
    const roles = Array.isArray(actor.roles) ? actor.roles : [];
    if (roles.length === 0 && !actor.isServiceAccount) {
      return { allow: false, reason: 'NO_ROLES' };
    }
    for (const r of roles) {
      if (gov.hasPermission(r, action)) {
        return { allow: true, grantedByRole: r };
      }
    }
    // Service accounts: check if action is in their allowed-endpoints
    // list (caller-supplied actor.allowedActions).
    if (
      actor.isServiceAccount &&
      Array.isArray(actor.allowedActions) &&
      actor.allowedActions.includes(action)
    ) {
      return { allow: true, grantedByRole: 'service-account-allowlist' };
    }
    return { allow: false, reason: 'RBAC_PERMISSION_NOT_HELD' };
  }

  // ─── Layer 3 — Scope ─────────────────────────────────────

  /**
   * Compute the actor's scoped branch ids:
   *   - GLOBAL → all (sentinel value: actor.scopedBranchIds=[] but
   *               isGlobalScope=true)
   *   - REGION → actor.regionBranchIds
   *   - BRANCH → [actor.branchId]
   *   - DEPARTMENT/TEAM/OWN/ASSIGNED → narrower, still under branchId
   *
   * TEMP_ELEVATED unions an additional set in.
   */
  function computeScopedBranchIds(actor) {
    const roles = Array.isArray(actor.roles) ? actor.roles : [];
    const broadest = authzRegistry.broadestScope(roles);
    if (broadest === 'GLOBAL') {
      return { isGlobalScope: true, scopedBranchIds: [], scopeLevel: 'GLOBAL' };
    }
    if (broadest === 'REGION') {
      const ids = Array.isArray(actor.regionBranchIds) ? actor.regionBranchIds : [];
      return {
        isGlobalScope: false,
        scopedBranchIds: ids,
        scopeLevel: 'REGION',
      };
    }
    // BRANCH / DEPARTMENT / TEAM / OWN / ASSIGNED — all branch-scoped
    const ids = actor.branchId ? [String(actor.branchId)] : [];

    // Apply TEMP_ELEVATED if present + still valid
    if (actor.elevation && actor.elevation.expiresAt) {
      const expires = new Date(actor.elevation.expiresAt);
      if (expires > now()) {
        if (actor.elevation.toScope === 'GLOBAL') {
          return {
            isGlobalScope: true,
            scopedBranchIds: [],
            scopeLevel: 'GLOBAL',
            viaElevation: true,
          };
        }
        if (actor.elevation.branchId) {
          ids.push(String(actor.elevation.branchId));
        }
        if (Array.isArray(actor.elevation.branchIds)) {
          for (const b of actor.elevation.branchIds) ids.push(String(b));
        }
      }
    }

    return {
      isGlobalScope: false,
      scopedBranchIds: [...new Set(ids)],
      scopeLevel: broadest,
    };
  }

  function scopeCheck(actor, resource) {
    if (!resource) return { allow: true }; // no resource → scope N/A
    const scope = computeScopedBranchIds(actor);
    if (scope.isGlobalScope) {
      // Propagate viaElevation so audit trail captures HOW the
      // actor's scope was upgraded to GLOBAL.
      return { allow: true, scope: 'GLOBAL', viaElevation: !!scope.viaElevation };
    }
    // Resource has no branchId → org-level resource. Only GLOBAL roles
    // can access it.
    if (!resource.branchId) {
      return { allow: false, reason: 'RESOURCE_REQUIRES_GLOBAL_SCOPE' };
    }
    if (!scope.scopedBranchIds.includes(String(resource.branchId))) {
      return {
        allow: false,
        reason: 'BRANCH_SCOPE_MISMATCH',
        actorBranchIds: scope.scopedBranchIds,
        resourceBranchId: String(resource.branchId),
      };
    }
    // Narrow scopes: OWN / ASSIGNED need further check
    if (scope.scopeLevel === 'OWN' || scope.scopeLevel === 'ASSIGNED') {
      const ownerMatch =
        (resource.createdBy && String(resource.createdBy) === String(actor.userId)) ||
        (resource.assignedTo && String(resource.assignedTo) === String(actor.userId)) ||
        (resource.ownerId && String(resource.ownerId) === String(actor.userId));
      if (!ownerMatch) {
        return {
          allow: false,
          reason: scope.scopeLevel === 'OWN' ? 'OWN_SCOPE_MISMATCH' : 'ASSIGNED_SCOPE_MISMATCH',
        };
      }
    }
    return { allow: true, scope: scope.scopeLevel, viaElevation: scope.viaElevation };
  }

  // ─── Layer 4 — Policy / ABAC ─────────────────────────────

  function policyCheck(actor, action, resource, context) {
    // Service accounts bypass MFA — they authenticate via signed
    // tokens with IP allow-listing (see Constitution §11.9). MFA
    // doesn't apply to non-human callers.
    const isServiceAccount = !!actor.isServiceAccount;

    // MFA freshness — actions in MFA_REQUIREMENTS need a tier
    const requiredTier = authzRegistry.getMfaTierFor(action);
    if (requiredTier > 1 && !isServiceAccount) {
      const actorTier = typeof actor.mfaLevel === 'number' ? actor.mfaLevel : 1;
      if (actorTier < requiredTier) {
        return {
          allow: false,
          reason: 'STEP_UP_MFA_REQUIRED',
          requiredTier,
          actualTier: actorTier,
        };
      }
      // MFA freshness — if action needs ≥ tier 2, MFA must have been
      // asserted in the last 15 min for tier 2 or 5 min for tier 3.
      const freshnessMin = requiredTier >= 3 ? 5 : 15;
      const mfaAt = actor.mfaAssertedAt ? new Date(actor.mfaAssertedAt) : null;
      const ageMin = mfaAt ? (now() - mfaAt) / 60_000 : Infinity;
      if (ageMin > freshnessMin) {
        return { allow: false, reason: 'MFA_FRESHNESS_REQUIRED', maxAgeMin: freshnessMin };
      }
    }

    // Emergency access policy — if the actor's emergency window has
    // passed, any actions tagged as "emergency-only" are blocked.
    if (actor.emergencyAccess) {
      const ea = actor.emergencyAccess;
      if (ea.active && ea.expiresAt && new Date(ea.expiresAt) <= now()) {
        return { allow: false, reason: 'EMERGENCY_ACCESS_EXPIRED' };
      }
    }

    // Workflow status: archived resources block writes
    if (resource && resource.status === 'archived' && /create|edit|delete/.test(action)) {
      return { allow: false, reason: 'RESOURCE_ARCHIVED' };
    }

    // Risk score: very high risk → step up
    if (typeof actor.riskScore === 'number' && actor.riskScore >= 0.9) {
      return { allow: false, reason: 'ACTOR_HIGH_RISK_BLOCKED' };
    }

    // Custom caller-supplied rules
    for (const rule of policyRules) {
      try {
        const fires =
          (!rule.appliesTo || rule.appliesTo.includes(action)) &&
          typeof rule.predicate === 'function' &&
          rule.predicate({ actor, action, resource, context });
        if (fires) {
          return {
            allow: rule.effect !== 'deny',
            reason: rule.effect === 'deny' ? rule.reason || `POLICY:${rule.id}` : undefined,
            ruleId: rule.id,
          };
        }
      } catch {
        /* skip broken rule */
      }
    }

    return { allow: true };
  }

  // ─── Layer 5 — SoD ───────────────────────────────────────

  function sodCheck(actor, action, resource) {
    const rule = authzRegistry.findSodRule(action, { actor, resource });
    if (rule) {
      return {
        allow: false,
        reason: `SOD:${rule.id}`,
        sodHit: {
          ruleId: rule.id,
          severity: rule.severity,
          descriptionAr: rule.descriptionAr,
          descriptionEn: rule.descriptionEn,
        },
      };
    }
    return { allow: true };
  }

  // ─── decide() — the public entry point ───────────────────

  /**
   * The 5-layer decision. ALL layers must allow.
   * Layers are evaluated in order; on first denial the result returns
   * with the layer that produced it. Audit metadata is always built
   * even on allow.
   */
  function decide({ actor, action, resource = null, context = {} } = {}) {
    const audit = {
      action,
      resourceType: resource?.type || null,
      resourceId: resource?.id || null,
      actorUserId: actor?.userId || null,
      actorRoles: actor?.roles || [],
      timestamp: now(),
    };

    // Layer 1
    const layer1 = identityCheck(actor);
    if (!layer1.allow) {
      return {
        allow: false,
        reason: layer1.reason,
        appliedLayer: DENIAL_LAYER.IDENTITY,
        audit,
      };
    }

    // Layer 2
    const layer2 = rbacCheck(actor, action);
    if (!layer2.allow) {
      return {
        allow: false,
        reason: layer2.reason,
        appliedLayer: DENIAL_LAYER.RBAC,
        audit,
      };
    }
    audit.grantedByRole = layer2.grantedByRole;

    // Layer 3
    const layer3 = scopeCheck(actor, resource);
    if (!layer3.allow) {
      return {
        allow: false,
        reason: layer3.reason,
        appliedLayer: DENIAL_LAYER.SCOPE,
        scopeContext: layer3,
        audit,
      };
    }
    audit.scope = layer3.scope;
    if (layer3.viaElevation) audit.viaElevation = true;

    // Layer 4
    const layer4 = policyCheck(actor, action, resource, context);
    if (!layer4.allow) {
      return {
        allow: false,
        reason: layer4.reason,
        appliedLayer: DENIAL_LAYER.POLICY,
        policyContext: layer4,
        audit,
      };
    }

    // Layer 5
    const layer5 = sodCheck(actor, action, resource);
    if (!layer5.allow) {
      return {
        allow: false,
        reason: layer5.reason,
        appliedLayer: DENIAL_LAYER.SOD,
        sodHit: layer5.sodHit,
        audit,
      };
    }

    return {
      allow: true,
      appliedLayer: null,
      scope: audit.scope,
      audit,
    };
  }

  return {
    decide,
    // Per-layer helpers exposed for unit tests + middleware composition
    identityCheck,
    rbacCheck,
    scopeCheck,
    policyCheck,
    sodCheck,
    computeScopedBranchIds,
  };
}

module.exports = { createAuthzService, DENIAL_LAYER };
