/**
 * Advanced Permission Service - خدمة إدارة الصلاحيات المتقدمة
 * Intelligent Access Control & Permission Management System
 */

const mongoose = require('mongoose');

/**
 * Permission Configuration
 */
const permissionConfig = {
  // Permission types
  types: {
    read: 'قراءة',
    write: 'كتابة',
    delete: 'حذف',
    admin: 'إدارة',
    approve: 'موافقة',
    export: 'تصدير',
  },
  
  // Access levels
  levels: {
    none: 0,
    read: 1,
    write: 2,
    delete: 3,
    admin: 4,
    super: 5,
  },
  
  // Inheritance
  inheritance: {
    enabled: true,
    maxDepth: 5,
  },
  
  // Caching
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
  },
};

/**
 * Permission Schema
 */
const PermissionSchema = new mongoose.Schema({
  // Permission identification
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, default: 'general' },
  
  // Permission details
  type: { type: String, enum: Object.keys(permissionConfig.types), default: 'read' },
  level: { type: Number, default: 1 },
  
  // Resource
  resource: {
    type: { type: String }, // module, feature, data, api
    module: String,
    action: String,
    conditions: mongoose.Schema.Types.Mixed,
  },
  
  // Hierarchy
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  
  // Metadata
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'permissions',
});

/**
 * Role Schema
 */
const RoleSchema = new mongoose.Schema({
  // Role identification
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  
  // Permissions
  permissions: [{
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    level: { type: Number, default: 1 },
    conditions: mongoose.Schema.Types.Mixed,
    grantedAt: { type: Date, default: Date.now },
    grantedBy: String,
  }],
  
  // Inheritance
  inherits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  
  // Scope
  scope: {
    type: { type: String, enum: ['global', 'tenant', 'department', 'team', 'custom'], default: 'tenant' },
    value: String,
  },
  
  // Hierarchy level
  level: { type: Number, default: 0 },
  
  // Metadata
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'roles',
});

/**
 * User Permission Schema
 */
const UserPermissionSchema = new mongoose.Schema({
  // User reference
  userId: { type: String, required: true },
  tenantId: String,
  
  // Direct permissions
  directPermissions: [{
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    level: { type: Number, default: 1 },
    conditions: mongoose.Schema.Types.Mixed,
    grantedAt: { type: Date, default: Date.now },
    grantedBy: String,
    expiresAt: Date,
  }],
  
  // Role assignments
  roles: [{
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: String,
    expiresAt: Date,
    conditions: mongoose.Schema.Types.Mixed,
  }],
  
  // Deny list (explicit denials)
  deniedPermissions: [{
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    deniedAt: { type: Date, default: Date.now },
    deniedBy: String,
    reason: String,
  }],
  
  // Computed permissions (cached)
  computedPermissions: {
    permissions: mongoose.Schema.Types.Mixed,
    computedAt: Date,
    version: Number,
  },
  
  // Metadata
  lastAccessAt: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'user_permissions',
});

// Indexes
UserPermissionSchema.index({ userId: 1, tenantId: 1 });
UserPermissionSchema.index({ 'roles.role': 1 });

/**
 * Permission Check Log Schema
 */
const PermissionCheckLogSchema = new mongoose.Schema({
  userId: String,
  permission: String,
  resource: String,
  action: String,
  result: { type: Boolean, required: true },
  conditions: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  tenantId: String,
}, {
  collection: 'permission_check_logs',
});

/**
 * Advanced Permission Service Class
 */
class AdvancedPermissionService {
  constructor() {
    this.Permission = null;
    this.Role = null;
    this.UserPermission = null;
    this.PermissionCheckLog = null;
    this.cache = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Permission = connection.model('Permission', PermissionSchema);
    this.Role = connection.model('Role', RoleSchema);
    this.UserPermission = connection.model('UserPermission', UserPermissionSchema);
    this.PermissionCheckLog = connection.model('PermissionCheckLog', PermissionCheckLogSchema);
    
    // Create default permissions and roles
    await this.createDefaultPermissions();
    await this.createDefaultRoles();
    
    console.log('✅ Advanced Permission Service initialized');
  }
  
  /**
   * Create default permissions
   */
  async createDefaultPermissions() {
    const defaultPermissions = [
      // User management
      { key: 'users.read', name: 'عرض المستخدمين', category: 'users', type: 'read', level: 1, resource: { module: 'users', action: 'read' } },
      { key: 'users.create', name: 'إنشاء مستخدم', category: 'users', type: 'write', level: 2, resource: { module: 'users', action: 'create' } },
      { key: 'users.update', name: 'تعديل مستخدم', category: 'users', type: 'write', level: 2, resource: { module: 'users', action: 'update' } },
      { key: 'users.delete', name: 'حذف مستخدم', category: 'users', type: 'delete', level: 3, resource: { module: 'users', action: 'delete' } },
      
      // Archive
      { key: 'archive.read', name: 'عرض الأرشيف', category: 'archive', type: 'read', level: 1, resource: { module: 'archive', action: 'read' } },
      { key: 'archive.upload', name: 'رفع مستندات', category: 'archive', type: 'write', level: 2, resource: { module: 'archive', action: 'upload' } },
      { key: 'archive.delete', name: 'حذف مستندات', category: 'archive', type: 'delete', level: 3, resource: { module: 'archive', action: 'delete' } },
      { key: 'archive.sign', name: 'توقيع مستندات', category: 'archive', type: 'approve', level: 2, resource: { module: 'archive', action: 'sign' } },
      
      // HR
      { key: 'hr.read', name: 'عرض الموارد البشرية', category: 'hr', type: 'read', level: 1, resource: { module: 'hr', action: 'read' } },
      { key: 'hr.manage', name: 'إدارة الموارد البشرية', category: 'hr', type: 'admin', level: 4, resource: { module: 'hr', action: 'manage' } },
      
      // Finance
      { key: 'finance.read', name: 'عرض المالية', category: 'finance', type: 'read', level: 1, resource: { module: 'finance', action: 'read' } },
      { key: 'finance.approve', name: 'موافقة مالية', category: 'finance', type: 'approve', level: 3, resource: { module: 'finance', action: 'approve' } },
      
      // Reports
      { key: 'reports.read', name: 'عرض التقارير', category: 'reports', type: 'read', level: 1, resource: { module: 'reports', action: 'read' } },
      { key: 'reports.export', name: 'تصدير التقارير', category: 'reports', type: 'export', level: 2, resource: { module: 'reports', action: 'export' } },
      
      // Admin
      { key: 'admin.full', name: 'صلاحيات كاملة', category: 'admin', type: 'admin', level: 5, resource: { module: '*', action: '*' }, isSystem: true },
    ];
    
    for (const perm of defaultPermissions) {
      const existing = await this.Permission.findOne({ key: perm.key });
      if (!existing) {
        await this.Permission.create(perm);
      }
    }
  }
  
  /**
   * Create default roles
   */
  async createDefaultRoles() {
    const defaultRoles = [
      {
        key: 'super_admin',
        name: 'مدير النظام',
        description: 'صلاحيات كاملة على النظام',
        level: 5,
        isSystem: true,
        scope: { type: 'global' },
      },
      {
        key: 'admin',
        name: 'مدير',
        description: 'صلاحيات إدارية',
        level: 4,
        isSystem: true,
        scope: { type: 'tenant' },
      },
      {
        key: 'manager',
        name: 'مدير قسم',
        description: 'صلاحيات مدير قسم',
        level: 3,
        scope: { type: 'department' },
      },
      {
        key: 'supervisor',
        name: 'مشرف',
        description: 'صلاحيات مشرف',
        level: 2,
        scope: { type: 'team' },
      },
      {
        key: 'employee',
        name: 'موظف',
        description: 'صلاحيات موظف أساسية',
        level: 1,
        scope: { type: 'tenant' },
      },
      {
        key: 'viewer',
        name: 'مشاهد',
        description: 'صلاحيات مشاهدة فقط',
        level: 0,
        scope: { type: 'tenant' },
      },
    ];
    
    for (const role of defaultRoles) {
      const existing = await this.Role.findOne({ key: role.key });
      if (!existing) {
        await this.Role.create(role);
      }
    }
  }
  
  /**
   * Check permission
   */
  async checkPermission(userId, permissionKey, context = {}) {
    const startTime = Date.now();
    
    try {
      // Get user permissions
      const userPerms = await this.getUserPermissions(userId, context.tenantId);
      
      // Check if permission exists
      const hasPermission = this.evaluatePermission(userPerms, permissionKey, context);
      
      // Log check
      await this.logPermissionCheck(userId, permissionKey, context, hasPermission);
      
      return hasPermission;
      
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  /**
   * Get user permissions (with caching)
   */
  async getUserPermissions(userId, tenantId) {
    const cacheKey = `user:${userId}:${tenantId}`;
    
    // Check cache
    if (permissionConfig.cache.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < permissionConfig.cache.ttl * 1000) {
        return cached.permissions;
      }
    }
    
    // Get from database
    const userPerm = await this.UserPermission.findOne({ userId, tenantId })
      .populate('roles.role')
      .populate('directPermissions.permission')
      .populate('deniedPermissions.permission');
    
    if (!userPerm) {
      return { permissions: {}, roles: [] };
    }
    
    // Compute effective permissions
    const effectivePermissions = await this.computeEffectivePermissions(userPerm);
    
    // Update cache
    if (permissionConfig.cache.enabled) {
      this.cache.set(cacheKey, {
        permissions: effectivePermissions,
        timestamp: Date.now(),
      });
    }
    
    return effectivePermissions;
  }
  
  /**
   * Compute effective permissions
   */
  async computeEffectivePermissions(userPerm) {
    const effective = {};
    
    // Process role permissions
    for (const roleAssignment of userPerm.roles) {
      if (roleAssignment.expiresAt && new Date() > roleAssignment.expiresAt) continue;
      
      const role = roleAssignment.role;
      if (!role || !role.isActive) continue;
      
      for (const perm of role.permissions) {
        const permKey = perm.permission?.key || perm.permission;
        if (!effective[permKey] || perm.level > effective[permKey]) {
          effective[permKey] = perm.level;
        }
      }
      
      // Process inherited roles
      if (role.inherits && role.inherits.length > 0) {
        await this.processInheritedRoles(role.inherits, effective);
      }
    }
    
    // Process direct permissions
    for (const perm of userPerm.directPermissions) {
      if (perm.expiresAt && new Date() > perm.expiresAt) continue;
      
      const permKey = perm.permission?.key || perm.permission;
      if (!effective[permKey] || perm.level > effective[permKey]) {
        effective[permKey] = perm.level;
      }
    }
    
    // Remove denied permissions
    for (const denied of userPerm.deniedPermissions) {
      const permKey = denied.permission?.key || denied.permission;
      delete effective[permKey];
    }
    
    return { permissions: effective, roles: userPerm.roles.map(r => r.role?.key) };
  }
  
  /**
   * Process inherited roles
   */
  async processInheritedRoles(roleIds, effective) {
    for (const roleId of roleIds) {
      const role = await this.Role.findById(roleId).populate('permissions.permission');
      if (!role || !role.isActive) continue;
      
      for (const perm of role.permissions) {
        const permKey = perm.permission?.key || perm.permission;
        if (!effective[permKey] || perm.level > effective[permKey]) {
          effective[permKey] = perm.level;
        }
      }
    }
  }
  
  /**
   * Evaluate permission
   */
  evaluatePermission(userPerms, permissionKey, context) {
    const { permissions } = userPerms;
    
    // Check exact permission
    if (permissions[permissionKey]) {
      return this.checkConditions(permissions[permissionKey], context);
    }
    
    // Check wildcard permissions
    const parts = permissionKey.split('.');
    for (let i = parts.length - 1; i >= 0; i--) {
      const wildcardKey = parts.slice(0, i).join('.') + '.*';
      if (permissions[wildcardKey]) {
        return true;
      }
    }
    
    // Check admin permission
    if (permissions['admin.full']) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check conditions
   */
  checkConditions(permissionLevel, context) {
    // Basic condition check
    if (context.requiredLevel && permissionLevel < context.requiredLevel) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Log permission check
   */
  async logPermissionCheck(userId, permission, context, result) {
    try {
      await this.PermissionCheckLog.create({
        userId,
        permission,
        resource: context.resource,
        action: context.action,
        result,
        conditions: context.conditions,
        ip: context.ip,
        userAgent: context.userAgent,
        tenantId: context.tenantId,
      });
    } catch (error) {
      // Silent fail for logging
    }
  }
  
  /**
   * Grant permission to user
   */
  async grantPermission(userId, permissionKey, options = {}) {
    const permission = await this.Permission.findOne({ key: permissionKey });
    if (!permission) throw new Error('Permission not found');
    
    let userPerm = await this.UserPermission.findOne({ userId, tenantId: options.tenantId });
    if (!userPerm) {
      userPerm = await this.UserPermission.create({ userId, tenantId: options.tenantId });
    }
    
    // Check if already granted
    const existing = userPerm.directPermissions.find(
      p => p.permission?.toString() === permission._id.toString()
    );
    
    if (existing) {
      existing.level = options.level || 1;
      existing.conditions = options.conditions;
      existing.expiresAt = options.expiresAt;
    } else {
      userPerm.directPermissions.push({
        permission: permission._id,
        level: options.level || 1,
        conditions: options.conditions,
        grantedBy: options.grantedBy,
        expiresAt: options.expiresAt,
      });
    }
    
    await userPerm.save();
    
    // Invalidate cache
    this.invalidateCache(userId, options.tenantId);
    
    return userPerm;
  }
  
  /**
   * Revoke permission from user
   */
  async revokePermission(userId, permissionKey, options = {}) {
    const permission = await this.Permission.findOne({ key: permissionKey });
    if (!permission) throw new Error('Permission not found');
    
    const userPerm = await this.UserPermission.findOne({ userId, tenantId: options.tenantId });
    if (!userPerm) return;
    
    userPerm.directPermissions = userPerm.directPermissions.filter(
      p => p.permission?.toString() !== permission._id.toString()
    );
    
    await userPerm.save();
    
    // Invalidate cache
    this.invalidateCache(userId, options.tenantId);
    
    return userPerm;
  }
  
  /**
   * Assign role to user
   */
  async assignRole(userId, roleKey, options = {}) {
    const role = await this.Role.findOne({ key: roleKey });
    if (!role) throw new Error('Role not found');
    
    let userPerm = await this.UserPermission.findOne({ userId, tenantId: options.tenantId });
    if (!userPerm) {
      userPerm = await this.UserPermission.create({ userId, tenantId: options.tenantId });
    }
    
    // Check if already assigned
    const existing = userPerm.roles.find(
      r => r.role?.toString() === role._id.toString()
    );
    
    if (!existing) {
      userPerm.roles.push({
        role: role._id,
        assignedBy: options.assignedBy,
        expiresAt: options.expiresAt,
        conditions: options.conditions,
      });
      
      await userPerm.save();
    }
    
    // Invalidate cache
    this.invalidateCache(userId, options.tenantId);
    
    return userPerm;
  }
  
  /**
   * Remove role from user
   */
  async removeRole(userId, roleKey, options = {}) {
    const role = await this.Role.findOne({ key: roleKey });
    if (!role) throw new Error('Role not found');
    
    const userPerm = await this.UserPermission.findOne({ userId, tenantId: options.tenantId });
    if (!userPerm) return;
    
    userPerm.roles = userPerm.roles.filter(
      r => r.role?.toString() !== role._id.toString()
    );
    
    await userPerm.save();
    
    // Invalidate cache
    this.invalidateCache(userId, options.tenantId);
    
    return userPerm;
  }
  
  /**
   * Create custom role
   */
  async createRole(roleData, options = {}) {
    const role = await this.Role.create({
      ...roleData,
      tenantId: options.tenantId,
    });
    
    return role;
  }
  
  /**
   * Add permission to role
   */
  async addPermissionToRole(roleKey, permissionKey, options = {}) {
    const role = await this.Role.findOne({ key: roleKey, tenantId: options.tenantId });
    if (!role) throw new Error('Role not found');
    
    const permission = await this.Permission.findOne({ key: permissionKey });
    if (!permission) throw new Error('Permission not found');
    
    const existing = role.permissions.find(
      p => p.permission?.toString() === permission._id.toString()
    );
    
    if (!existing) {
      role.permissions.push({
        permission: permission._id,
        level: options.level || 1,
        conditions: options.conditions,
        grantedBy: options.grantedBy,
      });
      
      await role.save();
    }
    
    return role;
  }
  
  /**
   * Get all roles
   */
  async getRoles(options = {}) {
    const filter = { isActive: true };
    if (options.tenantId) filter.tenantId = { $in: [options.tenantId, null] };
    
    return this.Role.find(filter).populate('permissions.permission');
  }
  
  /**
   * Get all permissions
   */
  async getPermissions(options = {}) {
    const filter = { isActive: true };
    
    return this.Permission.find(filter);
  }
  
  /**
   * Invalidate cache
   */
  invalidateCache(userId, tenantId) {
    const cacheKey = `user:${userId}:${tenantId}`;
    this.cache.delete(cacheKey);
  }
  
  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Get user roles
   */
  async getUserRoles(userId, tenantId) {
    const userPerm = await this.UserPermission.findOne({ userId, tenantId })
      .populate('roles.role');
    
    if (!userPerm) return [];
    
    return userPerm.roles
      .filter(r => !r.expiresAt || new Date() < r.expiresAt)
      .map(r => r.role);
  }
  
  /**
   * Check if user has role
   */
  async hasRole(userId, roleKey, tenantId) {
    const roles = await this.getUserRoles(userId, tenantId);
    return roles.some(r => r?.key === roleKey);
  }
  
  /**
   * Get permission statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [totalRoles, totalPermissions, totalAssignments] = await Promise.all([
      this.Role.countDocuments(filter),
      this.Permission.countDocuments(),
      this.UserPermission.countDocuments(filter),
    ]);
    
    return {
      totalRoles,
      totalPermissions,
      totalAssignments,
    };
  }
}

// Singleton instance
const advancedPermissionService = new AdvancedPermissionService();

module.exports = {
  AdvancedPermissionService,
  advancedPermissionService,
  permissionConfig,
};