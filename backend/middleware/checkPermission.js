const { ROLE_PERMISSIONS } = require('../config/roles');

/**
 * Middleware factory to check for specific permissions
 * @param {string} permission - The required permission string (e.g., 'create:user')
 */
const checkPermission = permission => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      if (userPermissions.includes(permission)) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires permission: ${permission}`,
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check',
      });
    }
  };
};

/**
 * Middleware to check if user has ANY of the provided permissions
 * @param {string[]} permissions - Array of permission strings
 */
const checkAnyPermission = permissions => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      // Check if intersection exists
      const hasPermission = permissions.some(p => userPermissions.includes(p));

      if (hasPermission) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check',
      });
    }
  };
};

module.exports = { checkPermission, checkAnyPermission };
