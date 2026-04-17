/**
 * DDD Domain RBAC Middleware — حماية الدومينات العلاجية بالصلاحيات
 *
 * Maps each DDD domain to its RBAC resource and provides
 * route-level guards for list/get/create/update/delete operations.
 *
 * Usage in domain routes:
 *   const { dddGuard } = require('../../middleware/dddAuth.middleware');
 *   router.get('/',    dddGuard('core', 'read'),  controller.list);
 *   router.post('/',   dddGuard('core', 'create'), controller.create);
 *   router.put('/:id', dddGuard('core', 'update'), controller.update);
 *
 * @module middleware/dddAuth
 */

'use strict';

const { RESOURCES } = require('../config/rbac.config');

/**
 * Domain → RBAC Resource mapping
 * كل دومين يُربط بالمورد المقابل في نظام الصلاحيات
 */
const DOMAIN_RESOURCE_MAP = {
  core: RESOURCES.BENEFICIARIES,
  episodes: RESOURCES.EPISODES,
  timeline: RESOURCES.TIMELINE,
  assessments: RESOURCES.CLINICAL_ASSESSMENTS,
  'care-plans': RESOURCES.CARE_PLANS_DDD,
  sessions: RESOURCES.CLINICAL_SESSIONS,
  goals: RESOURCES.GOALS,
  measures: RESOURCES.MEASURES,
  workflow: RESOURCES.WORKFLOW,
  programs: RESOURCES.PROGRAMS,
  'ai-recommendations': RESOURCES.AI_RECOMMENDATIONS,
  quality: RESOURCES.QUALITY,
  family: RESOURCES.FAMILY,
  reports: RESOURCES.REPORT_TEMPLATES,
  'group-therapy': RESOURCES.GROUP_THERAPY,
  'tele-rehab': RESOURCES.TELE_REHAB,
  'ar-vr': RESOURCES.AR_VR,
  behavior: RESOURCES.BEHAVIOR,
  research: RESOURCES.RESEARCH,
  'field-training': RESOURCES.FIELD_TRAINING,
  dashboards: RESOURCES.KPI,
};

/**
 * HTTP Method → default RBAC action
 */
const METHOD_ACTION_MAP = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Create a DDD-aware RBAC guard middleware
 *
 * @param {string} domain - DDD domain name (e.g. 'core', 'episodes')
 * @param {string|string[]} action - RBAC action(s): 'read', 'create', 'update', 'delete', 'approve', etc.
 * @param {object} [options]
 * @param {boolean} [options.allowOwner=false] - Allow record owner to bypass
 * @param {string} [options.ownerField='createdBy'] - Field to check ownership
 * @returns {Function} Express middleware
 */
function dddGuard(domain, action, options = {}) {
  const resource = DOMAIN_RESOURCE_MAP[domain];
  if (!resource) {
    // Fallback: allow (domain not mapped → no restriction on RBAC level)
    return (_req, _res, next) => next();
  }

  const actions = Array.isArray(action) ? action : [action];
  const { allowOwner = false, ownerField = 'createdBy' } = options;

  return (req, res, next) => {
    // If no auth middleware has run, skip (development mode)
    if (!req.user) {
      return next();
    }

    const user = req.user;
    const role = user.role;

    // Super admin bypasses everything
    if (role === 'super_admin') return next();

    // Load rbac helpers lazily
    const { hasPermission } = require('../config/rbac.config');

    // Check if the user's role has ANY of the required actions
    const allowed = actions.some(act =>
      hasPermission(role, resource, act, user.customPermissions || [], user.deniedPermissions || [])
    );

    if (allowed) return next();

    // Check owner bypass
    if (allowOwner && req.params?.id && user._id) {
      // The actual ownership check would need to query the DB; store flag for downstream
      req._dddOwnerCheck = { field: ownerField, userId: user._id.toString() };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `ليس لديك صلاحية لهذا الإجراء — Access denied`,
      message_en: `Permission denied: ${resource}:${actions.join(',')}`,
      requiredPermission: `${resource}:${actions.join(',')}`,
    });
  };
}

/**
 * Auto-guard that infers the action from the HTTP method
 * @param {string} domain
 * @param {object} [options]
 * @returns {Function}
 */
function dddAutoGuard(domain, options = {}) {
  return (req, res, next) => {
    const action = METHOD_ACTION_MAP[req.method] || 'read';
    return dddGuard(domain, action, options)(req, res, next);
  };
}

/**
 * Middleware factory to guard all routes in a domain router
 * Use at the router level:
 *   router.use(dddRouterGuard('core'));
 */
function dddRouterGuard(domain, options = {}) {
  return (req, res, next) => {
    const action = METHOD_ACTION_MAP[req.method] || 'read';
    return dddGuard(domain, action, options)(req, res, next);
  };
}

/**
 * Export the resource map for Swagger tag generation
 */
function getDomainResources() {
  return { ...DOMAIN_RESOURCE_MAP };
}

module.exports = {
  DOMAIN_RESOURCE_MAP,
  dddGuard,
  dddAutoGuard,
  dddRouterGuard,
  getDomainResources,
};
