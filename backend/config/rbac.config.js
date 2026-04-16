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
  SUPER_ADMIN: 'super_admin',
  HEAD_OFFICE_ADMIN: 'head_office_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  HR: 'hr',
  HR_MANAGER: 'hr_manager',
  ACCOUNTANT: 'accountant',
  FINANCE: 'finance',
  DOCTOR: 'doctor',
  THERAPIST: 'therapist',
  TEACHER: 'teacher',
  RECEPTIONIST: 'receptionist',
  DATA_ENTRY: 'data_entry',
  PARENT: 'parent',
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
