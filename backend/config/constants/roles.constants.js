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
 *
 * Phase 7 update (2026-04-22): added the HQ-level roles (ceo,
 * group_gm, group_cfo, group_chro, group_quality_officer,
 * compliance_officer, internal_auditor, it_admin) that should
 * see all branches. Regional roles (regional_director,
 * regional_quality) are handled separately by branchScope
 * middleware's region-filter path — they see ONLY branches in
 * `user.regionIds[]`, not all branches.
 */
const CROSS_BRANCH_ROLES = [
  'super_admin',
  'head_office_admin',
  'admin',
  'ceo',
  'group_gm',
  'group_cfo',
  'group_chro',
  'group_quality_officer',
  'compliance_officer',
  'internal_auditor',
  'it_admin',
];

/**
 * Region-scoped roles — see branches in their region(s) only.
 * branchScope middleware resolves these against Branch.regionId to
 * build an $in filter.
 */
const REGION_SCOPED_ROLES = ['regional_director', 'regional_quality'];

/**
 * Roles that bypass tenant isolation entirely.
 * Used by multi-tenant-isolator.js.
 */
const TENANT_BYPASS_ROLES = [ROLES.SUPER_ADMIN, ROLES.HEAD_OFFICE_ADMIN, ROLES.ADMIN];

// ═══════════════════════════════════════════════════════════════
// Role Hierarchy (ADR-005) — مستويات الأدوار الستة
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical 6-level role hierarchy.
 * See docs/architecture/decisions/005-canonical-role-hierarchy.md
 *
 * L1 — Platform (full platform technical access)
 * L2 — Group (HQ) — cross-branch supervision
 * L3 — Branch — single branch operations
 * L4 — Department — within branch
 * L5 — Professional — caseload / role-specific
 * L6 — Self-Service — own records only
 */
const ROLE_LEVELS = {
  [ROLES.SUPER_ADMIN]: 1,

  [ROLES.HEAD_OFFICE_ADMIN]: 2,

  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 3,
  [ROLES.ACCOUNTANT]: 3,
  [ROLES.HR_MANAGER]: 3,

  [ROLES.SUPERVISOR]: 4,
  [ROLES.FINANCE]: 4,

  [ROLES.DOCTOR]: 5,
  [ROLES.THERAPIST]: 5,
  [ROLES.TEACHER]: 5,
  [ROLES.RECEPTIONIST]: 5,
  [ROLES.DATA_ENTRY]: 5,
  [ROLES.HR]: 5,

  [ROLES.PARENT]: 6,
  [ROLES.STUDENT]: 6,
  [ROLES.VIEWER]: 6,
  [ROLES.USER]: 6,
  [ROLES.GUEST]: 6,
};

/**
 * Return the hierarchy level (1-6) for a role name.
 * Unknown roles fall back to L6 (lowest scope).
 * @param {string} role
 * @returns {number} 1-6
 */
function levelOf(role) {
  return ROLE_LEVELS[resolveRole(role)] ?? 6;
}

/**
 * Does the user's highest role meet or exceed the required level?
 * (Numerically lower level = higher privilege.)
 * @param {string[]} userRoles
 * @param {number} requiredLevel
 */
function hasLevel(userRoles, requiredLevel) {
  if (!userRoles || !userRoles.length) return false;
  return userRoles.some(r => levelOf(r) <= requiredLevel);
}

module.exports = {
  ROLES,
  ALL_ROLES,
  ROLE_ALIASES,
  resolveRole,
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
  TENANT_BYPASS_ROLES,
  ROLE_LEVELS,
  levelOf,
  hasLevel,
};
