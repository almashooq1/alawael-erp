/**
 * domain-rules.js — Phase-7 domain-level Segregation of Duties.
 *
 * The existing `registry.js` covers TRANSACTIONAL SoD (same actor
 * cannot create+approve the same record). This file covers DOMAIN
 * SoD: certain roles must NEVER perform certain actions regardless
 * of whether they touched the record before.
 *
 * Driven by the 6 high-risk separations the IAM blueprint calls out:
 *   1. HR ↔ Finance      — finance roles must not edit employee PII;
 *                          HR roles must not create/approve invoices.
 *   2. Clinical ↔ Finance — therapists/clinical roles must not bill
 *                           or set invoice prices; finance must not
 *                           read clinical notes.
 *   3. Quality independence — quality roles must not have approver
 *                             role on records they audit.
 *   4. IT Admin ↔ Audit — it_admin can configure but cannot mark
 *                          audit log entries reviewed.
 *   5. Auditor independence — internal_auditor is read-only on
 *                              everything they audit.
 *   6. Driver/bus_assistant ↔ clinical — operations roles
 *                                         must not touch PHI.
 *
 * Each rule is a tuple { id, blockedRoles[], blockedActions[],
 * description, severity }. The checker resolves a request via:
 *
 *   roleCannotPerform(role, resource, action) → null | { rule }
 *
 * Wire-up: ABAC's sod-conflict policy (already exists) calls this
 * BEFORE the existing transactional SoD check. A miss in either
 * means the action is allowed (subject to other guards).
 */

'use strict';

/**
 * Each rule. action format is `<resource>:<action>`. Wildcard `*` on
 * either side is supported so a single rule can cover a family.
 *
 * Adding a new rule? Make sure:
 *   • blockedRoles only lists role values that exist in the rbac
 *     config (drift test enforces this).
 *   • severity is 'high' for compliance-mandatory separations
 *     (CBAHI / SAMA / MOH require HR↔Finance and Clinical↔Finance);
 *     'medium' for governance hygiene.
 */
const DOMAIN_RULES = [
  // ── 1. HR ↔ Finance ─────────────────────────────────────────────
  {
    id: 'sod-hr-cannot-touch-finance',
    description: 'HR roles must not create or approve invoices/expenses (CBAHI 4.3 / SAMA pre-pay)',
    blockedRoles: ['hr', 'hr_manager', 'hr_officer', 'hr_supervisor', 'group_chro'],
    blockedActions: [
      'invoices:create',
      'invoices:approve',
      'invoices:update',
      'invoices:delete',
      'expenses:create',
      'expenses:approve',
      'finance:create',
      'finance:approve',
      'purchase_orders:approve',
    ],
    severity: 'high',
  },
  {
    id: 'sod-finance-cannot-edit-employee-pii',
    description:
      'Finance roles must not create/edit employee records (Saudi Labor Law / GOSI dual-control)',
    blockedRoles: ['accountant', 'finance', 'finance_supervisor', 'group_cfo'],
    blockedActions: [
      'employees:create',
      'employees:update',
      'employees:delete',
      'hr:create',
      'hr:update',
      'hr:delete',
    ],
    severity: 'high',
  },

  // ── 2. Clinical ↔ Finance ──────────────────────────────────────
  {
    id: 'sod-clinical-cannot-bill',
    description:
      'Therapists must not invoice their own (or any) sessions (CBAHI 8.7 — billing independence)',
    blockedRoles: [
      'therapist',
      'therapist_slp',
      'therapist_ot',
      'therapist_pt',
      'therapist_psych',
      'therapy_assistant',
      'special_ed_teacher',
      'doctor',
      'clinical_director',
      'therapy_supervisor',
      'special_ed_supervisor',
    ],
    blockedActions: [
      'invoices:create',
      'invoices:approve',
      'invoices:update',
      'finance:create',
      'finance:approve',
    ],
    severity: 'high',
  },
  {
    id: 'sod-finance-cannot-read-clinical',
    description:
      'Finance roles must not read clinical assessments or care plans (PDPL data minimization)',
    blockedRoles: ['accountant', 'finance', 'finance_supervisor'],
    blockedActions: [
      'clinical_assessments:read',
      'clinical_assessments:export',
      'care_plans:read',
      'care_plans:export',
      'care_plans_ddd:read',
      'care_plans_ddd:export',
    ],
    severity: 'high',
  },

  // ── 3. Quality independence ────────────────────────────────────
  {
    id: 'sod-quality-cannot-approve-care',
    description: 'Quality roles must not approve clinical care plans they audit (independence)',
    blockedRoles: ['quality_coordinator', 'regional_quality'],
    // group_quality_officer is allowed approve role on care plans
    // intentionally — they sit OUTSIDE the audited unit, so it's not
    // a self-audit conflict.
    blockedActions: ['care_plans:approve', 'care_plans_ddd:approve'],
    severity: 'medium',
  },

  // ── 4. IT Admin ↔ Audit ────────────────────────────────────────
  {
    id: 'sod-it-admin-cannot-write-audit',
    description: 'IT Admin can configure system but cannot mutate audit log entries',
    blockedRoles: ['it_admin'],
    blockedActions: ['audit_logs:update', 'audit_logs:delete', 'audit_logs:create'],
    severity: 'high',
  },

  // ── 5. Internal Auditor — read-only enforcement ────────────────
  {
    id: 'sod-internal-auditor-readonly',
    description: 'Internal auditor is read-only on every domain (independence)',
    blockedRoles: ['internal_auditor'],
    blockedActions: ['*:create', '*:update', '*:delete', '*:approve'],
    severity: 'high',
  },

  // ── 6. Operations roles (driver, bus_assistant) ↔ PHI ──────────
  {
    id: 'sod-ops-cannot-touch-phi',
    description:
      'Driver/bus_assistant must not access clinical or beneficiary PII beyond transport metadata',
    blockedRoles: ['driver', 'bus_assistant'],
    blockedActions: [
      'beneficiaries:update',
      'beneficiaries:delete',
      'clinical_assessments:read',
      'clinical_assessments:create',
      'clinical_assessments:update',
      'care_plans:read',
      'care_plans_ddd:read',
      'sessions:create',
      'sessions:update',
      'clinical_sessions:create',
      'clinical_sessions:update',
    ],
    severity: 'high',
  },
];

/**
 * Match a single permission ("invoices:create") against a single rule
 * pattern that may use a wildcard ("*:create" or "invoices:*").
 */
function permMatches(perm, pattern) {
  if (perm === pattern) return true;
  const [pRes, pAct] = pattern.split(':');
  const [permRes, permAct] = perm.split(':');
  if (pRes !== '*' && pRes !== permRes) return false;
  if (pAct !== '*' && pAct !== permAct) return false;
  return true;
}

/**
 * Does a domain SoD rule forbid this role from performing this
 * resource:action? Returns the matching rule (with severity) or null.
 *
 * @param {string} role — single role string (caller resolves multi-role)
 * @param {string} permission — `${resource}:${action}` form
 * @returns {{ rule: object } | null}
 */
function checkDomainSoD(role, permission) {
  if (!role || !permission) return null;
  for (const rule of DOMAIN_RULES) {
    if (!rule.blockedRoles.includes(role)) continue;
    for (const blocked of rule.blockedActions) {
      if (permMatches(permission, blocked)) {
        return { rule };
      }
    }
  }
  return null;
}

/** Return all domain rules touching the given role (UI/admin listing). */
function rulesForRole(role) {
  return DOMAIN_RULES.filter(r => r.blockedRoles.includes(role));
}

function allDomainRules() {
  return DOMAIN_RULES.map(r => ({ ...r }));
}

module.exports = {
  DOMAIN_RULES,
  checkDomainSoD,
  rulesForRole,
  allDomainRules,
  permMatches, // exported for tests
};
