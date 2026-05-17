'use strict';

/**
 * drilldown.service.js — Wave 21.
 *
 * Drives the drill-down chain at request time:
 *
 *   • resolveNextLevel(kpiId, fromLevel, params)
 *       → returns { level, path, deepLink } for the next deeper level
 *       (substituting :param placeholders from `params`)
 *
 *   • resolveOwner(kpiId, ctx, resolveUsersForRole)
 *       → walks the role chain (direct → branch role → domain →
 *         fallback) and returns { role, userId, name, fallbackUsed }.
 *       resolveUsersForRole is the same callback the Alert engine
 *       uses for tier notification — passed through, NOT redeclared.
 *
 *   • getDrivers(kpiId) / getRelatedGeneratorIds(kpiId) /
 *     getActions(kpiId, params)
 *       → simple lookups that substitute params in action deepLinks.
 *
 *   • invokeAction(kpiId, actionId, ctx, auditLogger)
 *       → no-op outside audit; logs the click for the
 *         scoreboard-trust-score loop.
 *
 * No Mongo. Pure registry lookups + the injected resolver callbacks.
 */

const DefaultRegistry = require('./drilldown.registry');

const LEVEL_ORDER = ['executive', 'branch', 'unit', 'entity-list', 'record'];

function levelIndex(level) {
  return LEVEL_ORDER.indexOf(level);
}

function substitutePath(template, params = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key) && params[key] != null) {
      return encodeURIComponent(String(params[key]));
    }
    // Leave the placeholder if no value — caller will see the unresolved :param.
    return match;
  });
}

function createDrilldownService({ registry = DefaultRegistry, logger = console } = {}) {
  function getMetadata(kpiId) {
    if (typeof registry.getKpiDrillMetadata === 'function') {
      return registry.getKpiDrillMetadata(kpiId);
    }
    return (registry.REGISTRY || registry)[kpiId] || null;
  }

  function getLevels(kpiId) {
    const meta = getMetadata(kpiId);
    return meta ? meta.levels : null;
  }

  /**
   * Resolve the next drill-down level deeper than `fromLevel`.
   * Returns { ok, level, path, deepLink } — path is the template
   * (registry shape), deepLink is the substituted URL.
   */
  function resolveNextLevel({ kpiId, fromLevel, params = {} }) {
    const levels = getLevels(kpiId);
    if (!levels) return { ok: false, reason: 'KPI_NOT_FOUND' };
    if (!LEVEL_ORDER.includes(fromLevel)) return { ok: false, reason: 'INVALID_LEVEL' };

    const fromIdx = levelIndex(fromLevel);
    // Find the next configured level whose index > fromIdx.
    const next = levels.find(l => levelIndex(l.level) > fromIdx);
    if (!next) return { ok: false, reason: 'TERMINAL_LEVEL_REACHED' };

    return {
      ok: true,
      level: next.level,
      path: next.path,
      deepLink: substitutePath(next.path, params),
    };
  }

  /**
   * Resolve a specific named level (e.g. "jump to record").
   * Returns { ok, deepLink } or { ok: false, reason }.
   */
  function resolveLevel({ kpiId, toLevel, params = {} }) {
    const levels = getLevels(kpiId);
    if (!levels) return { ok: false, reason: 'KPI_NOT_FOUND' };
    const match = levels.find(l => l.level === toLevel);
    if (!match) return { ok: false, reason: 'LEVEL_NOT_AVAILABLE_FOR_KPI' };
    return {
      ok: true,
      level: match.level,
      path: match.path,
      deepLink: substitutePath(match.path, params),
    };
  }

  /**
   * Get the entire drill ladder for a KPI with paths substituted.
   * Useful for the breadcrumb / "show full chain" debug view.
   */
  function getFullChain({ kpiId, params = {} }) {
    const levels = getLevels(kpiId);
    if (!levels) return { ok: false, reason: 'KPI_NOT_FOUND' };
    return {
      ok: true,
      chain: levels.map(l => ({
        level: l.level,
        path: l.path,
        deepLink: substitutePath(l.path, params),
      })),
    };
  }

  /**
   * Walk the owner resolution chain:
   *   1. Direct: ctx.assignedUserId (if provided)
   *   2. Primary role from registry (resolved via resolveUsersForRole)
   *   3. Fallback chain (category-default)
   *
   * Returns { ok, role, userId, name, fallbackUsed }.
   */
  async function resolveOwner({ kpiId, ctx = {}, resolveUsersForRole = null }) {
    const meta = getMetadata(kpiId);
    if (!meta) return { ok: false, reason: 'KPI_NOT_FOUND' };

    // 1. Direct assignment beats any role chain.
    if (ctx.assignedUserId) {
      return {
        ok: true,
        role: 'directly_assigned',
        userId: ctx.assignedUserId,
        name: ctx.assignedUserName || null,
        fallbackUsed: false,
      };
    }

    if (typeof resolveUsersForRole !== 'function') {
      // No resolver wired — return the role name only (admin UI shows
      // "Assign now" link for that role).
      return {
        ok: true,
        role: meta.owner.role,
        userId: null,
        name: null,
        fallbackUsed: false,
        resolverMissing: true,
      };
    }

    // 2. Try primary role.
    let users = [];
    try {
      users = (await resolveUsersForRole(meta.owner.role, ctx)) || [];
    } catch (err) {
      logger.warn &&
        logger.warn(`[drilldown] resolveUsersForRole(${meta.owner.role}) failed: ${err.message}`);
      users = [];
    }
    if (users.length > 0) {
      const u = users[0];
      return {
        ok: true,
        role: meta.owner.role,
        userId: u._id || u.id,
        name: u.name || null,
        fallbackUsed: false,
      };
    }

    // 3. Walk fallback chain.
    const chain =
      typeof meta.owner.fallbackChain === 'string'
        ? registry.DEFAULT_OWNER_FALLBACK_CHAIN[meta.owner.fallbackChain]
        : Array.isArray(meta.owner.fallbackChain)
          ? meta.owner.fallbackChain
          : [];

    for (const fbRole of chain) {
      if (fbRole === meta.owner.role) continue; // already tried
      try {
        const fbUsers = (await resolveUsersForRole(fbRole, ctx)) || [];
        if (fbUsers.length > 0) {
          const u = fbUsers[0];
          return {
            ok: true,
            role: fbRole,
            userId: u._id || u.id,
            name: u.name || null,
            fallbackUsed: true,
            originalRole: meta.owner.role,
          };
        }
      } catch (err) {
        logger.warn &&
          logger.warn(`[drilldown] fallback resolveUsersForRole(${fbRole}) failed: ${err.message}`);
      }
    }

    // No user found anywhere — return primary role with userId=null.
    return {
      ok: true,
      role: meta.owner.role,
      userId: null,
      name: null,
      fallbackUsed: false,
      noUserFound: true,
    };
  }

  function getDrivers(kpiId) {
    const meta = getMetadata(kpiId);
    return meta ? meta.drivers || [] : [];
  }

  function getRelatedGeneratorIds(kpiId) {
    const meta = getMetadata(kpiId);
    return meta ? meta.relatedGeneratorIds || [] : [];
  }

  function getActions({ kpiId, params = {} }) {
    const meta = getMetadata(kpiId);
    if (!meta) return [];
    return (meta.actions || []).map(a => ({
      id: a.id,
      titleAr: a.titleAr,
      titleEn: a.titleEn,
      deepLink: substitutePath(a.deepLink, params),
      estimatedMin: a.estimatedMin,
      severity: a.severity,
    }));
  }

  /**
   * Get the per-KPI bundle of: explanation/breakdown/owner/next-action/related-records.
   * Owner resolution requires the resolveUsersForRole callback.
   */
  async function getDrillBundle({ kpiId, params = {}, ctx = {}, resolveUsersForRole = null }) {
    const meta = getMetadata(kpiId);
    if (!meta) return { ok: false, reason: 'KPI_NOT_FOUND' };

    const owner = await resolveOwner({ kpiId, ctx, resolveUsersForRole });

    return {
      ok: true,
      kpiId,
      titleAr: meta.titleAr,
      titleEn: meta.titleEn,
      category: meta.category,
      slice: meta.slice,
      terminalLevel: meta.terminalLevel,
      chain: getFullChain({ kpiId, params }).chain,
      drivers: getDrivers(kpiId),
      relatedGeneratorIds: getRelatedGeneratorIds(kpiId),
      owner,
      actions: getActions({ kpiId, params }),
    };
  }

  /**
   * Invoke (log) an action click. The actual navigation happens
   * client-side; this endpoint exists so the scoreboard can correlate
   * insights → action invocation → outcome.
   */
  async function invokeAction({ kpiId, actionId, ctx = {}, auditLogger = null }) {
    const meta = getMetadata(kpiId);
    if (!meta) return { ok: false, reason: 'KPI_NOT_FOUND' };

    const action = (meta.actions || []).find(a => a.id === actionId);
    if (!action) return { ok: false, reason: 'ACTION_NOT_FOUND' };

    if (auditLogger && typeof auditLogger.log === 'function') {
      try {
        await auditLogger.log({
          action: 'drilldown.action.invoke',
          actorUserId: ctx.userId || null,
          actorRole: ctx.role || null,
          entityType: 'KPI',
          entityId: kpiId,
          ipAddress: ctx.ip || null,
          metadata: {
            kpiId,
            actionId,
            severity: action.severity,
            deepLink: action.deepLink,
          },
        });
      } catch (err) {
        logger.warn && logger.warn(`[drilldown] audit invoke failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      kpiId,
      actionId,
      deepLink: substitutePath(action.deepLink, ctx.params || {}),
      severity: action.severity,
    };
  }

  return {
    getMetadata,
    getLevels,
    resolveNextLevel,
    resolveLevel,
    getFullChain,
    resolveOwner,
    getDrivers,
    getRelatedGeneratorIds,
    getActions,
    getDrillBundle,
    invokeAction,
    listRegisteredKpis: () =>
      typeof registry.listRegisteredKpis === 'function'
        ? registry.listRegisteredKpis()
        : Object.keys(registry.REGISTRY || registry),
  };
}

module.exports = {
  createDrilldownService,
  substitutePath, // exported for tests
};
