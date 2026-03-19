/**
 * Professional RBAC (Role-Based Access Control) v2 — نظام صلاحيات احترافي
 *
 * Delegates ALL role/permission definitions to config/rbac.config.js
 * (single source of truth). This file only provides Express middleware.
 *
 * Features:
 *  - Hierarchical roles with inheritance
 *  - Fine-grained resource-level permissions
 *  - Dynamic permission evaluation (with per-user custom/denied)
 *  - Owner-based self-access overrides
 *  - Audit trail logging
 *
 * @module middleware/rbac.v2
 */

const logger = require('../utils/logger');
const {
  ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
} = require('../config/rbac.config');

// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE — وسيط Express
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Require specific permission(s) to access a route.
 * Checks against the user's role-based permissions AND any custom/denied
 * overrides stored on req.user (populated from the JWT or DB).
 *
 * @param {string} resource — The resource being accessed
 * @param {string|string[]} actions — Required action(s)
 * @param {Object} options — { allowSelf: bool }
 */
const requirePermission = (resource, actions, options = {}) => {
  const actionList = Array.isArray(actions) ? actions : [actions];
  const { allowSelf = false } = options;

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' },
      });
    }

    const userRole = user.role || ROLES.GUEST;
    const customPerms = user.customPermissions || [];
    const deniedPerms = user.deniedPermissions || [];

    // Self-access override (e.g., user editing own profile)
    if (allowSelf) {
      const resourceOwnerId = req.params?.id || req.body?.userId;
      if (resourceOwnerId && resourceOwnerId === (user.id || user._id?.toString())) {
        return next();
      }
    }

    // Check each required action using rbac.config's engine
    const hasAll = actionList.every(action =>
      hasPermission(userRole, resource, action, customPerms, deniedPerms)
    );

    if (!hasAll) {
      logger.warn(
        `[RBAC] Access denied — User: ${user.email}, Role: ${userRole}, ` +
          `Resource: ${resource}, Actions: ${actionList.join(',')}`
      );
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          required: { resource, actions: actionList },
        },
      });
    }

    next();
  };
};

/**
 * Require that the user has one of the listed roles, or has a role
 * whose hierarchy level is >= the minimum level among the listed roles.
 */
const requireRole = (...roles) => {
  const flatRoles = roles.flat();

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' },
      });
    }

    const userRole = user.role || ROLES.GUEST;

    // Exact match or super_admin bypass
    if (flatRoles.includes(userRole) || userRole === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Hierarchy-level check
    const userLevel = getRoleLevel(userRole);
    const minRequired = Math.min(...flatRoles.map(r => getRoleLevel(r) || 100));

    if (userLevel >= minRequired) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_ROLE',
        message: 'مستوى صلاحيتك لا يكفي للوصول إلى هذا المورد',
        required: flatRoles,
        current: userRole,
      },
    });
  };
};

/**
 * Require minimum role level (numeric).
 * @param {number} minLevel — Minimum hierarchy level required
 */
const requireMinLevel = minLevel => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' },
      });
    }

    const userLevel = getRoleLevel(user.role || ROLES.GUEST);

    if (userLevel >= minLevel) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_LEVEL',
        message: 'مستوى صلاحيتك لا يكفي',
        required: minLevel,
        current: userLevel,
      },
    });
  };
};

// Re-export config constants so existing consumers that import from this file keep working
module.exports = {
  ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
  requirePermission,
  requireRole,
  requireMinLevel,
};
