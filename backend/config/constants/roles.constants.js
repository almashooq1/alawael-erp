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
  // CEO is a DISTINCT executive role (ADR-037 Q5, 2026-06-01): it carries its
  // OWN permission set in rbac.config (full wildcard `'*':['*']`, BROADER than
  // head_office_admin's 14 scoped perms), inherits head_office_admin, and is
  // gated directly in 34 live route files via authorize(['ceo', …]). It was
  // previously ONLY a ROLE_ALIASES entry → resolveRole('ceo') collapsed CEOs to
  // head_office_admin's narrower perms (a latent privilege-narrowing bug, now
  // fixed by adding it here + removing the alias below). Closes the last
  // ADR-037 D4 gap (constants is now a superset of rbac.config role values).
  CEO: 'ceo',
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
  // ── Healthcare-specific roles (Wave 0, 2026-05-16) ───────────────
  // Closes audit gap: a rehab center cannot operate without nursing
  // and patient-relations roles. DPO is a PDPL Art.30 requirement.
  NURSE: 'nurse',
  NURSING_SUPERVISOR: 'nursing_supervisor',
  HEAD_NURSE: 'head_nurse',
  PATIENT_RELATIONS_OFFICER: 'patient_relations_officer',
  CRM_SUPERVISOR: 'crm_supervisor',
  DPO: 'dpo',
  // ── CRPD compliance role (W464 — 2026-05-26) ──────────────────────
  // Independent Advocate per CRPD Article 12 (supported decision-making)
  // + ADR-031 Q2. Sources can vary: NGO partnership / Disability Authority
  // appointment / internal-but-organizationally-independent. Permissions
  // designed to be conflict-of-interest-free: read access to beneficiary
  // file + write access to BeneficiaryVoiceLog + DecisionRightsAssessment +
  // Complaint. Cannot override clinical decisions but CAN challenge them
  // via Rights surfaces.
  INDEPENDENT_ADVOCATE: 'independent_advocate',
  // ── Cultural Adaptation role (Phase E — 2026-05-26) ────────────────
  // Cultural Officer per Phase E. Single role, deferred via stakeholder
  // Q3 (standalone vs combined vs shared). Reserved here in the constant
  // so downstream code can reference it without breaking when Phase E
  // ships.
  CULTURAL_OFFICER: 'cultural_officer',
  // ── Family Wellbeing role (Phase C — 2026-05-26) ──────────────────
  // Family Counsellor per Phase C. Sister of Cultural Officer — reserved
  // here for forward-compat.
  FAMILY_COUNSELLOR: 'family_counsellor',
  // ── ADR-037 D2 union (W730, 2026-06-01): the 26 roles that existed ONLY
  //    in config/rbac.config.js (carrying real ROLE_HIERARCHY + permission
  //    maps) but were absent here, so a role defined there yet checked via
  //    this registry's resolver did not resolve. ADDITIVE — values are
  //    byte-identical to rbac.config, so existing callers are unaffected; this
  //    only makes both registries agree (drives check:role-divergence rbac-only
  //    26 → 0). D3 (permission maps for the 9 const-only roles) stays gated on
  //    ADR-037 Q1–Q2; this commit does NOT touch grants.
  // Org / branch (Phase-7)
  BRANCH_MANAGER: 'branch_manager',
  REGIONAL_DIRECTOR: 'regional_director',
  REGIONAL_QUALITY: 'regional_quality',
  QUALITY_COORDINATOR: 'quality_coordinator',
  CLINICAL_DIRECTOR: 'clinical_director',
  // HQ exec / governance
  GROUP_GM: 'group_gm',
  GROUP_CFO: 'group_cfo',
  GROUP_CHRO: 'group_chro',
  GROUP_QUALITY_OFFICER: 'group_quality_officer',
  COMPLIANCE_OFFICER: 'compliance_officer',
  INTERNAL_AUDITOR: 'internal_auditor',
  IT_ADMIN: 'it_admin',
  // Dept supervisors
  HR_OFFICER: 'hr_officer',
  HR_SUPERVISOR: 'hr_supervisor',
  FINANCE_SUPERVISOR: 'finance_supervisor',
  THERAPY_SUPERVISOR: 'therapy_supervisor',
  SPECIAL_ED_SUPERVISOR: 'special_ed_supervisor',
  // Clinical specialties
  THERAPIST_SLP: 'therapist_slp',
  THERAPIST_OT: 'therapist_ot',
  THERAPIST_PT: 'therapist_pt',
  THERAPIST_PSYCH: 'therapist_psych',
  SPECIAL_ED_TEACHER: 'special_ed_teacher',
  THERAPY_ASSISTANT: 'therapy_assistant',
  // Support / external (NON_MATRIX archetype — ADR-036 D5)
  DRIVER: 'driver',
  BUS_ASSISTANT: 'bus_assistant',
  GUARDIAN: 'guardian',
  // ─────────────────────────────────────────────────────────────────
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
  // NOTE: `ceo` is NO LONGER aliased to head_office_admin (ADR-037 Q5) — it is a
  // distinct role (ROLES.CEO above) with its own broader permission set. Aliasing
  // it here narrowed CEO access; removed 2026-06-01.
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
  'dpo',
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
  [ROLES.NURSING_SUPERVISOR]: 4,
  [ROLES.HEAD_NURSE]: 4,
  [ROLES.CRM_SUPERVISOR]: 4,
  [ROLES.DPO]: 2,

  [ROLES.DOCTOR]: 5,
  [ROLES.THERAPIST]: 5,
  [ROLES.TEACHER]: 5,
  [ROLES.RECEPTIONIST]: 5,
  [ROLES.DATA_ENTRY]: 5,
  [ROLES.HR]: 5,
  [ROLES.NURSE]: 5,
  [ROLES.PATIENT_RELATIONS_OFFICER]: 5,
  // W464 — Independent Advocate at Level 4 (cross-discipline, single-branch
  // scope by default; can be granted region-scope for NGO arrangements that
  // cover multiple branches).
  [ROLES.INDEPENDENT_ADVOCATE]: 4,
  // Phase C/E future roles at Level 5 (professional caseload).
  [ROLES.CULTURAL_OFFICER]: 5,
  [ROLES.FAMILY_COUNSELLOR]: 5,

  // ── ADR-037 D2 union roles — H1 fix (W932, 2026-06-05) ───────────────────
  // The D2 union (W730) added these 26 org/exec/clinical roles + `ceo` to ROLES
  // but NEVER to ROLE_LEVELS, so levelOf() fell back to L6 for every one of them
  // and managers/directors/specialists silently failed hasLevel() tier gates
  // (the backlog H1 finding). Levels are DERIVED, not invented:
  //   • rbac.config ROLE_HIERARCHY section tiers (Level 0 HQ / 1 Region /
  //     2 Branch / 3 Dept-supervisors / 4 Specialty / 5 Support / External), and
  //   • the scope lists above: HQ roles are in CROSS_BRANCH_ROLES (all-branch) so
  //     they are L2 — matching the "L1/L2 = cross-branch" ABAC semantics in
  //     authorization/abac/policies/cross-branch-access.js + regional-scope.js's
  //     `levelOf(r) <= 2` HQ marker. Regional roles are REGION_SCOPED (region-only,
  //     NOT all-branch), so they are L3 — assigning L2 would falsely read as HQ
  //     all-branch bypass; their region visibility is enforced separately via
  //     REGION_SCOPED_ROLES in branchScope.middleware, independent of this tier.
  // L2 — Group (HQ), cross-branch supervision (every one is in CROSS_BRANCH_ROLES)
  [ROLES.CEO]: 2,
  [ROLES.GROUP_GM]: 2,
  [ROLES.GROUP_CFO]: 2,
  [ROLES.GROUP_CHRO]: 2,
  [ROLES.GROUP_QUALITY_OFFICER]: 2,
  [ROLES.COMPLIANCE_OFFICER]: 2,
  [ROLES.INTERNAL_AUDITOR]: 2,
  [ROLES.IT_ADMIN]: 2,
  // L3 — Branch (single-branch ops) + Region (region-scoped, NOT all-branch)
  [ROLES.REGIONAL_DIRECTOR]: 3,
  [ROLES.REGIONAL_QUALITY]: 3,
  [ROLES.BRANCH_MANAGER]: 3,
  [ROLES.CLINICAL_DIRECTOR]: 3,
  [ROLES.QUALITY_COORDINATOR]: 3,
  // L4 — Department supervisors (within a branch)
  [ROLES.HR_SUPERVISOR]: 4,
  [ROLES.FINANCE_SUPERVISOR]: 4,
  [ROLES.THERAPY_SUPERVISOR]: 4,
  [ROLES.SPECIAL_ED_SUPERVISOR]: 4,
  // L5 — Professional caseload / role-specific (clinical specialties + support)
  [ROLES.THERAPIST_SLP]: 5,
  [ROLES.THERAPIST_OT]: 5,
  [ROLES.THERAPIST_PT]: 5,
  [ROLES.THERAPIST_PSYCH]: 5,
  [ROLES.SPECIAL_ED_TEACHER]: 5,
  [ROLES.THERAPY_ASSISTANT]: 5,
  [ROLES.HR_OFFICER]: 5,
  // L6 — Own-records / self-service. driver + bus_assistant are NON_MATRIX
  // transport roles (rbac.config level 25 — BELOW parent's 30; perm maps are
  // own-records only: vehicles:read + own attendance), so the faithful tier is
  // own-records, NOT professional caseload — assigning L5 would let a transport
  // worker pass a generic hasLevel(5) professional gate (W932 adversarial review,
  // over-grant lens). guardian == parent.
  [ROLES.DRIVER]: 6,
  [ROLES.BUS_ASSISTANT]: 6,
  [ROLES.GUARDIAN]: 6,

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
