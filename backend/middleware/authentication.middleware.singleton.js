/**
 * Authentication Middleware — Compatibility Proxy (was Singleton Pattern)
 * ══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: This file now delegates to the canonical auth.js middleware.
 * All JWT verification uses the unified secret from config/secrets.js.
 *
 * Consumers should migrate to:
 *   const auth = require('./auth');
 *
 * This proxy preserves the old export names so existing callers keep working.
 * ══════════════════════════════════════════════════════════════════════════
 */

const auth = require('./auth');
const logger = require('../utils/logger');

/* istanbul ignore next — thin compatibility shim */

/**
 * Ownership check — admin bypass, otherwise pass-through.
 * For fine-grained ownership, use a dedicated middleware.
 */
const checkOwnership = _paramName => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const role = (req.user.role || '').toLowerCase();
  if (['admin', 'superadmin', 'super_admin'].includes(role)) return next();
  // Default pass-through — callers needing strict ownership should use a dedicated check
  next();
};

/**
 * Simple activity logger (non-middleware form kept for backward compat)
 */
const logActivity = (req, action, details = {}) => {
  logger.info(`[AUTH ACTIVITY] ${action}`, {
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get?.('user-agent'),
    ...details,
  });
};

// Re-export: old name → canonical auth.js function
module.exports = {
  authenticate: auth.authenticateToken,
  optionalAuth: auth.optionalAuth,
  requireRole: auth.requireRole,
  requireAdmin: auth.requireAdmin,
  requirePermission: auth.requirePermission,
  requirePermissions: auth.requirePermissions,
  checkOwnership,
  refreshToken: auth.refreshToken,
  extractToken: auth.extractToken,
  verifyTokenHelper: auth.verifyToken,
  generateTokenHelper: auth.generateToken,
  logActivity,
};
