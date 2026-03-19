/**
 * ALAWAEL Quality Dashboard - RBAC Middleware
 * Role-Based Access Control Implementation
 * Phase 13 - Pillar 1: Advanced Features
 */

const rbacConfig = {
  roles: {
    // System Administrator - Full access
    ADMIN: {
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:roles'],
      level: 100,
    },

    // Quality Manager - Quality operations
    QUALITY_MANAGER: {
      permissions: [
        'read:quality',
        'write:quality',
        'read:reports',
        'write:reports',
        'manage:teams',
      ],
      level: 80,
    },

    // Team Lead - Team management
    TEAM_LEAD: {
      permissions: ['read:quality', 'write:quality', 'read:team', 'manage:team_members'],
      level: 60,
    },

    // Analyst - Data analysis
    ANALYST: {
      permissions: ['read:quality', 'read:reports', 'write:reports'],
      level: 40,
    },

    // Viewer - Read-only access
    VIEWER: {
      permissions: ['read:quality', 'read:reports'],
      level: 20,
    },

    // Guest - Limited access
    GUEST: {
      permissions: ['read:public'],
      level: 10,
    },
  },

  // Permission hierarchy
  permissionHierarchy: {
    'read:all': ['read:quality', 'read:reports', 'read:team', 'read:public'],
    'write:all': ['write:quality', 'write:reports'],
    'delete:all': ['delete:quality', 'delete:reports'],
    'manage:users': ['read:users', 'write:users', 'delete:users'],
    'manage:roles': ['read:roles', 'write:roles'],
  },
};

/**
 * RBAC Middleware - Check user permissions
 */
function rbacMiddleware(req, res, next) {
  try {
    // Get user from JWT token (assuming auth middleware sets req.user)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized - No authentication token',
        timestamp: new Date().toISOString(),
      });
    }

    // Get user role
    const userRole = user.role || 'GUEST';
    const roleConfig = rbacConfig.roles[userRole];

    if (!roleConfig) {
      return res.status(403).json({
        error: 'Forbidden - Invalid role',
        user: user.id,
        role: userRole,
        timestamp: new Date().toISOString(),
      });
    }

    // Attach role and permissions to request
    req.roleConfig = roleConfig;
    req.userRole = userRole;
    req.permissions = roleConfig.permissions;
    req.roleLevel = roleConfig.level;

    // Store audit info
    req.auditInfo = {
      userId: user.id,
      userEmail: user.email,
      role: userRole,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
    };

    next();
  } catch (error) {
    console.error('❌ RBAC Middleware Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Permission Check Middleware
 * Usage: app.get('/admin/users', requirePermission('manage:users'), handler)
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    try {
      const userPermissions = req.permissions || [];

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(required => {
        // Check direct permission
        if (userPermissions.includes(required)) {
          return true;
        }

        // Check hierarchical permissions
        for (const [perm, subPerms] of Object.entries(rbacConfig.permissionHierarchy)) {
          if (userPermissions.includes(perm) && subPerms.includes(required)) {
            return true;
          }
        }

        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden - Insufficient permissions',
          required: requiredPermissions,
          user: req.user.id,
          userRole: req.userRole,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('❌ Permission Check Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Role Check Middleware
 * Usage: app.get('/admin', requireRole('ADMIN', 'QUALITY_MANAGER'), handler)
 */
function requireRole(...requiredRoles) {
  return (req, res, next) => {
    try {
      if (!requiredRoles.includes(req.userRole)) {
        return res.status(403).json({
          error: 'Forbidden - Invalid role',
          required: requiredRoles,
          userRole: req.userRole,
          timestamp: new Date().toISOString(),
        });
      }
      next();
    } catch (error) {
      console.error('❌ Role Check Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Get user permissions details
 */
function getRoleInfo(role) {
  const config = rbacConfig.roles[role] || rbacConfig.roles.VIEWER;
  return {
    ...config,
    name: role in rbacConfig.roles ? role : 'VIEWER',
  };
}

/**
 * Get all available roles
 */
function getAllRoles() {
  return Object.entries(rbacConfig.roles)
    .map(([name, config]) => ({ name, ...config }))
    .sort((a, b) => b.level - a.level);
}

/**
 * Check if user can access resource
 */
function canAccess(userRole, permission) {
  if (!rbacConfig.roles[userRole]) {
    return false;
  }

  const userPermissions = rbacConfig.roles[userRole].permissions;

  // Check direct permission
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Check hierarchical permissions
  for (const [perm, subPerms] of Object.entries(rbacConfig.permissionHierarchy)) {
    if (userPermissions.includes(perm) && subPerms.includes(permission)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  rbacMiddleware,
  requirePermission,
  requireRole,
  getRoleInfo,
  getAllRoles,
  canAccess,
  rbacConfig,
};
