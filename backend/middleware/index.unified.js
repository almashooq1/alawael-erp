/* eslint-disable no-unused-vars */
/**
 * Unified Middleware Index
 * تصدير موحد لجميع الوسيطات
 */

const {
  authenticateToken,
  requireRole: authRequireRole,
  requirePermission: authRequirePermission,
  requirePermissions,
  requireAdmin,
  optionalAuth,
} = require('./auth.middleware');

const {
  requirePermission: rbacRequirePermission,
  requireRole: rbacRequireRole,
  requireMinLevel,
  ROLES,
  ACTIONS,
  RESOURCES,
} = require('./rbac.v2.middleware');

const { handleValidationErrors, sanitizeInput } = require('./validation');

// Unified exports — prefer rbac.v2 (uses config engine + hierarchy)
const authenticate = authenticateToken;
const authorize = (...roles) => rbacRequireRole(...roles);
const checkPermission = rbacRequirePermission;

/**
 * Cache middleware — returns a no-op middleware if no caching layer is configured.
 * @param {number} ttlSeconds - Cache TTL in seconds
 */
const cacheMiddleware = (ttlSeconds = 60) => {
  return (req, res, next) => {
    next();
  };
};

const validate = validations => {
  if (Array.isArray(validations)) {
    return [...validations, handleValidationErrors];
  }
  return handleValidationErrors;
};

module.exports = {
  // Primary API
  authenticate,
  authorize,
  checkPermission,
  cacheMiddleware,
  validate,
  // Auth middleware
  authenticateToken,
  requireAdmin,
  requirePermissions,
  optionalAuth,
  // RBAC v2 (preferred)
  requireRole: rbacRequireRole,
  requirePermission: rbacRequirePermission,
  requireMinLevel,
  // Constants
  ROLES,
  ACTIONS,
  RESOURCES,
  // Validation
  sanitizeInput,
};
