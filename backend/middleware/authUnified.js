/**
 * authUnified.js — Unified Authentication & Authorization Middleware
 * ═════════════════════════════════════════════════════════════════
 * Provides a SINGLE, consistent interface for applying auth to routes.
 * Replaces the scattered patterns across the codebase:
 *   • authenticateToken (used in some routes)
 *   • requireAuth (used in others)
 *   • protect (alias, used in others)
 *   • dualMountAuth (mount-time wrapper)
 *   • router.use(authenticate) (self-gating)
 *
 * Usage:
 *   const { authGate, requireRole, requireAdmin } = require('../middleware/authUnified');
 *
 *   // Simple auth gate (any authenticated user)
 *   router.get('/profile', authGate(), handler);
 *
 *   // Require specific roles
 *   router.get('/admin', authGate({ roles: ['admin', 'superadmin'] }), handler);
 *
 *   // Require permissions
 *   router.get('/reports', authGate({ permissions: ['view_reports'] }), handler);
 *
 *   // Combined: auth + roles + permissions
 *   router.get('/secret', authGate({ roles: ['admin'], permissions: ['admin_access'] }), handler);
 *
 *   // Optional auth (doesn't fail if no token)
 *   router.get('/public', authGate({ optional: true }), handler);
 */

'use strict';

const { authenticateToken, requireRole, requireAdmin, requirePermission } = require('./auth');

/**
 * Unified authentication gate.
 * @param {Object} options
 * @param {string[]} options.roles — Required roles (e.g., ['admin', 'manager'])
 * @param {string[]} options.permissions — Required permissions (e.g., ['view_reports'])
 * @param {boolean} options.optional — If true, doesn't fail when no token
 * @param {boolean} options.admin — Shortcut for requiring admin role
 * @returns {Function} Express middleware
 */
function authGate(options = {}) {
  const { roles, permissions, optional, admin } = options;

  return async (req, res, next) => {
    try {
      // Step 1: Authentication
      if (optional) {
        // Optional auth — try to authenticate but don't fail
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          await authenticateToken(req, res, () => {});
        }
        // Continue regardless
      } else {
        // Required auth — must pass
        await new Promise((resolve, reject) => {
          authenticateToken(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // If optional and no user, skip role/permission checks
      if (optional && !req.user) {
        return next();
      }

      // Step 2: Admin shortcut
      if (admin) {
        requireAdmin(req, res, () => {});
        if (res.headersSent) return; // requireAdmin already sent 403
      }

      // Step 3: Role check
      if (roles && roles.length > 0) {
        requireRole(roles)(req, res, () => {});
        if (res.headersSent) return; // requireRole already sent 403
      }

      // Step 4: Permission check
      if (permissions && permissions.length > 0) {
        for (const perm of permissions) {
          requirePermission(perm)(req, res, () => {});
          if (res.headersSent) return; // requirePermission already sent 403
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Convenience middleware: require any authenticated user
 */
const requireAuth = authGate();

/**
 * Convenience middleware: require admin role
 */
const requireAdminOnly = authGate({ admin: true });

/**
 * Convenience middleware: optional auth
 */
const optionalAuth = authGate({ optional: true });

module.exports = {
  authGate,
  requireAuth,
  requireAdminOnly,
  optionalAuth,
  // Re-export for compatibility
  requireRole,
  requireAdmin,
  requirePermission,
};
