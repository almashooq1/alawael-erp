/**
 * RehabRolePermissionSeeder — بذر الأدوار والصلاحيات لمراكز تأهيل ذوي الإعاقة
 *
 * ينفّذ:
 *  1. إنشاء 12 دور خاص بمراكز التأهيل (من prompt_03)
 *  2. إنشاء 161 صلاحية موزّعة على 13 وحدة
 *  3. ربط كل دور بصلاحياته وفق المصفوفة المحددة
 *
 * الأدوار الـ12:
 *  super-admin | branch-admin | medical-director | doctor | therapist
 *  special-educator | receptionist | accountant | hr-manager
 *  driver | parent-guardian | auditor
 *
 * الاستخدام:
 *   node backend/database/seeders/RehabRolePermissionSeeder.js
 *   أو من خلال: require('./RehabRolePermissionSeeder').run()
 *
 * @module database/seeders/RehabRolePermissionSeeder
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════
// نموذج Role (مرن — يعمل مع أي schema موجود)
// ═══════════════════════════════════════════════════════════════════════════
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    display_name_ar: String,
    display_name_en: String,
    is_system: { type: Boolean, default: false },
    level: { type: Number, default: 0 },
    permissions: [{ type: String }],
    description: String,
  },
  { timestamps: true }
);

const Role = mongoose.models.RehabRole || mongoose.model('RehabRole', roleSchema);

// ═══════════════════════════════════════════════════════════════════════════
// نموذج Permission
// ═══════════════════════════════════════════════════════════════════════════
const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    display_name_ar: String,
    display_name_en: String,
    module: String,
    group: String,
  },
  { timestamps: true }
);

const Permission =
  mongoose.models.RehabPermission || mongoose.model('RehabPermission', permissionSchema);

// ═══════════════════════════════════════════════════════════════════════════
// تعريف الأدوار الـ12
// ═══════════════════════════════════════════════════════════════════════════
const ROLES_DATA = [
  {
    name: 'super-admin',
    display_name_ar: 'مدير النظام',
    display_name_en: 'Super Admin',
    is_system: true,
    level: 0,
    description: 'صلاحيات كاملة على كل الفروع، لا قيود',
  },
  {
    name: 'branch-admin',
    display_name_ar: 'مدير الفرع',
    display_name_en: 'Branch Admin',
    is_system: true,
    level: 1,
    description: 'صلاحيات كاملة على فرع واحد',
  },
  {
    name: 'medical-director',
    display_name_ar: 'المدير الطبي',
    display_name_en: 'Medical Director',
    is_system: true,
    level: 2,
    description: 'إشراف سريري كامل، الموافقة على الخطط العلاجية',
  },
  {
    name: 'doctor',
    display_name_ar: 'طبيب',
    display_name_en: 'Doctor',
    is_system: true,
    level: 3,
    description: 'تشخيص، وصف، إحالة، كتابة تقارير طبية',
  },
  {
    name: 'therapist',
    display_name_ar: 'أخصائي علاج',
    display_name_en: 'Therapist',
    is_system: true,
    level: 4,
    description: 'إدارة جلساته، كتابة ملاحظات، متابعة أهداف',
  },
  {
    name: 'special-educator',
    display_name_ar: 'معلم تربية خاصة',
    display_name_en: 'Special Educator',
    is_system: true,
    level: 4,
    description: 'إدارة البرامج التعليمية، تقييمات تربوية، خطط تعليمية فردية',
  },
  {
    name: 'receptionist',
    display_name_ar: 'موظف استقبال',
    display_name_en: 'Receptionist',
    is_system: true,
    level: 5,
    description: 'تسجيل المستفيدين، إدارة المواعيد',
  },
  {
    name: 'accountant',
    display_name_ar: 'محاسب',
    display_name_en: 'Accountant',
    is_system: true,
    level: 5,
    description: 'فواتير، مدفوعات، مطالبات تأمينية، تقارير مالية',
  },
  {
    name: 'hr-manager',
    display_name_ar: 'مدير موارد بشرية',
    display_name_en: 'HR Manager',
    is_system: true,
    level: 3,
    description: 'إدارة الموظفين، الرواتب، الإجازات، GOSI، مقيم',
  },
  {
    name: 'driver',
    display_name_ar: 'سائق',
    display_name_en: 'Driver',
    is_system: true,
    level: 6,
    description: 'عرض الرحلات المسندة، تسجيل الحضور',
  },
  {
    name: 'parent-guardian',
    display_name_ar: 'ولي أمر',
    display_name_en: 'Parent/Guardian',
    is_system: true,
    level: 7,
    description: 'بوابة محدودة: عرض بيانات أبنائه، المواعيد، التقارير، الفواتير',
  },
  {
    name: 'auditor',
    display_name_ar: 'مدقق',
    display_name_en: 'Auditor',
    is_system: true,
    level: 8,
    description: 'قراءة فقط: عرض كل البيانات بدون تعديل',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// تعريف الصلاحيات الـ161
// ═══════════════════════════════════════════════════════════════════════════
const PERMISSIONS_DATA = [
  // ─── Dashboard (4) ───────────────────────────────────────────────────────
  {
    name: 'dashboard.view',
    display_name_ar: 'عرض لوحة التحكم',
    display_name_en: 'View Dashboard',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.statistics',
    display_name_ar: 'عرض الإحصائيات',
    display_name_en: 'View Statistics',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.financial-summary',
    display_name_ar: 'عرض الملخص المالي',
    display_name_en: 'View Financial Summary',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.customize',
    display_name_ar: 'تخصيص لوحة التحكم',
    display_name_en: 'Customize Dashboard',
    module: 'dashboard',
    group: 'dashboard',
  },

  // ─── Beneficiaries (14) ──────────────────────────────────────────────────
  {
    name: 'beneficiaries.view',
    display_name_ar: 'عرض المستفيدين',
    display_name_en: 'View Beneficiaries',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.create',
    display_name_ar: 'إضافة مستفيد',
    display_name_en: 'Create Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.edit',
    display_name_ar: 'تعديل مستفيد',
    display_name_en: 'Edit Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.delete',
    display_name_ar: 'حذف مستفيد',
    display_name_en: 'Delete Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.transfer',
    display_name_ar: 'نقل مستفيد بين الفروع',
    display_name_en: 'Transfer Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.export',
    display_name_ar: 'تصدير بيانات المستفيدين',
    display_name_en: 'Export Beneficiaries',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.medical-history',
    display_name_ar: 'عرض التاريخ الطبي',
    display_name_en: 'View Medical History',
    module: 'beneficiaries',
    group: 'medical',
  },
  {
    name: 'beneficiaries.medical-history.edit',
    display_name_ar: 'تعديل التاريخ الطبي',
    display_name_en: 'Edit Medical History',
    module: 'beneficiaries',
    group: 'medical',
  },
  {
    name: 'beneficiaries.documents.view',
    display_name_ar: 'عرض مستندات المستفيد',
    display_name_en: 'View Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.documents.upload',
    display_name_ar: 'رفع مستندات المستفيد',
    display_name_en: 'Upload Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.documents.delete',
    display_name_ar: 'حذف مستندات المستفيد',
    display_name_en: 'Delete Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.guardians.manage',
    display_name_ar: 'إدارة أولياء الأمور',
    display_name_en: 'Manage Guardians',
    module: 'beneficiaries',
    group: 'guardians',
  },
  {
    name: 'beneficiaries.waitlist.manage',
    display_name_ar: 'إدارة قائمة الانتظار',
    display_name_en: 'Manage Waitlist',
    module: 'beneficiaries',
    group: 'waitlist',
  },
  {
    name: 'beneficiaries.assessment.manage',
    display_name_ar: 'إدارة تقييمات الإعاقة',
    display_name_en: 'Manage Disability Assessments',
    module: 'beneficiaries',
    group: 'assessment',
  },

  // ─── Clinical (18) ───────────────────────────────────────────────────────
  {
    name: 'treatment-plans.view',
    display_name_ar: 'عرض الخطط العلاجية',
    display_name_en: 'View Treatment Plans',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.create',
    display_name_ar: 'إنشاء خطة علاجية',
    display_name_en: 'Create Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.edit',
    display_name_ar: 'تعديل خطة علاجية',
    display_name_en: 'Edit Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.approve',
    display_name_ar: 'الموافقة على الخطط العلاجية',
    display_name_en: 'Approve Treatment Plans',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.delete',
    display_name_ar: 'حذف خطة علاجية',
    display_name_en: 'Delete Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'sessions.view',
    display_name_ar: 'عرض الجلسات',
    display_name_en: 'View Sessions',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.create',
    display_name_ar: 'إنشاء جلسة',
    display_name_en: 'Create Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.edit',
    display_name_ar: 'تعديل جلسة',
    display_name_en: 'Edit Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.complete',
    display_name_ar: 'إكمال جلسة وإضافة ملاحظات',
    display_name_en: 'Complete Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.cancel',
    display_name_ar: 'إلغاء جلسة',
    display_name_en: 'Cancel Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.view-all',
    display_name_ar: 'عرض كل الجلسات',
    display_name_en: 'View All Sessions',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'assessments.view',
    display_name_ar: 'عرض التقييمات',
    display_name_en: 'View Assessments',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'assessments.create',
    display_name_ar: 'إنشاء تقييم',
    display_name_en: 'Create Assessment',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'assessments.approve',
    display_name_ar: 'الموافقة على التقييمات',
    display_name_en: 'Approve Assessments',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'programs.view',
    display_name_ar: 'عرض البرامج',
    display_name_en: 'View Programs',
    module: 'clinical',
    group: 'programs',
  },
  {
    name: 'programs.manage',
    display_name_ar: 'إدارة البرامج',
    display_name_en: 'Manage Programs',
    module: 'clinical',
    group: 'programs',
  },
  {
    name: 'referrals.create',
    display_name_ar: 'إنشاء إحالة',
    display_name_en: 'Create Referral',
    module: 'clinical',
    group: 'referrals',
  },
  {
    name: 'referrals.manage',
    display_name_ar: 'إدارة الإحالات',
    display_name_en: 'Manage Referrals',
    module: 'clinical',
    group: 'referrals',
  },

  // ─── Scheduling (8) ──────────────────────────────────────────────────────
  {
    name: 'appointments.view',
    display_name_ar: 'عرض المواعيد',
    display_name_en: 'View Appointments',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.create',
    display_name_ar: 'حجز موعد',
    display_name_en: 'Create Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.edit',
    display_name_ar: 'تعديل موعد',
    display_name_en: 'Edit Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.cancel',
    display_name_ar: 'إلغاء موعد',
    display_name_en: 'Cancel Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.view-all',
    display_name_ar: 'عرض كل المواعيد',
    display_name_en: 'View All Appointments',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'schedules.view',
    display_name_ar: 'عرض جداول الأخصائيين',
    display_name_en: 'View Specialist Schedules',
    module: 'scheduling',
    group: 'schedules',
  },
  {
    name: 'schedules.manage',
    display_name_ar: 'إدارة جداول الأخصائيين',
    display_name_en: 'Manage Specialist Schedules',
    module: 'scheduling',
    group: 'schedules',
  },
  {
    name: 'rooms.manage',
    display_name_ar: 'إدارة حجز الغرف',
    display_name_en: 'Manage Room Bookings',
    module: 'scheduling',
    group: 'rooms',
  },

  // ─── HR (20) ─────────────────────────────────────────────────────────────
  {
    name: 'employees.view',
    display_name_ar: 'عرض الموظفين',
    display_name_en: 'View Employees',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.create',
    display_name_ar: 'إضافة موظف',
    display_name_en: 'Create Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.edit',
    display_name_ar: 'تعديل موظف',
    display_name_en: 'Edit Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.delete',
    display_name_ar: 'حذف/إنهاء خدمات موظف',
    display_name_en: 'Delete/Terminate Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.salary.view',
    display_name_ar: 'عرض رواتب الموظفين',
    display_name_en: 'View Employee Salaries',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.documents.manage',
    display_name_ar: 'إدارة مستندات الموظفين',
    display_name_en: 'Manage Employee Documents',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'contracts.manage',
    display_name_ar: 'إدارة العقود',
    display_name_en: 'Manage Contracts',
    module: 'hr',
    group: 'contracts',
  },
  {
    name: 'payroll.view',
    display_name_ar: 'عرض مسير الرواتب',
    display_name_en: 'View Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'payroll.process',
    display_name_ar: 'معالجة الرواتب',
    display_name_en: 'Process Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'payroll.approve',
    display_name_ar: 'الموافقة على الرواتب',
    display_name_en: 'Approve Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'leaves.view',
    display_name_ar: 'عرض الإجازات',
    display_name_en: 'View Leaves',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'leaves.request',
    display_name_ar: 'طلب إجازة',
    display_name_en: 'Request Leave',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'leaves.approve',
    display_name_ar: 'الموافقة على الإجازات',
    display_name_en: 'Approve Leaves',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'attendance.view',
    display_name_ar: 'عرض سجل الحضور',
    display_name_en: 'View Attendance',
    module: 'hr',
    group: 'attendance',
  },
  {
    name: 'attendance.manage',
    display_name_ar: 'إدارة الحضور والانصراف',
    display_name_en: 'Manage Attendance',
    module: 'hr',
    group: 'attendance',
  },
  {
    name: 'performance.view',
    display_name_ar: 'عرض تقييمات الأداء',
    display_name_en: 'View Performance Reviews',
    module: 'hr',
    group: 'performance',
  },
  {
    name: 'performance.manage',
    display_name_ar: 'إدارة تقييمات الأداء',
    display_name_en: 'Manage Performance Reviews',
    module: 'hr',
    group: 'performance',
  },
  {
    name: 'gosi.manage',
    display_name_ar: 'إدارة اشتراكات GOSI',
    display_name_en: 'Manage GOSI Subscriptions',
    module: 'hr',
    group: 'integrations',
  },
  {
    name: 'muqeem.manage',
    display_name_ar: 'إدارة معاملات مقيم',
    display_name_en: 'Manage Muqeem Transactions',
    module: 'hr',
    group: 'integrations',
  },
  {
    name: 'disciplinary.manage',
    display_name_ar: 'إدارة الإجراءات التأديبية',
    display_name_en: 'Manage Disciplinary Actions',
    module: 'hr',
    group: 'disciplinary',
  },

  // ─── Finance (22) ────────────────────────────────────────────────────────
  {
    name: 'invoices.view',
    display_name_ar: 'عرض الفواتير',
    display_name_en: 'View Invoices',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.create',
    display_name_ar: 'إنشاء فاتورة',
    display_name_en: 'Create Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.edit',
    display_name_ar: 'تعديل فاتورة',
    display_name_en: 'Edit Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.cancel',
    display_name_ar: 'إلغاء فاتورة',
    display_name_en: 'Cancel Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.submit-zatca',
    display_name_ar: 'إرسال فاتورة لـ ZATCA',
    display_name_en: 'Submit Invoice to ZATCA',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'payments.view',
    display_name_ar: 'عرض المدفوعات',
    display_name_en: 'View Payments',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'payments.create',
    display_name_ar: 'تسجيل دفعة',
    display_name_en: 'Record Payment',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'payments.refund',
    display_name_ar: 'استرداد دفعة',
    display_name_en: 'Refund Payment',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'insurance.view',
    display_name_ar: 'عرض بيانات التأمين',
    display_name_en: 'View Insurance Data',
    module: 'finance',
    group: 'insurance',
  },
  {
    name: 'insurance.manage',
    display_name_ar: 'إدارة وثائق التأمين',
    display_name_en: 'Manage Insurance Policies',
    module: 'finance',
    group: 'insurance',
  },
  {
    name: 'claims.view',
    display_name_ar: 'عرض المطالبات التأمينية',
    display_name_en: 'View Insurance Claims',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'claims.create',
    display_name_ar: 'إنشاء مطالبة تأمينية',
    display_name_en: 'Create Insurance Claim',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'claims.submit-nphies',
    display_name_ar: 'تقديم مطالبة لـ NPHIES',
    display_name_en: 'Submit Claim to NPHIES',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'accounting.view',
    display_name_ar: 'عرض القيود المحاسبية',
    display_name_en: 'View Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'accounting.manage',
    display_name_ar: 'إدارة القيود المحاسبية',
    display_name_en: 'Manage Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'accounting.post',
    display_name_ar: 'ترحيل القيود',
    display_name_en: 'Post Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'chart-of-accounts.manage',
    display_name_ar: 'إدارة دليل الحسابات',
    display_name_en: 'Manage Chart of Accounts',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'budgets.view',
    display_name_ar: 'عرض الميزانيات',
    display_name_en: 'View Budgets',
    module: 'finance',
    group: 'budgets',
  },
  {
    name: 'budgets.manage',
    display_name_ar: 'إدارة الميزانيات',
    display_name_en: 'Manage Budgets',
    module: 'finance',
    group: 'budgets',
  },
  {
    name: 'expenses.view',
    display_name_ar: 'عرض المصروفات',
    display_name_en: 'View Expenses',
    module: 'finance',
    group: 'expenses',
  },
  {
    name: 'expenses.create',
    display_name_ar: 'إنشاء مصروف',
    display_name_en: 'Create Expense',
    module: 'finance',
    group: 'expenses',
  },
  {
    name: 'expenses.approve',
    display_name_ar: 'الموافقة على المصروفات',
    display_name_en: 'Approve Expenses',
    module: 'finance',
    group: 'expenses',
  },

  // ─── Transport (8) ───────────────────────────────────────────────────────
  {
    name: 'vehicles.view',
    display_name_ar: 'عرض المركبات',
    display_name_en: 'View Vehicles',
    module: 'transport',
    group: 'vehicles',
  },
  {
    name: 'vehicles.manage',
    display_name_ar: 'إدارة المركبات',
    display_name_en: 'Manage Vehicles',
    module: 'transport',
    group: 'vehicles',
  },
  {
    name: 'routes.manage',
    display_name_ar: 'إدارة المسارات',
    display_name_en: 'Manage Routes',
    module: 'transport',
    group: 'routes',
  },
  {
    name: 'trips.view',
    display_name_ar: 'عرض الرحلات',
    display_name_en: 'View Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.manage',
    display_name_ar: 'إدارة الرحلات',
    display_name_en: 'Manage Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.my-trips',
    display_name_ar: 'عرض رحلاتي (سائق)',
    display_name_en: 'View My Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.update-status',
    display_name_ar: 'تحديث حالة الرحلة',
    display_name_en: 'Update Trip Status',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'gps.view',
    display_name_ar: 'عرض تتبع GPS',
    display_name_en: 'View GPS Tracking',
    module: 'transport',
    group: 'gps',
  },

  // ─── Inventory (10) ──────────────────────────────────────────────────────
  {
    name: 'inventory.view',
    display_name_ar: 'عرض المخزون',
    display_name_en: 'View Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'inventory.manage',
    display_name_ar: 'إدارة المخزون',
    display_name_en: 'Manage Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'inventory.adjust',
    display_name_ar: 'تعديل أرصدة المخزون',
    display_name_en: 'Adjust Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'purchase-orders.view',
    display_name_ar: 'عرض أوامر الشراء',
    display_name_en: 'View Purchase Orders',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'purchase-orders.create',
    display_name_ar: 'إنشاء أمر شراء',
    display_name_en: 'Create Purchase Order',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'purchase-orders.approve',
    display_name_ar: 'الموافقة على أوامر الشراء',
    display_name_en: 'Approve Purchase Orders',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'suppliers.manage',
    display_name_ar: 'إدارة الموردين',
    display_name_en: 'Manage Suppliers',
    module: 'inventory',
    group: 'suppliers',
  },
  {
    name: 'assets.view',
    display_name_ar: 'عرض الأصول الثابتة',
    display_name_en: 'View Assets',
    module: 'inventory',
    group: 'assets',
  },
  {
    name: 'assets.manage',
    display_name_ar: 'إدارة الأصول الثابتة',
    display_name_en: 'Manage Assets',
    module: 'inventory',
    group: 'assets',
  },
  {
    name: 'warehouses.manage',
    display_name_ar: 'إدارة المستودعات',
    display_name_en: 'Manage Warehouses',
    module: 'inventory',
    group: 'warehouses',
  },

  // ─── Quality (12) ────────────────────────────────────────────────────────
  {
    name: 'quality.standards.view',
    display_name_ar: 'عرض معايير الجودة',
    display_name_en: 'View Quality Standards',
    module: 'quality',
    group: 'standards',
  },
  {
    name: 'quality.standards.manage',
    display_name_ar: 'إدارة معايير الجودة',
    display_name_en: 'Manage Quality Standards',
    module: 'quality',
    group: 'standards',
  },
  {
    name: 'quality.checklists.manage',
    display_name_ar: 'إدارة قوائم الامتثال',
    display_name_en: 'Manage Compliance Checklists',
    module: 'quality',
    group: 'checklists',
  },
  {
    name: 'incidents.view',
    display_name_ar: 'عرض الحوادث',
    display_name_en: 'View Incidents',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'incidents.report',
    display_name_ar: 'الإبلاغ عن حادثة',
    display_name_en: 'Report Incident',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'incidents.manage',
    display_name_ar: 'إدارة الحوادث',
    display_name_en: 'Manage Incidents',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'complaints.view',
    display_name_ar: 'عرض الشكاوى',
    display_name_en: 'View Complaints',
    module: 'quality',
    group: 'complaints',
  },
  {
    name: 'complaints.manage',
    display_name_ar: 'إدارة الشكاوى',
    display_name_en: 'Manage Complaints',
    module: 'quality',
    group: 'complaints',
  },
  {
    name: 'surveys.manage',
    display_name_ar: 'إدارة الاستبيانات',
    display_name_en: 'Manage Surveys',
    module: 'quality',
    group: 'surveys',
  },
  {
    name: 'audits.manage',
    display_name_ar: 'إدارة التدقيق',
    display_name_en: 'Manage Audit Records',
    module: 'quality',
    group: 'audits',
  },
  {
    name: 'risk.manage',
    display_name_ar: 'إدارة المخاطر',
    display_name_en: 'Manage Risk Assessments',
    module: 'quality',
    group: 'risk',
  },
  {
    name: 'improvements.manage',
    display_name_ar: 'إدارة خطط التحسين',
    display_name_en: 'Manage Improvement Plans',
    module: 'quality',
    group: 'improvements',
  },

  // ─── Communication (8) ───────────────────────────────────────────────────
  {
    name: 'messages.send',
    display_name_ar: 'إرسال رسائل داخلية',
    display_name_en: 'Send Internal Messages',
    module: 'communication',
    group: 'messages',
  },
  {
    name: 'messages.view-all',
    display_name_ar: 'عرض كل الرسائل',
    display_name_en: 'View All Messages',
    module: 'communication',
    group: 'messages',
  },
  {
    name: 'announcements.view',
    display_name_ar: 'عرض الإعلانات',
    display_name_en: 'View Announcements',
    module: 'communication',
    group: 'announcements',
  },
  {
    name: 'announcements.manage',
    display_name_ar: 'إدارة الإعلانات',
    display_name_en: 'Manage Announcements',
    module: 'communication',
    group: 'announcements',
  },
  {
    name: 'sms.send',
    display_name_ar: 'إرسال رسائل SMS',
    display_name_en: 'Send SMS',
    module: 'communication',
    group: 'sms',
  },
  {
    name: 'whatsapp.send',
    display_name_ar: 'إرسال رسائل WhatsApp',
    display_name_en: 'Send WhatsApp',
    module: 'communication',
    group: 'whatsapp',
  },
  {
    name: 'notifications.manage',
    display_name_ar: 'إدارة قوالب الإشعارات',
    display_name_en: 'Manage Notification Templates',
    module: 'communication',
    group: 'notifications',
  },
  {
    name: 'communication-logs.view',
    display_name_ar: 'عرض سجلات التواصل',
    display_name_en: 'View Communication Logs',
    module: 'communication',
    group: 'logs',
  },

  // ─── Documents (5) ───────────────────────────────────────────────────────
  {
    name: 'documents.view',
    display_name_ar: 'عرض الوثائق',
    display_name_en: 'View Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.upload',
    display_name_ar: 'رفع وثائق',
    display_name_en: 'Upload Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.manage',
    display_name_ar: 'إدارة الوثائق',
    display_name_en: 'Manage Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.sign',
    display_name_ar: 'توقيع الوثائق',
    display_name_en: 'Sign Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.archive',
    display_name_ar: 'أرشفة الوثائق',
    display_name_en: 'Archive Documents',
    module: 'documents',
    group: 'documents',
  },

  // ─── Reports (8) ─────────────────────────────────────────────────────────
  {
    name: 'reports.view',
    display_name_ar: 'عرض التقارير',
    display_name_en: 'View Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.generate',
    display_name_ar: 'توليد التقارير',
    display_name_en: 'Generate Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.export',
    display_name_ar: 'تصدير التقارير',
    display_name_en: 'Export Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.schedule',
    display_name_ar: 'جدولة التقارير',
    display_name_en: 'Schedule Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.financial',
    display_name_ar: 'التقارير المالية',
    display_name_en: 'Financial Reports',
    module: 'reports',
    group: 'financial-reports',
  },
  {
    name: 'reports.clinical',
    display_name_ar: 'التقارير السريرية',
    display_name_en: 'Clinical Reports',
    module: 'reports',
    group: 'clinical-reports',
  },
  {
    name: 'reports.hr',
    display_name_ar: 'تقارير الموارد البشرية',
    display_name_en: 'HR Reports',
    module: 'reports',
    group: 'hr-reports',
  },
  {
    name: 'kpi.view',
    display_name_ar: 'عرض مؤشرات الأداء',
    display_name_en: 'View KPIs',
    module: 'reports',
    group: 'kpi',
  },

  // ─── Settings (16) ───────────────────────────────────────────────────────
  {
    name: 'settings.view',
    display_name_ar: 'عرض الإعدادات',
    display_name_en: 'View Settings',
    module: 'settings',
    group: 'general',
  },
  {
    name: 'settings.manage',
    display_name_ar: 'تعديل الإعدادات',
    display_name_en: 'Manage Settings',
    module: 'settings',
    group: 'general',
  },
  {
    name: 'branches.view',
    display_name_ar: 'عرض الفروع',
    display_name_en: 'View Branches',
    module: 'settings',
    group: 'branches',
  },
  {
    name: 'branches.manage',
    display_name_ar: 'إدارة الفروع',
    display_name_en: 'Manage Branches',
    module: 'settings',
    group: 'branches',
  },
  {
    name: 'users.view',
    display_name_ar: 'عرض المستخدمين',
    display_name_en: 'View Users',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.create',
    display_name_ar: 'إنشاء مستخدم',
    display_name_en: 'Create User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.edit',
    display_name_ar: 'تعديل مستخدم',
    display_name_en: 'Edit User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.delete',
    display_name_ar: 'حذف/تعطيل مستخدم',
    display_name_en: 'Delete/Deactivate User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'roles.view',
    display_name_ar: 'عرض الأدوار',
    display_name_en: 'View Roles',
    module: 'settings',
    group: 'roles',
  },
  {
    name: 'roles.manage',
    display_name_ar: 'إدارة الأدوار والصلاحيات',
    display_name_en: 'Manage Roles & Permissions',
    module: 'settings',
    group: 'roles',
  },
  {
    name: 'audit-logs.view',
    display_name_ar: 'عرض سجلات المراجعة',
    display_name_en: 'View Audit Logs',
    module: 'settings',
    group: 'audit',
  },
  {
    name: 'integrations.zatca',
    display_name_ar: 'إدارة تكامل ZATCA',
    display_name_en: 'Manage ZATCA Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.nphies',
    display_name_ar: 'إدارة تكامل NPHIES',
    display_name_en: 'Manage NPHIES Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.gosi',
    display_name_ar: 'إدارة تكامل GOSI',
    display_name_en: 'Manage GOSI Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.muqeem',
    display_name_ar: 'إدارة تكامل مقيم',
    display_name_en: 'Manage Muqeem Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'backups.manage',
    display_name_ar: 'إدارة النسخ الاحتياطية',
    display_name_en: 'Manage Backups',
    module: 'settings',
    group: 'system',
  },

  // ─── Parent Portal (4) ───────────────────────────────────────────────────
  {
    name: 'portal.view-children',
    display_name_ar: 'عرض بيانات الأبناء',
    display_name_en: 'View Children Data',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-appointments',
    display_name_ar: 'عرض مواعيد الأبناء',
    display_name_en: 'View Children Appointments',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-reports',
    display_name_ar: 'عرض تقارير الأبناء',
    display_name_en: 'View Children Reports',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-invoices',
    display_name_ar: 'عرض فواتير الأبناء',
    display_name_en: 'View Children Invoices',
    module: 'portal',
    group: 'parent',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// مصفوفة ربط الأدوار بالصلاحيات
// ═══════════════════════════════════════════════════════════════════════════
const ROLE_PERMISSION_MAP = {
  'super-admin': '*', // كل الصلاحيات

  'branch-admin': {
    exclude: [
      'branches.manage',
      'roles.manage',
      'integrations.zatca',
      'integrations.nphies',
      'integrations.gosi',
      'integrations.muqeem',
      'backups.manage',
    ],
  },

  'medical-director': {
    modules: [
      'dashboard',
      'beneficiaries',
      'clinical',
      'scheduling',
      'reports',
      'quality',
      'communication',
      'documents',
    ],
    extra: ['employees.view', 'announcements.view'],
  },

  doctor: {
    explicit: [
      'dashboard.view',
      'dashboard.statistics',
      'beneficiaries.view',
      'beneficiaries.medical-history',
      'beneficiaries.medical-history.edit',
      'beneficiaries.documents.view',
      'beneficiaries.assessment.manage',
      'treatment-plans.view',
      'treatment-plans.create',
      'treatment-plans.edit',
      'treatment-plans.approve',
      'sessions.view',
      'sessions.view-all',
      'assessments.view',
      'assessments.create',
      'assessments.approve',
      'referrals.create',
      'referrals.manage',
      'programs.view',
      'appointments.view',
      'appointments.view-all',
      'schedules.view',
      'incidents.report',
      'incidents.view',
      'reports.view',
      'reports.generate',
      'reports.clinical',
      'messages.send',
      'announcements.view',
      'documents.view',
      'documents.upload',
      'documents.sign',
      'leaves.request',
    ],
  },

  therapist: {
    explicit: [
      'dashboard.view',
      'beneficiaries.view',
      'beneficiaries.medical-history',
      'beneficiaries.documents.view',
      'treatment-plans.view',
      'treatment-plans.create',
      'treatment-plans.edit',
      'sessions.view',
      'sessions.create',
      'sessions.edit',
      'sessions.complete',
      'sessions.cancel',
      'assessments.view',
      'assessments.create',
      'programs.view',
      'referrals.create',
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'schedules.view',
      'incidents.report',
      'reports.view',
      'reports.clinical',
      'messages.send',
      'announcements.view',
      'documents.view',
      'documents.upload',
      'leaves.request',
    ],
  },

  'special-educator': {
    explicit: [
      'dashboard.view',
      'beneficiaries.view',
      'beneficiaries.documents.view',
      'treatment-plans.view',
      'treatment-plans.create',
      'treatment-plans.edit',
      'sessions.view',
      'sessions.create',
      'sessions.edit',
      'sessions.complete',
      'assessments.view',
      'assessments.create',
      'programs.view',
      'programs.manage',
      'appointments.view',
      'appointments.create',
      'schedules.view',
      'incidents.report',
      'reports.view',
      'messages.send',
      'announcements.view',
      'documents.view',
      'documents.upload',
      'leaves.request',
    ],
  },

  receptionist: {
    explicit: [
      'dashboard.view',
      'beneficiaries.view',
      'beneficiaries.create',
      'beneficiaries.edit',
      'beneficiaries.documents.view',
      'beneficiaries.documents.upload',
      'beneficiaries.guardians.manage',
      'beneficiaries.waitlist.manage',
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'appointments.view-all',
      'schedules.view',
      'rooms.manage',
      'invoices.view',
      'invoices.create',
      'payments.view',
      'payments.create',
      'insurance.view',
      'messages.send',
      'announcements.view',
      'sms.send',
      'whatsapp.send',
      'reports.view',
      'leaves.request',
    ],
  },

  accountant: {
    modules: ['finance', 'reports'],
    extra: [
      'dashboard.view',
      'dashboard.statistics',
      'dashboard.financial-summary',
      'beneficiaries.view',
      'insurance.view',
      'insurance.manage',
      'messages.send',
      'announcements.view',
      'leaves.request',
    ],
  },

  'hr-manager': {
    modules: ['hr'],
    extra: [
      'dashboard.view',
      'dashboard.statistics',
      'reports.view',
      'reports.generate',
      'reports.export',
      'reports.hr',
      'messages.send',
      'announcements.view',
      'announcements.manage',
      'documents.view',
      'documents.upload',
      'documents.manage',
      'kpi.view',
    ],
  },

  driver: {
    explicit: [
      'dashboard.view',
      'trips.my-trips',
      'trips.update-status',
      'messages.send',
      'announcements.view',
      'incidents.report',
      'leaves.request',
    ],
  },

  'parent-guardian': {
    explicit: [
      'portal.view-children',
      'portal.view-appointments',
      'portal.view-reports',
      'portal.view-invoices',
      'messages.send',
      'announcements.view',
    ],
  },

  auditor: {
    pattern: 'view-only', // كل صلاحيات العرض فقط
    extra: [
      'dashboard.view',
      'dashboard.statistics',
      'dashboard.financial-summary',
      'audit-logs.view',
      'communication-logs.view',
      'reports.view',
      'reports.generate',
      'reports.export',
      'reports.financial',
      'reports.clinical',
      'reports.hr',
      'kpi.view',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// دالة حساب الصلاحيات لكل دور
// ═══════════════════════════════════════════════════════════════════════════

function resolvePermissionsForRole(roleName, allPermissions) {
  const mapping = ROLE_PERMISSION_MAP[roleName];
  if (!mapping) return [];

  // مدير النظام: كل الصلاحيات
  if (mapping === '*') return allPermissions.map(p => p.name);

  const names = new Set();

  // صلاحيات صريحة
  if (mapping.explicit) {
    mapping.explicit.forEach(p => names.add(p));
    return [...names];
  }

  // صلاحيات قائمة على وحدات
  if (mapping.modules) {
    allPermissions.filter(p => mapping.modules.includes(p.module)).forEach(p => names.add(p.name));
  }

  // صلاحيات إضافية
  if (mapping.extra) {
    mapping.extra.forEach(p => names.add(p));
  }

  // استثناءات
  if (mapping.exclude) {
    mapping.exclude.forEach(p => names.delete(p));
  }

  // نمط view-only (المدقق)
  if (mapping.pattern === 'view-only') {
    allPermissions
      .filter(p => p.name.includes('.view') || p.name.includes('view-'))
      .forEach(p => names.add(p.name));
  }

  // كل الصلاحيات ما عدا المستثناة
  if (mapping.exclude && !mapping.modules && !mapping.explicit) {
    allPermissions.filter(p => !mapping.exclude.includes(p.name)).forEach(p => names.add(p.name));
  }

  return [...names];
}

// ═══════════════════════════════════════════════════════════════════════════
// دالة التشغيل الرئيسية
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael_rehab';

  let connection;

  try {
    console.log('🔗 Connecting to MongoDB...');
    connection = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // ── 1. إنشاء / تحديث الصلاحيات ───────────────────────────────────────
    console.log('📋 Seeding permissions (161)...');
    const permOps = PERMISSIONS_DATA.map(p =>
      Permission.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true })
    );
    const allPermissions = await Promise.all(permOps);
    console.log(`✅ ${allPermissions.length} permissions seeded`);

    // ── 2. إنشاء / تحديث الأدوار وربطها بالصلاحيات ─────────────────────
    console.log('👥 Seeding roles (12) and assigning permissions...');
    let rolesSeeded = 0;

    for (const roleData of ROLES_DATA) {
      const permsForRole = resolvePermissionsForRole(roleData.name, allPermissions);

      await Role.findOneAndUpdate(
        { name: roleData.name },
        {
          ...roleData,
          permissions: permsForRole,
        },
        { upsert: true, new: true }
      );

      console.log(
        `  ✓ ${roleData.display_name_ar} (${roleData.name}): ${permsForRole.length} permissions`
      );
      rolesSeeded++;
    }

    console.log(
      `\n✅ Seeding complete: ${rolesSeeded} roles, ${allPermissions.length} permissions`
    );
    console.log('\n📊 Summary:');
    console.log('  ╔══════════════════════════════════╗');
    console.log(`  ║  Roles:       ${rolesSeeded.toString().padEnd(18)} ║`);
    console.log(`  ║  Permissions: ${allPermissions.length.toString().padEnd(18)} ║`);
    console.log('  ╚══════════════════════════════════╝');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// تشغيل مباشر
if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run, ROLES_DATA, PERMISSIONS_DATA, ROLE_PERMISSION_MAP };
