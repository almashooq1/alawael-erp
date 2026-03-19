/**
 * Authentication Middleware with Singleton Pattern
 * Handles JWT verification and token management
 * All operations use singleton service instances
 * 
 * Usage:
 * const auth = require('./authentication.middleware.singleton');
 * app.use(auth.authenticate);
 * app.post('/protected', auth.requireAdmin, handler);
 */

const jwt = require('jsonwebtoken');
const {
  getAuthenticationService,
  getSecurityService,
  getUnifiedJWTSecret,
  getUnifiedJWTRefreshSecret,
} = require('../services/services.singleton');

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 * Required: Authorization header with Bearer token
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = getUnifiedJWTSecret();
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      // Token valid, attach user to request
      req.user = decoded;
      req.token = token;
      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
      details: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 * Does not require token but validates if present
 * Next middleware called regardless of token validity
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = getUnifiedJWTSecret();
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        // Invalid token, continue without user
        req.user = null;
      } else {
        // Valid token, attach user
        req.user = decoded;
        req.token = token;
      }
      next();
    });
  } catch (error) {
    // Silently fail and continue
    req.user = null;
    next();
  }
};

/**
 * Require specific role(s)
 * User must have at least one of the provided roles
 * 
 * @param {...string} roles - Required roles
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE',
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require admin role specifically
 * Shorthand for requireRole('admin')
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const requireAdmin = requireRole('admin', 'superadmin');

/**
 * Require specific permission
 * Uses security service to check permission
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      // Use security service to validate permission
      const securityService = getSecurityService();
      const hasPermission = securityService.validatePermission(req.user.role, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission required: ${permission}`,
          code: 'INSUFFICIENT_PERMISSION',
          requiredPermission: permission,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Permission check error',
        code: 'PERMISSION_CHECK_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Require multiple permissions
 * User must have all provided permissions
 * 
 * @param {...string} permissions - Required permissions
 * @returns {Function} Express middleware
 */
const requirePermissions = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const securityService = getSecurityService();
      
      for (const permission of permissions) {
        const hasPermission = securityService.validatePermission(req.user.role, permission);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission required: ${permission}`,
            code: 'INSUFFICIENT_PERMISSION',
            requiredPermission: permission,
          });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Permission check error',
        code: 'PERMISSION_CHECK_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Check ownership of resource
 * Verifies user owns the resource identified by paramName
 * 
 * @param {string} paramName - URL parameter name (e.g., 'userId', 'postId')
 * @returns {Function} Express middleware
 */
const checkOwnership = (paramName) => {
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
          message: `Invalid parameter: ${paramName}`,
          code: 'INVALID_PARAMETER',
        });
      }

      // Check ownership via security service
      const securityService = getSecurityService();
      const isOwner = securityService.checkOwnership(req.user.id, resourceId);

      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this resource',
          code: 'OWNERSHIP_DENIED',
          resourceId,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ownership check error',
        code: 'OWNERSHIP_CHECK_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Token refresh handler
 * Verifies refresh token and issues new access token
 * 
 * @param {Request} req - Express request (expects refreshToken in body)
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN',
      });
    }

    const JWT_REFRESH_SECRET = getUnifiedJWTRefreshSecret();
    
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      try {
        // Use auth service to generate new token
        const authService = getAuthenticationService();
        const JWT_SECRET = getUnifiedJWTSecret();
        
        const newToken = jwt.sign(
          { id: decoded.id, email: decoded.email, role: decoded.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          accessToken: newToken,
          expiresIn: 86400, // 24 hours in seconds
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Token generation error',
          code: 'TOKEN_GENERATION_ERROR',
          details: error.message,
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh error',
      code: 'TOKEN_REFRESH_ERROR',
      details: error.message,
    });
  }
};

/**
 * Extract token from authorization header
 * Helper function used by other middleware
 * 
 * @param {Request} req - Express request
 * @returns {string|null} Token or null if not found
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

/**
 * Verify token validity
 * Helper function used by other middleware
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyTokenHelper = (token) => {
  try {
    const JWT_SECRET = getUnifiedJWTSecret();
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate new token
 * Helper function used by routes
 * 
 * @param {Object} user - User object
 * @param {Object} options - Token options
 * @returns {string} Generated JWT token
 */
const generateTokenHelper = (user, options = {}) => {
  const JWT_SECRET = getUnifiedJWTSecret();
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    ...options.additionalClaims,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || '24h',
    subject: user.id,
  });
};

/**
 * Log authentication activity
 * Used for audit trails
 * 
 * @param {Request} req - Express request
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 */
const logActivity = (req, action, details = {}) => {
  console.log(`[AUTH ACTIVITY] ${action}`, {
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...details,
  });
};

// Export all middleware functions
module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  requirePermissions,
  checkOwnership,
  refreshToken,
  extractToken,
  verifyTokenHelper,
  generateTokenHelper,
  logActivity,
};
