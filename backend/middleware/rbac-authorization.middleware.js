/**
 * RBAC Authorization Middleware
 * برمجيات وسيطة لفحص التفويض والأذونات
 */

const AdvancedRBACSystem = require('../services/advanced-rbac.system');
const RBACPolicyEngine = require('../services/rbac-policy-engine');
const RBACAuditingService = require('../services/rbac-auditing.service');
const IntelligentRBACMiddleware = require('../middleware/rbac-intelligent.middleware');

// Initialize components
const rbacSystem = new AdvancedRBACSystem();
const policyEngine = new RBACPolicyEngine();
const auditingService = new RBACAuditingService();
const intelligentMiddleware = new IntelligentRBACMiddleware();

/**
 * RBAC Authorization Middleware
 * فحص ما إذا كان المستخدم لديه الأذونات المطلوبة
 * 
 * Usage: app.use('/api/admin', rbacAuthorize('admin:write'))
 */
function rbacAuthorize(requiredPermissions, options = {}) {
  return async (req, res, next) => {
    try {
      // Extract user ID from request
      const userId = req.user?.id || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User identification required',
        });
      }

      // Normalize permissions to array
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check strategy (all/any/weighted)
      const strategy = options.strategy || 'all';

      let hasAccess = false;
      const context = {
        userId,
        action: req.method,
        resource: req.path,
        timestamp: new Date(),
      };

      switch (strategy) {
        case 'any':
          // User needs any of the permissions
          hasAccess = permissions.some(perm =>
            rbacSystem.hasPermission(userId, perm, context)
          );
          break;

        case 'weighted':
          // User needs majority of permissions
          const weight = permissions.filter(perm =>
            rbacSystem.hasPermission(userId, perm, context)
          ).length / permissions.length;
          hasAccess = weight >= (options.threshold || 0.7);
          break;

        case 'all':
        default:
          // User needs all permissions
          hasAccess = rbacSystem.hasAllPermissions(userId, permissions, context);
      }

      if (!hasAccess) {
        // Log unauthorized attempt
        auditingService.logAuditEvent({
          userId,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          resourceType: 'endpoint',
          resourceId: req.path,
          details: { requiredPermissions: permissions, method: req.method },
          status: 'failure',
          severity: 'high',
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Required permissions: ' + permissions.join(', '),
          requiredPermissions: permissions,
        });
      }

      // Log successful authorization
      auditingService.logAuditEvent({
        userId,
        action: 'AUTHORIZED_ACCESS',
        resourceType: 'endpoint',
        resourceId: req.path,
        details: { permissions, method: req.method },
        status: 'success',
        severity: 'low',
      });

      // Attach user info to request
      req.rbacUser = {
        id: userId,
        roles: rbacSystem.getUserRoles(userId),
        permissions: rbacSystem.getUserEffectivePermissions(userId),
      };

      next();
    } catch (error) {
      console.error('RBAC Authorization Error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message,
      });
    }
  };
}

/**
 * Intelligent Authorization Middleware
 * Uses advanced features like rate limiting, risk scoring, anomaly detection
 */
function intelligentAuthorize(requiredPermissions, options = {}) {
  return intelligentMiddleware.authorize(requiredPermissions, {
    strategy: options.strategy || 'all',
    riskThreshold: options.riskThreshold || 0.7,
    enableRateLimit: options.enableRateLimit !== false,
    enableAnomalyDetection: options.enableAnomalyDetection !== false,
  });
}

/**
 * Role-based Authorization
 * Check if user has specific role
 */
function rbacAuthorizeRole(requiredRoles) {
  return (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User identification required',
        });
      }

      const userRoles = rbacSystem.getUserRoles(userId);
      const userRoleIds = userRoles.map(r => r.id);
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      const hasRole = roles.some(role => userRoleIds.includes(role));

      if (!hasRole) {
        auditingService.logAuditEvent({
          userId,
          action: 'INSUFFICIENT_ROLE',
          resourceType: 'endpoint',
          resourceId: req.path,
          details: { requiredRoles: roles, userRoles: userRoleIds },
          status: 'failure',
          severity: 'high',
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Required roles: ' + roles.join(', '),
          requiredRoles: roles,
        });
      }

      req.rbacUser = {
        id: userId,
        roles: userRoles,
        permissions: rbacSystem.getUserEffectivePermissions(userId),
      };

      next();
    } catch (error) {
      console.error('RBAC Role Authorization Error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message,
      });
    }
  };
}

/**
 * Attribute-based Access Control (ABAC)
 */
function rbacAuthorizeAttributes(conditions) {
  return (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User identification required',
        });
      }

      const userAttributes = rbacSystem.getUserAttributes(userId);

      // Check if all conditions are met
      const allConditionsMet = Object.entries(conditions || {}).every(
        ([key, value]) => {
          const attrValue = userAttributes[key];
          if (typeof value === 'function') {
            return value(attrValue);
          }
          return attrValue === value;
        }
      );

      if (!allConditionsMet) {
        auditingService.logAuditEvent({
          userId,
          action: 'ABAC_CONDITION_FAILED',
          resourceType: 'endpoint',
          resourceId: req.path,
          details: { requiredAttributes: conditions, userAttributes },
          status: 'failure',
          severity: 'high',
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Attribute conditions not met.',
        });
      }

      req.rbacUser = {
        id: userId,
        roles: rbacSystem.getUserRoles(userId),
        permissions: rbacSystem.getUserEffectivePermissions(userId),
        attributes: userAttributes,
      };

      next();
    } catch (error) {
      console.error('ABAC Error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message,
      });
    }
  };
}

/**
 * Rate Limiting Middleware
 * Limit requests per user/role
 */
function rbacRateLimit(options = {}) {
  return (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];

      if (!userId) {
        return next();
      }

      // Get user role for rate limiting
      const userRoles = rbacSystem.getUserRoles(userId);
      const userRole = userRoles?.[0];

      // Define limit based on role
      const limits = {
        'super-admin': 100000,
        'admin': 10000,
        'manager': 1000,
        'user': 100,
        'guest': 10,
      };

      const limit = limits[userRole?.id] || limits.user;

      // Check rate limit
      const isLimited = intelligentMiddleware._checkRateLimit(userId);

      if (isLimited) {
        auditingService.logAuditEvent({
          userId,
          action: 'RATE_LIMIT_EXCEEDED',
          resourceType: 'api',
          resourceId: req.path,
          status: 'failure',
          severity: 'medium',
        });

        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: 60,
        });
      }

      next();
    } catch (error) {
      console.error('Rate Limit Error:', error);
      next();
    }
  };
}

/**
 * Session Validation Middleware
 */
function validateSession(req, res, next) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Session required',
      });
    }

    const isValid = intelligentMiddleware.validateSession(sessionId);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Session validation failed',
    });
  }
}

/**
 * Logging Middleware
 * Log all RBAC-related activities
 */
function rbacLogging(req, res, next) {
  const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';

  res.on('finish', () => {
    auditingService.logAuditEvent({
      userId,
      action: `${req.method}_${req.path.split('/')[1]}`,
      resourceType: 'api',
      resourceId: req.path,
      details: {
        method: req.method,
        statusCode: res.statusCode,
      },
      status: res.statusCode < 400 ? 'success' : 'failure',
      severity: res.statusCode >= 500 ? 'high' : 'low',
    });
  });

  next();
}

module.exports = {
  rbacAuthorize,
  intelligentAuthorize,
  rbacAuthorizeRole,
  rbacAuthorizeAttributes,
  rbacRateLimit,
  validateSession,
  rbacLogging,
  // Export components for advanced usage
  rbacSystem,
  policyEngine,
  auditingService,
  intelligentMiddleware,
};
