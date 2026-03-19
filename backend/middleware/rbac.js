/* eslint-disable no-unused-vars */
/**
 * Role-Based Access Control (RBAC) Middleware — Legacy API
 * نظام التحكم في الوصول بناءً على الأدوار
 *
 * Thin compatibility layer.  All role/permission definitions live in
 * config/rbac.config.js.  This file re-exports simple Express helpers
 * so existing routes that import from './rbac' keep working.
 */

const logger = require('../utils/logger');
const {
  ROLES,
  hasPermission: configHasPermission,
  getRoleLevel,
} = require('../config/rbac.config');

/**
 * Authorize middleware - checks if user has required roles
 * @param {string|string[]} allowedRoles - Role(s) allowed to access
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      // Normalize to lowercase for comparison
      const normalizedAllowed = roles.map(r => r.toLowerCase());
      const userRole = (user.role || 'user').toLowerCase();

      // Super admin always passes
      if (userRole === ROLES.SUPER_ADMIN) return next();

      if (normalizedAllowed.includes(userRole)) return next();

      // Hierarchy level fallback
      const userLevel = getRoleLevel(userRole);
      const minRequired = Math.min(...normalizedAllowed.map(r => getRoleLevel(r) || 100));
      if (userLevel >= minRequired) return next();

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `User role does not have permission. Required: ${roles.join(', ')}`,
      });
    } catch (error) {
      logger.error('RBAC Authorization Error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Error during authorization check',
      });
    }
  };
};

/**
 * Check if user has specific permission string ("resource:action")
 */
const checkPermission = permission => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      // Support both flat string array and resource:action check
      const userPermissions = req.permissions || user.permissions || [];
      if (userPermissions.includes(permission) || userPermissions.includes('*:*')) {
        return next();
      }

      // Try parsing "resource:action" and checking via config engine
      const [resource, action] = permission.split(':');
      if (resource && action) {
        const userRole = (user.role || 'guest').toLowerCase();
        if (
          configHasPermission(
            userRole,
            resource,
            action,
            user.customPermissions,
            user.deniedPermissions
          )
        ) {
          return next();
        }
      }

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `User does not have permission: ${permission}`,
      });
    } catch (error) {
      logger.error('Permission Check Error:', error);
      return res
        .status(500)
        .json({ error: 'SERVER_ERROR', message: 'Error during permission check' });
    }
  };
};

/**
 * Require specific role(s)
 */
const requireRole = (...roles) => authorize(roles.flat());

/**
 * Require admin role (fixed: uses lowercase values matching User model)
 */
const requireAdmin = authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Check multiple permissions (all required)
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      const userPermissions = req.permissions || user.permissions || [];
      if (userPermissions.includes('*:*')) return next();

      const hasAll = permissions.every(perm => {
        if (userPermissions.includes(perm)) return true;
        const [resource, action] = perm.split(':');
        if (resource && action) {
          return configHasPermission(
            (user.role || 'guest').toLowerCase(),
            resource,
            action,
            user.customPermissions,
            user.deniedPermissions
          );
        }
        return false;
      });

      if (!hasAll) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Missing required permissions: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      logger.error('Multiple Permissions Check Error:', error);
      return res
        .status(500)
        .json({ error: 'SERVER_ERROR', message: 'Error during permissions check' });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      const userPermissions = req.permissions || user.permissions || [];
      if (userPermissions.includes('*:*')) return next();

      const hasAny = permissions.some(perm => {
        if (userPermissions.includes(perm)) return true;
        const [resource, action] = perm.split(':');
        if (resource && action) {
          return configHasPermission(
            (user.role || 'guest').toLowerCase(),
            resource,
            action,
            user.customPermissions,
            user.deniedPermissions
          );
        }
        return false;
      });

      if (!hasAny) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Needs at least one of: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      logger.error('Any Permission Check Error:', error);
      return res
        .status(500)
        .json({ error: 'SERVER_ERROR', message: 'Error during permission check' });
    }
  };
};

module.exports = {
  authorize,
  checkPermission,
  requireRole,
  requireAdmin,
  requirePermissions,
  requireAnyPermission,
};
