/**
 * Canonical Role Constants — ثوابت الأدوار المركزية
 *
 * مصدر الحقيقة الوحيد (Single Source of Truth) لجميع أسماء الأدوار
 * في المنصة. يُستخدم في: User model, rbac.config, rehab-roles,
 * branchScope middleware, multi-tenant-isolator.
 *
 * القاعدة: كل الأسماء الرسمية بصيغة snake_case
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// الأدوار الرسمية — snake_case فقط
// ═══════════════════════════════════════════════════════════════

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

/** All valid canonical role values */
const ALL_ROLES = Object.values(ROLES);

// ═══════════════════════════════════════════════════════════════
// خريطة الأسماء البديلة (Legacy ← Canonical)
// ═══════════════════════════════════════════════════════════════

/**
 * Maps legacy/alternate role names to canonical snake_case names.
 * Used by resolveRole() to normalize role names from different subsystems.
 */
const ROLE_ALIASES = {
  // rehab-roles.js kebab-case format
  'super-admin': ROLES.SUPER_ADMIN,
  'branch-admin': ROLES.MANAGER,
  'medical-director': ROLES.SUPERVISOR,
  'special-educator': ROLES.TEACHER,
  'hr-manager': ROLES.HR_MANAGER,
  'parent-guardian': ROLES.PARENT,
  // multi-tenant-isolator camelCase format
  superAdmin: ROLES.SUPER_ADMIN,
  systemAdmin: ROLES.ADMIN,
  // branchScope.middleware.js legacy entries
  hq_super_admin: ROLES.SUPER_ADMIN,
  hq_admin: ROLES.HEAD_OFFICE_ADMIN,
  ceo: ROLES.HEAD_OFFICE_ADMIN,
};

/**
 * Resolve a role name to its canonical form.
 * Returns the canonical name if found in aliases, otherwise returns the input.
 *
 * @param {string} role - Role name in any format
 * @returns {string} Canonical snake_case role name
 */
function resolveRole(role) {
  if (!role) return ROLES.GUEST;
  return ROLE_ALIASES[role] || role;
}

// ═══════════════════════════════════════════════════════════════
// أدوار الوصول عبر الفروع
// ═══════════════════════════════════════════════════════════════

/**
 * Roles that can access data across all branches.
 * Used by branchScope.middleware.js and multi-tenant-isolator.js.
 */
const CROSS_BRANCH_ROLES = [ROLES.SUPER_ADMIN, ROLES.HEAD_OFFICE_ADMIN, ROLES.ADMIN];

/**
 * Roles that bypass tenant isolation entirely.
 * Used by multi-tenant-isolator.js.
 */
const TENANT_BYPASS_ROLES = [ROLES.SUPER_ADMIN, ROLES.HEAD_OFFICE_ADMIN, ROLES.ADMIN];

module.exports = {
  ROLES,
  ALL_ROLES,
  ROLE_ALIASES,
  resolveRole,
  CROSS_BRANCH_ROLES,
  TENANT_BYPASS_ROLES,
};
