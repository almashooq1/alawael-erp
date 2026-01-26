/**
 * ============================================
 * ADVANCED ROLE-BASED ACCESS CONTROL (RBAC)
 * نظام التحكم في الوصول المتقدم
 * ============================================
 */

const mongoose = require('mongoose');

// Permission Schema
const permissionSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: String,
  description: String,
  category: String, // e.g., 'users', 'orders', 'products'
  resource: String,
  action: String, // create, read, update, delete, execute
  createdAt: { type: Date, default: Date.now },
});

// Role Schema with Hierarchy
const roleSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: String,
  permissions: [{ type: String, ref: 'Permission' }],
  parentRole: { type: String, ref: 'Role' }, // For role hierarchy
  level: Number, // 1=Admin, 2=Manager, 3=User, 4=Guest
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// RBAC Middleware
class RBACService {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.auditLog = [];
  }

  /**
   * 1️⃣ ROLE DEFINITIONS
   */

  initializeRoles() {
    // Admin Role
    this.createRole({
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      level: 1,
      permissions: ['*'], // All permissions
    });

    // Manager Role
    this.createRole({
      id: 'manager',
      name: 'Manager',
      description: 'Limited administrative access',
      level: 2,
      permissions: [
        'users:read',
        'users:create',
        'users:update',
        'orders:read',
        'orders:update',
        'products:read',
        'products:create',
        'reports:read',
      ],
    });

    // User Role
    this.createRole({
      id: 'user',
      name: 'User',
      description: 'Standard user access',
      level: 3,
      permissions: [
        'users:read_own',
        'orders:read',
        'orders:create',
        'products:read',
        'profile:update',
      ],
    });

    // Guest Role
    this.createRole({
      id: 'guest',
      name: 'Guest',
      description: 'Limited read-only access',
      level: 4,
      permissions: ['products:read', 'categories:read'],
    });
  }

  /**
   * 2️⃣ CREATE & MANAGE ROLES
   */

  createRole(roleData) {
    const role = {
      id: roleData.id,
      name: roleData.name,
      description: roleData.description,
      level: roleData.level || 3,
      permissions: roleData.permissions || [],
      parentRole: roleData.parentRole,
      isActive: true,
      createdAt: new Date(),
    };

    this.roles.set(roleData.id, role);
    return role;
  }

  updateRole(roleId, updates) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const role = this.roles.get(roleId);
    Object.assign(role, updates, { updatedAt: new Date() });

    return role;
  }

  deleteRole(roleId) {
    if (roleId === 'admin' || roleId === 'user') {
      throw new Error('Cannot delete system roles');
    }

    return this.roles.delete(roleId);
  }

  /**
   * 3️⃣ PERMISSION MANAGEMENT
   */

  createPermission(permissionData) {
    const permission = {
      id: permissionData.id,
      name: permissionData.name,
      description: permissionData.description,
      category: permissionData.category,
      resource: permissionData.resource,
      action: permissionData.action,
      createdAt: new Date(),
    };

    this.permissions.set(permissionData.id, permission);
    return permission;
  }

  grantPermissionToRole(roleId, permissionId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const role = this.roles.get(roleId);

    if (!role.permissions.includes(permissionId)) {
      role.permissions.push(permissionId);
    }

    return role;
  }

  revokePermissionFromRole(roleId, permissionId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const role = this.roles.get(roleId);
    role.permissions = role.permissions.filter(p => p !== permissionId);

    return role;
  }

  /**
   * 4️⃣ CHECK PERMISSIONS
   */

  hasPermission(user, requiredPermission) {
    // Admin has all permissions
    if (user.role === 'admin') {
      return true;
    }

    const role = this.roles.get(user.role);
    if (!role) return false;

    // Check if permission exists in role
    if (role.permissions.includes('*')) return true;

    // Check direct permission
    if (role.permissions.includes(requiredPermission)) {
      return true;
    }

    // Check inherited permissions from parent role
    if (role.parentRole) {
      return this.hasPermission({ role: role.parentRole }, requiredPermission);
    }

    return false;
  }

  hasAllPermissions(user, requiredPermissions) {
    return requiredPermissions.every(perm => this.hasPermission(user, perm));
  }

  hasAnyPermission(user, requiredPermissions) {
    return requiredPermissions.some(perm => this.hasPermission(user, perm));
  }

  /**
   * 5️⃣ RESOURCE-LEVEL ACCESS CONTROL
   */

  canAccessResource(user, resource, action) {
    // Admin can access everything
    if (user.role === 'admin') return true;

    const role = this.roles.get(user.role);
    if (!role) return false;

    const requiredPermission = `${resource}:${action}`;

    // Check exact permission
    if (role.permissions.includes(requiredPermission)) return true;

    // Check resource:* (all actions)
    if (role.permissions.includes(`${resource}:*`)) return true;

    // Check *:action (all resources)
    if (role.permissions.includes(`*:${action}`)) return true;

    // Check owner access for personal resources
    if (action === 'read' && resource === 'profile') {
      if (user.id === resource.ownerId) return true;
    }

    return false;
  }

  /**
   * 6️⃣ AUDIT LOGGING
   */

  logAccessAttempt(user, resource, action, allowed) {
    const logEntry = {
      timestamp: new Date(),
      userId: user.id,
      userRole: user.role,
      resource: resource,
      action: action,
      allowed: allowed,
      ipAddress: user.ipAddress,
      userAgent: user.userAgent,
    };

    this.auditLog.push(logEntry);

    // Alert on failed attempts
    if (!allowed) {
      console.warn(`🚨 Access denied: ${user.id} tried to ${action} ${resource}`);
      // Could send alert/notification
    }

    return logEntry;
  }

  getAuditLog(filters = {}) {
    let logs = this.auditLog;

    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }

    if (filters.allowed !== undefined) {
      logs = logs.filter(l => l.allowed === filters.allowed);
    }

    if (filters.startDate) {
      logs = logs.filter(l => l.timestamp >= new Date(filters.startDate));
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 7️⃣ MIDDLEWARE FUNCTION
   */

  authorize(...requiredPermissions) {
    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check permissions
        const hasPermission = this.hasAnyPermission(user, requiredPermissions);

        if (!hasPermission) {
          this.logAccessAttempt(user, 'api_endpoint', 'access', false);
          return res.status(403).json({ error: 'Forbidden' });
        }

        this.logAccessAttempt(user, 'api_endpoint', 'access', true);
        next();
      } catch (error) {
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  /**
   * 8️⃣ RESOURCE-LEVEL MIDDLEWARE
   */

  requirePermission(resource, action) {
    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const canAccess = this.canAccessResource(user, resource, action);

        if (!canAccess) {
          this.logAccessAttempt(user, resource, action, false);
          return res.status(403).json({
            error: `You don't have ${action} permission for ${resource}`,
          });
        }

        this.logAccessAttempt(user, resource, action, true);
        next();
      } catch (error) {
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  /**
   * 9️⃣ FIELD-LEVEL ACCESS CONTROL
   */

  filterFieldsByPermission(user, resource, data) {
    const allowedFields = this.getVisibleFields(user, resource);

    if (!allowedFields) return data;

    const filtered = {};
    allowedFields.forEach(field => {
      if (field in data) {
        filtered[field] = data[field];
      }
    });

    return filtered;
  }

  getVisibleFields(user, resource) {
    const fieldMap = {
      user: {
        admin: ['*'],
        manager: ['id', 'name', 'email', 'role', 'status', 'createdAt'],
        user: ['id', 'name', 'email'],
        guest: ['id', 'name'],
      },
      order: {
        admin: ['*'],
        manager: ['*'],
        user: ['id', 'items', 'total', 'status', 'createdAt'],
        guest: [],
      },
    };

    const fields = fieldMap[resource]?.[user.role] || [];
    return fields.includes('*') ? null : fields;
  }

  /**
   * 🔟 DATA MASKING FOR LOWER ROLES
   */

  maskSensitiveData(user, resource, data) {
    if (user.role === 'admin') return data;

    const masked = { ...data };

    // Mask SSN, bank account, etc.
    if (resource === 'user') {
      if (masked.ssn) {
        masked.ssn = '***-**-' + masked.ssn.slice(-4);
      }
      if (masked.bankAccount) {
        masked.bankAccount = '****' + masked.bankAccount.slice(-4);
      }
      if (masked.creditCard) {
        masked.creditCard = '****-****-****-' + masked.creditCard.slice(-4);
      }
    }

    return masked;
  }

  /**
   * 1️⃣1️⃣ PERMISSION MATRIX REPORT
   */

  generatePermissionMatrix() {
    const matrix = {};

    this.roles.forEach((role, roleId) => {
      matrix[roleId] = {
        name: role.name,
        level: role.level,
        permissions: role.permissions,
        permissionCount: role.permissions.length,
      };
    });

    return matrix;
  }

  /**
   * 1️⃣2️⃣ ROLE HIERARCHY VISUALIZATION
   */

  getRoleHierarchy() {
    const hierarchy = [];

    const addRole = (roleId, level = 0) => {
      const role = this.roles.get(roleId);
      if (!role) return;

      hierarchy.push({
        id: roleId,
        name: role.name,
        level: level,
        children: Array.from(this.roles.values())
          .filter(r => r.parentRole === roleId)
          .map(r => r.id),
      });

      role.children?.forEach(childId => addRole(childId, level + 1));
    };

    // Start with top-level roles
    this.roles.forEach((role, roleId) => {
      if (!role.parentRole) {
        addRole(roleId);
      }
    });

    return hierarchy;
  }

  /**
   * 1️⃣3️⃣ BULK PERMISSION ASSIGNMENT
   */

  assignPermissionsByTemplate(userId, template) {
    const templates = {
      content_manager: ['posts:create', 'posts:edit', 'posts:delete', 'media:upload'],
      sales_rep: ['orders:read', 'orders:update', 'customers:read', 'customers:create'],
      analyst: ['reports:read', 'analytics:read', 'data:export'],
    };

    return templates[template] || [];
  }

  /**
   * 1️⃣4️⃣ PERMISSION STATISTICS
   */

  getPermissionStats() {
    return {
      totalRoles: this.roles.size,
      totalPermissions: this.permissions.size,
      auditLogEntries: this.auditLog.length,
      deniedAccess: this.auditLog.filter(l => !l.allowed).length,
      denialRate:
        ((this.auditLog.filter(l => !l.allowed).length / this.auditLog.length) * 100).toFixed(2) +
        '%',
    };
  }
}

module.exports = new RBACService();
