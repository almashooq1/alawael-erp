/**
 * Authorization Middleware with Singleton Pattern
 * Handles role-based access control, permissions, and advanced authorization
 * All operations use singleton service instances
 * 
 * Usage:
 * const authz = require('./authorization.middleware.singleton');
 * app.post('/admin/action', authz.authorize('admin'), handler);
 * app.delete('/resource/:id', authz.checkOwnership('id'), handler);
 */

const {
  getSecurityService,
  getPermissionService,
  getUserService,
} = require('../services/services.singleton');

/**
 * Role-based authorization
 * User must have one of the specified roles
 * 
 * @param {...string} allowedRoles - Roles allowed to access
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_ROLE',
          userRole: req.user.role,
          allowedRoles,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTHZ_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Check specific permission
 * Uses permission service to validate access
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const permissionService = getPermissionService();
      const hasPermission = await permissionService.checkPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission}`,
          code: 'INSUFFICIENT_PERMISSION',
          requiredPermission: permission,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Permission check error',
        code: 'PERMISSION_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Check resource ownership
 * Verifies user owns the resource or is admin
 * 
 * @param {string} paramName - URL parameter containing resource ID
 * @param {string} resourceType - Type of resource (e.g., 'post', 'comment')
 * @returns {Function} Express middleware
 */
const checkOwnership = (paramName, resourceType = 'resource') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: `Missing parameter: ${paramName}`,
          code: 'MISSING_PARAMETER',
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }

      // Check ownership for regular users
      const securityService = getSecurityService();
      const isOwner = securityService.checkOwnership(req.user.id, resourceId);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: `You do not own this ${resourceType}`,
          code: 'OWNERSHIP_DENIED',
          resourceId,
          resourceType,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ownership check error',
        code: 'OWNERSHIP_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Require multi-factor authentication
 * Verifies user has MFA enabled
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const requireMFA = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Check if MFA is enabled for user
    if (!req.user.mfaEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Multi-factor authentication required',
        code: 'MFA_REQUIRED',
      });
    }

    // Check if MFA is already verified in this session
    if (!req.session?.mfaVerified) {
      return res.status(403).json({
        success: false,
        message: 'MFA verification required',
        code: 'MFA_NOT_VERIFIED',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'MFA check error',
      code: 'MFA_ERROR',
      details: error.message,
    });
  }
};

/**
 * Require verified email
 * Ensures user has verified their email address
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const requireVerified = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification check error',
      code: 'VERIFICATION_ERROR',
      details: error.message,
    });
  }
};

/**
 * Check if user account is active
 * Prevents access from suspended or disabled accounts
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const checkActiveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userService = getUserService();
    const user = await userService.findById(req.user.id);

    if (!user || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
        status: user?.status,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Account activation check error',
      code: 'ACTIVATION_CHECK_ERROR',
      details: error.message,
    });
  }
};

/**
 * Detect and flag new devices
 * Logs device information for security monitoring
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const detectNewDevice = (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const deviceFingerprint = {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Store in session for logging
    if (!req.session) {
      req.session = {};
    }
    req.session.deviceFingerprint = deviceFingerprint;

    next();
  } catch (error) {
    // Non-critical, continue regardless
    next();
  }
};

/**
 * Require password change
 * Forces users with expired passwords to update
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const requirePasswordChange = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Check if password change is required
    if (req.user.passwordChangeRequired) {
      return res.status(403).json({
        success: false,
        message: 'Password change required before proceeding',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password check error',
      code: 'PASSWORD_CHECK_ERROR',
      details: error.message,
    });
  }
};

/**
 * Check branch/organization access
 * Verifies user has access to the specified branch
 * 
 * @param {string} paramName - URL parameter containing branch ID
 * @returns {Function} Express middleware
 */
const checkBranch = (paramName = 'branchId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const branchId = req.params[paramName];
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: `Missing parameter: ${paramName}`,
          code: 'MISSING_PARAMETER',
        });
      }

      // Check if user has access to this branch
      const userService = getUserService();
      const user = await userService.findById(req.user.id);

      if (!user?.branches?.includes(branchId) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No access to this branch',
          code: 'BRANCH_ACCESS_DENIED',
          branchId,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Branch access check error',
        code: 'BRANCH_CHECK_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Audit logging middleware
 * Logs all access to sensitive endpoints
 * 
 * @param {string} action - Action being performed
 * @returns {Function} Express middleware
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        userId: req.user?.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        status: res.statusCode,
        success: data?.success || false,
      };

      console.log('[AUDIT]', JSON.stringify(logEntry));

      return originalJson.call(this, data);
    };

    next();
  };
};

// Export all authorization middleware
module.exports = {
  authorize,
  checkPermission,
  checkOwnership,
  requireMFA,
  requireVerified,
  checkActiveUser,
  detectNewDevice,
  requirePasswordChange,
  checkBranch,
  auditLog,
};
