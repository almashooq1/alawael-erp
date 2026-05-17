'use strict';

/**
 * authz.registry.js — Wave 31.
 *
 * Operationalises the Authorization Constitution (Wave 31 doc):
 *   • SCOPE_LEVELS — the 7-level scope ladder
 *   • ROLE_CATALOG — the 18 canonical roles with mission + defaultScope
 *   • SOD_RULES — the 10 toxic-combination prohibitions
 *   • MFA_REQUIREMENTS — per-action step-up MFA tier
 *   • EMERGENCY_ELIGIBLE_ROLES — who can request break-glass
 *
 * The companion service (`authz.service.js`) consumes this registry
 * to compute decide() outcomes. Adding a new role or SoD rule means
 * extending this file + the Constitution doc — NEVER inline in route
 * handlers.
 *
 * See `docs/blueprint/35-authorization-constitution.md`.
 */

// ─── Scope ladder ───────────────────────────────────────────────

const SCOPE_LEVELS = Object.freeze([
  'GLOBAL',
  'REGION',
  'BRANCH',
  'DEPARTMENT',
  'TEAM',
  'OWN',
  'ASSIGNED',
]);

// Higher index = NARROWER. GLOBAL is broadest.
const SCOPE_ORDER = Object.freeze({
  GLOBAL: 0,
  REGION: 1,
  BRANCH: 2,
  DEPARTMENT: 3,
  TEAM: 4,
  OWN: 5,
  ASSIGNED: 6,
});

// ─── Role catalog ───────────────────────────────────────────────
// 18 canonical roles, each declares its default scope + audit sensitivity.
// Aligns with the Wave 23 role-profiles registry's groupKey naming.

const ROLE_CATALOG = Object.freeze({
  // ── HQ / GLOBAL roles ───────────────────────────
  super_admin: {
    mission: 'Final escalation authority + platform owner',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'CRITICAL',
    privileged: true,
    canRequestEmergency: true,
    canApproveEmergency: true,
    mfaRequiredLogin: 2,
  },
  hq_admin: {
    mission: 'Day-to-day platform admin',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'HIGH',
    privileged: true,
    canRequestEmergency: true,
    canApproveEmergency: true,
    mfaRequiredLogin: 2,
  },
  hq_clinical_director: {
    mission: 'Org-wide clinical standards + KPIs',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'HIGH',
    privileged: true,
    canRequestEmergency: true,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  hq_hr_director: {
    mission: 'Org-wide HR strategy + Saudization',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'HIGH',
    privileged: true,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  hq_finance_director: {
    mission: 'Org financial oversight + ZATCA',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'CRITICAL',
    privileged: true,
    canRequestEmergency: true,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  hq_auditor: {
    mission: 'Internal audit — read-only across all domains',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'MEDIUM',
    privileged: true,
    readOnly: true,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  hq_readonly_executive: {
    mission: 'Board / advisor — dashboard-only',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'LOW',
    privileged: false,
    readOnly: true,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  dpo: {
    mission: 'Data Protection Officer — PDPL Art.30 compliance',
    defaultScope: 'GLOBAL',
    auditSensitivity: 'CRITICAL',
    privileged: true,
    canRequestEmergency: true,
    canApproveEmergency: true,
    mfaRequiredLogin: 2,
  },

  // ── Branch roles ────────────────────────────────
  branch_manager: {
    mission: 'Single-branch operational owner',
    defaultScope: 'BRANCH',
    auditSensitivity: 'HIGH',
    privileged: false,
    canRequestEmergency: true,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  clinical_supervisor: {
    mission: 'Branch clinical quality + care plan approvals',
    defaultScope: 'BRANCH',
    auditSensitivity: 'CRITICAL',
    privileged: false,
    canRequestEmergency: true,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  therapist: {
    mission: 'Direct care delivery — own assigned beneficiaries',
    defaultScope: 'OWN',
    auditSensitivity: 'HIGH',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  receptionist: {
    mission: 'Intake + complaints + daily logistics',
    defaultScope: 'BRANCH',
    auditSensitivity: 'MEDIUM',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  branch_hr: {
    mission: 'Branch-level HR ops',
    defaultScope: 'BRANCH',
    auditSensitivity: 'MEDIUM',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  branch_finance: {
    mission: 'Branch financial ops',
    defaultScope: 'BRANCH',
    auditSensitivity: 'HIGH',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  branch_quality: {
    mission: 'Branch incident + complaint + audit',
    defaultScope: 'BRANCH',
    auditSensitivity: 'HIGH',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  driver: {
    mission: 'Transport route execution',
    defaultScope: 'OWN',
    auditSensitivity: 'LOW',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  family_portal: {
    mission: 'Parent/guardian view of own child',
    defaultScope: 'OWN',
    auditSensitivity: 'MEDIUM',
    privileged: false,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 1,
  },
  temporary_reviewer: {
    mission: 'External auditor — time-bound read access',
    defaultScope: 'TEMP_ELEVATED',
    auditSensitivity: 'CRITICAL',
    privileged: true,
    readOnly: true,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 2,
  },
  integration_service: {
    mission: 'Machine-to-machine integration (NPHIES, ZATCA, ZKTeco, WhatsApp)',
    defaultScope: 'GLOBAL', // bound to allow-listed endpoints
    auditSensitivity: 'CRITICAL',
    privileged: false, // not a human
    isServiceAccount: true,
    canRequestEmergency: false,
    canApproveEmergency: false,
    mfaRequiredLogin: 0, // signed token only
  },
});

// ─── SoD rules (10 toxic combinations) ─────────────────────────

const SOD_RULES = Object.freeze([
  {
    id: 'invoice-self-approval',
    onAction: 'finance.invoices.approve',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.createdBy && String(actor.userId) === String(resource.createdBy),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز اعتماد الفاتورة من نفس منشئها',
    descriptionEn: 'Cannot approve an invoice you created yourself',
  },
  {
    id: 'assessment-self-sign',
    onAction: 'clinical.assessments.sign',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.createdBy && String(actor.userId) === String(resource.createdBy),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز توقيع التقييم من معدِّه',
    descriptionEn: 'Cannot sign your own assessment',
  },
  {
    id: 'role-self-elevation',
    onAction: 'governance.role-elevation.approve',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.requestedBy && String(actor.userId) === String(resource.requestedBy),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز اعتماد طلب الصلاحية لنفسك',
    descriptionEn: 'Cannot approve your own elevation request',
  },
  {
    id: 'dsar-self-respond',
    onAction: 'compliance.dsar.respond',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.createdBy && String(actor.userId) === String(resource.createdBy),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز الرد على DSAR من منشئه',
    descriptionEn: 'Cannot respond to a DSAR you created',
  },
  {
    id: 'incident-self-close',
    onAction: 'quality.incidents.close',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.createdBy && String(actor.userId) === String(resource.createdBy),
    severity: 'high',
    overridePolicy: 'compensating',
    descriptionAr: 'لا يجوز إغلاق حادثة من منشئها (يحتاج مدقّق آخر)',
    descriptionEn: 'Cannot close an incident you created (needs another reviewer)',
  },
  {
    id: 'pricing-self-approval',
    onAction: 'pricing.approve',
    prohibitedIf: ({ actor, resource }) =>
      actor.userId && resource.createdBy && String(actor.userId) === String(resource.createdBy),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز اعتماد التسعير لمن عدّله',
    descriptionEn: 'Cannot approve pricing changes you made',
  },
  {
    id: 'audit-log-modify-universal',
    onAction: 'audit-log.modify',
    prohibitedIf: () => true, // ALWAYS prohibited — even super_admin
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'تعديل سجل التدقيق ممنوع كليًا',
    descriptionEn: 'Audit log modification is universally prohibited',
  },
  {
    id: 'audit-log-delete-universal',
    onAction: 'audit-log.delete',
    prohibitedIf: () => true,
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'حذف سجل التدقيق ممنوع كليًا',
    descriptionEn: 'Audit log deletion is universally prohibited',
  },
  {
    id: 'payroll-after-termination',
    onAction: 'finance.payroll.approve',
    // Cannot approve payroll for someone you terminated in the same cycle.
    // This is a CONTEXTUAL check — actor must hold both hr.employees.terminate
    // and finance.payroll.approve, AND the payroll record includes the
    // recently-terminated employee.
    prohibitedIf: ({ actor, resource }) =>
      actor.recentTerminations && resource.employeesIncluded
        ? resource.employeesIncluded.some(e => actor.recentTerminations.includes(String(e)))
        : false,
    severity: 'high',
    overridePolicy: 'compensating',
    descriptionAr: 'لا يجوز اعتماد الراتب لمن أنهيت خدمته في نفس الدورة',
    descriptionEn: 'Cannot approve payroll for someone you terminated in this cycle',
  },
  {
    id: 'export-then-delete',
    // This rule fires at DELETE time if the actor exported the entity in
    // the last 24h. Blocks the "exfil then erase" pattern.
    onAction: 'branch-data.delete',
    prohibitedIf: ({ actor, resource }) =>
      actor.recentExports &&
      actor.recentExports.some(e => String(e.resourceId) === String(resource.id)),
    severity: 'critical',
    overridePolicy: 'never',
    descriptionAr: 'لا يجوز حذف ما صدّرته خلال آخر 24 ساعة',
    descriptionEn: 'Cannot delete a resource you exported in the last 24 hours',
  },
]);

// ─── MFA tier required per action ──────────────────────────────

const MFA_REQUIREMENTS = Object.freeze({
  // Tier 3 (highest — TOTP + biometric)
  'governance.permissions.grant': 3,
  'governance.audit-trail.export': 3,
  'governance.role-elevation.approve': 3,
  'impersonation.start': 3,
  'emergency-access.activate': 3,

  // Tier 2 (TOTP)
  'finance.invoices.approve': 2,
  'finance.payroll.approve': 2,
  'finance.zatca.submit': 2,
  'clinical.assessments.sign': 2,
  'clinical.care-plans.approve': 2,
  'hr.employees.terminate': 2,
  'hr.compensation.modify': 2,
  'branch-data.export': 2,

  // Default Tier 1 — anything else
});

const DEFAULT_MFA_TIER = 1;

// ─── Emergency access ─────────────────────────────────────────

const EMERGENCY_MAX_DURATION_MIN_BY_ROLE = Object.freeze({
  super_admin: 240, // 4h
  hq_admin: 240,
  dpo: 480, // 8h — DPO may need longer for compliance investigation
  hq_finance_director: 240,
  hq_clinical_director: 240,
  branch_manager: 120,
  clinical_supervisor: 120,
});

// ─── Canonical role → authz catalog key bridge ────────────────
// The Constitution's 18-role catalog is finer-grained than the 9
// role-profiles groups and the ~22 canonical roles. This map lets
// callers pass either: canonical-role names (from roles.constants.js)
// OR catalog keys — both resolve correctly.

const CANONICAL_TO_AUTHZ_ROLE = Object.freeze({
  // HQ tier
  super_admin: 'super_admin',
  head_office_admin: 'hq_admin',
  admin: 'hq_admin',
  // Branch leadership
  manager: 'branch_manager',
  supervisor: 'clinical_supervisor',
  nursing_supervisor: 'clinical_supervisor',
  head_nurse: 'clinical_supervisor',
  // Direct care
  therapist: 'therapist',
  doctor: 'therapist',
  teacher: 'therapist',
  nurse: 'therapist',
  // Finance
  finance: 'branch_finance',
  accountant: 'branch_finance',
  // HR
  hr: 'branch_hr',
  hr_manager: 'branch_hr',
  // Quality / compliance
  dpo: 'dpo',
  crm_supervisor: 'branch_quality',
  // Reception
  receptionist: 'receptionist',
  patient_relations_officer: 'receptionist',
  // Parent portal
  parent: 'family_portal',
});

// ─── API helpers ──────────────────────────────────────────────

function getRoleDefinition(roleKey) {
  if (ROLE_CATALOG[roleKey]) return ROLE_CATALOG[roleKey];
  const bridge = CANONICAL_TO_AUTHZ_ROLE[roleKey];
  return bridge ? ROLE_CATALOG[bridge] : null;
}

function listRoles() {
  return Object.keys(ROLE_CATALOG);
}

function defaultScopeFor(roleKey) {
  // Try direct (catalog key)
  if (ROLE_CATALOG[roleKey]) return ROLE_CATALOG[roleKey].defaultScope;
  // Fall back through the bridge (canonical role)
  const bridge = CANONICAL_TO_AUTHZ_ROLE[roleKey];
  if (bridge && ROLE_CATALOG[bridge]) return ROLE_CATALOG[bridge].defaultScope;
  return null;
}

/**
 * Compute the broadest scope across a user's role set.
 * Returns the scope with the LOWEST index in SCOPE_ORDER.
 * If no roles match, returns null (= no access).
 */
function broadestScope(roleKeys = []) {
  let best = null;
  let bestRank = Infinity;
  for (const r of roleKeys) {
    const scope = defaultScopeFor(r);
    if (!scope) continue;
    const rank = SCOPE_ORDER[scope];
    if (rank !== undefined && rank < bestRank) {
      bestRank = rank;
      best = scope;
    }
  }
  return best;
}

function getMfaTierFor(action) {
  return MFA_REQUIREMENTS[action] || DEFAULT_MFA_TIER;
}

function findSodRule(action, ctx) {
  // Returns the first rule whose `prohibitedIf` fires, or null.
  for (const rule of SOD_RULES) {
    if (rule.onAction !== action) continue;
    try {
      if (rule.prohibitedIf(ctx)) return rule;
    } catch {
      // Rule predicate threw — be safe, treat as not-firing (don't
      // accidentally deny on a bug in the predicate).
    }
  }
  return null;
}

module.exports = {
  SCOPE_LEVELS,
  SCOPE_ORDER,
  ROLE_CATALOG,
  CANONICAL_TO_AUTHZ_ROLE,
  SOD_RULES,
  MFA_REQUIREMENTS,
  DEFAULT_MFA_TIER,
  EMERGENCY_MAX_DURATION_MIN_BY_ROLE,
  getRoleDefinition,
  listRoles,
  defaultScopeFor,
  broadestScope,
  getMfaTierFor,
  findSodRule,
};
