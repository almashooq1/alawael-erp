/**
 * 👥 Role-Based Access Control (RBAC)
 *
 * Comprehensive permission and role system
 * - Role definitions
 * - Permission management
 * - Resource-level access control
 * - Dynamic permission checking
 */

class RBACSystem {
  constructor(options = {}) {
    this.roles = new Map();
    this.permissions = new Map();
    this.resources = new Map();
    this.userRoles = new Map();
    this.roleHierarchy = new Map();
    this.auditLog = [];
  }

  /**
   * Define permission
   */
  definePermission(permissionId, config = {}) {
    this.permissions.set(permissionId, {
      id: permissionId,
      name: config.name || permissionId,
      description: config.description || '',
      resourceType: config.resourceType,
      action: config.action,
      createdAt: Date.now(),
    });
  }

  /**
   * Define role
   */
  defineRole(roleId, config = {}) {
    this.roles.set(roleId, {
      id: roleId,
      name: config.name || roleId,
      description: config.description || '',
      permissions: new Set(config.permissions || []),
      level: config.level || 0, // For role hierarchy
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (config.parent) {
      this.roleHierarchy.set(roleId, config.parent);
    }
  }

  /**
   * Add permission to role
   */
  addPermissionToRole(roleId, permissionId) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (!this.permissions.has(permissionId)) {
      throw new Error(`Permission ${permissionId} not found`);
    }

    role.permissions.add(permissionId);
    role.updatedAt = Date.now();
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(roleId, permissionId) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);

    role.permissions.delete(permissionId);
    role.updatedAt = Date.now();
  }

  /**
   * Assign role to user
   */
  assignRoleToUser(userId, roleId, context = {}) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    this.userRoles.get(userId).push({
      roleId,
      assignedAt: Date.now(),
      assignedBy: context.assignedBy || 'system',
      scope: context.scope || 'global',
      expiresAt: context.expiresAt || null,
    });

    this._logAuditEvent('ROLE_ASSIGNED', {
      userId,
      roleId,
      context,
    });
  }

  /**
   * Revoke role from user
   */
  revokeRoleFromUser(userId, roleId, context = {}) {
    if (!this.userRoles.has(userId)) return;

    const roles = this.userRoles.get(userId);
    const index = roles.findIndex(r => r.roleId === roleId);

    if (index !== -1) {
      roles.splice(index, 1);
      this._logAuditEvent('ROLE_REVOKED', {
        userId,
        roleId,
        context,
      });
    }
  }

  /**
   * Get all permissions for user
   */
  getUserPermissions(userId) {
    const permissions = new Set();
    const now = Date.now();

    const userRoles = this.userRoles.get(userId) || [];

    for (const roleAssignment of userRoles) {
      // Skip expired roles
      if (roleAssignment.expiresAt && roleAssignment.expiresAt < now) {
        continue;
      }

      const role = this.roles.get(roleAssignment.roleId);
      if (!role) continue;

      // Add direct permissions
      for (const perm of role.permissions) {
        permissions.add(perm);
      }

      // Add parent role permissions (if hierarchy exists)
      this._addInheritedPermissions(roleAssignment.roleId, permissions);
    }

    return Array.from(permissions);
  }

  /**
   * Add inherited permissions from parent roles
   */
  _addInheritedPermissions(roleId, permissions) {
    const parent = this.roleHierarchy.get(roleId);
    if (!parent) return;

    const parentRole = this.roles.get(parent);
    if (!parentRole) return;

    for (const perm of parentRole.permissions) {
      permissions.add(perm);
    }

    // Recursively add parent's parents
    this._addInheritedPermissions(parent, permissions);
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId, permissionId, resource = null) {
    const userPermissions = this.getUserPermissions(userId);

    if (userPermissions.includes(permissionId)) {
      return true;
    }

    // Check resource-specific permissions
    if (resource) {
      return this.hasResourcePermission(userId, permissionId, resource);
    }

    return false;
  }

  /**
   * Check resource-specific permissions
   */
  hasResourcePermission(userId, permissionId, resource) {
    const resourceAccess = this.resources.get(resource.id);
    if (!resourceAccess) return false;

    const userAccess = resourceAccess.acl.find(a => a.userId === userId);
    if (!userAccess) return false;

    return userAccess.permissions.includes(permissionId);
  }

  /**
   * Grant direct resource access
   */
  grantResourceAccess(userId, resourceId, permissions, context = {}) {
    if (!this.resources.has(resourceId)) {
      this.resources.set(resourceId, {
        id: resourceId,
        acl: [],
      });
    }

    const resource = this.resources.get(resourceId);
    const existingAccess = resource.acl.find(a => a.userId === userId);

    if (existingAccess) {
      existingAccess.permissions = Array.from(
        new Set([...existingAccess.permissions, ...permissions])
      );
    } else {
      resource.acl.push({
        userId,
        permissions,
        grantedAt: Date.now(),
        grantedBy: context.grantedBy || 'system',
      });
    }

    this._logAuditEvent('RESOURCE_ACCESS_GRANTED', {
      userId,
      resourceId,
      permissions,
      context,
    });
  }

  /**
   * Revoke resource access
   */
  revokeResourceAccess(userId, resourceId, permissions = null, context = {}) {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const access = resource.acl.find(a => a.userId === userId);
    if (!access) return;

    if (permissions) {
      access.permissions = access.permissions.filter(p => !permissions.includes(p));

      if (access.permissions.length === 0) {
        resource.acl = resource.acl.filter(a => a.userId !== userId);
      }
    } else {
      resource.acl = resource.acl.filter(a => a.userId !== userId);
    }

    this._logAuditEvent('RESOURCE_ACCESS_REVOKED', {
      userId,
      resourceId,
      permissions,
      context,
    });
  }

  /**
   * Log audit event
   */
  _logAuditEvent(action, data) {
    this.auditLog.push({
      timestamp: Date.now(),
      action,
      data,
    });

    // Keep only last 10000 audit events
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filters = {}) {
    let log = this.auditLog;

    if (filters.action) {
      log = log.filter(e => e.action === filters.action);
    }

    if (filters.userId) {
      log = log.filter(e => e.data.userId === filters.userId);
    }

    if (filters.startTime) {
      log = log.filter(e => e.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      log = log.filter(e => e.timestamp <= filters.endTime);
    }

    return log;
  }

  /**
   * Get role hierarchy
   */
  getRoleHierarchy() {
    const hierarchy = {};

    for (const [roleId, parentId] of this.roleHierarchy) {
      hierarchy[roleId] = parentId;
    }

    return hierarchy;
  }

  /**
   * Get role details
   */
  getRoleDetails(roleId) {
    const role = this.roles.get(roleId);
    if (!role) return null;

    return {
      ...role,
      permissions: Array.from(role.permissions),
      parent: this.roleHierarchy.get(roleId) || null,
    };
  }

  /**
   * Get user info
   */
  getUserInfo(userId) {
    const roles = this.userRoles.get(userId) || [];
    const permissions = this.getUserPermissions(userId);

    return {
      userId,
      roles: roles.map(r => r.roleId),
      permissions,
      roleAssignments: roles,
    };
  }
}

/**
 * Express middleware for RBAC
 */
function rbacMiddleware(rbac) {
  return {
    /**
     * Check permission middleware
     */
    requirePermission: permissionId => (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!rbac.hasPermission(req.user.userId, permissionId)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    },

    /**
     * Check any permission
     */
    requireAnyPermission: permissionIds => (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = permissionIds.some(pid => rbac.hasPermission(req.user.userId, pid));

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    },

    /**
     * Require role
     */
    requireRole: roleId => (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userInfo = rbac.getUserInfo(req.user.userId);
      if (!userInfo.roles.includes(roleId)) {
        return res.status(403).json({ error: 'Insufficient role' });
      }

      next();
    },
  };
}

module.exports = { RBACSystem, rbacMiddleware };
