/**
 * permissions.js — Middleware للتحقق من الصلاحيات
 */

const logger = require('../utils/logger');

/**
 * التحقق من صلاحية معينة
 * @param {string|string[]} requiredPermission - الصلاحية أو قائمة الصلاحيات المطلوبة
 */
const checkPermission = requiredPermission => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      // Super admin يملك كل الصلاحيات
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      const permissions = req.user.permissions || [];
      const required = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      const hasPermission = required.some(p => permissions.includes(p));

      if (!hasPermission) {
        logger.warn(
          `[permissions] Access denied for user ${req.user.userId} — required: ${required.join(', ')}`
        );
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لهذا المورد',
        });
      }

      return next();
    } catch (err) {
      logger.error('[permissions] Error:', err.message);
      return next();
    }
  };
};

/**
 * التحقق من أن المستخدم يملك أحد الأدوار المحددة
 * @param {string|string[]} roles - الدور أو قائمة الأدوار
 */
const checkRole = roles => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }

      const allowed = Array.isArray(roles) ? roles : [roles];

      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لهذا المورد',
        });
      }

      return next();
    } catch (err) {
      return next();
    }
  };
};

module.exports = { checkPermission, checkRole };
