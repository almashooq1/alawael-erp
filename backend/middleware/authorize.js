/**
 * Permission-based Authorization Middleware
 * مسار: middleware/authorize.js
 *
 * Used for fine-grained permission checks (e.g., authorize('view_accident_analytics'))
 * Different from role-based authorize in auth.js which checks user roles.
 */

const logger = require('../utils/logger');

/**
 * Creates middleware that checks if user has a specific permission
 * @param {string|string[]} requiredPermissions - Permission(s) required
 * @returns {Function} Express middleware
 */
const authorize = requiredPermissions => {
  return (req, res, next) => {
    try {
      // Must be authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'يجب تسجيل الدخول أولاً',
        });
      }

      // Admin bypasses permission checks
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }

      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check user permissions
      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.some(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        logger.warn(`Permission denied: user ${req.user.id} lacks [${permissions.join(', ')}]`);
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          required: permissions,
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
      });
    }
  };
};

module.exports = authorize;
