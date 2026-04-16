/**
 * rehab-roles.js — تعريف الأدوار والصلاحيات لنظام مراكز تأهيل ذوي الإعاقة
 *
 * الملف: backend/config/rehab-roles.js
 * المصدر: prompt_03 — نظام إدارة مراكز تأهيل ذوي الإعاقة — Rehab-ERP v2.0
 *
 * هذا الملف مستقل تماماً عن نظام RBAC الموجود في:
 *   - backend/rbac.js (النظام العام)
 *   - backend/permissions/ (خدمة الصلاحيات المتقدمة)
 *
 * يُستخدم هذا الملف لنظام مراكز التأهيل المتخصصة فقط.
 */

'use strict';

const { resolveRole, CROSS_BRANCH_ROLES } = require('./constants/roles.constants');

// ═══════════════════════════════════════════════════════════════
// الأدوار الـ 12 لنظام مراكز التأهيل
// ═══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} RehabRole
 * @property {string} name - اسم الدور (slug)
 * @property {string} displayNameAr - الاسم بالعربية
 * @property {string} displayNameEn - الاسم بالإنجليزية
 * @property {boolean} isSystem - هل هو دور نظامي لا يمكن حذفه
 * @property {number} level - مستوى الصلاحية (كلما قلّ أكثر صلاحية)
 */

const REHAB_ROLES = [
  {
    name: 'super-admin',
    displayNameAr: 'مدير النظام',
    displayNameEn: 'Super Admin',
    isSystem: true,
    level: 0,
    description: 'صلاحيات كاملة على كل الفروع، إدارة النظام والإعدادات، لا قيود',
  },
  {
    name: 'branch-admin',
    displayNameAr: 'مدير الفرع',
    displayNameEn: 'Branch Admin',
    isSystem: true,
    level: 1,
    description: 'صلاحيات كاملة على فرع واحد، إدارة الموظفين والإعدادات المحلية',
  },
  {
    name: 'medical-director',
    displayNameAr: 'المدير الطبي',
    displayNameEn: 'Medical Director',
    isSystem: true,
    level: 2,
    description: 'إشراف سريري كامل، الموافقة على الخطط العلاجية، مراجعة التقييمات',
  },
  {
    name: 'doctor',
    displayNameAr: 'طبيب',
    displayNameEn: 'Doctor',
    isSystem: true,
    level: 3,
    description: 'تشخيص، وصف، إحالة، كتابة تقارير طبية',
  },
  {
    name: 'therapist',
    displayNameAr: 'أخصائي علاج',
    displayNameEn: 'Therapist',
    isSystem: true,
    level: 4,
    description: 'إدارة جلساته، كتابة ملاحظات، متابعة أهداف، تقارير تقدم',
  },
  {
    name: 'special-educator',
    displayNameAr: 'معلم تربية خاصة',
    displayNameEn: 'Special Educator',
    isSystem: true,
    level: 4,
    description: 'إدارة البرامج التعليمية، تقييمات تربوية، خطط تعليمية فردية',
  },
  {
    name: 'receptionist',
    displayNameAr: 'موظف استقبال',
    displayNameEn: 'Receptionist',
    isSystem: true,
    level: 5,
    description: 'تسجيل المستفيدين، إدارة المواعيد، الاستقبال',
  },
  {
    name: 'accountant',
    displayNameAr: 'محاسب',
    displayNameEn: 'Accountant',
    isSystem: true,
    level: 5,
    description: 'فواتير، مدفوعات، مطالبات تأمينية، تقارير مالية',
  },
  {
    name: 'hr-manager',
    displayNameAr: 'مدير موارد بشرية',
    displayNameEn: 'HR Manager',
    isSystem: true,
    level: 3,
    description: 'إدارة الموظفين، الرواتب، الإجازات، GOSI، مقيم',
  },
  {
    name: 'driver',
    displayNameAr: 'سائق',
    displayNameEn: 'Driver',
    isSystem: true,
    level: 6,
    description: 'عرض الرحلات المسندة، تسجيل الحضور، تأكيد الاستلام/التسليم',
  },
  {
    name: 'parent-guardian',
    displayNameAr: 'ولي أمر',
    displayNameEn: 'Parent/Guardian',
    isSystem: true,
    level: 7,
    description: 'بوابة محدودة: عرض بيانات أبنائه، المواعيد، التقارير، الفواتير',
  },
  {
    name: 'auditor',
    displayNameAr: 'مدقق',
    displayNameEn: 'Auditor',
    isSystem: true,
    level: 8,
    description: 'قراءة فقط: عرض كل البيانات بدون تعديل، تصدير التقارير',
  },
];

// ═══════════════════════════════════════════════════════════════
// الصلاحيات الـ 161 لنظام مراكز التأهيل
// ═══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} RehabPermission
 * @property {string} name - مفتاح الصلاحية
 * @property {string} displayNameAr - الاسم بالعربية
 * @property {string} displayNameEn - الاسم بالإنجليزية
 * @property {string} module - الوحدة
 * @property {string} group - المجموعة
 */

const REHAB_PERMISSIONS = [
  // ─── Dashboard (4) ───
  {
    name: 'dashboard.view',
    displayNameAr: 'عرض لوحة التحكم',
    displayNameEn: 'View Dashboard',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.statistics',
    displayNameAr: 'عرض الإحصائيات',
    displayNameEn: 'View Statistics',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.financial-summary',
    displayNameAr: 'عرض الملخص المالي',
    displayNameEn: 'View Financial Summary',
    module: 'dashboard',
    group: 'dashboard',
  },
  {
    name: 'dashboard.customize',
    displayNameAr: 'تخصيص لوحة التحكم',
    displayNameEn: 'Customize Dashboard',
    module: 'dashboard',
    group: 'dashboard',
  },

  // ─── Beneficiaries (14) ───
  {
    name: 'beneficiaries.view',
    displayNameAr: 'عرض المستفيدين',
    displayNameEn: 'View Beneficiaries',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.create',
    displayNameAr: 'إضافة مستفيد',
    displayNameEn: 'Create Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.edit',
    displayNameAr: 'تعديل مستفيد',
    displayNameEn: 'Edit Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.delete',
    displayNameAr: 'حذف مستفيد',
    displayNameEn: 'Delete Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.transfer',
    displayNameAr: 'نقل مستفيد بين الفروع',
    displayNameEn: 'Transfer Beneficiary',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.export',
    displayNameAr: 'تصدير بيانات المستفيدين',
    displayNameEn: 'Export Beneficiaries',
    module: 'beneficiaries',
    group: 'beneficiaries',
  },
  {
    name: 'beneficiaries.medical-history',
    displayNameAr: 'عرض التاريخ الطبي',
    displayNameEn: 'View Medical History',
    module: 'beneficiaries',
    group: 'medical',
  },
  {
    name: 'beneficiaries.medical-history.edit',
    displayNameAr: 'تعديل التاريخ الطبي',
    displayNameEn: 'Edit Medical History',
    module: 'beneficiaries',
    group: 'medical',
  },
  {
    name: 'beneficiaries.documents.view',
    displayNameAr: 'عرض مستندات المستفيد',
    displayNameEn: 'View Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.documents.upload',
    displayNameAr: 'رفع مستندات المستفيد',
    displayNameEn: 'Upload Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.documents.delete',
    displayNameAr: 'حذف مستندات المستفيد',
    displayNameEn: 'Delete Beneficiary Documents',
    module: 'beneficiaries',
    group: 'documents',
  },
  {
    name: 'beneficiaries.guardians.manage',
    displayNameAr: 'إدارة أولياء الأمور',
    displayNameEn: 'Manage Guardians',
    module: 'beneficiaries',
    group: 'guardians',
  },
  {
    name: 'beneficiaries.waitlist.manage',
    displayNameAr: 'إدارة قائمة الانتظار',
    displayNameEn: 'Manage Waitlist',
    module: 'beneficiaries',
    group: 'waitlist',
  },
  {
    name: 'beneficiaries.assessment.manage',
    displayNameAr: 'إدارة تقييمات الإعاقة',
    displayNameEn: 'Manage Disability Assessments',
    module: 'beneficiaries',
    group: 'assessment',
  },

  // ─── Clinical (18) ───
  {
    name: 'treatment-plans.view',
    displayNameAr: 'عرض الخطط العلاجية',
    displayNameEn: 'View Treatment Plans',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.create',
    displayNameAr: 'إنشاء خطة علاجية',
    displayNameEn: 'Create Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.edit',
    displayNameAr: 'تعديل خطة علاجية',
    displayNameEn: 'Edit Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.approve',
    displayNameAr: 'الموافقة على الخطط العلاجية',
    displayNameEn: 'Approve Treatment Plans',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'treatment-plans.delete',
    displayNameAr: 'حذف خطة علاجية',
    displayNameEn: 'Delete Treatment Plan',
    module: 'clinical',
    group: 'treatment-plans',
  },
  {
    name: 'sessions.view',
    displayNameAr: 'عرض الجلسات',
    displayNameEn: 'View Sessions',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.create',
    displayNameAr: 'إنشاء جلسة',
    displayNameEn: 'Create Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.edit',
    displayNameAr: 'تعديل جلسة',
    displayNameEn: 'Edit Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.complete',
    displayNameAr: 'إكمال جلسة وإضافة ملاحظات',
    displayNameEn: 'Complete Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.cancel',
    displayNameAr: 'إلغاء جلسة',
    displayNameEn: 'Cancel Session',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'sessions.view-all',
    displayNameAr: 'عرض كل الجلسات (ليس فقط جلساتي)',
    displayNameEn: 'View All Sessions',
    module: 'clinical',
    group: 'sessions',
  },
  {
    name: 'assessments.view',
    displayNameAr: 'عرض التقييمات',
    displayNameEn: 'View Assessments',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'assessments.create',
    displayNameAr: 'إنشاء تقييم',
    displayNameEn: 'Create Assessment',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'assessments.approve',
    displayNameAr: 'الموافقة على التقييمات',
    displayNameEn: 'Approve Assessments',
    module: 'clinical',
    group: 'assessments',
  },
  {
    name: 'programs.view',
    displayNameAr: 'عرض البرامج',
    displayNameEn: 'View Programs',
    module: 'clinical',
    group: 'programs',
  },
  {
    name: 'programs.manage',
    displayNameAr: 'إدارة البرامج',
    displayNameEn: 'Manage Programs',
    module: 'clinical',
    group: 'programs',
  },
  {
    name: 'referrals.create',
    displayNameAr: 'إنشاء إحالة',
    displayNameEn: 'Create Referral',
    module: 'clinical',
    group: 'referrals',
  },
  {
    name: 'referrals.manage',
    displayNameAr: 'إدارة الإحالات',
    displayNameEn: 'Manage Referrals',
    module: 'clinical',
    group: 'referrals',
  },

  // ─── Scheduling (8) ───
  {
    name: 'appointments.view',
    displayNameAr: 'عرض المواعيد',
    displayNameEn: 'View Appointments',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.create',
    displayNameAr: 'حجز موعد',
    displayNameEn: 'Create Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.edit',
    displayNameAr: 'تعديل موعد',
    displayNameEn: 'Edit Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.cancel',
    displayNameAr: 'إلغاء موعد',
    displayNameEn: 'Cancel Appointment',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'appointments.view-all',
    displayNameAr: 'عرض كل المواعيد',
    displayNameEn: 'View All Appointments',
    module: 'scheduling',
    group: 'appointments',
  },
  {
    name: 'schedules.view',
    displayNameAr: 'عرض جداول الأخصائيين',
    displayNameEn: 'View Specialist Schedules',
    module: 'scheduling',
    group: 'schedules',
  },
  {
    name: 'schedules.manage',
    displayNameAr: 'إدارة جداول الأخصائيين',
    displayNameEn: 'Manage Specialist Schedules',
    module: 'scheduling',
    group: 'schedules',
  },
  {
    name: 'rooms.manage',
    displayNameAr: 'إدارة حجز الغرف',
    displayNameEn: 'Manage Room Bookings',
    module: 'scheduling',
    group: 'rooms',
  },

  // ─── HR (20) ───
  {
    name: 'employees.view',
    displayNameAr: 'عرض الموظفين',
    displayNameEn: 'View Employees',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.create',
    displayNameAr: 'إضافة موظف',
    displayNameEn: 'Create Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.edit',
    displayNameAr: 'تعديل موظف',
    displayNameEn: 'Edit Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.delete',
    displayNameAr: 'حذف/إنهاء خدمات موظف',
    displayNameEn: 'Delete/Terminate Employee',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.salary.view',
    displayNameAr: 'عرض رواتب الموظفين',
    displayNameEn: 'View Employee Salaries',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'employees.documents.manage',
    displayNameAr: 'إدارة مستندات الموظفين',
    displayNameEn: 'Manage Employee Documents',
    module: 'hr',
    group: 'employees',
  },
  {
    name: 'contracts.manage',
    displayNameAr: 'إدارة العقود',
    displayNameEn: 'Manage Contracts',
    module: 'hr',
    group: 'contracts',
  },
  {
    name: 'payroll.view',
    displayNameAr: 'عرض مسير الرواتب',
    displayNameEn: 'View Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'payroll.process',
    displayNameAr: 'معالجة الرواتب',
    displayNameEn: 'Process Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'payroll.approve',
    displayNameAr: 'الموافقة على الرواتب',
    displayNameEn: 'Approve Payroll',
    module: 'hr',
    group: 'payroll',
  },
  {
    name: 'leaves.view',
    displayNameAr: 'عرض الإجازات',
    displayNameEn: 'View Leaves',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'leaves.request',
    displayNameAr: 'طلب إجازة',
    displayNameEn: 'Request Leave',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'leaves.approve',
    displayNameAr: 'الموافقة على الإجازات',
    displayNameEn: 'Approve Leaves',
    module: 'hr',
    group: 'leaves',
  },
  {
    name: 'attendance.view',
    displayNameAr: 'عرض سجل الحضور',
    displayNameEn: 'View Attendance',
    module: 'hr',
    group: 'attendance',
  },
  {
    name: 'attendance.manage',
    displayNameAr: 'إدارة الحضور والانصراف',
    displayNameEn: 'Manage Attendance',
    module: 'hr',
    group: 'attendance',
  },
  {
    name: 'performance.view',
    displayNameAr: 'عرض تقييمات الأداء',
    displayNameEn: 'View Performance Reviews',
    module: 'hr',
    group: 'performance',
  },
  {
    name: 'performance.manage',
    displayNameAr: 'إدارة تقييمات الأداء',
    displayNameEn: 'Manage Performance Reviews',
    module: 'hr',
    group: 'performance',
  },
  {
    name: 'gosi.manage',
    displayNameAr: 'إدارة اشتراكات GOSI',
    displayNameEn: 'Manage GOSI Subscriptions',
    module: 'hr',
    group: 'integrations',
  },
  {
    name: 'muqeem.manage',
    displayNameAr: 'إدارة معاملات مقيم',
    displayNameEn: 'Manage Muqeem Transactions',
    module: 'hr',
    group: 'integrations',
  },
  {
    name: 'disciplinary.manage',
    displayNameAr: 'إدارة الإجراءات التأديبية',
    displayNameEn: 'Manage Disciplinary Actions',
    module: 'hr',
    group: 'disciplinary',
  },

  // ─── Finance (22) ───
  {
    name: 'invoices.view',
    displayNameAr: 'عرض الفواتير',
    displayNameEn: 'View Invoices',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.create',
    displayNameAr: 'إنشاء فاتورة',
    displayNameEn: 'Create Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.edit',
    displayNameAr: 'تعديل فاتورة',
    displayNameEn: 'Edit Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.cancel',
    displayNameAr: 'إلغاء فاتورة',
    displayNameEn: 'Cancel Invoice',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'invoices.submit-zatca',
    displayNameAr: 'إرسال فاتورة لـ ZATCA',
    displayNameEn: 'Submit Invoice to ZATCA',
    module: 'finance',
    group: 'invoices',
  },
  {
    name: 'payments.view',
    displayNameAr: 'عرض المدفوعات',
    displayNameEn: 'View Payments',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'payments.create',
    displayNameAr: 'تسجيل دفعة',
    displayNameEn: 'Record Payment',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'payments.refund',
    displayNameAr: 'استرداد دفعة',
    displayNameEn: 'Refund Payment',
    module: 'finance',
    group: 'payments',
  },
  {
    name: 'insurance.view',
    displayNameAr: 'عرض بيانات التأمين',
    displayNameEn: 'View Insurance Data',
    module: 'finance',
    group: 'insurance',
  },
  {
    name: 'insurance.manage',
    displayNameAr: 'إدارة وثائق التأمين',
    displayNameEn: 'Manage Insurance Policies',
    module: 'finance',
    group: 'insurance',
  },
  {
    name: 'claims.view',
    displayNameAr: 'عرض المطالبات التأمينية',
    displayNameEn: 'View Insurance Claims',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'claims.create',
    displayNameAr: 'إنشاء مطالبة تأمينية',
    displayNameEn: 'Create Insurance Claim',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'claims.submit-nphies',
    displayNameAr: 'تقديم مطالبة لـ NPHIES',
    displayNameEn: 'Submit Claim to NPHIES',
    module: 'finance',
    group: 'claims',
  },
  {
    name: 'accounting.view',
    displayNameAr: 'عرض القيود المحاسبية',
    displayNameEn: 'View Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'accounting.manage',
    displayNameAr: 'إدارة القيود المحاسبية',
    displayNameEn: 'Manage Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'accounting.post',
    displayNameAr: 'ترحيل القيود',
    displayNameEn: 'Post Journal Entries',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'chart-of-accounts.manage',
    displayNameAr: 'إدارة دليل الحسابات',
    displayNameEn: 'Manage Chart of Accounts',
    module: 'finance',
    group: 'accounting',
  },
  {
    name: 'budgets.view',
    displayNameAr: 'عرض الميزانيات',
    displayNameEn: 'View Budgets',
    module: 'finance',
    group: 'budgets',
  },
  {
    name: 'budgets.manage',
    displayNameAr: 'إدارة الميزانيات',
    displayNameEn: 'Manage Budgets',
    module: 'finance',
    group: 'budgets',
  },
  {
    name: 'expenses.view',
    displayNameAr: 'عرض المصروفات',
    displayNameEn: 'View Expenses',
    module: 'finance',
    group: 'expenses',
  },
  {
    name: 'expenses.create',
    displayNameAr: 'إنشاء مصروف',
    displayNameEn: 'Create Expense',
    module: 'finance',
    group: 'expenses',
  },
  {
    name: 'expenses.approve',
    displayNameAr: 'الموافقة على المصروفات',
    displayNameEn: 'Approve Expenses',
    module: 'finance',
    group: 'expenses',
  },

  // ─── Transport (8) ───
  {
    name: 'vehicles.view',
    displayNameAr: 'عرض المركبات',
    displayNameEn: 'View Vehicles',
    module: 'transport',
    group: 'vehicles',
  },
  {
    name: 'vehicles.manage',
    displayNameAr: 'إدارة المركبات',
    displayNameEn: 'Manage Vehicles',
    module: 'transport',
    group: 'vehicles',
  },
  {
    name: 'routes.manage',
    displayNameAr: 'إدارة المسارات',
    displayNameEn: 'Manage Routes',
    module: 'transport',
    group: 'routes',
  },
  {
    name: 'trips.view',
    displayNameAr: 'عرض الرحلات',
    displayNameEn: 'View Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.manage',
    displayNameAr: 'إدارة الرحلات',
    displayNameEn: 'Manage Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.my-trips',
    displayNameAr: 'عرض رحلاتي (سائق)',
    displayNameEn: 'View My Trips',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'trips.update-status',
    displayNameAr: 'تحديث حالة الرحلة',
    displayNameEn: 'Update Trip Status',
    module: 'transport',
    group: 'trips',
  },
  {
    name: 'gps.view',
    displayNameAr: 'عرض تتبع GPS',
    displayNameEn: 'View GPS Tracking',
    module: 'transport',
    group: 'gps',
  },

  // ─── Inventory (10) ───
  {
    name: 'inventory.view',
    displayNameAr: 'عرض المخزون',
    displayNameEn: 'View Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'inventory.manage',
    displayNameAr: 'إدارة المخزون',
    displayNameEn: 'Manage Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'inventory.adjust',
    displayNameAr: 'تعديل أرصدة المخزون',
    displayNameEn: 'Adjust Inventory',
    module: 'inventory',
    group: 'items',
  },
  {
    name: 'purchase-orders.view',
    displayNameAr: 'عرض أوامر الشراء',
    displayNameEn: 'View Purchase Orders',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'purchase-orders.create',
    displayNameAr: 'إنشاء أمر شراء',
    displayNameEn: 'Create Purchase Order',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'purchase-orders.approve',
    displayNameAr: 'الموافقة على أوامر الشراء',
    displayNameEn: 'Approve Purchase Orders',
    module: 'inventory',
    group: 'purchase-orders',
  },
  {
    name: 'suppliers.manage',
    displayNameAr: 'إدارة الموردين',
    displayNameEn: 'Manage Suppliers',
    module: 'inventory',
    group: 'suppliers',
  },
  {
    name: 'assets.view',
    displayNameAr: 'عرض الأصول الثابتة',
    displayNameEn: 'View Assets',
    module: 'inventory',
    group: 'assets',
  },
  {
    name: 'assets.manage',
    displayNameAr: 'إدارة الأصول الثابتة',
    displayNameEn: 'Manage Assets',
    module: 'inventory',
    group: 'assets',
  },
  {
    name: 'warehouses.manage',
    displayNameAr: 'إدارة المستودعات',
    displayNameEn: 'Manage Warehouses',
    module: 'inventory',
    group: 'warehouses',
  },

  // ─── Quality (12) ───
  {
    name: 'quality.standards.view',
    displayNameAr: 'عرض معايير الجودة',
    displayNameEn: 'View Quality Standards',
    module: 'quality',
    group: 'standards',
  },
  {
    name: 'quality.standards.manage',
    displayNameAr: 'إدارة معايير الجودة',
    displayNameEn: 'Manage Quality Standards',
    module: 'quality',
    group: 'standards',
  },
  {
    name: 'quality.checklists.manage',
    displayNameAr: 'إدارة قوائم الامتثال',
    displayNameEn: 'Manage Compliance Checklists',
    module: 'quality',
    group: 'checklists',
  },
  {
    name: 'incidents.view',
    displayNameAr: 'عرض الحوادث',
    displayNameEn: 'View Incidents',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'incidents.report',
    displayNameAr: 'الإبلاغ عن حادثة',
    displayNameEn: 'Report Incident',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'incidents.manage',
    displayNameAr: 'إدارة الحوادث',
    displayNameEn: 'Manage Incidents',
    module: 'quality',
    group: 'incidents',
  },
  {
    name: 'complaints.view',
    displayNameAr: 'عرض الشكاوى',
    displayNameEn: 'View Complaints',
    module: 'quality',
    group: 'complaints',
  },
  {
    name: 'complaints.manage',
    displayNameAr: 'إدارة الشكاوى',
    displayNameEn: 'Manage Complaints',
    module: 'quality',
    group: 'complaints',
  },
  {
    name: 'surveys.manage',
    displayNameAr: 'إدارة الاستبيانات',
    displayNameEn: 'Manage Surveys',
    module: 'quality',
    group: 'surveys',
  },
  {
    name: 'audits.manage',
    displayNameAr: 'إدارة التدقيق',
    displayNameEn: 'Manage Audit Records',
    module: 'quality',
    group: 'audits',
  },
  {
    name: 'risk.manage',
    displayNameAr: 'إدارة المخاطر',
    displayNameEn: 'Manage Risk Assessments',
    module: 'quality',
    group: 'risk',
  },
  {
    name: 'improvements.manage',
    displayNameAr: 'إدارة خطط التحسين',
    displayNameEn: 'Manage Improvement Plans',
    module: 'quality',
    group: 'improvements',
  },

  // ─── Communication (8) ───
  {
    name: 'messages.send',
    displayNameAr: 'إرسال رسائل داخلية',
    displayNameEn: 'Send Internal Messages',
    module: 'communication',
    group: 'messages',
  },
  {
    name: 'messages.view-all',
    displayNameAr: 'عرض كل الرسائل',
    displayNameEn: 'View All Messages',
    module: 'communication',
    group: 'messages',
  },
  {
    name: 'announcements.view',
    displayNameAr: 'عرض الإعلانات',
    displayNameEn: 'View Announcements',
    module: 'communication',
    group: 'announcements',
  },
  {
    name: 'announcements.manage',
    displayNameAr: 'إدارة الإعلانات',
    displayNameEn: 'Manage Announcements',
    module: 'communication',
    group: 'announcements',
  },
  {
    name: 'sms.send',
    displayNameAr: 'إرسال رسائل SMS',
    displayNameEn: 'Send SMS',
    module: 'communication',
    group: 'sms',
  },
  {
    name: 'whatsapp.send',
    displayNameAr: 'إرسال رسائل WhatsApp',
    displayNameEn: 'Send WhatsApp',
    module: 'communication',
    group: 'whatsapp',
  },
  {
    name: 'notifications.manage',
    displayNameAr: 'إدارة قوالب الإشعارات',
    displayNameEn: 'Manage Notification Templates',
    module: 'communication',
    group: 'notifications',
  },
  {
    name: 'communication-logs.view',
    displayNameAr: 'عرض سجلات التواصل',
    displayNameEn: 'View Communication Logs',
    module: 'communication',
    group: 'logs',
  },

  // ─── Documents (5) ───
  {
    name: 'documents.view',
    displayNameAr: 'عرض الوثائق',
    displayNameEn: 'View Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.upload',
    displayNameAr: 'رفع وثائق',
    displayNameEn: 'Upload Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.manage',
    displayNameAr: 'إدارة الوثائق',
    displayNameEn: 'Manage Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.sign',
    displayNameAr: 'توقيع الوثائق',
    displayNameEn: 'Sign Documents',
    module: 'documents',
    group: 'documents',
  },
  {
    name: 'documents.archive',
    displayNameAr: 'أرشفة الوثائق',
    displayNameEn: 'Archive Documents',
    module: 'documents',
    group: 'documents',
  },

  // ─── Reports (8) ───
  {
    name: 'reports.view',
    displayNameAr: 'عرض التقارير',
    displayNameEn: 'View Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.generate',
    displayNameAr: 'توليد التقارير',
    displayNameEn: 'Generate Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.export',
    displayNameAr: 'تصدير التقارير',
    displayNameEn: 'Export Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.schedule',
    displayNameAr: 'جدولة التقارير',
    displayNameEn: 'Schedule Reports',
    module: 'reports',
    group: 'reports',
  },
  {
    name: 'reports.financial',
    displayNameAr: 'التقارير المالية',
    displayNameEn: 'Financial Reports',
    module: 'reports',
    group: 'financial-reports',
  },
  {
    name: 'reports.clinical',
    displayNameAr: 'التقارير السريرية',
    displayNameEn: 'Clinical Reports',
    module: 'reports',
    group: 'clinical-reports',
  },
  {
    name: 'reports.hr',
    displayNameAr: 'تقارير الموارد البشرية',
    displayNameEn: 'HR Reports',
    module: 'reports',
    group: 'hr-reports',
  },
  {
    name: 'kpi.view',
    displayNameAr: 'عرض مؤشرات الأداء',
    displayNameEn: 'View KPIs',
    module: 'reports',
    group: 'kpi',
  },

  // ─── Settings (16) ───
  {
    name: 'settings.view',
    displayNameAr: 'عرض الإعدادات',
    displayNameEn: 'View Settings',
    module: 'settings',
    group: 'general',
  },
  {
    name: 'settings.manage',
    displayNameAr: 'تعديل الإعدادات',
    displayNameEn: 'Manage Settings',
    module: 'settings',
    group: 'general',
  },
  {
    name: 'branches.view',
    displayNameAr: 'عرض الفروع',
    displayNameEn: 'View Branches',
    module: 'settings',
    group: 'branches',
  },
  {
    name: 'branches.manage',
    displayNameAr: 'إدارة الفروع',
    displayNameEn: 'Manage Branches',
    module: 'settings',
    group: 'branches',
  },
  {
    name: 'users.view',
    displayNameAr: 'عرض المستخدمين',
    displayNameEn: 'View Users',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.create',
    displayNameAr: 'إنشاء مستخدم',
    displayNameEn: 'Create User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.edit',
    displayNameAr: 'تعديل مستخدم',
    displayNameEn: 'Edit User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'users.delete',
    displayNameAr: 'حذف/تعطيل مستخدم',
    displayNameEn: 'Delete/Deactivate User',
    module: 'settings',
    group: 'users',
  },
  {
    name: 'roles.view',
    displayNameAr: 'عرض الأدوار',
    displayNameEn: 'View Roles',
    module: 'settings',
    group: 'roles',
  },
  {
    name: 'roles.manage',
    displayNameAr: 'إدارة الأدوار والصلاحيات',
    displayNameEn: 'Manage Roles & Permissions',
    module: 'settings',
    group: 'roles',
  },
  {
    name: 'audit-logs.view',
    displayNameAr: 'عرض سجلات المراجعة',
    displayNameEn: 'View Audit Logs',
    module: 'settings',
    group: 'audit',
  },
  {
    name: 'integrations.zatca',
    displayNameAr: 'إدارة تكامل ZATCA',
    displayNameEn: 'Manage ZATCA Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.nphies',
    displayNameAr: 'إدارة تكامل NPHIES',
    displayNameEn: 'Manage NPHIES Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.gosi',
    displayNameAr: 'إدارة تكامل GOSI',
    displayNameEn: 'Manage GOSI Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'integrations.muqeem',
    displayNameAr: 'إدارة تكامل مقيم',
    displayNameEn: 'Manage Muqeem Integration',
    module: 'settings',
    group: 'integrations',
  },
  {
    name: 'backups.manage',
    displayNameAr: 'إدارة النسخ الاحتياطية',
    displayNameEn: 'Manage Backups',
    module: 'settings',
    group: 'system',
  },

  // ─── Parent Portal (4) ───
  {
    name: 'portal.view-children',
    displayNameAr: 'عرض بيانات الأبناء',
    displayNameEn: 'View Children Data',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-appointments',
    displayNameAr: 'عرض مواعيد الأبناء',
    displayNameEn: 'View Children Appointments',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-reports',
    displayNameAr: 'عرض تقارير الأبناء',
    displayNameEn: 'View Children Reports',
    module: 'portal',
    group: 'parent',
  },
  {
    name: 'portal.view-invoices',
    displayNameAr: 'عرض فواتير الأبناء',
    displayNameEn: 'View Children Invoices',
    module: 'portal',
    group: 'parent',
  },
];

// ═══════════════════════════════════════════════════════════════
// مصفوفة توزيع الصلاحيات على الأدوار
// ═══════════════════════════════════════════════════════════════

/**
 * الصلاحيات المسندة لكل دور
 * المفتاح: اسم الدور (slug)
 * القيمة: مصفوفة أسماء الصلاحيات
 *
 * ملاحظة: super-admin يحصل على كل الصلاحيات تلقائياً
 */
const ROLE_PERMISSIONS_MAP = {
  // مدير النظام — كل الصلاحيات (يُعالَج برمجياً)
  'super-admin': ['*'],

  // مدير الفرع — كل شيء ما عدا إعدادات النظام العامة
  'branch-admin': REHAB_PERMISSIONS.filter(
    p =>
      ![
        'branches.manage',
        'roles.manage',
        'integrations.zatca',
        'integrations.nphies',
        'integrations.gosi',
        'integrations.muqeem',
        'backups.manage',
      ].includes(p.name)
  ).map(p => p.name),

  // المدير الطبي
  'medical-director': REHAB_PERMISSIONS.filter(p =>
    [
      'dashboard',
      'beneficiaries',
      'clinical',
      'scheduling',
      'reports',
      'quality',
      'communication',
      'documents',
    ].includes(p.module)
  )
    .map(p => p.name)
    .concat(['employees.view', 'announcements.view']),

  // طبيب
  doctor: [
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

  // أخصائي علاج
  therapist: [
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

  // معلم تربية خاصة
  'special-educator': [
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

  // موظف استقبال
  receptionist: [
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

  // محاسب
  accountant: [
    'dashboard.view',
    'dashboard.statistics',
    'dashboard.financial-summary',
    'beneficiaries.view',
    'insurance.view',
    'insurance.manage',
    // كل صلاحيات المالية والتقارير
    ...REHAB_PERMISSIONS.filter(p => ['finance', 'reports'].includes(p.module)).map(p => p.name),
    'messages.send',
    'announcements.view',
    'leaves.request',
  ],

  // مدير الموارد البشرية
  'hr-manager': [
    'dashboard.view',
    'dashboard.statistics',
    // كل صلاحيات HR
    ...REHAB_PERMISSIONS.filter(p => p.module === 'hr').map(p => p.name),
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

  // سائق
  driver: [
    'dashboard.view',
    'trips.my-trips',
    'trips.update-status',
    'messages.send',
    'announcements.view',
    'incidents.report',
    'leaves.request',
  ],

  // ولي أمر
  'parent-guardian': [
    'portal.view-children',
    'portal.view-appointments',
    'portal.view-reports',
    'portal.view-invoices',
    'messages.send',
    'announcements.view',
  ],

  // مدقق — قراءة فقط
  auditor: [
    ...REHAB_PERMISSIONS.filter(p => p.name.includes('.view') || p.name.includes('.view-all')).map(
      p => p.name
    ),
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
};

// ═══════════════════════════════════════════════════════════════
// أدوار الوصول للفروع — للتكامل مع branchScope.middleware.js
// ═══════════════════════════════════════════════════════════════

/**
 * الأدوار التي تملك صلاحية الوصول لجميع الفروع
 * مُتوافق مع CROSS_BRANCH_ROLES في branchScope.middleware.js
 */
const REHAB_CROSS_BRANCH_ROLES = ['super_admin', 'head_office_admin', 'admin'];

/**
 * دالة مساعدة: هل يملك الدور صلاحية معينة؟
 *
 * @param {string} roleName - اسم الدور
 * @param {string} permissionName - اسم الصلاحية
 * @returns {boolean}
 */
function rehabHasPermission(roleName, permissionName) {
  const permissions = ROLE_PERMISSIONS_MAP[roleName];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(permissionName);
}

/**
 * دالة مساعدة: الحصول على صلاحيات دور معين
 *
 * @param {string} roleName - اسم الدور
 * @returns {string[]} - مصفوفة الصلاحيات
 */
function getRolePermissions(roleName) {
  return ROLE_PERMISSIONS_MAP[roleName] || [];
}

/**
 * دالة مساعدة: الحصول على الصلاحيات حسب الوحدة
 *
 * @param {string} moduleName - اسم الوحدة
 * @returns {RehabPermission[]}
 */
function getPermissionsByModule(moduleName) {
  return REHAB_PERMISSIONS.filter(p => p.module === moduleName);
}

// ═══════════════════════════════════════════════════════════════
// Middleware — التحقق من صلاحيات التأهيل
// ═══════════════════════════════════════════════════════════════

/**
 * requireRehabPermission
 * Middleware يتحقق من صلاحية محددة لنظام التأهيل
 *
 * الاستخدام:
 *   router.get('/beneficiaries', requireRehabPermission('beneficiaries.view'), handler);
 *
 * @param {string} permissionName - اسم الصلاحية المطلوبة
 * @returns {Function} Express middleware
 */
function requireRehabPermission(permissionName) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح — يجب تسجيل الدخول',
      });
    }

    const userRole = resolveRole(user.rehabRole || user.role);

    // مدير النظام وإدارة المقر الرئيسي يملكون كل الصلاحيات
    if (CROSS_BRANCH_ROLES.includes(userRole)) {
      return next();
    }

    if (!rehabHasPermission(userRole, permissionName)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
        required: permissionName,
        yourRole: userRole,
      });
    }

    next();
  };
}

module.exports = {
  REHAB_ROLES,
  REHAB_PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
  REHAB_CROSS_BRANCH_ROLES,
  rehabHasPermission,
  getRolePermissions,
  getPermissionsByModule,
  requireRehabPermission,
};
