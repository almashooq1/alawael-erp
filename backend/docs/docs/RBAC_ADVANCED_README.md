/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 ADVANCED RBAC SYSTEM - نظام التحكم بالوصول المتقدم
 * System Overview and README
 * ═══════════════════════════════════════════════════════════════════════════════
 */

# Advanced RBAC System - نظام التحكم بالوصول المتقدم والذكي

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المميزات الرئيسية](#المميزات-الرئيسية)
3. [البنية المعمارية](#البنية-المعمارية)
4. [التكامل والإعداد](#التكامل-والإعداد)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)
6. [واجهة برمجية JSON](#واجهة-برمجية-json)
7. [أفضل الممارسات](#أفضل-الممارسات)
8. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

نظام RBAC متقدم وشامل مصمم للعمل مع تطبيقات المؤسسات الكبيرة. يوفر:

- **إدارة أدوار وأذونات** قوية وهرمية
- **محرك سياسات** ديناميكي قابل للتوسع
- **تدقيق وتتبع** شامل لجميع الإجراءات
- **كشف ذكي** للشذوذ والمخاطر
- **حد من معدل الوصول** ديناميكي
- **تخزين مؤقت ذكي** لتحسين الأداء

---

## ✨ المميزات الرئيسية

### 1️⃣ إدارة الأدوار الهرمية المتقدمة

```javascript
// إنشاء دور بهرمية وراثة
rbacSystem.createRole('senior-manager', {
  name: 'Senior Manager',
  description: 'High-level management role',
  parentRole: 'manager',
  level: 550,
  scope: 'department',
  expiresAt: new Date('2025-12-31'),
  maxUsers: 10
});

// الدور يرث أذونات الـ parent
const permissions = rbacSystem.getRolePermissions('senior-manager', true);
```

### 2️⃣ نظام الأذونات الديناميكي

```javascript
// إنشاء أذونات مع شروط متقدمة
rbacSystem.createPermission('docs:edit:own', {
  resource: 'documents',
  action: 'edit',
  riskLevel: 'medium',
  conditions: {
    ownerId: 'userId',
    status: 'draft'
  }
});

// التحقق من الأذونات مع السياق
const hasAccess = rbacSystem.hasPermission(userId, 'docs:edit:own', {
  ownerId: userId,
  documentId: 'doc-123'
});
```

### 3️⃣ التحكم القائم على الخصائص (ABAC)

```javascript
// تعيين خصائص المستخدم
rbacSystem.setUserAttributes(userId, {
  department: 'IT',
  team: 'Security',
  level: 4,
  clearance: 'SECRET',
  location: 'HQ'
});

// الشروط تستخدم الخصائص
const conditions = {
  clearance: ['SECRET', 'TOP_SECRET'],
  department: { $in: ['IT', 'Security'] },
  minLevel: 3
};

// التحقق مع الخصائص
const canAccess = rbacSystem.hasPermission(userId, 'sensitive-op', {
  requiresClearance: 'SECRET'
});
```

### 4️⃣ محرك السياسات المتقدم

```javascript
// إنشاء سياسة معقدة
policyEngine.createPolicy('time-based-access', {
  name: 'Time-Based Access',
  principal: { role: 'contractor' },
  action: ['read'],
  resource: ['public/*'],
  effect: 'Allow',
  conditions: {
    hour: { $gte: 8, $lte: 20 },
    dayOfWeek: { $in: [1, 2, 3, 4, 5] } // الأيام العملية فقط
  },
  priority: 600
});

// تقييم السياسات
const evaluation = policyEngine.evaluatePolicies(userId, {
  action: 'read',
  resource: 'public/docs',
  hour: 15,
  dayOfWeek: 3
});
```

### 5️⃣ نظام الوصول المحدود النطاق

```javascript
// إعطاء أذونات مقيدة بنطاق
rbacSystem.assignRoleToUser(userId, 'manager', {
  scope: 'department',
  scopeData: {
    departmentId: 'dept-123',
    allowedTeams: ['team-1', 'team-2']
  }
});

// التحقق من نطاق الوصول
const scope = rbacSystem.calculateUserScope(userId);
console.log(scope);
// {
//   global: false,
//   departments: Set ['dept-123'],
//   teams: Set ['team-1', 'team-2'],
//   resources: Set [],
//   custom: {}
// }

// التحقق من الوصول للمورد المحدد
const canAccess = rbacSystem.canAccessResource(userId, 'resource-123', {
  departmentId: 'dept-123'
});
```

### 6️⃣ نظام التدقيق الشامل

```javascript
// تسجيل الأحداث تلقائياً
auditingService.logAuditEvent({
  eventType: 'ROLE_ASSIGNMENT',
  userId: 'admin-1',
  action: 'ASSIGN',
  resource: 'users/user-123',
  status: 'success',
  resourceId: 'user-123',
  metadata: { roleId: 'manager' },
  severity: 'medium'
});

// البحث في السجلات
const logs = auditingService.queryAuditLog({
  userId: 'user-123',
  eventType: ['ROLE_ASSIGNED', 'PERMISSION_GRANTED'],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-02-01'),
  status: 'failure',
  limit: 100
});

// توليد التقارير
const report = auditingService.generateAuditReport({
  startDate: new Date(Date.now() - 86400000 * 30),
  endDate: new Date()
});

console.log(report);
// {
//   summary: { totalEvents: 1500, successfulActions: 1450, ... },
//   eventDistribution: { ROLE_CREATED: 5, ... },
//   userActivity: { 'user-1': { totalActions: 50, ... }, ... },
//   recommendations: [...]
// }
```

### 7️⃣ كشف الشذوذ والمخاطر

```javascript
// الكشف التلقائي عن السلوك غير الطبيعي
const riskScore = intelligentMiddleware.calculateRiskScore(userId, {
  action: 'DELETE_ROLE',
  location: 'unknown',
  deviceId: 'device-123',
  isSensitiveOperation: true,
  time: 'off-hours'
});

// الحصول على تقرير الحوادث
const incidents = auditingService.getSecurityIncidents({
  status: 'open',
  severity: 'high'
});

for (const incident of incidents) {
  console.log(`⚠️ ${incident.type}: ${incident.severity}`);
}
```

### 8️⃣ الحد من معدل الوصول الذكي

```javascript
// الحد الديناميكي بناءً على الدور
intelligentMiddleware.setDynamicRateLimit(userId, {
  blockDurationMs: 300000 // 5 دقائق
});

// Super Admin: 500 طلب/دقيقة
// Admin: 200 طلب/دقيقة
// User: 100 طلب/دقيقة
// Guest: 50 طلب/دقيقة
```

### 9️⃣ إدارة الجلسات المتقدمة

```javascript
// إنشاء جلسة جديدة
const sessionId = intelligentMiddleware.createSession(userId, {
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  deviceId: req.headers['x-device-id']
});

// التحقق من صحة الجلسة
const validation = intelligentMiddleware.validateSession(sessionId);

if (!validation.valid) {
  console.log('Session invalid:', validation.reason);
  // SESSION_NOT_FOUND, SESSION_EXPIRED, SESSION_IDLE_TIMEOUT
}
```

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   API Routes (rbac-advanced.routes.js)              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • Roles Management          • Policy Management    │    │
│  │  • Permissions Management   • Audit & Reporting    │    │
│  │  • User-Role Assignment     • Admin Operations      │    │
│  └─────────────────────────────────────────────────────┘    │
│              ↓                           ↓                   │
│  ┌──────────────────────────┬──────────────────────────┐    │
│  │   Intelligent RBAC   │   RBAC Controller   │    │
│  │   Middleware         │                     │    │
│  └──────────────────────────┴──────────────────────────┘    │
│      ↓                           ↓                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │          Advanced RBAC System (Core)               │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  • Role Hierarchy        • Permission Management  │    │
│  │  • User-Role Assignment  • Permission Checking    │    │
│  │  • ABAC (Attributes)     • Scope Management      │    │
│  └────────────────────────────────────────────────────┘    │
│    ↙          ↓           ↓           ↘               │
│  ┌─────────┬──────────┬───────────┬──────────┐    │
│  │  RBAC   │ Policy   │  Auditing │Intelligent│    │
│  │  System │  Engine  │  Service  │Middleware │    │
│  └─────────┴──────────┴───────────┴──────────┘    │
│     ↓         ↓         ↓         ↓               │
│  ┌─────────────────────────────────────────────┐  │
│  │      Persistent Storage / Database          │  │
│  │  (MongoDB / PostgreSQL / Any Database)      │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ التكامل والإعداد

### الخطوة 1️⃣: التثبيت والاستيراد

```javascript
const AdvancedRBACSystem = require('./services/advanced-rbac.system');
const RBACPolicyEngine = require('./services/rbac-policy-engine');
const RBACAuditingService = require('./services/rbac-auditing.service');
const IntelligentRBACMiddleware = require('./middleware/rbac-intelligent.middleware');
const AdvancedRBACController = require('./controllers/rbac.controller.advanced');
```

### الخطوة 2️⃣: التهيئة

```javascript
// إنشاء المكونات
const rbacSystem = new AdvancedRBACSystem({
  enableCache: true,
  cacheTTL: 3600000,
  enableAudit: true,
  enableAnomaly: true
});

const policyEngine = new RBACPolicyEngine(rbacSystem);
const auditingService = new RBACAuditingService();
const intelligentMiddleware = new IntelligentRBACMiddleware(
  rbacSystem,
  policyEngine,
  auditingService
);

const rbacController = new AdvancedRBACController(
  rbacSystem,
  policyEngine,
  auditingService,
  intelligentMiddleware
);
```

### الخطوة 3️⃣: إضافة التوجيهات

```javascript
const express = require('express');
const app = express();

// استخدام التوجيهات
const rbacRouter = require('./config/rbac-integration').setupRBACRoutes(
  rbacSystem,
  policyEngine,
  auditingService,
  intelligentMiddleware,
  rbacController
);

app.use('/api/rbac', rbacRouter);
```

---

## 📚 أمثلة الاستخدام

### مثال 1: الوصول المحدود بناءً على الدور والقسم

```javascript
// إنشاء دور مخصص
rbacSystem.createRole('department-manager', {
  name: 'Department Manager',
  scope: 'department',
  level: 500
});

// تعيين الدور مع نطاق محدد
rbacSystem.assignRoleToUser(userId, 'department-manager', {
  scope: 'department',
  scopeData: {
    departmentId: 'HR',
    allowedActions: ['read', 'update']
  }
});

// التحقق من الوصول مع السياق
const canAccess = rbacSystem.hasPermission(userId, 'users:read', {
  departmentId: 'HR'
});
```

### مثال 2: السياسات الزمنية

```javascript
// سياسة للوصول خارج ساعات العمل
policyEngine.createPolicy('after-hours-restricted', {
  principal: { role: 'user' },
  action: ['delete', 'sensitive_operation'],
  resource: ['*'],
  conditions: {
    hour: { $lt: 8 }, // قبل 8 صباحاً
    dayOfWeek: { $in: [0, 6] } // الويكند
  },
  effect: 'Deny',
  priority: 2000
});
```

### مثال 3: الاستثناءات المؤقتة

```javascript
// إعطاء وصول مؤقت
intelligentMiddleware.middleware?.addTemporaryException('exc-123', {
  userId: 'user-123',
  action: 'DELETE_ROLE',
  effect: 'Allow',
  expiresAt: new Date(Date.now() + 3600000), // ساعة واحدة
  reason: 'Emergency access for system maintenance',
  createdBy: 'admin-1'
});
```

### مثال 4: التقارير والحوادث

```javascript
// الحصول على الحوادث
const incidents = auditingService.getSecurityIncidents({
  status: 'open',
  severity: 'high'
});

// توليد تقرير الامتثال
const complianceReport = auditingService.generateComplianceReport();

// إرسال تنبيهات
auditingService.on('anomalyDetected', (anomaly) => {
  console.log('🚨 Anomaly Detected:', anomaly);
  // إرسال إلى خدمة التنبيهات
});
```

---

## 🔌 واجهة برمجية JSON

### إنشاء دور

**POST** `/api/rbac/roles`

```json
{
  "roleId": "content-manager",
  "name": "Content Manager",
  "description": "Can manage content areas",
  "level": 400,
  "scope": "global",
  "parentRole": "manager"
}
```

### تعيين دور مع شروط

**POST** `/api/rbac/users/user-123/roles/editor`

```json
{
  "expiresAt": "2025-12-31T23:59:59Z",
  "scope": "project",
  "scopeData": {
    "projectId": "proj-123"
  },
  "conditions": {
    "contentType": ["article", "blog"]
  }
}
```

### تقييم السياسات

**POST** `/api/rbac/users/user-123/evaluate-policies`

```json
{
  "action": "delete",
  "resource": "users/456",
  "timestamp": "2025-02-18T10:30:00Z",
  "ipAddress": "192.168.1.1",
  "dayOfWeek": 3,
  "hour": 14
}
```

### الحصول على سجلات التدقيق

**GET** `/api/rbac/audit-logs?eventType=ROLE_ASSIGNED&userId=user-123&limit=50&sortBy=timestamp&sortOrder=desc`

```json
{
  "success": true,
  "total": 150,
  "returned": 50,
  "results": [
    {
      "id": "audit_1234567890_abc123",
      "timestamp": "2025-02-18T10:30:00Z",
      "eventType": "ROLE_ASSIGNED",
      "userId": "admin-1",
      "action": "ASSIGN",
      "resource": "users/user-123",
      "status": "success",
      "severity": "low"
    }
    // ... more records
  ]
}
```

---

## 🎓 أفضل الممارسات

### 1️⃣ تصميم الأدوار

- استخدم الهرمية الواضحة
- اختر مستويات صريحة للأدوار
- تجنب الأدوار المتداخلة المعقدة

```javascript
// ✅ جيد
createRole('super-admin', { level: 1000 });
createRole('admin', { level: 800, parentRole: 'super-admin' });
createRole('manager', { level: 600, parentRole: 'admin' });
createRole('user', { level: 200, parentRole: 'manager' });

// ❌ سيء
createRole('super-admin', { level: 100 });
createRole('admin', { level: 200, parentRole: 'user' });
```

### 2️⃣ إدارة الأذونات

- حافظ على أذونات محددة وقابلة للفهم
- استخدم نمط `resource:action`
- قم بتجميع الأذونات المرتبطة

```javascript
// ✅ جيد
'users:create', 'users:read', 'users:update', 'users:delete'
'documents:read:own' // أذونات مقيدة

// ❌ سيء
'admin-all', 'user-stuff', 'dothis'
```

### 3️⃣ السياسات

- ابدأ بـ Deny ثم أضف Allow
- استخدم الأولويات بشكل استراتيجي
- اختبر السياسات قبل التفعيل

```javascript
// ✅ جيد
// Deny-by-default
policyEngine.createPolicy('deny-all', {
  principal: '*',
  action: '*',
  resource: '*',
  effect: 'Deny',
  priority: 0 // أقل أولوية
});

// ثم أضف Allow للحالات المسموحة
policyEngine.createPolicy('allow-read', {
  principal: { role: 'user' },
  action: ['read'],
  resource: ['public/*'],
  effect: 'Allow',
  priority: 100
});
```

### 4️⃣ التدقيق

- سجل الأحداث الحساسة دائماً
- احتفظ بسجلات لفترة كافية
- راجع التقارير بانتظام

```javascript
// ✅ دائماً سجّل
auditingService.logAuditEvent({
  eventType: 'SENSITIVE_OPERATION',
  userId,
  action,
  resource,
  severity: 'high'
});
```

### 5️⃣ الأمان

- استخدم HTTPS فقط
- حماية مفاتيح الجلسات
- تحديث الأذونات بانتظام

---

## 🛠️ استكشاف الأخطاء

### المشكلة: المستخدم لا يحصل على الوصول رغم وجود الإذن

```javascript
// تحقق من الأدوار
const roles = rbacSystem.getUserRoles(userId);
console.log('User Roles:', roles);

// تحقق من الأذونات
const permissions = rbacSystem.getRolePermissions(roles[0]?.roleId);
console.log('Role Permissions:', permissions);

// تحقق من الشروط
console.log('User Attributes:', rbacSystem.getUserAttributes(userId));

// اختبر الإذن مع السياق
const has = rbacSystem.hasPermission(userId, permId, { /* context */ });
console.log('Has Permission:', has);
```

### المشكلة: السياسات لا تعمل كما هو متوقع

```javascript
// قيّم السياسات مباشرة
const evaluation = policyEngine.evaluatePolicies(userId, {
  /* context */
});
console.log('Evaluation Result:', evaluation);

// تحقق من السياسات المنطبقة
const applicable = policyEngine.getAllPolicies({ active: true });
console.log('Applicable Policies:', applicable);
```

### المشكلة: أداء بطيء

```javascript
// تحقق من إحصائيات الذاكرة المؤقتة
const stats = intelligentMiddleware.getPerformanceStats();
console.log('Performance:', stats);

// تنظيف الذاكرة المؤقتة
intelligentMiddleware.smartCache.clear();
```

---

## 📞 الدعم والمساهمة

للمشاكل والاستفسارات، استخدم سجل مشاكل GitHub أو تواصل مع فريق التطوير.

---

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License.

*/

module.exports = {
  version: '1.0.0',
  name: 'Advanced RBAC System',
  description: 'Enterprise-grade role-based access control system',
  author: 'Development Team',
  licience: 'MIT'
};
