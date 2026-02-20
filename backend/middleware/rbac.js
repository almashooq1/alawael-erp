/**
 * Role-Based Access Control (RBAC) Middleware
 * نظام التحكم في الوصول بناءً على الأدوار
 */

/**
 * Authorize middleware - checks if user has required roles
 * @param {string|string[]} allowedRoles - Role(s) allowed to access
 * @returns {Function} Express middleware function
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Get user from request (set by auth middleware)
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      // Normalize allowedRoles to array
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Get user role (default to 'user')
      const userRole = user.role || user.roles || 'user';
      const userRoles = Array.isArray(userRole) ? userRole : [userRole];

      // Check if user has one of the required roles
      const hasRequiredRole = userRoles.some((role) =>
        roles.includes(role || role.toUpperCase()),
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `User role does not have permission. Required: ${roles.join(', ')}`,
        });
      }

      // User has required role
      next();
    } catch (error) {
      console.error('RBAC Authorization Error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Error during authorization check',
      });
    }
  };
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission string to check
 * @returns {Function} Express middleware function
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      // Get user permissions
      const userPermissions = user.permissions || [];

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `User does not have permission: ${permission}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission Check Error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Error during permission check',
      });
    }
  };
};

/**
 * Require specific role
 * @param {...string} roles - Roles that are required
 * @returns {Function} Express middleware function
 */
const requireRole = (...roles) => authorize(roles);

/**
 * Require admin role
 * @returns {Function} Express middleware function
 */
const requireAdmin = authorize(['ADMIN', 'SUPERADMIN']);

/**
 * Check multiple permissions (all required)
 * @param {...string} permissions - Permissions that are required
 * @returns {Function} Express middleware function
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const userPermissions = user.permissions || [];
      const hasAllPermissions = permissions.every((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `User does not have all required permissions: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Multiple Permissions Check Error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Error during permissions check',
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {...string} permissions - Permissions to check (any one is sufficient)
 * @returns {Function} Express middleware function
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const userPermissions = user.permissions || [];
      const hasAnyPermission = permissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `User does not have any of the required permissions: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Any Permission Check Error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Error during permission check',
      });
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
