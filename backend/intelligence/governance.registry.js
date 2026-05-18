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

  // ─── Wave 96 Phase 1 — Hikvision Workforce Surveillance & Attendance ─
  // Device registry + event ingestion + health monitoring.
  // Phases 2-5 will add face-library, recognition, attendance, fraud
  // permission codes additively.
  'hikvision.device.create': [
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_director',
    'regional_manager',
  ],
  'hikvision.device.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'iam.role_matrix_editor',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.device.list': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'iam.role_matrix_editor',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.device.update': [
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_director',
    'regional_manager',
  ],
  'hikvision.device.retire': [
    'security_architect',
    'iam.role_granter',
    'hr_director',
    'chro',
    'regional_manager',
  ],
  'hikvision.channel.create': [
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'branch_director',
    'regional_manager',
  ],
  'hikvision.channel.update': [
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'branch_director',
    'regional_manager',
  ],
  'hikvision.channel.list': [
    'security_architect',
    'security.officer',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'hikvision.event.ingest': [
    // Webhook auth is HMAC-based at the route layer; permission gate
    // is only used when a human/operator replays via /ingest/manual.
    'security_architect',
    'iam.role_granter',
    'dpo',
  ],
  'hikvision.event.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.event.list': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.health.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'hr_admin',
    'hr_director',
    'chro',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.health.record': [
    // Internal cron / health-probe writes. Operator manual writes go
    // through this same gate.
    'security_architect',
    'iam.role_granter',
    'dpo',
  ],

  // ─── Wave 97 Phase 2 — Face Library + Template Enrollment ────
  'hikvision.library.create': [
    'security_architect',
    'iam.role_granter',
    'hr_director',
    'chro',
    'regional_manager',
    'dpo',
  ],
  'hikvision.library.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.library.list': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'hikvision.library.update': [
    'security_architect',
    'iam.role_granter',
    'hr_director',
    'chro',
    'regional_manager',
    'dpo',
  ],
  'hikvision.library.archive': [
    // Archival is irreversible — restrict to senior roles + DPO
    'security_architect',
    'chro',
    'hr_director',
    'dpo',
  ],
  'hikvision.library.subscribe': [
    'security_architect',
    'iam.role_granter',
    'hr_director',
    'branch_director',
    'regional_manager',
  ],
  'hikvision.template.enroll': [
    // Bound by 2-person rule at service layer (Wave 97):
    // enroller role + employee acknowledgement.
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'security_architect',
  ],
  'hikvision.template.confirm': [
    // Internal — called by ISAPI sync worker / device-ack handler.
    'security_architect',
    'iam.role_granter',
  ],
  'hikvision.template.suspend': [
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'dpo',
  ],
  'hikvision.template.reenroll': [
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'security_architect',
  ],
  'hikvision.template.cascade': [
    // Employee-exit cascade trigger — narrow to HR + DPO + governance
    'hr_admin',
    'hr_director',
    'chro',
    'dpo',
    'compliance_officer',
    'audit_admin',
  ],
  'hikvision.template.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.template.list': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],

  // ─── Wave 98 Phase 3 — Recognition + Confidence Review ──────
  'hikvision.event.process': [
    // Internal — cron worker / operator manual re-process.
    'security_architect',
    'iam.role_granter',
    'dpo',
  ],
  'hikvision.processed.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.processed.list': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.review.list': [
    'security_architect',
    'security.officer',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'hikvision.review.read': [
    'security_architect',
    'security.officer',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'hikvision.review.approve': [
    // The supervisor pool sees their own queue. HR sees HR queue.
    // The gate code is the same — service layer enforces queue membership.
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'security_architect',
    'security.officer',
    'compliance_officer',
  ],
  'hikvision.review.reject': [
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'security_architect',
    'security.officer',
    'compliance_officer',
  ],
  'hikvision.review.escalate': [
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'security_architect',
    'security.officer',
    'compliance_officer',
    'auditor',
  ],
  'attendance.source.read': [
    'security_architect',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
    'payroll_admin',
    'payroll_manager',
  ],
  'attendance.source.list': [
    'security_architect',
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
    'payroll_admin',
    'payroll_manager',
  ],

  // ─── Wave 99 Phase 4 — Attendance Integration ─────────────
  'attendance.reconciliation.run': [
    // Cron-driven primarily; operators may force-run a re-reconcile
    // for a specific shift_date after manual corrections.
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'payroll_admin',
    'dpo',
  ],
  'attendance.reconciliation.read': [
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
    'payroll_admin',
    'payroll_manager',
  ],
  'attendance.reconciliation.list': [
    'hr_admin',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
    'payroll_admin',
    'payroll_manager',
  ],
  'attendance.reconciliation.resolve': [
    // Operator-driven case resolution (multi-source-disagreement etc.)
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'regional_manager',
  ],
  'payroll.period.create': [
    'payroll_admin',
    'payroll_manager',
    'chro',
    'hr_director',
    'finance_director',
  ],
  'payroll.period.read': [
    'hr_admin',
    'hr_director',
    'chro',
    'payroll_admin',
    'payroll_manager',
    'finance_director',
    'finance_admin',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'payroll.period.list': [
    'hr_admin',
    'hr_director',
    'chro',
    'payroll_admin',
    'payroll_manager',
    'finance_director',
    'finance_admin',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'payroll.period.close': [
    // Two-person rule at service layer (HR director + finance approval)
    'payroll_admin',
    'payroll_manager',
    'chro',
    'hr_director',
    'finance_director',
  ],
  'payroll.period.reopen': [
    // Very narrow — only when audit catches a calculation error pre-pay
    'chro',
    'finance_director',
    'audit_committee_chair',
    'dpo',
  ],
  'payroll.override.create': [
    // Requires Nafath tier-3 + approver chain at service layer
    'hr_director',
    'chro',
    'finance_director',
    'payroll_manager',
  ],
  'payroll.override.read': [
    'hr_admin',
    'hr_director',
    'chro',
    'payroll_admin',
    'payroll_manager',
    'finance_director',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'payroll.override.list': [
    'hr_admin',
    'hr_director',
    'chro',
    'payroll_admin',
    'payroll_manager',
    'finance_director',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],

  // ─── Wave 100 Phase 5 — Fraud Detection ────────────────────
  'fraud.detection.run': [
    // Cron-driven primarily. Operators (security architect / DPO) may
    // force a re-scan after a tuning change.
    'security_architect',
    'iam.role_granter',
    'ciso',
    'dpo',
  ],
  'fraud.flag.read': [
    'security_architect',
    'security.officer',
    'ciso',
    'hr_director',
    'chro',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'audit_committee_chair',
    'dpo',
  ],
  'fraud.flag.list': [
    'security_architect',
    'security.officer',
    'ciso',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'dpo',
  ],
  'fraud.flag.acknowledge': [
    // Operator confirms the flag is real — kept on score.
    'security_architect',
    'security.officer',
    'ciso',
    'hr_director',
    'chro',
    'compliance_officer',
    'dpo',
  ],
  'fraud.flag.dismiss': [
    // Operator confirms false positive — removed from score.
    // Narrower than acknowledge — dismiss has tamper risk so we
    // restrict to senior + DPO/audit.
    'security_architect',
    'ciso',
    'hr_director',
    'chro',
    'dpo',
    'audit_committee_chair',
  ],
  'fraud.flag.escalate': [
    'security_architect',
    'security.officer',
    'ciso',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'fraud.score.read': [
    'security_architect',
    'security.officer',
    'ciso',
    'hr_director',
    'chro',
    'branch_manager',
    'branch_director',
    'regional_manager',
    'compliance_officer',
    'auditor',
    'audit_admin',
    'audit_committee_chair',
    'dpo',
  ],
  'fraud.score.recompute': ['security_architect', 'iam.role_granter', 'ciso', 'dpo'],

  // ─── Wave 106 Phase F — ISAPI Sync Worker ─────────────────
  'hikvision.sync.run': [
    // Cron-driven primarily; operators may force-run after enrollments.
    'security_architect',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'dpo',
  ],
  'hikvision.sync.run.all': [
    // Whole-org sync — heavier, narrower auth.
    'security_architect',
    'iam.role_granter',
    'dpo',
  ],
  'hikvision.sync.drift.detect': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  'hikvision.sync.status.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
  ],

  // ─── Wave 108 — Operational Scheduler ─────────────────────
  // Read-only status of all registered jobs + latest run per job.
  // Wide read (same readers as sync.status.read).
  'hikvision.jobs.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  // Manually run a job (override cron) — only senior ops because
  // these jobs write to the DB and emit AuditLog entries.
  'hikvision.jobs.run': ['security_architect', 'iam.role_granter', 'dpo', 'hr_director'],
  // History of past runs (full payloads for audit replay).
  'hikvision.jobs.history.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'compliance_officer',
    'auditor',
    'dpo',
  ],

  // ─── Wave 109 — Real-Time Event Stream ─────────────────────
  // Read aggregate + per-device stream status.
  'hikvision.stream.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  // Trigger a refresh of the device list (attach new / detach
  // retired). Narrow because it mutates running connections.
  'hikvision.stream.control': ['security_architect', 'iam.role_granter', 'dpo'],

  // ─── Wave 110 — Per-Branch Config Overrides ───────────────
  // Read per-branch thresholds + effective resolution.
  'hikvision.branch-config.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
  ],
  // Edit per-branch thresholds — narrow because it changes how
  // attendance + fraud decisions land for the branch.
  'hikvision.branch-config.write': ['security_architect', 'iam.role_granter', 'hr_director', 'dpo'],

  // ─── Wave 111 — Branch Operations Aggregator ──────────────
  // Read-only aggregator bundling per-branch operational signals
  // from every other Hikvision service. Same readers as
  // sync.status.read (branch managers + directors + compliance).
  'hikvision.branch-ops.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
  ],

  // ─── Wave 112 — Org-Wide Executive Summary ─────────────────
  // Narrower than branch-ops.read because the snapshot exposes
  // top-employees and cross-branch fraud rankings — sensitive
  // signals reserved for executive leadership + sec architects.
  'hikvision.org-summary.read': [
    'security_architect',
    'security.officer',
    'compliance_officer',
    'auditor',
    'dpo',
    'executive_leadership',
    'head_office',
  ],

  // ─── Wave 113 — Anomaly Detector ───────────────────────────
  // Wide read — anyone who'd act on an operational alert should
  // be able to see it. Includes branch managers/directors so
  // they can act on issues in their branch immediately.
  'hikvision.anomalies.read': [
    'security_architect',
    'security.officer',
    'iam.role_granter',
    'hr_admin',
    'hr_director',
    'branch_manager',
    'branch_director',
    'compliance_officer',
    'auditor',
    'dpo',
    'executive_leadership',
    'head_office',
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
