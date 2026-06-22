'use strict';

/**
 * role-profiles.registry.js — Wave 23.
 *
 * Decision-support profile per role group. Single source of truth for:
 *   • primary goals + decisions supported
 *   • which KPIs surface by default
 *   • which alert surfaces apply
 *   • which quick actions appear
 *   • what data is restricted from view
 *   • layout density preference
 *   • default landing dashboard
 *   • drill terminal level
 *
 * See `docs/blueprint/31-role-based-decision-support.md` for the
 * design contract.
 *
 * Role groups are SEMANTIC. The mapping from canonical roles (in
 * `config/constants/roles.constants.js`) to groups lives in
 * `CANONICAL_TO_GROUP` below — that's the indirection that lets us
 * add 30 role-name variants without 30 profile entries.
 */

// ─── Enums ───────────────────────────────────────────────────────

const DENSITIES = Object.freeze(['low', 'medium', 'medium-high', 'high']);

const RESTRICTED_DATA_KINDS = Object.freeze([
  'clinical_phi',
  'financial',
  'hr_compensation',
  'pii_identifiers',
  'cross_branch',
  'individual_records',
]);

const ALERT_SURFACES = Object.freeze([
  'executive',
  'branch',
  'clinical',
  'hr',
  'finance',
  'quality',
  'dpo',
  'me',
  'reception',
]);

const TERMINAL_LEVELS = Object.freeze(['executive', 'branch', 'unit', 'entity-list', 'record']);

// ─── The 9 role group profiles ────────────────────────────────

const ROLE_GROUPS = {
  executive_leadership: {
    titleAr: 'الإدارة العليا',
    titleEn: 'Executive Leadership',
    primaryGoalsAr: ['التوجيه الاستراتيجي', 'المسار المالي', 'الموقف التنظيمي', 'النمو'],
    primaryGoalsEn: [
      'Strategic direction',
      'Financial trajectory',
      'Regulatory standing',
      'Growth',
    ],
    decisionsSupportedAr: [
      'تخصيص رأس المال',
      'فتح فروع جديدة',
      'تعيينات تنفيذية',
      'تقارير مجلس الإدارة',
    ],
    decisionsSupportedEn: [
      'Capital allocation',
      'Branch openings',
      'Executive hiring',
      'Board reporting',
    ],
    defaultLanding: '/dashboards/executive',
    layoutDensity: 'low',
    kpiIds: [
      'kpi.beneficiary.active_count',
      'kpi.beneficiary.admissions_monthly',
      'kpi.invoices.overdue_count',
      'kpi.incidents.critical_open',
    ],
    alertSurfaces: ['executive'],
    quickActions: [
      {
        id: 'generate-board-pack',
        titleAr: 'أنشئ ملف مجلس الإدارة',
        titleEn: 'Generate board pack',
        deepLink: '/reports/board-pack',
        estimatedMin: 5,
      },
      {
        id: 'branch-comparison',
        titleAr: 'مقارنة الفروع',
        titleEn: 'Branch comparison',
        deepLink: '/dashboards/branches-compare',
        estimatedMin: 3,
      },
      {
        id: '12-month-forecast',
        titleAr: 'توقعات 12 شهر',
        titleEn: '12-month forecast',
        deepLink: '/dashboards/forecast?horizon=12m',
        estimatedMin: 5,
      },
    ],
    restrictedData: ['individual_records', 'pii_identifiers'],
    terminalLevel: 'branch',
  },

  head_office: {
    titleAr: 'الإدارة الرئيسية',
    titleEn: 'Head Office',
    primaryGoalsAr: ['التميز التشغيلي عبر الفروع', 'الالتزام بـ SLA', 'الاتساق بين الفروع'],
    primaryGoalsEn: [
      'Cross-branch operational excellence',
      'SLA compliance',
      'Cross-branch consistency',
    ],
    decisionsSupportedAr: ['إعادة توزيع الموارد', 'إدارة أداء الفروع', 'توحيد الإجراءات'],
    decisionsSupportedEn: [
      'Resource rebalancing',
      'Branch performance management',
      'Process standardization',
    ],
    defaultLanding: '/dashboards/head-office',
    layoutDensity: 'medium',
    kpiIds: [
      'kpi.beneficiary.active_count',
      'kpi.attendance.daily_rate',
      'kpi.therapy_sessions.completion',
      'kpi.complaints.open_count',
      'kpi.incidents.critical_open',
    ],
    alertSurfaces: ['executive', 'branch'],
    quickActions: [
      {
        id: 'branch-ranking',
        titleAr: 'ترتيب الفروع',
        titleEn: 'Branch ranking',
        deepLink: '/dashboards/branches-rank',
        estimatedMin: 3,
      },
      {
        id: 'escalations-queue',
        titleAr: 'قائمة التصعيدات',
        titleEn: 'Escalations queue',
        deepLink: '/escalations',
        estimatedMin: 10,
      },
      {
        id: 'cross-branch-sop-audit',
        titleAr: 'تدقيق الإجراءات بين الفروع',
        titleEn: 'Cross-branch SOP audit',
        deepLink: '/quality/sop-audit',
        estimatedMin: 30,
      },
    ],
    restrictedData: ['pii_identifiers'],
    terminalLevel: 'entity-list',
  },

  branch_manager: {
    titleAr: 'مدير الفرع',
    titleEn: 'Branch Manager',
    primaryGoalsAr: ['أداء الفرع', 'مخرجات المستفيدين', 'رفاه الموظفين'],
    primaryGoalsEn: ['Branch performance', 'Beneficiary outcomes', 'Staff well-being'],
    decisionsSupportedAr: ['العمليات اليومية', 'تكليفات الموظفين', 'التصعيدات', 'تخطيط الطاقة'],
    decisionsSupportedEn: ['Daily ops', 'Staff assignments', 'Escalations', 'Capacity planning'],
    defaultLanding: '/dashboards/branch/:branchId',
    layoutDensity: 'medium-high',
    kpiIds: [
      'kpi.beneficiary.active_count',
      'kpi.attendance.daily_rate',
      'kpi.goals.stalled_count',
      'kpi.therapy_sessions.completion',
      'kpi.therapist.utilization',
      'kpi.complaints.open_count',
    ],
    alertSurfaces: ['branch'],
    quickActions: [
      {
        id: 'todays-worklist',
        titleAr: 'مهام اليوم',
        titleEn: "Today's worklist",
        deepLink: '/me?branch=:branchId',
        estimatedMin: 5,
      },
      {
        id: 'staff-schedule',
        titleAr: 'جدول الموظفين',
        titleEn: 'Staff schedule',
        deepLink: '/hr/employees?branch=:branchId',
        estimatedMin: 10,
      },
      {
        id: 'open-complaints',
        titleAr: 'الشكاوى المفتوحة',
        titleEn: 'Open complaints',
        deepLink: '/crm/complaints?branch=:branchId&status=open',
        estimatedMin: 15,
      },
      {
        id: 'branch-audit-pack',
        titleAr: 'ملف تدقيق الفرع',
        titleEn: 'Branch audit pack',
        deepLink: '/quality/audit-pack?branch=:branchId',
        estimatedMin: 20,
      },
    ],
    restrictedData: ['cross_branch'],
    terminalLevel: 'record',
  },

  clinical_supervisor: {
    titleAr: 'المشرف السريري',
    titleEn: 'Clinical Supervisor',
    primaryGoalsAr: ['المخرجات السريرية', 'جودة خطط الرعاية', 'تطوير المعالجين'],
    primaryGoalsEn: ['Clinical outcomes', 'Care plan quality', 'Therapist development'],
    decisionsSupportedAr: [
      'اعتماد خطط الرعاية',
      'تعديل التدخلات',
      'تدريب المعالجين',
      'إعادة توزيع الحالات',
    ],
    decisionsSupportedEn: [
      'Care plan approvals',
      'Intervention adjustments',
      'Therapist coaching',
      'Caseload rebalancing',
    ],
    defaultLanding: '/dashboards/branch/:branchId/care',
    layoutDensity: 'high',
    kpiIds: [
      'kpi.goals.stalled_count',
      'kpi.care_plans.review_overdue',
      'kpi.therapy_sessions.completion',
      'kpi.therapist.utilization',
      'kpi.beneficiary.active_count',
    ],
    alertSurfaces: ['clinical'],
    quickActions: [
      {
        id: 'review-care-plans',
        titleAr: 'راجع خطط الرعاية',
        titleEn: 'Review care plans',
        deepLink: '/care-plans?branch=:branchId&status=pending_review',
        estimatedMin: 30,
      },
      {
        id: 'approve-assessments',
        titleAr: 'اعتمد التقييمات',
        titleEn: 'Approve assessments',
        deepLink: '/assessments?branch=:branchId&status=pending',
        estimatedMin: 20,
      },
      {
        id: 'open-care-360',
        titleAr: 'افتح 360',
        titleEn: 'Open Care 360',
        deepLink: '/beneficiary-portal',
        estimatedMin: 5,
      },
      {
        id: 'schedule-case-conference',
        titleAr: 'جدول اجتماع حالة',
        titleEn: 'Schedule case conference',
        deepLink: '/care/case-conferences/new?branch=:branchId',
        estimatedMin: 15,
      },
    ],
    restrictedData: ['financial', 'hr_compensation'],
    terminalLevel: 'record',
  },

  therapist: {
    titleAr: 'المعالج',
    titleEn: 'Therapist',
    primaryGoalsAr: ['تقدم المستفيدين', 'جودة الجلسات', 'توثيق دقيق وفي الوقت'],
    primaryGoalsEn: ['Patient progress', 'Session quality', 'Timely documentation'],
    decisionsSupportedAr: ['محتوى الجلسة', 'تحديث الأهداف', 'ترتيب أولويات اليوم', 'إكمال التوثيق'],
    decisionsSupportedEn: [
      'Session activities',
      'Goal updates',
      'Daily prioritization',
      'Documentation completion',
    ],
    defaultLanding: '/me',
    layoutDensity: 'high',
    kpiIds: ['kpi.therapy_sessions.completion', 'kpi.goals.stalled_count'],
    alertSurfaces: ['me'],
    quickActions: [
      {
        id: 'start-session',
        titleAr: 'ابدأ جلسة',
        titleEn: 'Start session',
        deepLink: '/sessions/new',
        estimatedMin: 1,
      },
      {
        id: 'log-progress',
        titleAr: 'سجّل تقدم',
        titleEn: 'Log progress',
        deepLink: '/smart-goals?assignee=me',
        estimatedMin: 10,
      },
      {
        id: 'open-assessment',
        titleAr: 'افتح تقييم',
        titleEn: 'Open assessment',
        deepLink: '/assessments?assignee=me',
        estimatedMin: 15,
      },
      {
        id: 'my-schedule',
        titleAr: 'جدولي',
        titleEn: 'My schedule',
        deepLink: '/appointments?assignee=me',
        estimatedMin: 3,
      },
    ],
    restrictedData: ['financial', 'hr_compensation', 'cross_branch'],
    terminalLevel: 'record',
  },

  finance: {
    titleAr: 'المالية',
    titleEn: 'Finance',
    primaryGoalsAr: [
      'تحصيل الإيرادات',
      'إدارة المدفوعات',
      'الاستعداد للتدقيق',
      'الالتزام بـ ZATCA',
    ],
    primaryGoalsEn: ['Revenue collection', 'AP management', 'Audit readiness', 'ZATCA compliance'],
    decisionsSupportedAr: [
      'اعتماد المدفوعات',
      'تصعيد المتأخرات',
      'مطابقة الحسابات',
      'تعديلات الميزانية',
    ],
    decisionsSupportedEn: [
      'Approve payments',
      'Escalate overdue',
      'Reconcile',
      'Budget adjustments',
    ],
    defaultLanding: '/dashboards/finance',
    layoutDensity: 'high',
    kpiIds: ['kpi.invoices.overdue_count'],
    alertSurfaces: ['finance'],
    quickActions: [
      {
        id: 'approve-invoice',
        titleAr: 'اعتمد فاتورة',
        titleEn: 'Approve invoice',
        deepLink: '/finance/invoices?status=pending_approval',
        estimatedMin: 10,
      },
      {
        id: 'send-reminder',
        titleAr: 'أرسل تذكير',
        titleEn: 'Send reminder',
        deepLink: '/finance/invoices?status=overdue',
        estimatedMin: 5,
      },
      {
        id: 'open-audit-log',
        titleAr: 'افتح سجل التدقيق',
        titleEn: 'Open audit log',
        deepLink: '/finance/audit-log',
        estimatedMin: 10,
      },
      {
        id: 'zatca-queue',
        titleAr: 'قائمة ZATCA',
        titleEn: 'ZATCA queue',
        deepLink: '/finance/zatca/queue',
        estimatedMin: 15,
      },
    ],
    restrictedData: ['clinical_phi'],
    terminalLevel: 'record',
  },

  hr: {
    titleAr: 'الموارد البشرية',
    titleEn: 'HR',
    primaryGoalsAr: [
      'تخطيط القوى العاملة',
      'الالتزام السعودي (السعودة، التأمينات)',
      'الاحتفاظ بالموظفين',
    ],
    primaryGoalsEn: ['Workforce planning', 'Saudi compliance (Saudization, GOSI)', 'Retention'],
    decisionsSupportedAr: ['التوظيف', 'إنهاء الخدمة', 'تعديلات الراتب', 'خطط التدريب', 'التهيئة'],
    decisionsSupportedEn: [
      'Hiring',
      'Terminations',
      'Salary adjustments',
      'Training plans',
      'Onboarding',
    ],
    defaultLanding: '/dashboards/hr',
    layoutDensity: 'medium',
    kpiIds: ['kpi.therapist.utilization', 'kpi.documents.expiring_30d'],
    alertSurfaces: ['hr'],
    quickActions: [
      {
        id: 'open-employee',
        titleAr: 'افتح موظف',
        titleEn: 'Open employee',
        deepLink: '/hr/employees',
        estimatedMin: 5,
      },
      {
        id: 'schedule-training',
        titleAr: 'جدول تدريب',
        titleEn: 'Schedule training',
        deepLink: '/hr/training/new',
        estimatedMin: 15,
      },
      {
        id: 'view-onboarding',
        titleAr: 'مسارات التهيئة',
        titleEn: 'View onboarding',
        deepLink: '/hr/onboarding',
        estimatedMin: 10,
      },
      {
        id: 'payroll-preview',
        titleAr: 'معاينة الرواتب',
        titleEn: 'Payroll preview',
        deepLink: '/hr/payroll/preview',
        estimatedMin: 20,
      },
    ],
    restrictedData: ['clinical_phi'],
    terminalLevel: 'record',
  },

  quality_compliance: {
    titleAr: 'الجودة والامتثال',
    titleEn: 'Quality & Compliance',
    primaryGoalsAr: [
      'الامتثال التنظيمي (سباهي، ISO 9001، نظام حماية البيانات)',
      'تقليل الحوادث',
      'الاستعداد للتدقيق',
    ],
    primaryGoalsEn: [
      'Regulatory compliance (CBAHI, ISO 9001, PDPL)',
      'Incident reduction',
      'Audit prep',
    ],
    decisionsSupportedAr: [
      'بدء CAPA',
      'تحديد أولويات التدقيق',
      'تحديث السياسات',
      'الرد على طلبات حقوق الموضوع',
    ],
    decisionsSupportedEn: [
      'CAPA initiation',
      'Audit prioritization',
      'Policy updates',
      'Subject access response (DSAR)',
    ],
    defaultLanding: '/dashboards/quality',
    layoutDensity: 'medium-high',
    kpiIds: [
      'kpi.incidents.critical_open',
      'kpi.complaints.open_count',
      'kpi.documents.expiring_30d',
      'kpi.care_plans.review_overdue',
    ],
    alertSurfaces: ['quality', 'dpo'],
    quickActions: [
      {
        id: 'open-incident',
        titleAr: 'افتح حادثة',
        titleEn: 'Open incident',
        deepLink: '/quality/incidents?status=open',
        estimatedMin: 30,
      },
      {
        id: 'start-rca',
        titleAr: 'ابدأ تحليل سبب جذري',
        titleEn: 'Start RCA',
        deepLink: '/quality/rca/new',
        estimatedMin: 60,
      },
      {
        id: 'capa-queue',
        titleAr: 'قائمة CAPA',
        titleEn: 'CAPA queue',
        deepLink: '/quality/capa',
        estimatedMin: 20,
      },
      {
        id: 'dsar-queue',
        titleAr: 'قائمة طلبات حقوق الموضوع',
        titleEn: 'DSAR queue',
        deepLink: '/compliance/dsar',
        estimatedMin: 20,
      },
      {
        id: 'open-audit',
        titleAr: 'افتح تدقيق',
        titleEn: 'Open audit',
        deepLink: '/quality/audits',
        estimatedMin: 30,
      },
    ],
    restrictedData: [],
    terminalLevel: 'record',
  },

  reception: {
    titleAr: 'الاستقبال / خدمة المستفيدين',
    titleEn: 'Reception / Beneficiary Service',
    primaryGoalsAr: ['تسجيل دخول سلس', 'معالجة الشكاوى', 'تنظيم لوجستيات اليوم'],
    primaryGoalsEn: ['Smooth intake', 'Complaint handling', 'Daily logistics'],
    decisionsSupportedAr: ['جدولة الزيارات', 'توجيه الشكاوى', 'تنسيق النقل', 'التواصل مع الأهل'],
    decisionsSupportedEn: [
      'Visit scheduling',
      'Complaint routing',
      'Transport coordination',
      'Family communication',
    ],
    defaultLanding: '/dashboards/reception',
    layoutDensity: 'high',
    kpiIds: ['kpi.attendance.daily_rate', 'kpi.complaints.open_count'],
    alertSurfaces: ['reception', 'me'],
    quickActions: [
      {
        id: 'check-in',
        titleAr: 'تسجيل حضور',
        titleEn: 'Check-in',
        deepLink: '/attendance/check-in?branch=:branchId&date=today',
        estimatedMin: 1,
      },
      {
        id: 'log-complaint',
        titleAr: 'سجّل شكوى',
        titleEn: 'Log complaint',
        deepLink: '/crm/complaints/new?branch=:branchId',
        estimatedMin: 10,
      },
      {
        id: 'schedule-visit',
        titleAr: 'جدول زيارة',
        titleEn: 'Schedule visit',
        deepLink: '/appointments/new?branch=:branchId',
        estimatedMin: 5,
      },
      {
        id: 'print-attendance',
        titleAr: 'اطبع كشف الحضور',
        titleEn: 'Print attendance sheet',
        deepLink: '/attendance?branch=:branchId&date=today&print=true',
        estimatedMin: 2,
      },
    ],
    restrictedData: ['clinical_phi', 'financial', 'hr_compensation'],
    terminalLevel: 'entity-list',
  },
};

Object.freeze(ROLE_GROUPS);

// ─── Canonical role → group mapping ────────────────────────────

const CANONICAL_TO_GROUP = Object.freeze({
  // Executive layer
  super_admin: 'executive_leadership',
  // Head office layer
  head_office_admin: 'head_office',
  admin: 'head_office',
  // Branch layer
  manager: 'branch_manager',
  // Clinical supervisor layer
  supervisor: 'clinical_supervisor',
  nursing_supervisor: 'clinical_supervisor',
  head_nurse: 'clinical_supervisor',
  // Therapist layer (direct care providers)
  therapist: 'therapist',
  doctor: 'therapist',
  teacher: 'therapist',
  nurse: 'therapist',
  // Finance
  finance: 'finance',
  accountant: 'finance',
  // HR
  hr: 'hr',
  hr_manager: 'hr',
  // Quality & Compliance
  dpo: 'quality_compliance',
  crm_supervisor: 'quality_compliance',
  // Reception
  receptionist: 'reception',
  patient_relations_officer: 'reception',
});

// ─── Public API ────────────────────────────────────────────────

function listGroupKeys() {
  return Object.keys(ROLE_GROUPS);
}

function getProfile(groupKey) {
  return ROLE_GROUPS[groupKey] || null;
}

function resolveRoleGroup(canonicalRole) {
  if (!canonicalRole) return null;
  return CANONICAL_TO_GROUP[canonicalRole] || null;
}

function getRegistry() {
  return ROLE_GROUPS;
}

module.exports = {
  ROLE_GROUPS,
  CANONICAL_TO_GROUP,
  DENSITIES,
  RESTRICTED_DATA_KINDS,
  ALERT_SURFACES,
  TERMINAL_LEVELS,
  listGroupKeys,
  getProfile,
  resolveRoleGroup,
  getRegistry,
};
