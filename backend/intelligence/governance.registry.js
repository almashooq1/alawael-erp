'use strict';

/**
 * governance.registry.js — Wave 26.
 *
 * Single source of truth for:
 *   • PERMISSIONS — dot-coded permissions + role-group holders
 *   • COMPLIANCE_BANNERS — per-data-kind banner config
 *   • SENSITIVE_FIELD_KINDS — the canonical sensitivity vocabulary
 *
 * See `docs/blueprint/34-governance-auditability.md`.
 */

// ─── Sensitivity vocabulary ────────────────────────────────────

const SENSITIVE_FIELD_KINDS = Object.freeze([
  'clinical_phi',
  'financial',
  'hr_compensation',
  'pii_identifiers',
  'business_secret',
]);

// ─── Compliance banners (declarative config) ───────────────────

const COMPLIANCE_BANNERS = Object.freeze({
  clinical_phi: {
    bannerAr: 'بيانات صحية محمية — كل عرض يُسجّل (PDPL م.13)',
    bannerEn: 'PHI present — every view is audited (PDPL Art.13)',
    severity: 'must-display',
    requiresAuditLog: true,
    auditAction: 'pii.access',
    color: 'amber',
  },
  financial: {
    bannerAr: 'بيانات مالية حساسة — استخدام داخلي فقط',
    bannerEn: 'Sensitive financial data — internal use only',
    severity: 'should-display',
    requiresAuditLog: true,
    auditAction: 'finance.access',
    color: 'amber',
  },
  hr_compensation: {
    bannerAr: 'بيانات تعويض — لا تشارك خارجياً',
    bannerEn: 'Compensation data — do not share externally',
    severity: 'must-display',
    requiresAuditLog: true,
    auditAction: 'hr.compensation.access',
    color: 'red',
  },
  pii_identifiers: {
    bannerAr: 'معرفات شخصية — تعامل بسرية',
    bannerEn: 'Personal identifiers — handle confidentially',
    severity: 'should-display',
    requiresAuditLog: false,
    auditAction: null,
    color: 'gray',
  },
  business_secret: {
    bannerAr: 'سر تجاري — للقيادة العليا فقط',
    bannerEn: 'Business secret — executive leadership only',
    severity: 'must-display',
    requiresAuditLog: true,
    auditAction: 'business-secret.access',
    color: 'red',
  },
});

// ─── Permissions ──────────────────────────────────────────────
// Code → role groups that hold it. A role group can hold many codes.

const PERMISSIONS = Object.freeze({
  // Finance
  'finance.invoices.view': ['finance', 'head_office', 'executive_leadership', 'branch_manager'],
  'finance.invoices.approve': ['finance', 'head_office'],
  'finance.invoices.escalate': ['finance', 'head_office'],
  'finance.zatca.submit': ['finance'],
  'finance.payroll.approve': ['finance', 'hr'],
  'finance.audit-log.read': ['finance', 'quality_compliance', 'executive_leadership'],

  // Clinical
  'clinical.care-plans.view': ['clinical_supervisor', 'therapist', 'branch_manager'],
  'clinical.care-plans.approve': ['clinical_supervisor'],
  'clinical.assessments.sign': ['clinical_supervisor'],
  'clinical.assessments.create': ['therapist', 'clinical_supervisor'],
  'clinical.sessions.start': ['therapist'],
  'clinical.red-flags.view': ['clinical_supervisor', 'branch_manager'],

  // HR
  'hr.employees.view': ['hr', 'branch_manager', 'executive_leadership'],
  'hr.employees.terminate': ['hr', 'head_office'],
  'hr.compensation.view': ['hr', 'finance'],
  'hr.compensation.modify': ['hr'],
  'hr.training.assign': ['hr', 'branch_manager'],

  // Quality / Compliance
  'quality.incidents.view': ['quality_compliance', 'branch_manager', 'clinical_supervisor'],
  'quality.incidents.create': [
    'quality_compliance',
    'clinical_supervisor',
    'branch_manager',
    'therapist',
  ],
  'quality.incidents.investigate': ['quality_compliance'],
  'quality.capa.close': ['quality_compliance'],
  'quality.audit.read': ['quality_compliance', 'executive_leadership'],
  'compliance.dsar.view': ['quality_compliance'],
  'compliance.dsar.respond': ['quality_compliance'],

  // Operational
  'ops.alerts.view': 'all',
  'ops.alerts.acknowledge': 'all-authenticated',
  'ops.alerts.assign': 'all-authenticated',
  'ops.alerts.mute': [
    'branch_manager',
    'head_office',
    'clinical_supervisor',
    'finance',
    'quality_compliance',
  ],
  'ops.alerts.resolve': 'all-authenticated',
  'ops.insights.confirm': 'all-authenticated',
  'ops.insights.dismiss': 'all-authenticated',
  'ops.insights.note': 'all-authenticated',

  // Reception / Beneficiary services
  'beneficiary.intake.create': ['reception', 'branch_manager'],
  'beneficiary.complaints.log': ['reception', 'branch_manager', 'quality_compliance'],
  'beneficiary.complaints.route': ['quality_compliance', 'branch_manager'],

  // Governance
  'governance.audit-trail.read': ['quality_compliance', 'executive_leadership', 'head_office'],
  'governance.audit-trail.export': ['quality_compliance', 'executive_leadership'],
  'governance.permissions.read': 'all-authenticated',
  'governance.banners.read': 'all-authenticated',

  // Cross-branch
  'branch-access.cross': ['executive_leadership', 'head_office', 'quality_compliance'],
  'branch-access.region': ['head_office'], // plus regional_* roles when wired

  // Strategic
  'strategy.forecast.view': ['executive_leadership', 'head_office'],
  'strategy.board-pack.generate': ['executive_leadership', 'head_office'],

  // Wave 31 — bulk branch-data ops (gated by SoD + step-up MFA + audit)
  'branch-data.export': ['executive_leadership', 'head_office', 'quality_compliance'],
  'branch-data.delete': ['executive_leadership'],

  // Wave 40 — Beneficiary 360 Phase 2 (Lifecycle HTTP)
  'beneficiary.lifecycle.transitions.read': [
    'branch_manager',
    'clinical_supervisor',
    'quality_compliance',
    'executive_leadership',
    'head_office',
  ],
  'beneficiary.lifecycle.transitions.list-allowed': 'all-authenticated',

  // Per-transition request permissions (12)
  'beneficiary.lifecycle.admit.request': ['branch_manager', 'clinical_supervisor'],
  'beneficiary.lifecycle.suspend.request': ['branch_manager', 'clinical_supervisor'],
  'beneficiary.lifecycle.reactivate.request': ['branch_manager', 'clinical_supervisor'],
  'beneficiary.lifecycle.initiate_transfer.request': [
    'branch_manager',
    'quality_compliance',
    'head_office',
  ],
  'beneficiary.lifecycle.complete_transfer.request': ['branch_manager'],
  'beneficiary.lifecycle.reverse_transfer.request': ['branch_manager', 'quality_compliance'],
  'beneficiary.lifecycle.discharge.request': ['clinical_supervisor', 'branch_manager'],
  'beneficiary.lifecycle.archive.request': ['branch_manager', 'quality_compliance'],
  'beneficiary.lifecycle.restore.request': ['quality_compliance', 'clinical_supervisor'],
  'beneficiary.lifecycle.request_deletion.request': ['quality_compliance'],
  'beneficiary.lifecycle.approve_deletion.request': ['quality_compliance', 'executive_leadership'],
  'beneficiary.lifecycle.cancel_deletion.request': ['quality_compliance'],

  // Workflow-step permissions
  'beneficiary.lifecycle.transition.approve': [
    'branch_manager',
    'clinical_supervisor',
    'quality_compliance',
    'executive_leadership',
    'head_office',
  ],
  'beneficiary.lifecycle.transition.execute': [
    'branch_manager',
    'clinical_supervisor',
    'quality_compliance',
    'executive_leadership',
    'head_office',
  ],
  'beneficiary.lifecycle.transition.cancel-own': 'all-authenticated',
  'beneficiary.lifecycle.transition.cancel-any': ['quality_compliance', 'executive_leadership'],
  'beneficiary.lifecycle.transition.reverse': [
    'branch_manager',
    'clinical_supervisor',
    'quality_compliance',
    'executive_leadership',
  ],

  // Wave 41 — Care Planning Phase 1 (registry + validator + service)
  'care-plan.read': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
    'head_office',
  ],
  'care-plan.list': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
    'head_office',
  ],
  'care-plan.draft.create': ['therapist', 'teacher'],
  'care-plan.draft.edit-own': ['therapist', 'teacher'],
  'care-plan.validation.run': ['therapist', 'teacher', 'clinical_supervisor'],
  'care-plan.submit-to-supervisor': ['therapist', 'teacher'],
  'care-plan.begin-review': ['clinical_supervisor'],
  'care-plan.request-revision': ['clinical_supervisor', 'branch_manager'],
  'care-plan.review.scorecard': ['clinical_supervisor', 'branch_manager'],
  'care-plan.escalate': ['clinical_supervisor'],
  'care-plan.approve': ['clinical_supervisor', 'branch_manager'],
  'care-plan.reject': ['clinical_supervisor', 'branch_manager'],
  'care-plan.archive': ['clinical_supervisor', 'branch_manager', 'quality_compliance'],
  'care-plan.save-to-record': ['clinical_supervisor', 'branch_manager'],
  'care-plan.notify-family': ['clinical_supervisor', 'branch_manager'],
  'care-plan.supersede': ['branch_manager'],
  'care-plan.amendment.apply': ['branch_manager'],
  'care-plan.version.create': ['therapist', 'teacher'],
  'care-plan.family-version.preview': [
    'clinical_supervisor',
    'branch_manager',
    'therapist',
    'teacher',
  ],
  'care-plan.audit-trail.read': [
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
  ],

  // Wave 44 — Care Planning Phase 4 (Recommendations + Progress)
  'care-plan.recommendation.preview': ['therapist', 'teacher', 'clinical_supervisor'],
  'care-plan.recommendation.apply': ['therapist', 'teacher'],
  'care-plan.progress-review.run': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
  ],
  'care-plan.progress-review.read': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
  ],

  // Wave 46 — Programs Library + Group Plans
  'care-plan.programs-library.read': 'all-authenticated',
  'care-plan.tests-library.read': 'all-authenticated',
  'care-plan.group-plan.build': ['therapist', 'teacher', 'clinical_supervisor'],
  'care-plan.group-plan.validate': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
  ],
  'care-plan.group-plan.read': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
  ],

  // Wave 47 — Report Generation
  'care-plan.report.clinician_draft': ['therapist', 'teacher', 'clinical_supervisor'],
  'care-plan.report.supervisor_review': ['clinical_supervisor', 'branch_manager'],
  'care-plan.report.final_approved_plan': [
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
    'executive_leadership',
  ],
  'care-plan.report.rejection': ['clinical_supervisor', 'branch_manager', 'therapist', 'teacher'],
  'care-plan.report.monthly_progress': [
    'therapist',
    'teacher',
    'clinical_supervisor',
    'branch_manager',
  ],
  'care-plan.report.end_of_cycle_closure': [
    'clinical_supervisor',
    'branch_manager',
    'quality_compliance',
  ],

  // Wave 72 — Access Review (User Access Recertification Program)
  // Closes red-team #12. Backed by Wave-38 foundations (registry +
  // simulator + AccessReviewAttestation model).
  'access-review.attestation.create': [
    'dpo',
    'ciso',
    'compliance_officer',
    'audit_admin',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'chro',
    'hr_director',
  ],
  'access-review.attestation.read': [
    'dpo',
    'ciso',
    'compliance_officer',
    'audit_admin',
    'auditor',
    'audit_committee_chair',
    'executive_leadership',
    'quality_compliance',
  ],
  'access-review.attestation.list': [
    'dpo',
    'ciso',
    'compliance_officer',
    'audit_admin',
    'auditor',
    'audit_committee_chair',
    'executive_leadership',
    'quality_compliance',
  ],
  'access-review.cycle.read': [
    'dpo',
    'ciso',
    'compliance_officer',
    'audit_admin',
    'audit_committee_chair',
    'executive_leadership',
    'quality_compliance',
  ],
  'access-review.chain.verify': [
    'dpo',
    'ciso',
    'audit_admin',
    'auditor',
    'audit_committee_chair',
    'security_architect',
  ],
  'access-review.simulate': [
    'dpo',
    'ciso',
    'compliance_officer',
    'security_architect',
    'iam.role_granter',
    'iam.role_matrix_editor',
  ],

  // Wave 74 — Access Review Scheduler (operationalisation)
  'access-review.cycle.open': ['dpo', 'ciso', 'audit_admin', 'compliance_officer'],
  'access-review.cycle.build': [
    'dpo',
    'ciso',
    'audit_admin',
    'compliance_officer',
    'security_architect',
  ],
  'access-review.cycle.notify': ['dpo', 'ciso', 'audit_admin'],
  'access-review.cycle.close': ['dpo', 'audit_admin', 'audit_committee_chair'],
  'access-review.event.mover': ['hr_admin', 'hr_director', 'chro', 'dpo', 'ciso'],
  'access-review.event.dormancy': ['dpo', 'ciso', 'audit_admin', 'security_architect'],

  // Wave 80 — Cycle Templates (static catalog + resolver)
  'access-review.template.read': [
    'dpo',
    'ciso',
    'compliance_officer',
    'audit_admin',
    'security_architect',
    'iam.role_granter',
    'iam.role_matrix_editor',
    'hr_admin',
    'hr_director',
    'chro',
  ],
  'access-review.template.resolve': [
    'dpo',
    'ciso',
    'audit_admin',
    'compliance_officer',
    'security_architect',
  ],
});

// ─── API ────────────────────────────────────────────────────────

function listPermissionCodes() {
  return Object.keys(PERMISSIONS);
}

function getHoldersOf(code) {
  const v = PERMISSIONS[code];
  if (!v) return null;
  if (v === 'all' || v === 'all-authenticated') return v;
  return [...v];
}

function getBannerFor(kind) {
  return COMPLIANCE_BANNERS[kind] || null;
}

function listBannerKinds() {
  return Object.keys(COMPLIANCE_BANNERS);
}

module.exports = {
  PERMISSIONS,
  COMPLIANCE_BANNERS,
  SENSITIVE_FIELD_KINDS,
  listPermissionCodes,
  getHoldersOf,
  getBannerFor,
  listBannerKinds,
};
