/**
 * Permission Middleware - وسيط التحقق من الصلاحيات
 * Express Middleware for Access Control
 */

const { advancedPermissionService } = require('./permission-service');

/**
 * Permission Middleware Factory
 */
function requirePermission(permissionKey, options = {}) {
  return async (req, res, next) => {
    try {
      // Get user from request
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'المستخدم غير مصادق عليه',
        });
      }
      
      // Build context
      const context = {
        tenantId,
        resource: options.resource || req.params.resource,
        action: options.action || req.method.toLowerCase(),
        requiredLevel: options.level,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        params: req.params,
        query: req.query,
        body: req.body,
      };
      
      // Check permission
      const hasPermission = await advancedPermissionService.checkPermission(
        userId,
        permissionKey,
        context
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          permission: permissionKey,
        });
      }
      
      // Attach permission info to request
      req.permission = {
        key: permissionKey,
        checked: true,
        granted: true,
      };
      
      next();
      
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'خطأ في التحقق من الصلاحيات',
      });
    }
  };
}

/**
 * Role Middleware Factory
 */
function requireRole(roleKey, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'المستخدم غير مصادق عليه',
        });
      }
      
      // Check if user has role
      const hasRole = await advancedPermissionService.hasRole(userId, roleKey, tenantId);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'ليس لديك الدور المطلوب',
          role: roleKey,
        });
      }
      
      req.role = {
        key: roleKey,
        checked: true,
        granted: true,
      };
      
      next();
      
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * Any Permission Middleware (OR condition)
 */
function requireAnyPermission(permissionKeys, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const context = {
        tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };
      
      // Check if user has ANY of the permissions
      for (const permKey of permissionKeys) {
        const hasPermission = await advancedPermissionService.checkPermission(
          userId,
          permKey,
          context
        );
        
        if (hasPermission) {
          req.permission = { key: permKey, checked: true, granted: true };
          return next();
        }
      }
      
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'ليس لديك أي من الصلاحيات المطلوبة',
        permissions: permissionKeys,
      });
      
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * All Permissions Middleware (AND condition)
 */
function requireAllPermissions(permissionKeys, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const context = {
        tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };
      
      // Check if user has ALL permissions
      const missingPermissions = [];
      
      for (const permKey of permissionKeys) {
        const hasPermission = await advancedPermissionService.checkPermission(
          userId,
          permKey,
          context
        );
        
        if (!hasPermission) {
          missingPermissions.push(permKey);
        }
      }
      
      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'ليس لديك جميع الصلاحيات المطلوبة',
          missing: missingPermissions,
        });
      }
      
      req.permission = { keys: permissionKeys, checked: true, granted: true };
      next();
      
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * Optional Permission Middleware
 * Attaches permission info but doesn't block
 */
function checkPermission(permissionKey, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (userId) {
        const hasPermission = await advancedPermissionService.checkPermission(
          userId,
          permissionKey,
          { tenantId, ip: req.ip }
        );
        
        req.permission = {
          key: permissionKey,
          checked: true,
          granted: hasPermission,
        };
      } else {
        req.permission = {
          key: permissionKey,
          checked: false,
          granted: false,
        };
      }
      
      next();
      
    } catch (error) {
      // Don't block on error for optional check
      req.permission = {
        key: permissionKey,
        checked: false,
        granted: false,
        error: error.message,
      };
      next();
    }
  };
}

/**
 * Admin Only Middleware
 */
function adminOnly(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Super Admin Only Middleware
 */
function superAdminOnly(req, res, next) {
  return requireRole('super_admin')(req, res, next);
}

/**
 * Owner or Admin Middleware
 */
function ownerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Check if admin
      const isAdmin = await advancedPermissionService.hasRole(userId, 'admin', tenantId);
      if (isAdmin) {
        return next();
      }
      
      // Check if owner
      const ownerId = typeof getOwnerId === 'function' 
        ? await getOwnerId(req) 
        : req.params[getOwnerId] || req.body[getOwnerId];
      
      if (ownerId && ownerId.toString() === userId.toString()) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'يجب أن تكون المالك أو مدير',
      });
      
    } catch (error) {
      console.error('Owner/Admin middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * Permission Level Middleware
 */
function requireLevel(minLevel, options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Get user permissions
      const userPerms = await advancedPermissionService.getUserPermissions(userId, tenantId);
      
      // Check if user has sufficient level
      const userLevel = Math.max(...Object.values(userPerms.permissions || {}), 0);
      
      if (userLevel < minLevel) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `مستوى الصلاحية المطلوب: ${minLevel}`,
          currentLevel: userLevel,
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Level middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * Dynamic Permission Middleware
 * Checks permission based on request parameters
 */
function dynamicPermission(options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      // Build permission key from request
      const resource = options.resource || req.params.resource || req.baseUrl.split('/').pop();
      const action = options.action || getActionFromMethod(req.method);
      const permissionKey = `${resource}.${action}`;
      
      const context = {
        tenantId,
        resource,
        action,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };
      
      const hasPermission = await advancedPermissionService.checkPermission(
        userId,
        permissionKey,
        context
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'ليس لديك صلاحية لهذا الإجراء',
          permission: permissionKey,
        });
      }
      
      req.permission = { key: permissionKey, checked: true, granted: true };
      next();
      
    } catch (error) {
      console.error('Dynamic permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

/**
 * Get action from HTTP method
 */
function getActionFromMethod(method) {
  const mapping = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return mapping[method.toUpperCase()] || 'read';
}

/**
 * Conditional Permission Middleware
 */
function conditionalPermission(condition, permissionIfTrue, permissionIfFalse = null) {
  return async (req, res, next) => {
    try {
      const result = await condition(req);
      const permissionKey = result ? permissionIfTrue : permissionIfFalse;
      
      if (!permissionKey) {
        return next();
      }
      
      return requirePermission(permissionKey)(req, res, next);
      
    } catch (error) {
      console.error('Conditional permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  };
}

module.exports = {
  requirePermission,
  requireRole,
  requireAnyPermission,
  requireAllPermissions,
  checkPermission,
  adminOnly,
  superAdminOnly,
  ownerOrAdmin,
  requireLevel,
  dynamicPermission,
  conditionalPermission,
};