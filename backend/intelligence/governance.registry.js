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
