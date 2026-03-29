/**
 * @file roles-permissions.seed.js
 * @description بذر الأدوار والصلاحيات لنظام الأوائل ERP
 * Seed roles and permissions for Al-Awael ERP
 */

'use strict';

const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// Permissions Registry
// ─────────────────────────────────────────────────────────────────────────────
const PERMISSIONS = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  {
    code: 'dashboard.view',
    module: 'dashboard',
    action: 'view',
    nameAr: 'عرض لوحة التحكم',
    nameEn: 'View Dashboard',
  },
  {
    code: 'dashboard.analytics',
    module: 'dashboard',
    action: 'analytics',
    nameAr: 'عرض التحليلات',
    nameEn: 'View Analytics',
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  {
    code: 'users.view',
    module: 'users',
    action: 'view',
    nameAr: 'عرض المستخدمين',
    nameEn: 'View Users',
  },
  {
    code: 'users.create',
    module: 'users',
    action: 'create',
    nameAr: 'إنشاء مستخدم',
    nameEn: 'Create User',
  },
  {
    code: 'users.edit',
    module: 'users',
    action: 'edit',
    nameAr: 'تعديل مستخدم',
    nameEn: 'Edit User',
  },
  {
    code: 'users.delete',
    module: 'users',
    action: 'delete',
    nameAr: 'حذف مستخدم',
    nameEn: 'Delete User',
  },
  {
    code: 'users.roles',
    module: 'users',
    action: 'roles',
    nameAr: 'إدارة الأدوار',
    nameEn: 'Manage Roles',
  },

  // ── Beneficiaries ──────────────────────────────────────────────────────────
  {
    code: 'beneficiaries.view',
    module: 'beneficiaries',
    action: 'view',
    nameAr: 'عرض المستفيدين',
    nameEn: 'View Beneficiaries',
  },
  {
    code: 'beneficiaries.create',
    module: 'beneficiaries',
    action: 'create',
    nameAr: 'تسجيل مستفيد',
    nameEn: 'Register Beneficiary',
  },
  {
    code: 'beneficiaries.edit',
    module: 'beneficiaries',
    action: 'edit',
    nameAr: 'تعديل بيانات مستفيد',
    nameEn: 'Edit Beneficiary',
  },
  {
    code: 'beneficiaries.delete',
    module: 'beneficiaries',
    action: 'delete',
    nameAr: 'حذف مستفيد',
    nameEn: 'Delete Beneficiary',
  },
  {
    code: 'beneficiaries.export',
    module: 'beneficiaries',
    action: 'export',
    nameAr: 'تصدير بيانات المستفيدين',
    nameEn: 'Export Beneficiaries',
  },
  {
    code: 'beneficiaries.medical',
    module: 'beneficiaries',
    action: 'medical',
    nameAr: 'عرض السجل الطبي',
    nameEn: 'View Medical Records',
  },

  // ── Rehabilitation ─────────────────────────────────────────────────────────
  {
    code: 'rehab.sessions.view',
    module: 'rehabilitation',
    action: 'view_sessions',
    nameAr: 'عرض جلسات التأهيل',
    nameEn: 'View Rehab Sessions',
  },
  {
    code: 'rehab.sessions.create',
    module: 'rehabilitation',
    action: 'create_sessions',
    nameAr: 'إنشاء جلسة تأهيل',
    nameEn: 'Create Rehab Session',
  },
  {
    code: 'rehab.sessions.edit',
    module: 'rehabilitation',
    action: 'edit_sessions',
    nameAr: 'تعديل جلسة تأهيل',
    nameEn: 'Edit Rehab Session',
  },
  {
    code: 'rehab.plans.view',
    module: 'rehabilitation',
    action: 'view_plans',
    nameAr: 'عرض خطط التأهيل',
    nameEn: 'View Rehab Plans',
  },
  {
    code: 'rehab.plans.create',
    module: 'rehabilitation',
    action: 'create_plans',
    nameAr: 'إنشاء خطة تأهيل',
    nameEn: 'Create Rehab Plan',
  },
  {
    code: 'rehab.assessments.view',
    module: 'rehabilitation',
    action: 'view_assessments',
    nameAr: 'عرض التقييمات',
    nameEn: 'View Assessments',
  },
  {
    code: 'rehab.assessments.create',
    module: 'rehabilitation',
    action: 'create_assessments',
    nameAr: 'إنشاء تقييم',
    nameEn: 'Create Assessment',
  },
  {
    code: 'rehab.programs.manage',
    module: 'rehabilitation',
    action: 'manage_programs',
    nameAr: 'إدارة برامج التأهيل',
    nameEn: 'Manage Rehab Programs',
  },

  // ── HR ─────────────────────────────────────────────────────────────────────
  {
    code: 'hr.employees.view',
    module: 'hr',
    action: 'view_employees',
    nameAr: 'عرض الموظفين',
    nameEn: 'View Employees',
  },
  {
    code: 'hr.employees.create',
    module: 'hr',
    action: 'create_employees',
    nameAr: 'إضافة موظف',
    nameEn: 'Add Employee',
  },
  {
    code: 'hr.employees.edit',
    module: 'hr',
    action: 'edit_employees',
    nameAr: 'تعديل بيانات موظف',
    nameEn: 'Edit Employee',
  },
  {
    code: 'hr.employees.delete',
    module: 'hr',
    action: 'delete_employees',
    nameAr: 'حذف موظف',
    nameEn: 'Delete Employee',
  },
  {
    code: 'hr.attendance.view',
    module: 'hr',
    action: 'view_attendance',
    nameAr: 'عرض الحضور والغياب',
    nameEn: 'View Attendance',
  },
  {
    code: 'hr.attendance.manage',
    module: 'hr',
    action: 'manage_attendance',
    nameAr: 'إدارة الحضور',
    nameEn: 'Manage Attendance',
  },
  {
    code: 'hr.leaves.view',
    module: 'hr',
    action: 'view_leaves',
    nameAr: 'عرض الإجازات',
    nameEn: 'View Leaves',
  },
  {
    code: 'hr.leaves.approve',
    module: 'hr',
    action: 'approve_leaves',
    nameAr: 'اعتماد الإجازات',
    nameEn: 'Approve Leaves',
  },
  {
    code: 'hr.payroll.view',
    module: 'hr',
    action: 'view_payroll',
    nameAr: 'عرض الرواتب',
    nameEn: 'View Payroll',
  },
  {
    code: 'hr.payroll.process',
    module: 'hr',
    action: 'process_payroll',
    nameAr: 'معالجة الرواتب',
    nameEn: 'Process Payroll',
  },
  {
    code: 'hr.performance.view',
    module: 'hr',
    action: 'view_performance',
    nameAr: 'عرض تقييمات الأداء',
    nameEn: 'View Performance',
  },
  {
    code: 'hr.performance.create',
    module: 'hr',
    action: 'create_performance',
    nameAr: 'إنشاء تقييم أداء',
    nameEn: 'Create Performance Review',
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  {
    code: 'finance.invoices.view',
    module: 'finance',
    action: 'view_invoices',
    nameAr: 'عرض الفواتير',
    nameEn: 'View Invoices',
  },
  {
    code: 'finance.invoices.create',
    module: 'finance',
    action: 'create_invoices',
    nameAr: 'إنشاء فاتورة',
    nameEn: 'Create Invoice',
  },
  {
    code: 'finance.invoices.approve',
    module: 'finance',
    action: 'approve_invoices',
    nameAr: 'اعتماد الفواتير',
    nameEn: 'Approve Invoices',
  },
  {
    code: 'finance.payments.view',
    module: 'finance',
    action: 'view_payments',
    nameAr: 'عرض المدفوعات',
    nameEn: 'View Payments',
  },
  {
    code: 'finance.payments.process',
    module: 'finance',
    action: 'process_payments',
    nameAr: 'معالجة المدفوعات',
    nameEn: 'Process Payments',
  },
  {
    code: 'finance.reports.view',
    module: 'finance',
    action: 'view_reports',
    nameAr: 'عرض التقارير المالية',
    nameEn: 'View Financial Reports',
  },
  {
    code: 'finance.budget.view',
    module: 'finance',
    action: 'view_budget',
    nameAr: 'عرض الميزانية',
    nameEn: 'View Budget',
  },
  {
    code: 'finance.budget.manage',
    module: 'finance',
    action: 'manage_budget',
    nameAr: 'إدارة الميزانية',
    nameEn: 'Manage Budget',
  },
  {
    code: 'finance.accounts.view',
    module: 'finance',
    action: 'view_accounts',
    nameAr: 'عرض الحسابات',
    nameEn: 'View Accounts',
  },
  {
    code: 'finance.accounts.manage',
    module: 'finance',
    action: 'manage_accounts',
    nameAr: 'إدارة الحسابات',
    nameEn: 'Manage Accounts',
  },

  // ── Branches ───────────────────────────────────────────────────────────────
  {
    code: 'branches.view',
    module: 'branches',
    action: 'view',
    nameAr: 'عرض الفروع',
    nameEn: 'View Branches',
  },
  {
    code: 'branches.manage',
    module: 'branches',
    action: 'manage',
    nameAr: 'إدارة الفروع',
    nameEn: 'Manage Branches',
  },

  // ── Fleet ──────────────────────────────────────────────────────────────────
  {
    code: 'fleet.vehicles.view',
    module: 'fleet',
    action: 'view_vehicles',
    nameAr: 'عرض المركبات',
    nameEn: 'View Vehicles',
  },
  {
    code: 'fleet.vehicles.manage',
    module: 'fleet',
    action: 'manage_vehicles',
    nameAr: 'إدارة المركبات',
    nameEn: 'Manage Vehicles',
  },
  {
    code: 'fleet.trips.view',
    module: 'fleet',
    action: 'view_trips',
    nameAr: 'عرض الرحلات',
    nameEn: 'View Trips',
  },
  {
    code: 'fleet.trips.manage',
    module: 'fleet',
    action: 'manage_trips',
    nameAr: 'إدارة الرحلات',
    nameEn: 'Manage Trips',
  },

  // ── Documents ──────────────────────────────────────────────────────────────
  {
    code: 'documents.view',
    module: 'documents',
    action: 'view',
    nameAr: 'عرض الوثائق',
    nameEn: 'View Documents',
  },
  {
    code: 'documents.upload',
    module: 'documents',
    action: 'upload',
    nameAr: 'رفع وثائق',
    nameEn: 'Upload Documents',
  },
  {
    code: 'documents.delete',
    module: 'documents',
    action: 'delete',
    nameAr: 'حذف وثائق',
    nameEn: 'Delete Documents',
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  {
    code: 'reports.view',
    module: 'reports',
    action: 'view',
    nameAr: 'عرض التقارير',
    nameEn: 'View Reports',
  },
  {
    code: 'reports.create',
    module: 'reports',
    action: 'create',
    nameAr: 'إنشاء تقرير',
    nameEn: 'Create Report',
  },
  {
    code: 'reports.export',
    module: 'reports',
    action: 'export',
    nameAr: 'تصدير التقارير',
    nameEn: 'Export Reports',
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  {
    code: 'settings.view',
    module: 'settings',
    action: 'view',
    nameAr: 'عرض الإعدادات',
    nameEn: 'View Settings',
  },
  {
    code: 'settings.manage',
    module: 'settings',
    action: 'manage',
    nameAr: 'إدارة الإعدادات',
    nameEn: 'Manage Settings',
  },
  {
    code: 'settings.system',
    module: 'settings',
    action: 'system',
    nameAr: 'إعدادات النظام',
    nameEn: 'System Settings',
  },

  // ── Audit ──────────────────────────────────────────────────────────────────
  {
    code: 'audit.view',
    module: 'audit',
    action: 'view',
    nameAr: 'عرض سجلات المراجعة',
    nameEn: 'View Audit Logs',
  },
  {
    code: 'audit.export',
    module: 'audit',
    action: 'export',
    nameAr: 'تصدير سجلات المراجعة',
    nameEn: 'Export Audit Logs',
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  {
    code: 'notifications.view',
    module: 'notifications',
    action: 'view',
    nameAr: 'عرض الإشعارات',
    nameEn: 'View Notifications',
  },
  {
    code: 'notifications.send',
    module: 'notifications',
    action: 'send',
    nameAr: 'إرسال إشعارات',
    nameEn: 'Send Notifications',
  },
  {
    code: 'notifications.manage',
    module: 'notifications',
    action: 'manage',
    nameAr: 'إدارة الإشعارات',
    nameEn: 'Manage Notifications',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Roles Registry
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = [
  {
    name: 'superadmin',
    nameAr: 'مدير النظام العام',
    description: 'صلاحيات كاملة على جميع أجزاء النظام',
    isSystem: true,
    level: 1,
    permissions: '*', // all permissions
  },
  {
    name: 'admin',
    nameAr: 'مدير',
    description: 'صلاحيات إدارية شاملة',
    isSystem: true,
    level: 2,
    permissions: [
      'dashboard.view',
      'dashboard.analytics',
      'users.view',
      'users.create',
      'users.edit',
      'beneficiaries.view',
      'beneficiaries.create',
      'beneficiaries.edit',
      'beneficiaries.export',
      'rehab.sessions.view',
      'rehab.sessions.create',
      'rehab.sessions.edit',
      'rehab.plans.view',
      'rehab.plans.create',
      'rehab.assessments.view',
      'rehab.assessments.create',
      'rehab.programs.manage',
      'hr.employees.view',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.attendance.view',
      'hr.attendance.manage',
      'hr.leaves.view',
      'hr.leaves.approve',
      'hr.payroll.view',
      'hr.payroll.process',
      'hr.performance.view',
      'hr.performance.create',
      'finance.invoices.view',
      'finance.invoices.create',
      'finance.invoices.approve',
      'finance.payments.view',
      'finance.payments.process',
      'finance.reports.view',
      'finance.budget.view',
      'finance.budget.manage',
      'finance.accounts.view',
      'finance.accounts.manage',
      'branches.view',
      'branches.manage',
      'fleet.vehicles.view',
      'fleet.vehicles.manage',
      'fleet.trips.view',
      'fleet.trips.manage',
      'documents.view',
      'documents.upload',
      'documents.delete',
      'reports.view',
      'reports.create',
      'reports.export',
      'settings.view',
      'settings.manage',
      'audit.view',
      'audit.export',
      'notifications.view',
      'notifications.send',
      'notifications.manage',
    ],
  },
  {
    name: 'manager',
    nameAr: 'مدير فرع',
    description: 'إدارة الفرع والعمليات اليومية',
    isSystem: false,
    level: 3,
    permissions: [
      'dashboard.view',
      'dashboard.analytics',
      'beneficiaries.view',
      'beneficiaries.create',
      'beneficiaries.edit',
      'rehab.sessions.view',
      'rehab.sessions.create',
      'rehab.sessions.edit',
      'rehab.plans.view',
      'rehab.plans.create',
      'rehab.assessments.view',
      'rehab.assessments.create',
      'hr.employees.view',
      'hr.attendance.view',
      'hr.attendance.manage',
      'hr.leaves.view',
      'hr.leaves.approve',
      'hr.payroll.view',
      'hr.performance.view',
      'hr.performance.create',
      'finance.invoices.view',
      'finance.invoices.create',
      'finance.payments.view',
      'finance.reports.view',
      'finance.budget.view',
      'branches.view',
      'fleet.vehicles.view',
      'fleet.trips.view',
      'documents.view',
      'documents.upload',
      'reports.view',
      'reports.create',
      'reports.export',
      'audit.view',
      'notifications.view',
      'notifications.send',
    ],
  },
  {
    name: 'therapist',
    nameAr: 'معالج / أخصائي',
    description: 'إدارة الجلسات العلاجية والمستفيدين',
    isSystem: false,
    level: 4,
    permissions: [
      'dashboard.view',
      'beneficiaries.view',
      'beneficiaries.create',
      'beneficiaries.edit',
      'beneficiaries.medical',
      'rehab.sessions.view',
      'rehab.sessions.create',
      'rehab.sessions.edit',
      'rehab.plans.view',
      'rehab.plans.create',
      'rehab.assessments.view',
      'rehab.assessments.create',
      'documents.view',
      'documents.upload',
      'reports.view',
      'reports.create',
      'notifications.view',
    ],
  },
  {
    name: 'receptionist',
    nameAr: 'موظف استقبال',
    description: 'استقبال المستفيدين وجدولة المواعيد',
    isSystem: false,
    level: 5,
    permissions: [
      'dashboard.view',
      'beneficiaries.view',
      'beneficiaries.create',
      'rehab.sessions.view',
      'documents.view',
      'documents.upload',
      'notifications.view',
    ],
  },
  {
    name: 'hr_officer',
    nameAr: 'موظف موارد بشرية',
    description: 'إدارة شؤون الموظفين والرواتب',
    isSystem: false,
    level: 5,
    permissions: [
      'dashboard.view',
      'hr.employees.view',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.attendance.view',
      'hr.attendance.manage',
      'hr.leaves.view',
      'hr.leaves.approve',
      'hr.payroll.view',
      'hr.payroll.process',
      'hr.performance.view',
      'hr.performance.create',
      'documents.view',
      'documents.upload',
      'reports.view',
      'reports.create',
      'notifications.view',
    ],
  },
  {
    name: 'accountant',
    nameAr: 'محاسب',
    description: 'إدارة الشؤون المالية والمحاسبية',
    isSystem: false,
    level: 5,
    permissions: [
      'dashboard.view',
      'dashboard.analytics',
      'finance.invoices.view',
      'finance.invoices.create',
      'finance.payments.view',
      'finance.payments.process',
      'finance.reports.view',
      'finance.budget.view',
      'finance.accounts.view',
      'finance.accounts.manage',
      'documents.view',
      'documents.upload',
      'reports.view',
      'reports.create',
      'reports.export',
      'notifications.view',
    ],
  },
  {
    name: 'driver',
    nameAr: 'سائق',
    description: 'إدارة الرحلات ونقل المستفيدين',
    isSystem: false,
    level: 6,
    permissions: ['dashboard.view', 'fleet.trips.view', 'notifications.view'],
  },
  {
    name: 'parent',
    nameAr: 'ولي أمر / مرافق',
    description: 'متابعة تقدم المستفيد وحضور الجلسات',
    isSystem: false,
    level: 7,
    permissions: [
      'beneficiaries.view',
      'rehab.sessions.view',
      'documents.view',
      'notifications.view',
    ],
  },
  {
    name: 'viewer',
    nameAr: 'مشاهد / قراءة فقط',
    description: 'صلاحية العرض فقط',
    isSystem: false,
    level: 8,
    permissions: ['dashboard.view', 'beneficiaries.view', 'reports.view', 'notifications.view'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed Function
// ─────────────────────────────────────────────────────────────────────────────
async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db);
  if (!db) throw new Error('No database connection');

  const permCol = db.collection('permissions');
  const roleCol = db.collection('roles');

  // ── Seed Permissions ───────────────────────────────────────────────────────
  let permCreated = 0;
  let permUpdated = 0;

  for (const perm of PERMISSIONS) {
    const result = await permCol.updateOne(
      { code: perm.code },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: { ...perm, updatedAt: new Date() },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) permCreated++;
    else if (result.modifiedCount > 0) permUpdated++;
  }

  console.log(`  ✅ Permissions: ${permCreated} created, ${permUpdated} updated`);

  // ── Seed Roles ─────────────────────────────────────────────────────────────
  let roleCreated = 0;
  let roleUpdated = 0;

  for (const role of ROLES) {
    const { permissions, ...roleData } = role;

    // Resolve permission IDs
    let permissionIds = [];
    if (permissions === '*') {
      const allPerms = await permCol.find({}).project({ _id: 1 }).toArray();
      permissionIds = allPerms.map(p => p._id);
    } else {
      const perms = await permCol
        .find({ code: { $in: permissions } })
        .project({ _id: 1 })
        .toArray();
      permissionIds = perms.map(p => p._id);
    }

    const result = await roleCol.updateOne(
      { name: role.name },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          ...roleData,
          permissions: permissionIds,
          permissionCodes: permissions === '*' ? ['*'] : permissions,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) roleCreated++;
    else if (result.modifiedCount > 0) roleUpdated++;
  }

  console.log(`  ✅ Roles: ${roleCreated} created, ${roleUpdated} updated`);
}

async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db);
  if (!db) return;
  // Only remove non-system roles and permissions
  await db.collection('roles').deleteMany({ isSystem: { $ne: true } });
  console.log('  ✅ Non-system roles removed');
}

module.exports = { seed, down, PERMISSIONS, ROLES };
