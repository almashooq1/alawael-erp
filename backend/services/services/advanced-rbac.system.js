/**
 * ═══════════════════════════════════════════════════════════════
 * 🔐 Advanced RBAC System - نظام التحكم المتقدم بالوصول
 * ═══════════════════════════════════════════════════════════════
 * 
 * المميزات:
 * ✅ إدارة الأدوار الهرمية المتقدمة
 * ✅ نظام الأذونات الديناميكي
 * ✅ التحكم القائم على الخصائص (ABAC)
 * ✅ إدارة المدة الزمنية للأدوار
 * ✅ نظام التدقيق الشامل
 * ✅ التخزين المؤقت الذكي
 * ✅ نظام الكشف عن الشذوذ
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class AdvancedRBACSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Core Storage
    this.roles = new Map();
    this.permissions = new Map();
    this.resourceDefinitions = new Map();
    this.userRoles = new Map();
    this.userAttributes = new Map();
    
    // Advanced Features
    this.roleHierarchy = new Map();
    this.roleInheritance = new Map();
    this.temporalRoles = new Map();
    this.scopedAccess = new Map();
    this.customRules = new Map();
    this.permissionCache = new Map();
    this.auditLog = [];
    this.anomalyDetection = new Map();
    
    // Performance & Security
    this.accessHistory = new Map();
    this.deniedAccessAttempts = [];
    this.config = {
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 3600000, // 1 hour
      enableAudit: config.enableAudit !== false,
      enableAnomaly: config.enableAnomaly !== false,
      maxAuditEntries: config.maxAuditEntries || 50000,
      anomalyThreshold: config.anomalyThreshold || 5, // عدد المحاولات المشبوهة
      ...config
    };

    this._initializeDefaults();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 1️⃣ ROLES MANAGEMENT - إدارة الأدوار
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء دور جديد مع تكوينات متقدمة
   */
  createRole(roleId, config = {}) {
    if (this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} already exists`);
    }

    const role = {
      id: roleId,
      name: config.name || roleId,
      description: config.description || '',
      
      // Permissions
      permissions: new Set(config.permissions || []),
      
      // Hierarchy
      parentRole: config.parentRole || null,
      childRoles: new Set(config.childRoles || []),
      level: config.level || 0,
      
      // Status
      isActive: config.isActive !== false,
      isSystem: config.isSystem || false,
      
      // Scope Management
      scope: config.scope || 'global', // global, department, team
      scopeData: config.scopeData || {},
      
      // Temporal Settings
      expiresAt: config.expiresAt || null,
      maxUsers: config.maxUsers || null,
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: config.createdBy || 'system',
      metadata: config.metadata || {},
    };

    this.roles.set(roleId, role);

    // Setup hierarchy
    if (roleId.parentRole) {
      this._setupRoleHierarchy(roleId, roleId.parentRole);
    }

    this._logAuditEvent('ROLE_CREATED', { roleId, config });
    this.emit('roleCreated', role);

    return role;
  }

  /**
   * تحديث دور موجود
   */
  updateRole(roleId, updates) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);

    if (role.isSystem && !updates.allowSystemModification) {
      throw new Error('Cannot modify system roles without explicit permission');
    }

    const oldRole = { ...role };
    Object.assign(role, updates, { updatedAt: new Date() });

    this._clearRoleCache(roleId);
    this._logAuditEvent('ROLE_UPDATED', { roleId, oldRole, newRole: role });
    this.emit('roleUpdated', role);

    return role;
  }

  /**
   * حذف دور
   */
  deleteRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (role.isSystem) throw new Error('Cannot delete system roles');

    const userCount = Array.from(this.userRoles.values())
      .flat()
      .filter(ur => ur.roleId === roleId).length;

    if (userCount > 0) {
      throw new Error(`Cannot delete role with ${userCount} active assignments`);
    }

    this.roles.delete(roleId);
    this.roleHierarchy.delete(roleId);
    
    this._logAuditEvent('ROLE_DELETED', { roleId });
    this.emit('roleDeleted', roleId);
  }

  /**
   * الحصول على دور محدد
   */
  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  /**
   * الحصول على جميع الأدوار
   */
  getAllRoles() {
    return Array.from(this.roles.values());
  }

  /**
   * تحديث دور موجود
   */
  updateRole(roleId, updates = {}) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);

    if (updates.name) role.name = updates.name;
    if (updates.description) role.description = updates.description;
    if (updates.level !== undefined) role.level = updates.level;
    if (updates.isActive !== undefined) role.isActive = updates.isActive;

    role.updatedAt = new Date();

    this._clearRoleCache(roleId);
    this._logAuditEvent('ROLE_UPDATED', { roleId, updates });
    this.emit('roleUpdated', { roleId, updates });

    return role;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PERMISSIONS MANAGEMENT - إدارة الأذونات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء إذن جديد
   */
  createPermission(permId, config = {}) {
    if (this.permissions.has(permId)) {
      throw new Error(`Permission ${permId} already exists`);
    }

    const permission = {
      id: permId,
      name: config.name || permId,
      description: config.description || '',
      
      // Resource & Action
      resource: config.resource || '',
      action: config.action || '', // create, read, update, delete, execute
      
      // Conditions
      conditions: config.conditions || {}, // ABAC conditions
      
      // Scope
      scope: config.scope || 'global',
      
      // Risk Level
      riskLevel: config.riskLevel || 'low', // low, medium, high, critical
      
      // Status
      isActive: config.isActive !== false,
      isDeprecated: config.isDeprecated || false,
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: config.metadata || {}
    };

    this.permissions.set(permId, permission);
    this._logAuditEvent('PERMISSION_CREATED', { permId, config });
    this.emit('permissionCreated', permission);

    return permission;
  }

  /**
   * الحصول على جميع الأذونات
   */
  getAllPermissions() {
    return Array.from(this.permissions.values());
  }

  /**
   * الحصول على إذن محدد
   */
  getPermission(permissionId) {
    return this.permissions.get(permissionId) || null;
  }

  /**
   * الحصول على جميع المستخدمين
   */
  getAllUsers() {
    return Array.from(this.userRoles.keys());
  }

  /**
   * إضافة إذن إلى دور
   */
  assignPermissionToRole(roleId, permissionId, metadata = {}) {
    const role = this.roles.get(roleId);
    const permission = this.permissions.get(permissionId);

    if (!role) throw new Error(`Role ${roleId} not found`);
    if (!permission) throw new Error(`Permission ${permissionId} not found`);

    role.permissions.add(permissionId);
    this._clearRoleCache(roleId);

    this._logAuditEvent('PERMISSION_ASSIGNED', {
      roleId,
      permissionId,
      metadata
    });

    this.emit('permissionAssigned', { roleId, permissionId });
    return role;
  }

  /**
   * إزالة إذن من دور
   */
  removePermissionFromRole(roleId, permissionId) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);

    role.permissions.delete(permissionId);
    this._clearRoleCache(roleId);

    this._logAuditEvent('PERMISSION_REMOVED', { roleId, permissionId });
    this.emit('permissionRemoved', { roleId, permissionId });

    return role;
  }

  /**
   * الحصول على جميع الأذونات للدور (مع الوراثة)
   */
  getRolePermissions(roleId, includeInherited = true) {
    const cacheKey = `role_perms_${roleId}_${includeInherited}`;
    if (this.config.enableCache && this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey);
    }

    const role = this.roles.get(roleId);
    if (!role) return [];

    const permissions = new Set(role.permissions);

    if (includeInherited && role.parentRole) {
      const parentPerms = this.getRolePermissions(role.parentRole, true);
      if (parentPerms) {
        parentPerms.forEach(p => permissions.add(p));
      }
    }

    const permissionsArray = Array.from(permissions);
    
    if (this.config.enableCache) {
      this.permissionCache.set(cacheKey, permissionsArray);
      setTimeout(() => this.permissionCache.delete(cacheKey), this.config.cacheTTL);
    }

    return permissionsArray;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 3️⃣ USER-ROLE ASSIGNMENT - تعيين الأدوار للمستخدمين
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تعيين دور للمستخدم مع دعم الشروط المتقدمة
   */
  assignRoleToUser(userId, roleId, assignmentConfig = {}) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);

    // التحقق من حدود المستخدمين
    if (role.maxUsers) {
      const currentCount = (this.userRoles.get(roleId) || []).length;
      if (currentCount >= role.maxUsers) {
        throw new Error(`Role ${roleId} has reached maximum user limit`);
      }
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    const assignment = {
      roleId,
      assignedAt: new Date(),
      assignedBy: assignmentConfig.assignedBy || 'system',
      
      // Temporal
      expiresAt: assignmentConfig.expiresAt || null,
      
      // Scope
      scope: assignmentConfig.scope || role.scope || 'global',
      scopeData: assignmentConfig.scopeData || {},
      
      // Conditions
      conditions: assignmentConfig.conditions || {},
      
      // Status
      isActive: assignmentConfig.isActive !== false,
      
      // Metadata
      metadata: assignmentConfig.metadata || {}
    };

    // التحقق من الشروط
    if (!this._validateAssignmentConditions(userId, assignment)) {
      throw new Error('Assignment conditions not met');
    }

    this.userRoles.get(userId).push(assignment);
    this._logAuditEvent('ROLE_ASSIGNED', { userId, roleId, assignment });
    this.emit('roleAssigned', { userId, roleId, assignment });

    return assignment;
  }

  /**
   * إزالة دور من المستخدم
   */
  removeRoleFromUser(userId, roleId) {
    const userRoles = this.userRoles.get(userId) || [];
    const initialLength = userRoles.length;

    this.userRoles.set(
      userId,
      userRoles.filter(r => r.roleId !== roleId)
    );

    const removed = initialLength !== userRoles.length;

    if (removed) {
      this._clearUserCache(userId);
      this._logAuditEvent('ROLE_REMOVED', { userId, roleId });
      this.emit('roleRemoved', { userId, roleId });
    }

    return removed;
  }

  /**
   * الحصول على أدوار المستخدم (مع تصفية الأدوار المنتهية الصلاحية)
   */
  getUserRoles(userId) {
    const assignments = this.userRoles.get(userId) || [];
    const now = new Date();

    return assignments
      .filter(assignment => {
        // تصفية الأدوار المنتهية الصلاحية
        if (assignment.expiresAt && assignment.expiresAt < now) {
          this.removeRoleFromUser(userId, assignment.roleId);
          return false;
        }

        // تصفية الأدوار غير النشطة
        if (!assignment.isActive) return false;

        return true;
      })
      .map(assignment => ({
        ...assignment,
        ...this.roles.get(assignment.roleId)
      }));
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 4️⃣ PERMISSION CHECKING - التحقق من الأذونات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من وجود إذن للمستخدم مع دعم ABAC
   */
  hasPermission(userId, permissionId, context = {}) {
    const cacheKey = this._generateCacheKey(userId, permissionId, context);
    
    if (this.config.enableCache && this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey);
    }

    const userAssignments = this.getUserRoles(userId);
    let hasAccess = false;

    for (const assignment of userAssignments) {
      const role = this.roles.get(assignment.roleId);
      if (!role || !role.isActive) continue;

      const permissions = this.getRolePermissions(assignment.roleId, true);

      if (permissions.includes(permissionId)) {
        // فحص الشروط والقيود
        if (this._evaluateConditions(assignment, context)) {
          hasAccess = true;
          break;
        }
      }
    }

    // فحص القواعد المخصصة
    if (!hasAccess) {
      hasAccess = this._evaluateCustomRules(userId, permissionId, context);
    }

    const result = { userId, permissionId, hasAccess, context, timestamp: new Date() };

    // Anomaly Detection
    if (!hasAccess) {
      this._detectAnomalies(userId, result);
    }

    if (this.config.enableCache) {
      this.permissionCache.set(cacheKey, hasAccess);
      setTimeout(() => this.permissionCache.delete(cacheKey), this.config.cacheTTL);
    }

    this._recordAccessAttempt(userId, result);
    return hasAccess;
  }

  /**
   * التحقق من وجود جميع الأذونات
   */
  hasAllPermissions(userId, permissionIds, context = {}) {
    return permissionIds.every(permId => 
      this.hasPermission(userId, permId, context)
    );
  }

  /**
   * التحقق من وجود أي من الأذونات
   */
  hasAnyPermission(userId, permissionIds, context = {}) {
    return permissionIds.some(permId =>
      this.hasPermission(userId, permId, context)
    );
  }

  /**
   * الحصول على جميع الأذونات الفعلية للمستخدم
   */
  getUserEffectivePermissions(userId, context = {}) {
    const userRoles = this.getUserRoles(userId);
    const effectivePermissions = new Set();

    for (const assignment of userRoles) {
      const permissions = this.getRolePermissions(assignment.roleId, true);
      
      for (const permId of permissions) {
        // تطبيق الشروط
        if (this._evaluateConditions(assignment, context)) {
          effectivePermissions.add(permId);
        }
      }
    }

    return Array.from(effectivePermissions);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 5️⃣ ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تعيين خصائص المستخدم
   */
  setUserAttributes(userId, attributes) {
    this.userAttributes.set(userId, {
      ...this.userAttributes.get(userId),
      ...attributes,
      updatedAt: new Date()
    });

    this._clearUserCache(userId);
    this._logAuditEvent('USER_ATTRIBUTES_UPDATED', { userId, attributes });
  }

  /**
   * الحصول على خصائص المستخدم
   */
  getUserAttributes(userId) {
    return this.userAttributes.get(userId) || {};
  }

  /**
   * تقييم الشروط بناءً على الخصائص
   */
  _evaluateConditions(assignment, context = {}) {
    const conditions = assignment.conditions || {};
    const userAttrs = this.getUserAttributes(context.userId || '');

    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key] || userAttrs[key];

      if (!this._matchConditionValue(actualValue, expectedValue)) {
        return false;
      }
    }

    return true;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 6️⃣ SCOPED ACCESS - الوصول المحدد النطاق
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * حساب نطاق الوصول للمستخدم
   */
  calculateUserScope(userId) {
    const userRoles = this.getUserRoles(userId);
    const scope = {
      global: false,
      departments: new Set(),
      teams: new Set(),
      resources: new Set(),
      custom: {}
    };

    for (const assignment of userRoles) {
      if (assignment.scope === 'global') {
        scope.global = true;
      } else if (assignment.scope === 'department' && assignment.scopeData?.departmentId) {
        scope.departments.add(assignment.scopeData.departmentId);
      } else if (assignment.scope === 'team' && assignment.scopeData?.teamId) {
        scope.teams.add(assignment.scopeData.teamId);
      }

      // Custom scope data
      if (assignment.scopeData?.custom) {
        Object.assign(scope.custom, assignment.scopeData.custom);
      }
    }

    return scope;
  }

  /**
   * التحقق من وصول المستخدم إلى مورد محدد
   */
  canAccessResource(userId, resourceId, context = {}) {
    const scope = this.calculateUserScope(userId);

    if (scope.global) return true;

    // التحقق من النطاقات المحددة
    if (context.departmentId && scope.departments.has(context.departmentId)) {
      return true;
    }

    if (context.teamId && scope.teams.has(context.teamId)) {
      return true;
    }

    if (scope.resources.has(resourceId)) {
      return true;
    }

    return false;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 7️⃣ AUDIT & LOGGING - التدقيق والتسجيل
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تسجيل حدث تدقيق
   */
  _logAuditEvent(eventType, data) {
    if (!this.config.enableAudit) return;

    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType,
      data,
      severity: this._calculateEventSeverity(eventType)
    };

    this.auditLog.push(auditEntry);

    // الحفاظ على حد أقصى للسجلات
    if (this.auditLog.length > this.config.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditEntries);
    }

    this.emit('auditEvent', auditEntry);
  }

  /**
   * الحصول على سجل التدقيق مع التصفية
   */
  getAuditLog(filters = {}) {
    let results = this.auditLog;

    if (filters.eventType) {
      results = results.filter(e => e.eventType === filters.eventType);
    }

    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate);
    }

    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }

    if (filters.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 8️⃣ ANOMALY DETECTION - كشف الشذوذ
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * كشف السلوك غير الطبيعي
   */
  _detectAnomalies(userId, accessResult) {
    if (!this.config.enableAnomaly) return;

    if (!this.anomalyDetection.has(userId)) {
      this.anomalyDetection.set(userId, {
        deniedCount: 0,
        lastCheck: new Date(),
        patterns: []
      });
    }

    const userAnomaly = this.anomalyDetection.get(userId);
    userAnomaly.deniedCount++;
    userAnomaly.lastCheck = new Date();

    // تنبيهات
    if (userAnomaly.deniedCount >= this.config.anomalyThreshold) {
      this._logAuditEvent('ANOMALY_DETECTED', {
        userId,
        deniedCount: userAnomaly.deniedCount,
        accessResult
      });

      this.emit('anomalyDetected', {
        userId,
        reason: 'Multiple denied access attempts',
        count: userAnomaly.deniedCount
      });

      // إعادة تعيين العداد بعد بعض الوقت
      setTimeout(() => {
        const anomaly = this.anomalyDetection.get(userId);
        if (anomaly) anomaly.deniedCount = 0;
      }, 3600000); // ساعة واحدة
    }
  }

  /**
   * الحصول على تقرير الشذوذ
   */
  getAnomalyReport() {
    const report = [];

    for (const [userId, anomaly] of this.anomalyDetection.entries()) {
      if (anomaly.deniedCount > 0) {
        report.push({
          userId,
          deniedCount: anomaly.deniedCount,
          lastCheck: anomaly.lastCheck,
          riskLevel: anomaly.deniedCount > this.config.anomalyThreshold ? 'high' : 'medium'
        });
      }
    }

    return report.sort((a, b) => b.deniedCount - a.deniedCount);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 9️⃣ UTILITY METHODS - الطرق المساعدة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء مفتاح الذاكرة المؤقتة
   */
  _generateCacheKey(userId, permissionId, context) {
    const contextStr = JSON.stringify(context);
    return `${userId}:${permissionId}:${contextStr}`;
  }

  /**
   * مسح ذاكرة المستخدم
   */
  _clearUserCache(userId) {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(userId));

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  /**
   * مسح ذاكرة الدور
   */
  _clearRoleCache(roleId) {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.includes(`role_perms_${roleId}`));

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  /**
   * حساب شدة الحدث
   */
  _calculateEventSeverity(eventType) {
    const severityMap = {
      ROLE_CREATED: 'medium',
      ROLE_DELETED: 'high',
      PERMISSION_ASSIGNED: 'low',
      PERMISSION_REMOVED: 'medium',
      ROLE_ASSIGNED: 'low',
      ROLE_REMOVED: 'medium',
      ANOMALY_DETECTED: 'high'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * إعداد هرمية الأدوار
   */
  _setupRoleHierarchy(childRoleId, parentRoleId) {
    this.roleHierarchy.set(childRoleId, parentRoleId);
    const parent = this.roles.get(parentRoleId);
    if (parent) {
      parent.childRoles.add(childRoleId);
    }
  }

  /**
   * تقييم القواعد المخصصة
   */
  _evaluateCustomRules(userId, permissionId, context) {
    const rules = this.customRules.get(`${userId}:${permissionId}`) || [];
    return rules.some(rule => rule.eval(context));
  }

  /**
   * التحقق من شروط التعيين
   */
  _validateAssignmentConditions(userId, assignment) {
    const role = this.roles.get(assignment.roleId);
    return role && role.isActive;
  }

  /**
   * مطابقة قيمة الشرط
   */
  _matchConditionValue(actual, expected) {
    if (typeof expected === 'function') {
      return expected(actual);
    }
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  }

  /**
   * تسجيل محاولة الوصول
   */
  _recordAccessAttempt(userId, result) {
    if (!this.accessHistory.has(userId)) {
      this.accessHistory.set(userId, []);
    }

    this.accessHistory.get(userId).push(result);

    // الحفاظ على آخر 1000 محاولة فقط
    const history = this.accessHistory.get(userId);
    if (history.length > 1000) {
      this.accessHistory.set(userId, history.slice(-1000));
    }
  }

  /**
   * الحصول على سجل الوصول للمستخدم
   */
  getUserAccessHistory(userId, limit = 100) {
    const history = this.accessHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * INITIALIZATION - التهيئة
   * ═══════════════════════════════════════════════════════════════
   */

  _initializeDefaults() {
    // إنشاء الأدوار الافتراضية
    this.createRole('super-admin', {
      name: 'Super Administrator',
      description: 'Full system access with all permissions',
      level: 1000,
      isSystem: true,
      scope: 'global'
    });

    this.createRole('admin', {
      name: 'Administrator',
      description: 'System administrator with management rights',
      level: 800,
      isSystem: true,
      parentRole: 'super-admin',
      scope: 'global'
    });

    this.createRole('manager', {
      name: 'Manager',
      description: 'Department manager with limited administrative rights',
      level: 600,
      isSystem: true,
      parentRole: 'admin',
      scope: 'department'
    });

    this.createRole('user', {
      name: 'User',
      description: 'Standard user with basic permissions',
      level: 200,
      isSystem: true,
      parentRole: 'manager',
      scope: 'global'
    });

    this.createRole('guest', {
      name: 'Guest',
      description: 'Guest user with minimal read-only access',
      level: 100,
      isSystem: true,
      parentRole: 'user',
      scope: 'global'
    });
  }

  /**
   * الحصول على إحصائيات النظام
   */
  getSystemStats() {
    return {
      totalRoles: this.roles.size,
      totalPermissions: this.permissions.size,
      totalUsers: this.userRoles.size,
      auditLogEntries: this.auditLog.length,
      cacheSize: this.permissionCache.size,
      anomaliesDetected: this.anomalyDetection.size
    };
  }

  /**
   * تصدير البيانات للنسخ الاحتياطي
   */
  exportData() {
    return {
      roles: Array.from(this.roles.entries()),
      permissions: Array.from(this.permissions.entries()),
      userRoles: Array.from(this.userRoles.entries()),
      userAttributes: Array.from(this.userAttributes.entries()),
      auditLog: this.auditLog.slice(-1000) // آخر 1000 حدث
    };
  }

  /**
   * استيراد البيانات من النسخة الاحتياطية
   */
  importData(data) {
    if (data.roles) {
      this.roles = new Map(data.roles);
    }
    if (data.permissions) {
      this.permissions = new Map(data.permissions);
    }
    if (data.userRoles) {
      this.userRoles = new Map(data.userRoles);
    }
    if (data.userAttributes) {
      this.userAttributes = new Map(data.userAttributes);
    }

    this._logAuditEvent('DATA_IMPORTED', { timestamp: new Date() });
  }
}

module.exports = AdvancedRBACSystem;
