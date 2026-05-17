'use strict';

/**
 * access-review-simulator.service.js — Wave 38.
 *
 * Pre-attestation simulator. Given an actor's role bundle + scope,
 * computes:
 *
 *   • violations    — currently-tripped SoD bundle conflicts (the
 *                     actor today holds a toxic combination)
 *   • nearMisses    — combinations one role-grant away from tripping
 *                     (proactive — surface BEFORE someone is added)
 *   • effectiveScope — broadest scope across all the actor's roles
 *                     (uses authz.registry.broadestScope when wired)
 *   • sensitiveRoleCount — how many HIGH_SENSITIVITY roles held
 *   • recommendations — REVISE candidates to break conflicts
 *   • riskScore     — 0-100 composite for ranking attestation queues
 *   • requiredCadence — derived from the highest-risk role held
 *   • requiredReviewType — derived from scope + sensitivity
 *
 * The simulator is PURE — no I/O, no DB. The Wave-39 scheduler will
 * batch-run this across all entitlements at cycle open to build
 * reviewer queues sorted by risk.
 *
 * This is the mechanical answer to "is this entitlement still
 * justified?" that red-team finding #12 said was missing.
 */

const reg = require('./access-review.registry');

// ─── Severity → risk weight ────────────────────────────────────────

const SEVERITY_WEIGHT = Object.freeze({
  critical: 30,
  high: 15,
  medium: 5,
  low: 1,
});

/**
 * @param {object} opts
 *   - authzRegistry  — Wave-31 registry (provides broadestScope).
 *                       Optional — falls back to a built-in resolver.
 *   - logger
 */
function createAccessReviewSimulator({ authzRegistry = null, logger = console } = {}) {
  void logger;

  function _broadestScope(roles) {
    if (authzRegistry && typeof authzRegistry.broadestScope === 'function') {
      try {
        return authzRegistry.broadestScope(roles);
      } catch {
        /* fall through */
      }
    }
    // Lightweight fallback: pick the "broadest" by a known order.
    const ORDER = ['GLOBAL', 'REGION', 'BRANCH', 'DEPARTMENT', 'TEAM', 'OWN', 'ASSIGNED'];
    for (const level of ORDER) {
      if (roles && roles.includes && roles.includes(`__scope:${level}`)) return level;
    }
    return null;
  }

  /**
   * Given an actor, produce a full simulation report.
   * @param {object} actor
   *   - userId
   *   - roles    — array of role keys
   *   - scope    — declared scope (optional; computed from roles otherwise)
   *   - isServiceAccount
   *   - isTempElevated
   *   - lastUsedAt — Date (for dormancy detection)
   */
  function simulateActor(actor = {}) {
    const roles = Array.isArray(actor.roles) ? actor.roles : [];
    const violations = reg.findActorBundleConflicts(roles);
    const nearMisses = reg.findActorBundleNearMisses(roles);
    const sensitiveRoleCount = roles.filter(r => reg.isHighSensitivity(r)).length;
    const effectiveScope = actor.scope || _broadestScope(roles);

    // Highest-risk role determines required cadence
    const requiresHighSensitivity = sensitiveRoleCount > 0;
    const highestRiskRole = roles.find(r => reg.isHighSensitivity(r)) || roles[0] || null;
    const requiredCadence = reg.getCadenceFor(highestRiskRole, {
      isServiceAccount: !!actor.isServiceAccount,
      isTempElevated: !!actor.isTempElevated,
    });

    // Review type chosen based on scope + sensitivity
    const requiredReviewType = reg.getReviewTypeFor({
      role: highestRiskRole,
      scope: effectiveScope,
      eventContext: {
        isHighRiskTrigger: violations.length > 0,
      },
    });

    // Recommendations: for each violation, suggest REVISE candidates
    // (remove every role except the FIRST in the conflict's requiresAll,
    // which is treated as the "primary" identity — caller picks).
    const recommendations = violations.map(v => ({
      conflictId: v.id,
      action: 'REVISE',
      severity: v.severity,
      candidateRolesToRemove: v.requiresAll.slice(1),
      rationaleEn: `Remove one of [${v.requiresAll.slice(1).join(', ')}] to break ${v.id}`,
      rationaleAr: `أزل أحد [${v.requiresAll.slice(1).join('، ')}] لكسر ${v.id}`,
    }));

    // Dormancy
    let dormancy = null;
    if (actor.lastUsedAt instanceof Date) {
      const daysSince = (Date.now() - actor.lastUsedAt.getTime()) / (24 * 60 * 60 * 1000);
      let status = 'active';
      if (daysSince > 365) status = 'retired';
      else if (daysSince > 180) status = 'expired';
      else if (daysSince > 90) status = 'dormant';
      else if (daysSince > 30) status = 'quiet';
      dormancy = { daysSinceLastUse: Math.floor(daysSince), status };
    }

    // Composite risk score 0-100
    let riskScore = 0;
    for (const v of violations) {
      riskScore += SEVERITY_WEIGHT[v.severity] || 0;
    }
    for (const nm of nearMisses) {
      riskScore += (SEVERITY_WEIGHT[nm.severity] || 0) / 3; // near-miss is 1/3 weight
    }
    riskScore += sensitiveRoleCount * 5;
    if (effectiveScope === 'GLOBAL') riskScore += 15;
    else if (effectiveScope === 'REGION') riskScore += 8;
    if (dormancy && dormancy.status === 'dormant') riskScore += 10;
    if (dormancy && dormancy.status === 'expired') riskScore += 20;
    if (dormancy && dormancy.status === 'retired') riskScore += 35;
    riskScore = Math.min(100, Math.round(riskScore));

    return {
      actorUserId: actor.userId || null,
      effectiveScope,
      requiresHighSensitivity,
      sensitiveRoleCount,
      violations,
      nearMisses,
      recommendations,
      dormancy,
      riskScore,
      requiredCadence,
      requiredReviewType,
      generatedAt: new Date(),
    };
  }

  /**
   * Batch — simulate many actors at once. Sorted by riskScore desc.
   * The Wave-39 scheduler will call this at cycle open to produce
   * reviewer queues.
   */
  function simulateBatch(actors = []) {
    const reports = actors.map(a => simulateActor(a));
    reports.sort((x, y) => y.riskScore - x.riskScore);
    return reports;
  }

  /**
   * Given a proposed grant (would add role X to actor), report whether
   * adding it would trip an SoD conflict. Used by the IAM team
   * BEFORE granting — preventative check.
   */
  function simulateGrant(actor = {}, proposedRole) {
    const baseline = simulateActor(actor);
    const afterRoles = [...(actor.roles || []), proposedRole];
    const afterReport = simulateActor({ ...actor, roles: afterRoles });
    const newViolations = afterReport.violations.filter(
      v => !baseline.violations.some(b => b.id === v.id)
    );
    return {
      proposedRole,
      grantAllowed: newViolations.length === 0,
      newViolations,
      riskScoreDelta: afterReport.riskScore - baseline.riskScore,
      baselineRiskScore: baseline.riskScore,
      afterRiskScore: afterReport.riskScore,
    };
  }

  return {
    simulateActor,
    simulateBatch,
    simulateGrant,
  };
}

module.exports = {
  createAccessReviewSimulator,
  SEVERITY_WEIGHT,
};
