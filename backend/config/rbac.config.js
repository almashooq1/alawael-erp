/**
 * Unified RBAC Configuration — نظام الصلاحيات والأدوار الموحد
 *
 * Single source of truth for:
 *  - Role definitions & hierarchy
 *  - Permission definitions (resource:action)
 *  - Role → Permission mappings
 *  - Utility functions for permission resolution
 *
 * @module config/rbac
 */

// ═══════════════════════════════════════════════════════════════════════════
// ROLES — تعريف الأدوار
// ═══════════════════════════════════════════════════════════════════════════

const ROLES = {
  // Level 0 — HQ / Group
  SUPER_ADMIN: 'super_admin',
  HEAD_OFFICE_ADMIN: 'head_office_admin',
  CEO: 'ceo',
  GROUP_GM: 'group_gm',
  GROUP_CFO: 'group_cfo',
  GROUP_CHRO: 'group_chro',
  GROUP_QUALITY_OFFICER: 'group_quality_officer',
  COMPLIANCE_OFFICER: 'compliance_officer',
  INTERNAL_AUDITOR: 'internal_auditor',
  IT_ADMIN: 'it_admin',

  // Level 1 — Region (Phase 7)
  REGIONAL_DIRECTOR: 'regional_director',
  REGIONAL_QUALITY: 'regional_quality',

  // Level 2 — Branch
  ADMIN: 'admin',
  MANAGER: 'manager',
  BRANCH_MANAGER: 'branch_manager',
  CLINICAL_DIRECTOR: 'clinical_director',
  QUALITY_COORDINATOR: 'quality_coordinator',

  // Level 3 — Department supervisors
  SUPERVISOR: 'supervisor',
  HR_SUPERVISOR: 'hr_supervisor',
  FINANCE_SUPERVISOR: 'finance_supervisor',
  THERAPY_SUPERVISOR: 'therapy_supervisor',
  SPECIAL_ED_SUPERVISOR: 'special_ed_supervisor',

  // Level 4 — Specialty / Program
  DOCTOR: 'doctor',
  THERAPIST: 'therapist',
  THERAPIST_SLP: 'therapist_slp',
  THERAPIST_OT: 'therapist_ot',
  THERAPIST_PT: 'therapist_pt',
  THERAPIST_PSYCH: 'therapist_psych',
  TEACHER: 'teacher',
  SPECIAL_ED_TEACHER: 'special_ed_teacher',
  THERAPY_ASSISTANT: 'therapy_assistant',

  // Level 5 — Support
  HR: 'hr',
  HR_MANAGER: 'hr_manager',
  HR_OFFICER: 'hr_officer',
  ACCOUNTANT: 'accountant',
  FINANCE: 'finance',
  RECEPTIONIST: 'receptionist',
  DATA_ENTRY: 'data_entry',
  DRIVER: 'driver',
  BUS_ASSISTANT: 'bus_assistant',

  // External
  PARENT: 'parent',
  GUARDIAN: 'guardian',
  STUDENT: 'student',
  VIEWER: 'viewer',
  USER: 'user',
  GUEST: 'guest',
};

/** All valid role values (for validation) */
const ALL_ROLES = Object.values(ROLES);

// ═══════════════════════════════════════════════════════════════════════════
// ROLE HIERARCHY — التسلسل الهرمي للأدوار
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: {
    level: 100,
    inherits: [ROLES.HEAD_OFFICE_ADMIN],
    label: 'مدير النظام',
    labelEn: 'Super Admin',
  },
  [ROLES.HEAD_OFFICE_ADMIN]: {
    level: 95,
    inherits: [ROLES.ADMIN],
    label: 'إدارة المقر الرئيسي',
    labelEn: 'Head Office Admin',
  },
  [ROLES.ADMIN]: { level: 90, inherits: [ROLES.MANAGER], label: 'مسؤول', labelEn: 'Admin' },
  [ROLES.MANAGER]: { level: 70, inherits: [ROLES.SUPERVISOR], label: 'مدير', labelEn: 'Manager' },
  [ROLES.SUPERVISOR]: { level: 60, inherits: [ROLES.VIEWER], label: 'مشرف', labelEn: 'Supervisor' },
  [ROLES.HR]: { level: 60, inherits: [ROLES.VIEWER], label: 'موارد بشرية', labelEn: 'HR' },
  [ROLES.HR_MANAGER]: {
    level: 65,
    inherits: [ROLES.HR],
    label: 'مدير الموارد البشرية',
    labelEn: 'HR Manager',
  },
  [ROLES.ACCOUNTANT]: {
    level: 55,
    inherits: [ROLES.VIEWER],
    label: 'محاسب',
    labelEn: 'Accountant',
  },
  [ROLES.FINANCE]: { level: 60, inherits: [ROLES.ACCOUNTANT], label: 'مالية', labelEn: 'Finance' },
  [ROLES.DOCTOR]: { level: 55, inherits: [ROLES.VIEWER], label: 'طبيب', labelEn: 'Doctor' },
  [ROLES.THERAPIST]: { level: 50, inherits: [ROLES.VIEWER], label: 'معالج', labelEn: 'Therapist' },
  [ROLES.TEACHER]: { level: 50, inherits: [ROLES.VIEWER], label: 'معلم', labelEn: 'Teacher' },
  [ROLES.RECEPTIONIST]: {
    level: 40,
    inherits: [ROLES.VIEWER],
    label: 'موظف استقبال',
    labelEn: 'Receptionist',
  },
  [ROLES.DATA_ENTRY]: {
    level: 40,
    inherits: [ROLES.VIEWER],
    label: 'إدخال بيانات',
    labelEn: 'Data Entry',
  },
  [ROLES.PARENT]: { level: 30, inherits: [ROLES.GUEST], label: 'ولي أمر', labelEn: 'Parent' },
  [ROLES.STUDENT]: { level: 20, inherits: [ROLES.GUEST], label: 'طالب', labelEn: 'Student' },
  [ROLES.VIEWER]: { level: 10, inherits: [], label: 'مُطّلع', labelEn: 'Viewer' },
  [ROLES.USER]: { level: 10, inherits: [], label: 'مستخدم', labelEn: 'User' },
  [ROLES.GUEST]: { level: 0, inherits: [], label: 'زائر', labelEn: 'Guest' },

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 7 expansions — 22 new roles added 2026-04-22
  // ═════════════════════════════════════════════════════════════════════════

  // — Level 0 HQ —
  [ROLES.CEO]: {
    level: 95,
    inherits: [ROLES.HEAD_OFFICE_ADMIN],
    label: 'المدير التنفيذي',
    labelEn: 'CEO',
  },
  [ROLES.GROUP_GM]: {
    level: 90,
    inherits: [ROLES.ADMIN],
    label: 'المدير العام',
    labelEn: 'Group GM',
  },
  [ROLES.GROUP_CFO]: {
    level: 85,
    inherits: [ROLES.FINANCE],
    label: 'المدير المالي',
    labelEn: 'Group CFO',
  },
  [ROLES.GROUP_CHRO]: {
    level: 85,
    inherits: [ROLES.HR_MANAGER],
    label: 'مدير الموارد البشرية العام',
    labelEn: 'Group CHRO',
  },
  [ROLES.GROUP_QUALITY_OFFICER]: {
    level: 80,
    inherits: [ROLES.VIEWER],
    label: 'مدير الجودة العام',
    labelEn: 'Group Quality Officer',
  },
  [ROLES.COMPLIANCE_OFFICER]: {
    level: 80,
    inherits: [ROLES.VIEWER],
    label: 'مسؤول الامتثال',
    labelEn: 'Compliance Officer',
  },
  [ROLES.INTERNAL_AUDITOR]: {
    level: 75,
    inherits: [ROLES.VIEWER],
    label: 'المراجع الداخلي',
    labelEn: 'Internal Auditor',
  },
  [ROLES.IT_ADMIN]: {
    level: 95,
    inherits: [ROLES.ADMIN],
    label: 'مدير تقنية المعلومات',
    labelEn: 'IT Admin',
  },

  // — Level 1 Region —
  [ROLES.REGIONAL_DIRECTOR]: {
    level: 75,
    inherits: [ROLES.MANAGER],
    label: 'مدير المنطقة',
    labelEn: 'Regional Director',
  },
  [ROLES.REGIONAL_QUALITY]: {
    level: 65,
    inherits: [ROLES.VIEWER],
    label: 'منسق جودة المنطقة',
    labelEn: 'Regional Quality',
  },

  // — Level 2 Branch —
  [ROLES.BRANCH_MANAGER]: {
    level: 70,
    inherits: [ROLES.MANAGER],
    label: 'مدير الفرع',
    labelEn: 'Branch Manager',
  },
  [ROLES.CLINICAL_DIRECTOR]: {
    level: 70,
    inherits: [ROLES.DOCTOR],
    label: 'المدير السريري',
    labelEn: 'Clinical Director',
  },
  [ROLES.QUALITY_COORDINATOR]: {
    level: 60,
    inherits: [ROLES.VIEWER],
    label: 'منسق الجودة',
    labelEn: 'Quality Coordinator',
  },

  // — Level 3 Department supervisors —
  [ROLES.HR_SUPERVISOR]: {
    level: 60,
    inherits: [ROLES.HR],
    label: 'مشرف الموارد البشرية',
    labelEn: 'HR Supervisor',
  },
  [ROLES.FINANCE_SUPERVISOR]: {
    level: 60,
    inherits: [ROLES.ACCOUNTANT],
    label: 'مشرف المالية',
    labelEn: 'Finance Supervisor',
  },
  [ROLES.THERAPY_SUPERVISOR]: {
    level: 55,
    inherits: [ROLES.THERAPIST],
    label: 'مشرف علاجي',
    labelEn: 'Therapy Supervisor',
  },
  [ROLES.SPECIAL_ED_SUPERVISOR]: {
    level: 55,
    inherits: [ROLES.TEACHER],
    label: 'مشرف التربية الخاصة',
    labelEn: 'Special Ed Supervisor',
  },

  // — Level 4 Specialty / Program —
  [ROLES.THERAPIST_SLP]: {
    level: 50,
    inherits: [ROLES.THERAPIST],
    label: 'أخصائي نطق',
    labelEn: 'Speech-Language Pathologist',
  },
  [ROLES.THERAPIST_OT]: {
    level: 50,
    inherits: [ROLES.THERAPIST],
    label: 'أخصائي علاج وظيفي',
    labelEn: 'Occupational Therapist',
  },
  [ROLES.THERAPIST_PT]: {
    level: 50,
    inherits: [ROLES.THERAPIST],
    label: 'أخصائي علاج طبيعي',
    labelEn: 'Physical Therapist',
  },
  [ROLES.THERAPIST_PSYCH]: {
    level: 50,
    inherits: [ROLES.THERAPIST],
    label: 'أخصائي نفسي',
    labelEn: 'Psychologist',
  },
  [ROLES.SPECIAL_ED_TEACHER]: {
    level: 45,
    inherits: [ROLES.TEACHER],
    label: 'معلم تربية خاصة',
    labelEn: 'Special Ed Teacher',
  },
  [ROLES.THERAPY_ASSISTANT]: {
    level: 35,
    inherits: [ROLES.VIEWER],
    label: 'معالج مساعد',
    labelEn: 'Therapy Assistant',
  },

  // — Level 5 Support —
  [ROLES.HR_OFFICER]: {
    level: 50,
    inherits: [ROLES.HR],
    label: 'موظف موارد بشرية',
    labelEn: 'HR Officer',
  },
  [ROLES.DRIVER]: { level: 25, inherits: [ROLES.VIEWER], label: 'سائق', labelEn: 'Driver' },
  [ROLES.BUS_ASSISTANT]: {
    level: 25,
    inherits: [ROLES.VIEWER],
    label: 'مساعد نقل',
    labelEn: 'Bus Assistant',
  },

  // — External —
  [ROLES.GUARDIAN]: { level: 30, inherits: [ROLES.GUEST], label: 'ولي أمر', labelEn: 'Guardian' },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS & RESOURCES — الإجراءات والموارد
// ═══════════════════════════════════════════════════════════════════════════

const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  APPROVE: 'approve',
  MANAGE: 'manage',
};

const RESOURCES = {
  USERS: 'users',
  EMPLOYEES: 'employees',
  STUDENTS: 'students',
  PATIENTS: 'patients',
  SESSIONS: 'sessions',
  REPORTS: 'reports',
  FINANCE: 'finance',
  INVOICES: 'invoices',
  PAYROLL: 'payroll',
  HR: 'hr',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
  SCHEDULES: 'schedules',
  ATTENDANCE: 'attendance',
  ASSESSMENTS: 'assessments',
  CARE_PLANS: 'care_plans',
  VEHICLES: 'vehicles',
  INVENTORY: 'inventory',
  MAINTENANCE: 'maintenance',
  DASHBOARD: 'dashboard',
  MESSAGES: 'messages',
  // ── DDD Rehabilitation Resources ──────────────────────────────────
  BENEFICIARIES: 'beneficiaries',
  EPISODES: 'episodes',
  TIMELINE: 'timeline',
  CLINICAL_ASSESSMENTS: 'clinical_assessments',
  CARE_PLANS_DDD: 'care_plans_ddd',
  CLINICAL_SESSIONS: 'clinical_sessions',
  GOALS: 'goals',
  MEASURES: 'measures',
  WORKFLOW: 'workflow',
  PROGRAMS: 'programs',
  AI_RECOMMENDATIONS: 'ai_recommendations',
  QUALITY: 'quality',
  FAMILY: 'family',
  REPORT_TEMPLATES: 'report_templates',
  GROUP_THERAPY: 'group_therapy',
  TELE_REHAB: 'tele_rehab',
  AR_VR: 'ar_vr',
  BEHAVIOR: 'behavior',
  RESEARCH: 'research',
  FIELD_TRAINING: 'field_training',
  KPI: 'kpi',
  DECISION_ALERTS: 'decision_alerts',
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLE → PERMISSIONS MAP — خريطة الصلاحيات لكل دور
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: { '*': ['*'] },

  [ROLES.HEAD_OFFICE_ADMIN]: {
    [RESOURCES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ, ACTIONS.MANAGE],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.QUALITY]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.KPI]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.FINANCE]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.INVOICES]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.PAYROLL]: [ACTIONS.READ, ACTIONS.APPROVE],
  },

  [ROLES.ADMIN]: {
    [RESOURCES.USERS]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.MANAGE,
    ],
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ, ACTIONS.MANAGE],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
  },

  [ROLES.MANAGER]: {
    [RESOURCES.USERS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.EMPLOYEES]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ],
    [RESOURCES.SCHEDULES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
  },

  [ROLES.SUPERVISOR]: {
    [RESOURCES.EMPLOYEES]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [RESOURCES.SCHEDULES]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
  },

  [ROLES.HR]: {
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.HR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.PAYROLL]: [ACTIONS.READ],
    [RESOURCES.USERS]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE],
  },

  [ROLES.HR_MANAGER]: {
    [RESOURCES.HR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.PAYROLL]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.EXPORT, ACTIONS.MANAGE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
  },

  [ROLES.ACCOUNTANT]: {
    [RESOURCES.FINANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.INVOICES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.PAYROLL]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
  },

  [ROLES.FINANCE]: {
    [RESOURCES.FINANCE]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.MANAGE,
    ],
    [RESOURCES.INVOICES]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.APPROVE,
    ],
    [RESOURCES.PAYROLL]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ],
  },

  [ROLES.DOCTOR]: {
    [RESOURCES.PATIENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CARE_PLANS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ASSESSMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.DOCUMENTS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.SCHEDULES]: [ACTIONS.READ],
    // DDD rehabilitation
    [RESOURCES.BENEFICIARIES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.EPISODES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CARE_PLANS_DDD]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.GOALS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.MEASURES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.WORKFLOW]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.PROGRAMS]: [ACTIONS.READ],
    [RESOURCES.AI_RECOMMENDATIONS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.QUALITY]: [ACTIONS.READ],
    [RESOURCES.FAMILY]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.TIMELINE]: [ACTIONS.READ],
    [RESOURCES.KPI]: [ACTIONS.READ],
    [RESOURCES.BEHAVIOR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.GROUP_THERAPY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.TELE_REHAB]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AR_VR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.RESEARCH]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
  },

  [ROLES.THERAPIST]: {
    [RESOURCES.PATIENTS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CARE_PLANS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ASSESSMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.DOCUMENTS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.SCHEDULES]: [ACTIONS.READ],
    // DDD rehabilitation
    [RESOURCES.BENEFICIARIES]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.EPISODES]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CARE_PLANS_DDD]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.GOALS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.MEASURES]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.WORKFLOW]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AI_RECOMMENDATIONS]: [ACTIONS.READ],
    [RESOURCES.FAMILY]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.TIMELINE]: [ACTIONS.READ],
    [RESOURCES.BEHAVIOR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.GROUP_THERAPY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.TELE_REHAB]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AR_VR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
  },

  [ROLES.TEACHER]: {
    [RESOURCES.STUDENTS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.SCHEDULES]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.DOCUMENTS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.ASSESSMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
  },

  [ROLES.RECEPTIONIST]: {
    [RESOURCES.USERS]: [ACTIONS.READ],
    [RESOURCES.PATIENTS]: [ACTIONS.READ],
    [RESOURCES.SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.SCHEDULES]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
  },

  [ROLES.DATA_ENTRY]: {
    [RESOURCES.STUDENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.PATIENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.DOCUMENTS]: [ACTIONS.CREATE, ACTIONS.READ],
  },

  [ROLES.PARENT]: {
    [RESOURCES.STUDENTS]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
    // DDD family portal
    [RESOURCES.BENEFICIARIES]: [ACTIONS.READ],
    [RESOURCES.EPISODES]: [ACTIONS.READ],
    [RESOURCES.GOALS]: [ACTIONS.READ],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.READ],
    [RESOURCES.TIMELINE]: [ACTIONS.READ],
    [RESOURCES.FAMILY]: [ACTIONS.READ],
  },

  [ROLES.STUDENT]: {
    [RESOURCES.SCHEDULES]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
  },

  [ROLES.VIEWER]: {
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
  },

  [ROLES.USER]: {
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
  },

  [ROLES.GUEST]: {},

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 7 — permission maps for the new roles (2026-04-22).
  //
  // Each entry below augments the inherited permissions from its parent
  // in ROLE_HIERARCHY. Defense-in-depth is handled separately by
  // branchScope middleware + ABAC policies + (Phase 7 next commit) the
  // tenantScope mongoose plugin. This map is the RBAC source of truth
  // for WHAT actions a role can attempt; the tenant/region filters
  // decide on WHICH rows the action lands.
  // ═════════════════════════════════════════════════════════════════════════

  // — Level 0 HQ —
  [ROLES.CEO]: { '*': [ACTIONS.READ, ACTIONS.APPROVE, ACTIONS.EXPORT] },
  [ROLES.GROUP_GM]: { '*': [ACTIONS.READ, ACTIONS.APPROVE, ACTIONS.UPDATE, ACTIONS.EXPORT] },
  [ROLES.GROUP_CFO]: {
    [RESOURCES.FINANCE]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.INVOICES]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.PAYROLL]: [ACTIONS.READ, ACTIONS.APPROVE, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
  },
  [ROLES.GROUP_CHRO]: {
    [RESOURCES.EMPLOYEES]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.HR]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.PAYROLL]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE, ACTIONS.EXPORT],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
  },
  [ROLES.GROUP_QUALITY_OFFICER]: {
    [RESOURCES.QUALITY]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [ACTIONS.READ],
    [RESOURCES.CARE_PLANS_DDD]: [ACTIONS.READ, ACTIONS.APPROVE],
  },
  [ROLES.COMPLIANCE_OFFICER]: {
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.DOCUMENTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.QUALITY]: [ACTIONS.READ, ACTIONS.EXPORT],
  },
  [ROLES.INTERNAL_AUDITOR]: {
    '*': [ACTIONS.READ, ACTIONS.EXPORT],
  },
  [ROLES.IT_ADMIN]: {
    [RESOURCES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.SETTINGS]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.DELETE,
      ACTIONS.MANAGE,
    ],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
  },

  // — Level 1 Region —
  [ROLES.REGIONAL_DIRECTOR]: {
    // regional_director gets manager-level ops on everything in their
    // region. The branch → region filter happens at the scope layer.
    [RESOURCES.BENEFICIARIES]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.EXPORT],
    [RESOURCES.EMPLOYEES]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ, ACTIONS.EXPORT],
    [RESOURCES.QUALITY]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.FINANCE]: [ACTIONS.READ, ACTIONS.APPROVE],
  },
  [ROLES.REGIONAL_QUALITY]: {
    [RESOURCES.QUALITY]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
  },

  // — Level 2 Branch —
  [ROLES.BRANCH_MANAGER]: {
    // inherits from MANAGER; adds approval on branch-specific workflows
    [RESOURCES.EMPLOYEES]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.FINANCE]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.INVOICES]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.QUALITY]: [ACTIONS.READ, ACTIONS.UPDATE],
  },
  [ROLES.CLINICAL_DIRECTOR]: {
    [RESOURCES.BENEFICIARIES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.CARE_PLANS]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.DELETE,
    ],
    [RESOURCES.CARE_PLANS_DDD]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.DELETE,
    ],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.DELETE,
    ],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.SESSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
  },
  [ROLES.QUALITY_COORDINATOR]: {
    [RESOURCES.QUALITY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AUDIT_LOGS]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.EXPORT],
  },

  // — Level 3 Supervisors —
  [ROLES.HR_SUPERVISOR]: {
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.HR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.UPDATE],
  },
  [ROLES.FINANCE_SUPERVISOR]: {
    [RESOURCES.FINANCE]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
    [RESOURCES.INVOICES]: [
      ACTIONS.CREATE,
      ACTIONS.READ,
      ACTIONS.UPDATE,
      ACTIONS.APPROVE,
      ACTIONS.EXPORT,
    ],
  },
  [ROLES.THERAPY_SUPERVISOR]: {
    [RESOURCES.CARE_PLANS]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.CARE_PLANS_DDD]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.SESSIONS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [ACTIONS.READ, ACTIONS.APPROVE],
  },
  [ROLES.SPECIAL_ED_SUPERVISOR]: {
    [RESOURCES.CARE_PLANS]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.PROGRAMS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.STUDENTS]: [ACTIONS.READ, ACTIONS.UPDATE],
  },

  // — Level 4 Specialty therapists — all inherit from THERAPIST,
  // so they get THERAPIST's base permissions automatically via the
  // inheritance resolver. We leave their maps empty (or set
  // specialty-specific extras when a real need emerges).
  [ROLES.THERAPIST_SLP]: {},
  [ROLES.THERAPIST_OT]: {},
  [ROLES.THERAPIST_PT]: {},
  [ROLES.THERAPIST_PSYCH]: {
    // Psychologists get access to confidentiality-level restricted notes
    // via ABAC policy (confidentiality-level.policy.js) — no RBAC perm
    // needed beyond the therapist baseline.
  },
  [ROLES.SPECIAL_ED_TEACHER]: {
    [RESOURCES.STUDENTS]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.PROGRAMS]: [ACTIONS.READ],
  },
  [ROLES.THERAPY_ASSISTANT]: {
    [RESOURCES.SESSIONS]: [ACTIONS.READ],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.READ],
    [RESOURCES.BENEFICIARIES]: [ACTIONS.READ],
  },

  // — Level 5 Support —
  [ROLES.HR_OFFICER]: {
    [RESOURCES.EMPLOYEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.HR]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ],
  },
  [ROLES.DRIVER]: {
    [RESOURCES.VEHICLES]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ],
  },
  [ROLES.BUS_ASSISTANT]: {
    [RESOURCES.VEHICLES]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ],
  },

  // — External (Guardian is a dedicated role so ABAC can differentiate
  //   it from a generic PARENT for multi-guardian access rules) —
  [ROLES.GUARDIAN]: {
    [RESOURCES.BENEFICIARIES]: [ACTIONS.READ],
    [RESOURCES.SESSIONS]: [ACTIONS.READ],
    [RESOURCES.CLINICAL_SESSIONS]: [ACTIONS.READ],
    [RESOURCES.CARE_PLANS]: [ACTIONS.READ],
    [RESOURCES.CARE_PLANS_DDD]: [ACTIONS.READ],
    [RESOURCES.ASSESSMENTS]: [ACTIONS.READ],
    [RESOURCES.CLINICAL_ASSESSMENTS]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ],
    [RESOURCES.MESSAGES]: [ACTIONS.CREATE, ACTIONS.READ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION RESOLUTION ENGINE — محرك حساب الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════

const _cache = new Map();
const CACHE_TTL = 5 * 60_000;

/**
 * Resolve all effective permissions for a role (including inherited).
 * Returns { resource: [actions] } map.
 */
function resolvePermissions(role) {
  const cached = _cache.get(role);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.perms;

  const visited = new Set();
  const effective = {};

  function collect(r) {
    if (visited.has(r)) return;
    visited.add(r);

    const perms = ROLE_PERMISSIONS[r] || {};
    for (const [resource, actions] of Object.entries(perms)) {
      if (!effective[resource]) effective[resource] = new Set();
      for (const a of actions) effective[resource].add(a);
    }

    const hierarchy = ROLE_HIERARCHY[r];
    if (hierarchy?.inherits) {
      for (const parent of hierarchy.inherits) collect(parent);
    }
  }

  collect(role);

  const result = {};
  for (const [resource, actions] of Object.entries(effective)) {
    result[resource] = [...actions];
  }

  _cache.set(role, { perms: result, ts: Date.now() });
  return result;
}

/**
 * Flatten permissions to a string array: ["resource:action", ...]
 * Used for JWT payload and frontend consumption.
 */
function flattenPermissions(role, customPermissions = [], deniedPermissions = []) {
  const resourcePerms = resolvePermissions(role);
  const flat = new Set();

  // Wildcard
  if (resourcePerms['*']?.includes('*')) {
    flat.add('*:*');
    return [...flat];
  }

  for (const [resource, actions] of Object.entries(resourcePerms)) {
    for (const action of actions) {
      flat.add(`${resource}:${action}`);
    }
  }

  // Add custom user-specific permissions
  for (const p of customPermissions) flat.add(p);

  // Remove denied permissions
  for (const p of deniedPermissions) flat.delete(p);

  return [...flat];
}

/**
 * Check if a role has a specific permission.
 */
function hasPermission(role, resource, action, customPermissions = [], deniedPermissions = []) {
  // Check denied first
  if (deniedPermissions.includes(`${resource}:${action}`)) return false;

  // Check custom permissions
  if (customPermissions.includes(`${resource}:${action}`)) return true;
  if (customPermissions.includes(`${resource}:*`)) return true;
  if (customPermissions.includes('*:*')) return true;

  const perms = resolvePermissions(role);

  // Wildcard (super_admin)
  if (perms['*']?.includes('*')) return true;

  const resourcePerms = perms[resource];
  if (!resourcePerms) return false;

  return resourcePerms.includes(action) || resourcePerms.includes('*');
}

/**
 * Get role hierarchy level.
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role]?.level || 0;
}

/**
 * Check if roleA has at least as high a level as roleB.
 */
function isAtLeast(roleA, roleB) {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

/**
 * Get the label for a role.
 */
function getRoleLabel(role, lang = 'ar') {
  const h = ROLE_HIERARCHY[role];
  if (!h) return role;
  return lang === 'ar' ? h.label : h.labelEn;
}

/**
 * Clear permission cache (for testing or after role config changes).
 */
function clearCache() {
  _cache.clear();
}

module.exports = {
  ROLES,
  ALL_ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  flattenPermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
  getRoleLabel,
  clearCache,
};
