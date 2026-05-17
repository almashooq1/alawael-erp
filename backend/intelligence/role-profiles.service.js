'use strict';

/**
 * role-profiles.service.js — Wave 23.
 *
 * Resolves a canonical role to its decision-support profile and
 * builds the dashboard bundle the UI needs at landing time:
 *
 *   • Profile (goals, decisions, quick actions, density, landing URL,
 *     restricted data array)
 *   • Decorated KPI bundles — each KPI's drill metadata pulled from
 *     drilldown.registry (Wave 21) so the UI can render the trust
 *     badge + drill chain in one round-trip.
 *   • Alert surfaces (executive/branch/clinical/hr/finance/quality
 *     /dpo/me/reception) — same set the alert dashboard router
 *     enforces.
 *   • Substituted defaultLanding with :branchId from the request.
 *
 * No Mongo. Reads registries (role-profiles, drilldown, data-quality)
 * + uses the injected drillDownService to compose paths.
 */

const DefaultRoleRegistry = require('./role-profiles.registry');
const { substitutePath } = require('./drilldown.service');

function createRoleProfilesService({
  roleRegistry = DefaultRoleRegistry,
  drillRegistry = null,
  dqRegistry = null,
  logger = console,
} = {}) {
  void logger;
  const drillReg = drillRegistry || require('./drilldown.registry');
  const dqReg = dqRegistry || require('./data-quality.registry');

  function getProfile(groupKey) {
    return roleRegistry.getProfile(groupKey);
  }

  function resolveRoleGroup(canonicalRole) {
    return roleRegistry.resolveRoleGroup(canonicalRole);
  }

  function listGroupKeys() {
    return roleRegistry.listGroupKeys();
  }

  /**
   * Resolve the dashboard bundle for a canonical role + request
   * context (typically { branchId }). Returns:
   *   {
   *     ok, canonicalRole, groupKey, profile,
   *     defaultLanding,         // :branchId substituted
   *     kpiBundles[],           // each = { kpiId, drillMetadata, dqConfig }
   *     alertSurfaces[],        // role's surfaces
   *     quickActions[],         // :branchId substituted in deepLinks
   *     restrictedData[],
   *     terminalLevel,
   *     layoutDensity
   *   }
   */
  function resolveDashboardForRole(canonicalRole, ctx = {}) {
    const groupKey = resolveRoleGroup(canonicalRole);
    if (!groupKey) {
      return { ok: false, reason: 'ROLE_NOT_MAPPED' };
    }
    const profile = getProfile(groupKey);
    if (!profile) {
      return { ok: false, reason: 'PROFILE_NOT_FOUND' };
    }

    // Only include params that the caller actually supplied — empty
    // strings would substitute into a deepLink as "/dashboards/branch/"
    // which is misleading (a real URL that doesn't exist). Leave the
    // ":branchId" placeholder visible so the UI can highlight what's
    // missing.
    const params = {};
    if (ctx.branchId) params.branchId = ctx.branchId;
    if (ctx.userId) params.userId = ctx.userId;

    // Build per-KPI bundles with drill metadata + DQ config attached.
    const kpiBundles = (profile.kpiIds || []).map(kpiId => {
      const drill =
        typeof drillReg.getKpiDrillMetadata === 'function'
          ? drillReg.getKpiDrillMetadata(kpiId)
          : null;
      const dq =
        typeof dqReg.getDatasetConfig === 'function' ? dqReg.getDatasetConfig(kpiId) : null;
      return {
        kpiId,
        titleAr: drill?.titleAr || null,
        titleEn: drill?.titleEn || null,
        category: drill?.category || null,
        terminalLevel: drill?.terminalLevel || null,
        hasDrillMetadata: !!drill,
        hasDataQualityContract: !!dq,
        dqCategory: dq?.category || null,
        maskOnCritical: dq?.maskOnCritical ?? null,
      };
    });

    return {
      ok: true,
      canonicalRole,
      groupKey,
      profile: {
        titleAr: profile.titleAr,
        titleEn: profile.titleEn,
        primaryGoalsAr: profile.primaryGoalsAr,
        primaryGoalsEn: profile.primaryGoalsEn,
        decisionsSupportedAr: profile.decisionsSupportedAr,
        decisionsSupportedEn: profile.decisionsSupportedEn,
      },
      defaultLanding: substitutePath(profile.defaultLanding, params),
      layoutDensity: profile.layoutDensity,
      kpiBundles,
      alertSurfaces: profile.alertSurfaces || [],
      quickActions: (profile.quickActions || []).map(a => ({
        id: a.id,
        titleAr: a.titleAr,
        titleEn: a.titleEn,
        deepLink: substitutePath(a.deepLink, params),
        estimatedMin: a.estimatedMin,
      })),
      restrictedData: profile.restrictedData || [],
      terminalLevel: profile.terminalLevel,
    };
  }

  /**
   * Compute the set of restricted-data kinds for a role.
   * Returned as a Set for fast membership checks at the query layer.
   */
  function getRestrictedDataKinds(canonicalRole) {
    const groupKey = resolveRoleGroup(canonicalRole);
    if (!groupKey) return new Set();
    const profile = getProfile(groupKey);
    return new Set(profile?.restrictedData || []);
  }

  /**
   * Apply restricted-data masking to a payload before sending to a
   * specific role. Strips fields tagged with a restricted kind in the
   * `fieldKindMap`. The map is supplied by the caller (each module
   * declares which fields are clinical_phi vs financial vs etc.) —
   * the service is generic.
   *
   * Returns a shallow clone with offending fields removed.
   */
  function maskForRole(payload, canonicalRole, fieldKindMap = {}) {
    if (!payload || typeof payload !== 'object') return payload;
    const restricted = getRestrictedDataKinds(canonicalRole);
    if (restricted.size === 0) return payload;
    if (Array.isArray(payload)) {
      return payload.map(item => maskForRole(item, canonicalRole, fieldKindMap));
    }
    const out = { ...payload };
    for (const [field, kind] of Object.entries(fieldKindMap)) {
      if (restricted.has(kind) && Object.prototype.hasOwnProperty.call(out, field)) {
        delete out[field];
      }
    }
    return out;
  }

  return {
    getProfile,
    resolveRoleGroup,
    listGroupKeys,
    resolveDashboardForRole,
    getRestrictedDataKinds,
    maskForRole,
  };
}

module.exports = { createRoleProfilesService };
