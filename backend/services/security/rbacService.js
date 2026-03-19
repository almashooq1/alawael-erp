/* eslint-disable no-unused-vars */
/**
 * RBAC Service - Role-Based Access Control
 * Manages roles, permissions, and access control
 */

const crypto = require('crypto');

class RBACService {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map(); // userId -> [roleIds]
    this.rolePermissions = new Map(); // roleId -> [permissionIds]
    this._initializeDefaultRoles();
  }

  /**
   * Create role
   * @param {Object} roleData - Role data
   * @returns {Object} Created role
   */
  createRole(roleData) {
    const roleId = crypto.randomUUID();
    const role = {
      id: roleId,
      name: roleData.name,
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystem: roleData.isSystem || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.roles.set(roleId, role);
    this.rolePermissions.set(roleId, roleData.permissions || []);

    return role;
  }

  /**
   * Get role by ID
   * @param {string} roleId - Role ID
   * @returns {Object} Role
   */
  getRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    return role;
  }

  /**
   * List all roles
   * @returns {Array} List of roles
   */
  listRoles() {
    return Array.from(this.roles.values());
  }

  /**
   * Update role
   * @param {string} roleId - Role ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated role
   */
  updateRole(roleId, updates) {
    const role = this.getRole(roleId);
    Object.assign(role, updates, { updated_at: new Date() });
    return role;
  }

  /**
   * Delete role
   * @param {string} roleId - Role ID
   * @returns {boolean} Success
   */
  deleteRole(roleId) {
    return this.roles.delete(roleId);
  }

  /**
   * Create permission
   * @param {Object} permissionData - Permission data
   * @returns {Object} Created permission
   */
  createPermission(permissionData) {
    const permissionId = crypto.randomUUID();
    const permission = {
      id: permissionId,
      key: permissionData.key,
      name: permissionData.name,
      description: permissionData.description || '',
      category: permissionData.category || 'general',
      created_at: new Date(),
    };

    this.permissions.set(permissionId, permission);
    return permission;
  }

  /**
   * Assign role to user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   * @returns {Object} Assignment result
   */
  assignRoleToUser(userId, roleId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    const userRolesList = this.userRoles.get(userId);
    if (!userRolesList.includes(roleId)) {
      userRolesList.push(roleId);
    }

    return {
      userId,
      roleId,
      assigned: true,
    };
  }

  /**
   * Revoke role from user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   * @returns {Object} Revocation result
   */
  revokeRoleFromUser(userId, roleId) {
    const userRolesList = this.userRoles.get(userId);
    if (!userRolesList) return { success: false };

    const index = userRolesList.indexOf(roleId);
    if (index > -1) {
      userRolesList.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  }

  /**
   * Get user roles
   * @param {string} userId - User ID
   * @returns {Array} User roles
   */
  getUserRoles(userId) {
    const roleIds = this.userRoles.get(userId) || [];
    return roleIds.map(roleId => this.roles.get(roleId)).filter(Boolean);
  }

  /**
   * Get user permissions
   * @param {string} userId - User ID
   * @returns {Array} User permissions
   */
  getUserPermissions(userId) {
    const roleIds = this.userRoles.get(userId) || [];
    const permissionIds = new Set();

    roleIds.forEach(roleId => {
      const perms = this.rolePermissions.get(roleId) || [];
      perms.forEach(p => permissionIds.add(p));
    });

    return Array.from(permissionIds)
      .map(pId => this.permissions.get(pId))
      .filter(Boolean);
  }

  /**
   * Check if user has permission
   * @param {string} userId - User ID
   * @param {string} permissionKey - Permission key
   * @returns {boolean} Has permission
   */
  hasPermission(userId, permissionKey) {
    const userPermissions = this.getUserPermissions(userId);
    return userPermissions.some(p => p.key === permissionKey);
  }

  /**
   * Check if user has any of permissions
   * @param {string} userId - User ID
   * @param {Array} permissionKeys - Permission keys
   * @returns {boolean} Has any permission
   */
  hasAnyPermission(userId, permissionKeys) {
    return permissionKeys.some(key => this.hasPermission(userId, key));
  }

  /**
   * Check if user has all permissions
   * @param {string} userId - User ID
   * @param {Array} permissionKeys - Permission keys
   * @returns {boolean} Has all permissions
   */
  hasAllPermissions(userId, permissionKeys) {
    return permissionKeys.every(key => this.hasPermission(userId, key));
  }

  /**
   * Add permission to role
   * @param {string} roleId - Role ID
   * @param {string} permissionId - Permission ID
   * @returns {boolean} Success
   */
  addPermissionToRole(roleId, permissionId) {
    const perms = this.rolePermissions.get(roleId);
    if (!perms) return false;

    if (!perms.includes(permissionId)) {
      perms.push(permissionId);
    }
    return true;
  }

  /**
   * Remove permission from role
   * @param {string} roleId - Role ID
   * @param {string} permissionId - Permission ID
   * @returns {boolean} Success
   */
  removePermissionFromRole(roleId, permissionId) {
    const perms = this.rolePermissions.get(roleId);
    if (!perms) return false;

    const index = perms.indexOf(permissionId);
    if (index > -1) {
      perms.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get role permissions
   * @param {string} roleId - Role ID
   * @returns {Array} Role permissions
   */
  getRolePermissions(roleId) {
    const permIds = this.rolePermissions.get(roleId) || [];
    return permIds.map(pId => this.permissions.get(pId)).filter(Boolean);
  }

  /**
   * Check resource access (ABAC)
   * @param {string} userId - User ID
   * @param {string} action - Action (read, write, delete)
   * @param {Object} resource - Resource object
   * @returns {boolean} Has access
   */
  checkResourceAccess(userId, action, resource) {
    const userRoles = this.getUserRoles(userId);
    const requiredPermission = `${resource.type}:${action}`;

    // Check if user has permission via roles
    for (const role of userRoles) {
      const rolePerms = this.getRolePermissions(role.id);
      if (rolePerms.some(p => p.key === requiredPermission)) {
        // Check resource-level access
        if (resource.owner === userId || resource.isPublic) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Initialize default roles
   * @private
   */
  _initializeDefaultRoles() {
    const adminRole = this.createRole({
      name: 'Administrator',
      description: 'Full system access',
      isSystem: true,
      permissions: ['*'], // All permissions
    });

    const managerRole = this.createRole({
      name: 'Manager',
      description: 'Management access',
      isSystem: true,
      permissions: ['read', 'create', 'update', 'approve'],
    });

    const employeeRole = this.createRole({
      name: 'Employee',
      description: 'Regular employee access',
      isSystem: true,
      permissions: ['read:own', 'create:own'],
    });

    const viewerRole = this.createRole({
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: ['read'],
    });
  }
}

module.exports = new RBACService();
