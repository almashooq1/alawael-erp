/**
 * RBAC Manager Service
 * خدمة مدير التحكم بالوصول القائم على الأدوار
 * 
 * المسؤوليات:
 * - إدارة الأدوار والأذونات
 * - تحديد العلاقات بين الأدوار والأذونات
 * - إدارة الأدوار المتوارثة
 * - تتبع الأذونات الديناميكية
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class RBACManager extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Role definitions
    this.roles = new Map();

    // Permission definitions
    this.permissions = new Map();

    // Role-permission mapping
    this.rolePermissions = new Map();

    // User-role mapping
    this.userRoles = new Map();

    // Role hierarchy
    this.roleHierarchy = new Map();

    // Initialize default roles and permissions
    this._initializeDefaults();
  }

  /**
   * Initialize default roles and permissions
   * تهيئة الأدوار والأذونات الافتراضية
   * 
   * @private
   */
  _initializeDefaults() {
    // Create default roles
    const defaultRoles = [
      {
        id: 'role-super-admin',
        name: 'Super Administrator',
        description: 'Full system access',
        level: 1000,
        isSystem: true
      },
      {
        id: 'role-admin',
        name: 'Administrator',
        description: 'System administration',
        level: 800,
        isSystem: true,
        parent: 'role-super-admin'
      },
      {
        id: 'role-manager',
        name: 'Manager',
        description: 'Department management',
        level: 600,
        isSystem: true,
        parent: 'role-admin'
      },
      {
        id: 'role-user',
        name: 'User',
        description: 'Standard user access',
        level: 200,
        isSystem: true,
        parent: 'role-manager'
      },
      {
        id: 'role-guest',
        name: 'Guest',
        description: 'Limited guest access',
        level: 100,
        isSystem: true,
        parent: 'role-user'
      }
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, {
        ...role,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0
        }
      });

      if (role.parent) {
        this.roleHierarchy.set(role.id, role.parent);
      }
    });

    // Create default permissions
    const defaultPermissions = [
      // System permissions
      { id: 'perm-system:read', name: 'System Read', category: 'system' },
      { id: 'perm-system:write', name: 'System Write', category: 'system' },
      { id: 'perm-system:delete', name: 'System Delete', category: 'system' },
      { id: 'perm-system:config', name: 'System Configuration', category: 'system' },

      // User permissions
      { id: 'perm-user:create', name: 'Create User', category: 'user' },
      { id: 'perm-user:read', name: 'Read User', category: 'user' },
      { id: 'perm-user:update', name: 'Update User', category: 'user' },
      { id: 'perm-user:delete', name: 'Delete User', category: 'user' },

      // Role permissions
      { id: 'perm-role:create', name: 'Create Role', category: 'role' },
      { id: 'perm-role:read', name: 'Read Role', category: 'role' },
      { id: 'perm-role:update', name: 'Update Role', category: 'role' },
      { id: 'perm-role:delete', name: 'Delete Role', category: 'role' },

      // Resource permissions
      { id: 'perm-resource:read', name: 'Read Resource', category: 'resource' },
      { id: 'perm-resource:write', name: 'Write Resource', category: 'resource' },
      { id: 'perm-resource:delete', name: 'Delete Resource', category: 'resource' },

      // Report permissions
      { id: 'perm-report:create', name: 'Create Report', category: 'report' },
      { id: 'perm-report:read', name: 'Read Report', category: 'report' },
      { id: 'perm-report:export', name: 'Export Report', category: 'report' }
    ];

    defaultPermissions.forEach(perm => {
      this.permissions.set(perm.id, {
        ...perm,
        isSystem: true,
        metadata: {
          createdAt: new Date(),
          usageCount: 0
        }
      });
    });

    // Assign default permissions to default roles
    this._assignDefaultPermissions();

    this.logger.info(
      `Initialized ${defaultRoles.length} roles and ${defaultPermissions.length} permissions`
    );
  }

  /**
   * Assign default permissions to roles
   * تعيين الأذونات الافتراضية للأدوار
   * 
   * @private
   */
  _assignDefaultPermissions() {
    // Super admin gets all permissions
    const allPermIds = Array.from(this.permissions.keys());
    this.rolePermissions.set('role-super-admin', new Set(allPermIds));

    // Admin gets most permissions except security
    const adminPermIds = allPermIds.filter(pid => !pid.includes('security'));
    this.rolePermissions.set('role-admin', new Set(adminPermIds));

    // Manager gets standard permissions
    const managerPermIds = allPermIds.filter(pid =>
      pid.includes('user') || pid.includes('resource') || pid.includes('report')
    );
    this.rolePermissions.set('role-manager', new Set(managerPermIds));

    // User gets read permissions
    const userPermIds = allPermIds.filter(pid => pid.includes(':read'));
    this.rolePermissions.set('role-user', new Set(userPermIds));

    // Guest gets minimal permissions
    const guestPermIds = allPermIds.filter(pid =>
      pid === 'perm-resource:read' || pid === 'perm-report:read'
    );
    this.rolePermissions.set('role-guest', new Set(guestPermIds));
  }

  /**
   * Create a new role
   * إنشاء دور جديد
   * 
   * @param {Object} roleData - Role data
   * @returns {Object} Created role
   */
  createRole(roleData) {
    try {
      const { name, description, level = 500, parent = null, metadata = {} } = roleData;

      if (!name) throw new Error('Role name is required');
      if (level < 1 || level > 1000) throw new Error('Level must be between 1-1000');

      const roleId = `role-${uuidv4()}`;

      const role = {
        id: roleId,
        name,
        description: description || '',
        level,
        parent,
        isSystem: false,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: metadata.userId,
          usageCount: 0
        }
      };

      this.roles.set(roleId, role);
      this.rolePermissions.set(roleId, new Set());

      if (parent) {
        this.roleHierarchy.set(roleId, parent);
      }

      this.emit('role:created', { roleId, role });
      this.logger.info(`Role created: ${roleId}`);

      return role;
    } catch (error) {
      this.logger.error(`Error creating role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new permission
   * إنشاء إذن جديد
   * 
   * @param {Object} permData - Permission data
   * @returns {Object} Created permission
   */
  createPermission(permData) {
    try {
      const { name, category, description = '' } = permData;

      if (!name) throw new Error('Permission name is required');
      if (!category) throw new Error('Permission category is required');

      const permId = `perm-${category}:${name.toLowerCase().replace(/\s+/g, '_')}`;

      if (this.permissions.has(permId)) {
        throw new Error(`Permission already exists: ${permId}`);
      }

      const permission = {
        id: permId,
        name,
        category,
        description,
        isSystem: false,
        metadata: {
          createdAt: new Date(),
          usageCount: 0
        }
      };

      this.permissions.set(permId, permission);
      this.emit('permission:created', { permId, permission });

      this.logger.info(`Permission created: ${permId}`);
      return permission;
    } catch (error) {
      this.logger.error(`Error creating permission: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign permission to role
   * تعيين إذن لدور
   * 
   * @param {String} roleId - Role ID
   * @param {String} permId - Permission ID
   */
  assignPermissionToRole(roleId, permId) {
    try {
      const role = this.roles.get(roleId);
      if (!role) throw new Error(`Role not found: ${roleId}`);

      if (role.isSystem) {
        throw new Error('Cannot modify system role permissions');
      }

      const perm = this.permissions.get(permId);
      if (!perm) throw new Error(`Permission not found: ${permId}`);

      if (!this.rolePermissions.has(roleId)) {
        this.rolePermissions.set(roleId, new Set());
      }

      this.rolePermissions.get(roleId).add(permId);
      perm.metadata.usageCount++;

      this.emit('permission:assigned', { roleId, permId });
      this.logger.info(`Permission ${permId} assigned to role ${roleId}`);
    } catch (error) {
      this.logger.error(`Error assigning permission: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove permission from role
   * إزالة إذن من الدور
   * 
   * @param {String} roleId - Role ID
   * @param {String} permId - Permission ID
   */
  removePermissionFromRole(roleId, permId) {
    try {
      const role = this.roles.get(roleId);
      if (!role) throw new Error(`Role not found: ${roleId}`);

      if (role.isSystem) {
        throw new Error('Cannot modify system role permissions');
      }

      const perms = this.rolePermissions.get(roleId);
      if (perms) {
        perms.delete(permId);
      }

      this.emit('permission:removed', { roleId, permId });
      this.logger.info(`Permission ${permId} removed from role ${roleId}`);
    } catch (error) {
      this.logger.error(`Error removing permission: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign role to user
   * تعيين دور للمستخدم
   * 
   * @param {String} userId - User ID
   * @param {String} roleId - Role ID
   */
  assignRoleToUser(userId, roleId) {
    try {
      const role = this.roles.get(roleId);
      if (!role) throw new Error(`Role not found: ${roleId}`);

      if (!this.userRoles.has(userId)) {
        this.userRoles.set(userId, new Set());
      }

      this.userRoles.get(userId).add(roleId);
      role.metadata.usageCount++;

      this.emit('role:assigned', { userId, roleId });
      this.logger.info(`Role ${roleId} assigned to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error assigning role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove role from user
   * إزالة دور من المستخدم
   * 
   * @param {String} userId - User ID
   * @param {String} roleId - Role ID
   */
  removeRoleFromUser(userId, roleId) {
    try {
      const userRoles = this.userRoles.get(userId);
      if (userRoles) {
        userRoles.delete(roleId);
      }

      this.emit('role:removed', { userId, roleId });
      this.logger.info(`Role ${roleId} removed from user ${userId}`);
    } catch (error) {
      this.logger.error(`Error removing role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get effective permissions for user
   * الحصول على الأذونات الفعالة للمستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Set} Effective permissions
   */
  getEffectivePermissions(userId) {
    try {
      const userRoleIds = this.userRoles.get(userId) || new Set();
      const effectivePerms = new Set();

      // Collect permissions from all assigned roles
      userRoleIds.forEach(roleId => {
        const rolePerms = this.rolePermissions.get(roleId) || new Set();
        rolePerms.forEach(perm => effectivePerms.add(perm));

        // Include inherited permissions from parent roles
        this._collectInheritedPermissions(roleId, effectivePerms);
      });

      return effectivePerms;
    } catch (error) {
      this.logger.error(`Error getting effective permissions: ${error.message}`);
      return new Set();
    }
  }

  /**
   * Collect inherited permissions from parent roles
   * جمع الأذونات الموروثة من الأدوار الأب
   * 
   * @private
   */
  _collectInheritedPermissions(roleId, perms) {
    const parentRoleId = this.roleHierarchy.get(roleId);
    if (!parentRoleId) return;

    const parentPerms = this.rolePermissions.get(parentRoleId) || new Set();
    parentPerms.forEach(perm => perms.add(perm));

    // Recursively collect from grandparent
    this._collectInheritedPermissions(parentRoleId, perms);
  }

  /**
   * Check if user has permission
   * التحقق من وجود إذن للمستخدم
   * 
   * @param {String} userId - User ID
   * @param {String} permId - Permission ID
   * @returns {Boolean} Has permission
   */
  hasPermission(userId, permId) {
    try {
      const effectivePerms = this.getEffectivePermissions(userId);
      return effectivePerms.has(permId);
    } catch (error) {
      this.logger.error(`Error checking permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has any of multiple permissions
   * التحقق من وجود أي من الأذونات
   * 
   * @param {String} userId - User ID
   * @param {Array} permIds - Permission IDs
   * @returns {Boolean} Has any permission
   */
  hasAnyPermission(userId, permIds) {
    try {
      const effectivePerms = this.getEffectivePermissions(userId);
      return permIds.some(permId => effectivePerms.has(permId));
    } catch (error) {
      this.logger.error(`Error checking permissions: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has all permissions
   * التحقق من وجود جميع الأذونات
   * 
   * @param {String} userId - User ID
   * @param {Array} permIds - Permission IDs
   * @returns {Boolean} Has all permissions
   */
  hasAllPermissions(userId, permIds) {
    try {
      const effectivePerms = this.getEffectivePermissions(userId);
      return permIds.every(permId => effectivePerms.has(permId));
    } catch (error) {
      this.logger.error(`Error checking permissions: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all roles for user
   * الحصول على جميع أدوار المستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Array} User roles
   */
  getUserRoles(userId) {
    try {
      const roleIds = this.userRoles.get(userId) || new Set();
      return Array.from(roleIds).map(roleId => this.roles.get(roleId)).filter(r => r);
    } catch (error) {
      this.logger.error(`Error getting user roles: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all permissions for role
   * الحصول على جميع أذونات الدور
   * 
   * @param {String} roleId - Role ID
   * @returns {Array} Role permissions
   */
  getRolePermissions(roleId) {
    try {
      const permIds = this.rolePermissions.get(roleId) || new Set();
      return Array.from(permIds)
        .map(permId => this.permissions.get(permId))
        .filter(p => p);
    } catch (error) {
      this.logger.error(`Error getting role permissions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all users with a role
   * الحصول على جميع المستخدمين برتبة معينة
   * 
   * @param {String} roleId - Role ID
   * @returns {Array} User IDs
   */
  getUsersWithRole(roleId) {
    try {
      const users = [];
      this.userRoles.forEach((roles, userId) => {
        if (roles.has(roleId)) {
          users.push(userId);
        }
      });
      return users;
    } catch (error) {
      this.logger.error(`Error getting users with role: ${error.message}`);
      return [];
    }
  }

  /**
   * Get RBAC statistics
   * الحصول على إحصائيات RBAC
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    try {
      return {
        totalRoles: this.roles.size,
        totalPermissions: this.permissions.size,
        systemRoles: Array.from(this.roles.values()).filter(r => r.isSystem).length,
        customRoles: Array.from(this.roles.values()).filter(r => !r.isSystem).length,
        usersWithRoles: this.userRoles.size,
        roleAssignments: Array.from(this.userRoles.values()).reduce((sum, roles) => sum + roles.size, 0),
        averagePermissionsPerRole: this._calculateAveragePermissions()
      };
    } catch (error) {
      this.logger.error(`Error getting statistics: ${error.message}`);
      return {};
    }
  }

  /**
   * Calculate average permissions per role
   * حساب متوسط الأذونات لكل دور
   * 
   * @private
   */
  _calculateAveragePermissions() {
    let total = 0;
    this.rolePermissions.forEach(perms => {
      total += perms.size;
    });
    return this.rolePermissions.size > 0 ? (total / this.rolePermissions.size).toFixed(2) : 0;
  }
}

module.exports = new RBACManager();
