/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📘 RBAC System Integration & Setup Guide
 * دليل التكامل والإعداد الشامل لنظام التحكم بالوصول
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * 1️⃣ INITIALIZATION - التهيئة والإعداد
 * ═══════════════════════════════════════════════════════════════
 */

// ملف الإعداد الرئيسي: backend/config/rbac-init.js

const AdvancedRBACSystem = require('../services/advanced-rbac.system');
const RBACPolicyEngine = require('../services/rbac-policy-engine');
const RBACAuditingService = require('../services/rbac-auditing.service');
const IntelligentRBACMiddleware = require('../middleware/rbac-intelligent.middleware');
const AdvancedRBACController = require('../controllers/rbac.controller.advanced');

/**
 * إنشاء نسخة مفردة (Singleton) من نظام RBAC
 */
function initializeRBACSystem(config = {}) {
  // 1. إنشاء النظام الأساسي
  const rbacSystem = new AdvancedRBACSystem({
    enableCache: true,
    cacheTTL: 3600000,
    enableAudit: true,
    enableAnomaly: true,
    maxAuditEntries: 100000,
    ...config.rbac
  });

  // 2. إنشاء محرك السياسات
  const policyEngine = new RBACPolicyEngine(rbacSystem);

  // 3. إنشاء خدمة التدقيق
  const auditingService = new RBACAuditingService({
    maxLogSize: 100000,
    retentionDays: 90,
    enableAudit: true,
    ...config.auditing
  });

  // 4. إنشاء الميدلوير الذكي
  const intelligentMiddleware = new IntelligentRBACMiddleware(
    rbacSystem,
    policyEngine,
    auditingService
  );

  // 5. إنشاء المتحكم
  const rbacController = new AdvancedRBACController(
    rbacSystem,
    policyEngine,
    auditingService,
    intelligentMiddleware
  );

  // 6. تكوين الأدوار والأذونات الافتراضية
  setupDefaultRolesAndPermissions(rbacSystem);

  // 7. تكوين السياسات الافتراضية
  setupDefaultPolicies(policyEngine);

  return {
    rbacSystem,
    policyEngine,
    auditingService,
    intelligentMiddleware,
    rbacController
  };
}

/**
 * إعداد الأدوار والأذونات الافتراضية
 */
function setupDefaultRolesAndPermissions(rbacSystem) {
  // ═══════════════════════════════════════════════════════════
  // تعريف الأذونات
  // ═══════════════════════════════════════════════════════════

  // إدارة المستخدمين
  rbacSystem.createPermission('users:create', {
    name: 'Create User',
    description: 'Create new users',
    resource: 'users',
    action: 'create',
    riskLevel: 'high'
  });

  rbacSystem.createPermission('users:read', {
    name: 'Read Users',
    description: 'View user information',
    resource: 'users',
    action: 'read',
    riskLevel: 'low'
  });

  rbacSystem.createPermission('users:update', {
    name: 'Update User',
    description: 'Modify user information',
    resource: 'users',
    action: 'update',
    riskLevel: 'medium'
  });

  rbacSystem.createPermission('users:delete', {
    name: 'Delete User',
    description: 'Remove users from system',
    resource: 'users',
    action: 'delete',
    riskLevel: 'critical'
  });

  // إدارة الأدوار
  rbacSystem.createPermission('roles:manage', {
    name: 'Manage Roles',
    description: 'Create, update, delete roles',
    resource: 'roles',
    action: 'manage',
    riskLevel: 'critical'
  });

  // الأذونات
  rbacSystem.createPermission('permissions:manage', {
    name: 'Manage Permissions',
    description: 'Create and assign permissions',
    resource: 'permissions',
    action: 'manage',
    riskLevel: 'critical'
  });

  // التقارير
  rbacSystem.createPermission('reports:view', {
    name: 'View Reports',
    description: 'Access system reports',
    resource: 'reports',
    action: 'read',
    riskLevel: 'low'
  });

  rbacSystem.createPermission('reports:export', {
    name: 'Export Reports',
    description: 'Download reports data',
    resource: 'reports',
    action: 'export',
    riskLevel: 'medium'
  });

  // ═══════════════════════════════════════════════════════════
  // تعيين الأذونات للأدوار الافتراضية
  // ═══════════════════════════════════════════════════════════

  // Super Admin - جميع الأذونات
  rbacSystem.assignPermissionToRole('super-admin', 'users:create');
  rbacSystem.assignPermissionToRole('super-admin', 'users:read');
  rbacSystem.assignPermissionToRole('super-admin', 'users:update');
  rbacSystem.assignPermissionToRole('super-admin', 'users:delete');
  rbacSystem.assignPermissionToRole('super-admin', 'roles:manage');
  rbacSystem.assignPermissionToRole('super-admin', 'permissions:manage');
  rbacSystem.assignPermissionToRole('super-admin', 'reports:view');
  rbacSystem.assignPermissionToRole('super-admin', 'reports:export');

  // Admin
  rbacSystem.assignPermissionToRole('admin', 'users:create');
  rbacSystem.assignPermissionToRole('admin', 'users:read');
  rbacSystem.assignPermissionToRole('admin', 'users:update');
  rbacSystem.assignPermissionToRole('admin', 'roles:manage');
  rbacSystem.assignPermissionToRole('admin', 'reports:view');
  rbacSystem.assignPermissionToRole('admin', 'reports:export');

  // Manager
  rbacSystem.assignPermissionToRole('manager', 'users:read');
  rbacSystem.assignPermissionToRole('manager', 'users:update');
  rbacSystem.assignPermissionToRole('manager', 'reports:view');

  // User
  rbacSystem.assignPermissionToRole('user', 'users:read');
  rbacSystem.assignPermissionToRole('user', 'reports:view');

  // Guest
  rbacSystem.assignPermissionToRole('guest', 'users:read');
}

/**
 * إعداد السياسات الافتراضية
 */
function setupDefaultPolicies(policyEngine) {
  // سياسة: السماح للـ Admin بكل شيء
  policyEngine.createPolicy('admin-allow-all', {
    name: 'Admin Allow All',
    description: 'Admins have full access',
    principal: { role: 'admin' },
    action: ['*'],
    resource: ['*'],
    effect: 'Allow',
    priority: 1000
  });

  // سياسة: منع الوصول للأشخاص المحظورين
  policyEngine.createPolicy('deny-blocked-users', {
    name: 'Deny Blocked Users',
    description: 'Block access for suspended users',
    conditions: {
      'isBlocked': false // يجب أن لا يكون محظوراً
    },
    effect: 'Deny',
    priority: 2000
  });

  // سياسة: محدودية الوصول خارج ساعات العمل
  policyEngine.createPolicy('business-hours-restriction', {
    name: 'Business Hours Restriction',
    description: 'Restrict sensitive operations outside business hours',
    conditions: {
      'isSensitiveOperation': false
    },
    effect: 'Allow',
    priority: 500
  });

  // قالب سياسة: الوصول بناءً على القسم
  policyEngine.createPolicyTemplate('department-based-access', {
    name: 'Department Based Access',
    description: 'Grant access to department members only',
    template: {
      principal: { department: '{{department}}' },
      action: ['read', 'update'],
      resource: ['employees', 'reports'],
      effect: 'Allow',
      priority: 600
    },
    variables: {
      department: 'IT' // القيمة الافتراضية
    }
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 2️⃣ EXPRESS INTEGRATION - التكامل مع Express
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * ملف التوجيهات: backend/routes/rbac-advanced.routes.js
 */
const express = require('express');
const { protect } = require('../middleware/auth');

function setupRBACRoutes(rbacSystem, policyEngine, auditingService, 
                         intelligentMiddleware, rbacController) {
  const router = express.Router();

  // حماية جميع المسارات بالمصادقة
  router.use(protect);

  /**
   * ═════════════════════════════════════════
   * ROLE ENDPOINTS
   * ═════════════════════════════════════════
   */
  
  // إنشاء دور
  router.post('/roles', 
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.createRole(req, res)
  );

  // الحصول على الأدوار
  router.get('/roles',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.getAllRoles(req, res)
  );

  // الحصول على دور محدد
  router.get('/roles/:roleId',
    (req, res) => rbacController.getRole(req, res)
  );

  // تحديث دور
  router.put('/roles/:roleId',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.updateRole(req, res)
  );

  // حذف دور
  router.delete('/roles/:roleId',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.deleteRole(req, res)
  );

  /**
   * ═════════════════════════════════════════
   * PERMISSION ENDPOINTS
   * ═════════════════════════════════════════
   */

  // إنشاء إذن
  router.post('/permissions',
    intelligentMiddleware.authorize(['permissions:manage']),
    (req, res) => rbacController.createPermission(req, res)
  );

  // إضافة إذن إلى دور
  router.post('/roles/:roleId/permissions/:permId',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.assignPermissionToRole(req, res)
  );

  // إزالة إذن من دور
  router.delete('/roles/:roleId/permissions/:permId',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.removePermissionFromRole(req, res)
  );

  /**
   * ═════════════════════════════════════════
   * USER-ROLE ENDPOINTS
   * ═════════════════════════════════════════
   */

  // تعيين دور للمستخدم
  router.post('/users/:userId/roles/:roleId',
    intelligentMiddleware.authorize(['users:update']),
    (req, res) => rbacController.assignRoleToUser(req, res)
  );

  // إزالة دور من المستخدم
  router.delete('/users/:userId/roles/:roleId',
    intelligentMiddleware.authorize(['users:update']),
    (req, res) => rbacController.removeRoleFromUser(req, res)
  );

  // الحصول على أدوار المستخدم
  router.get('/users/:userId/roles',
    (req, res) => rbacController.getUserRoles(req, res)
  );

  // الحصول على أذونات المستخدم
  router.get('/users/:userId/permissions',
    (req, res) => rbacController.getUserPermissions(req, res)
  );

  // التحقق من إذن
  router.get('/users/:userId/permissions/:permId/check',
    (req, res) => rbacController.checkPermission(req, res)
  );

  /**
   * ═════════════════════════════════════════
   * POLICY ENDPOINTS
   * ═════════════════════════════════════════
   */

  // إنشاء سياسة
  router.post('/policies',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.createPolicy(req, res)
  );

  // الحصول على السياسات
  router.get('/policies',
    (req, res) => rbacController.getPolicies(req, res)
  );

  // تقييم السياسات
  router.post('/users/:userId/evaluate-policies',
    (req, res) => rbacController.evaluatePolicies(req, res)
  );

  // اتخاذ قرار الوصول
  router.post('/users/:userId/access-decision',
    (req, res) => rbacController.makeAccessDecision(req, res)
  );

  /**
   * ═════════════════════════════════════════
   * AUDIT & REPORTING ENDPOINTS
   * ═════════════════════════════════════════
   */

  // الحصول على سجلات التدقيق
  router.get('/audit-logs',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.getAuditLog(req, res)
  );

  // توليد تقرير التدقيق
  router.post('/audit-report',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.generateAuditReport(req, res)
  );

  // الحصول على الحوادث الأمنية
  router.get('/security-incidents',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.getSecurityIncidents(req, res)
  );

  // الحصول على ملخص الأمان
  router.get('/security-summary',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.getSecuritySummary(req, res)
  );

  /**
   * ═════════════════════════════════════════
   * ADMIN ENDPOINTS
   * ═════════════════════════════════════════
   */

  // إحصائيات النظام
  router.get('/system-stats',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.getSystemStats(req, res)
  );

  // تصدير البيانات
  router.get('/export',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.exportData(req, res)
  );

  // استيراد البيانات
  router.post('/import',
    intelligentMiddleware.authorize(['roles:manage']),
    (req, res) => rbacController.importData(req, res)
  );

  return router;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 3️⃣ SERVER SETUP - إعداد الخادم الرئيسي
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * ملف الخادم الرئيسي: backend/server.js
 */

// const express = require('express');
// const { initializeRBACSystem, setupRBACRoutes } = require('./config/rbac-init');

function setupServer(app) {
  // 1. تهيئة نظام RBAC
  const rbacComponents = initializeRBACSystem({
    rbac: {
      enableCache: true,
      enableAudit: true,
      enableAnomaly: true
    },
    auditing: {
      retentionDays: 90
    }
  });

  // 2. إضافة التوجيهات
  const rbacRouter = setupRBACRoutes(
    rbacComponents.rbacSystem,
    rbacComponents.policyEngine,
    rbacComponents.auditingService,
    rbacComponents.intelligentMiddleware,
    rbacComponents.rbacController
  );

  // 3. تسجيل التوجيهات في التطبيق
  app.use('/api/rbac', rbacRouter);

  // 4. إضافة الميدلوير الذكي عالمياً (اختياري)
  app.use((req, res, next) => {
    req.rbacSystem = rbacComponents.rbacSystem;
    req.rbacPolicy = rbacComponents.policyEngine;
    req.rbacAudit = rbacComponents.auditingService;
    next();
  });

  return rbacComponents;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 4️⃣ USAGE EXAMPLES - أمثلة الاستخدام
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * مثال 1: التحقق من الأذونات في الكود
 */
async function example1_CheckPermission(rbacSystem, userId) {
  // التحقق من إذن واحد
  const canCreate = rbacSystem.hasPermission(userId, 'users:create');
  
  // التحقق من أذونات متعددة
  const canManage = rbacSystem.hasAllPermissions(userId, [
    'users:create',
    'users:update',
    'users:delete'
  ]);

  // التحقق من أي إذن من مجموعة
  const hasAccess = rbacSystem.hasAnyPermission(userId, [
    'users:create',
    'reports:export'
  ]);

  console.log('Can create users:', canCreate);
  console.log('Can manage users:', canManage);
  console.log('Has any permission:', hasAccess);
}

/**
 * مثال 2: إنشاء دور مخصص بسياسات
 */
async function example2_CreateCustomRole(rbacSystem, policyEngine) {
  // إنشاء دور جديد
  const _departmentManager = rbacSystem.createRole('dept-manager', {
    name: 'Department Manager',
    description: 'Can manage department resources',
    scope: 'department',
    level: 500
  });

  // تعيين أذونات
  rbacSystem.assignPermissionToRole('dept-manager', 'users:read');
  rbacSystem.assignPermissionToRole('dept-manager', 'users:update');
  rbacSystem.assignPermissionToRole('dept-manager', 'reports:view');
  rbacSystem.assignPermissionToRole('dept-manager', 'reports:export');

  // إنشاء سياسة للدور
  policyEngine.createPolicy('dept-manager-policy', {
    name: 'Department Manager Policy',
    principal: { role: 'dept-manager' },
    action: ['read', 'update'],
    resource: ['employees', 'department/*'],
    effect: 'Allow',
    priority: 700,
    conditions: {
      departmentId: '{{userDepartment}}'
    }
  });

  console.log('Created department manager role');
}

/**
 * مثال 3: میدلوير التحكم بالوصول
 */
async function example3_AccessControlMiddleware(intelligentMiddleware) {
  // استخدام الميدلوير في Route
  const authRouter = require('express').Router();

  authRouter.get('/protected-resource',
    intelligentMiddleware.authorize(['users:read'], { strategy: 'all' }),
    (req, res) => {
      res.json({
        message: 'Access granted',
        permissions: req.rbac.permissions,
        scope: req.rbac.scope
      });
    }
  );

  return authRouter;
}

/**
 * مثال 4: تقييم السياسات
 */
async function example4_EvaluatePolicies(policyEngine, userId) {
  const result = policyEngine.evaluatePolicies(userId, {
    action: 'update',
    resource: 'users/123',
    department: 'IT',
    isSensitiveOperation: true
  });

  console.log('Policy evaluation result:', result);
  console.log('Final decision:', result.finalDecision);
  console.log('Applied policies:', result.policiesApplied);
}

/**
 * مثال 5: التدقيق والتقارير
 */
async function example5_AuditingAndReports(auditingService) {
  // تسجيل حدث
  auditingService.logAuditEvent({
    eventType: 'USER_CREATED',
    userId: 'admin-1',
    action: 'CREATE',
    resource: 'users',
    resourceId: 'user-123',
    status: 'success',
    metadata: { newUser: 'John Doe' }
  });

  // الحصول على سجلات التدقيق
  const logs = auditingService.queryAuditLog({
    eventType: 'USER_CREATED',
    limit: 50
  });

  // توليد تقرير
  const report = auditingService.generateAuditReport({
    startDate: new Date(Date.now() - 86400000 * 30),
    endDate: new Date()
  });

  console.log('Total audit events:', logs.total);
  console.log('Report period:', report.period);
  console.log('Summary:', report.summary);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 5️⃣ API DOCUMENTATION - التوثيق الكامل
 * ═══════════════════════════════════════════════════════════════
 */

/*

### Roles API

**POST /api/rbac/roles** - إنشاء دور
Request:
{
  "roleId": "editor",
  "name": "Editor",
  "description": "Can edit content",
  "level": 300,
  "scope": "global"
}

Response:
{
  "success": true,
  "data": { role object }
}

**GET /api/rbac/roles** - الحصول على جميع الأدوار
**GET /api/rbac/roles/:roleId** - الحصول على دور محدد
**PUT /api/rbac/roles/:roleId** - تحديث دور
**DELETE /api/rbac/roles/:roleId** - حذف دور

### Permissions API

**POST /api/rbac/permissions** - إنشاء إذن
**POST /api/rbac/roles/:roleId/permissions/:permId** - إضافة إذن إلى دور
**DELETE /api/rbac/roles/:roleId/permissions/:permId** - إزالة إذن من دور

### User-Role API

**POST /api/rbac/users/:userId/roles/:roleId** - تعيين دور
**DELETE /api/rbac/users/:userId/roles/:roleId** - إزالة دور
**GET /api/rbac/users/:userId/roles** - الأدوار الحالية
**GET /api/rbac/users/:userId/permissions** - الأذونات الفعالة
**GET /api/rbac/users/:userId/permissions/:permId/check** - التحقق من إذن

### Policy API

**POST /api/rbac/policies** - إنشاء سياسة
**GET /api/rbac/policies** - الحصول على السياسات
**POST /api/rbac/users/:userId/evaluate-policies** - تقييم السياسات
**POST /api/rbac/users/:userId/access-decision** - اتخاذ قرار وصول

### Audit API

**GET /api/rbac/audit-logs** - الحصول على سجلات التدقيق
**POST /api/rbac/audit-report** - توليد تقرير
**GET /api/rbac/security-incidents** - الحوادث الأمنية
**GET /api/rbac/security-summary** - ملخص الأمان

***/

module.exports = {
  initializeRBACSystem,
  setupDefaultRolesAndPermissions,
  setupDefaultPolicies,
  setupRBACRoutes,
  setupServer,
  // Examples
  example1_CheckPermission,
  example2_CreateCustomRole,
  example3_AccessControlMiddleware,
  example4_EvaluatePolicies,
  example5_AuditingAndReports
};
