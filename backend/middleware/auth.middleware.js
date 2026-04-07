/**
 * Authentication Middleware - مكون المصادقة
 *
 * ⚠️ COMPATIBILITY PROXY — All logic consolidated in ./auth.js (Round 29)
 *
 * This file re-exports everything from auth.js so that existing
 * `require('../middleware/auth.middleware')` imports continue to work.
 */

const auth = require('./auth');

module.exports = {
  authenticateToken: auth.authenticateToken,
  requireAdmin: auth.requireAdmin,
  requireRole: auth.requireRole,
  requirePermission: auth.requirePermission,
  requirePermissions: auth.requirePermissions,
  optionalAuth: auth.optionalAuth,
  extractToken: auth.extractToken,
  verifyToken: auth.verifyToken,
  generateToken: auth.generateToken,
  generateTokenWithSession: auth.generateTokenWithSession,
  refreshToken: auth.refreshToken,
  revokeToken: auth.revokeToken,
  authorizeRole: auth.requireRole,
  get Session() {
    return auth.Session.current;
  },
};
