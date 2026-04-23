'use strict';

/**
 * management-review.registry.js — Phase 13 Commit 1 (4.0.55).
 *
 * Canonical catalogue of inputs/outputs required by an ISO 9001:2015
 * §9.3 management review — plus CBAHI-specific extensions for Saudi
 * rehabilitation day-care centers. Pure data, no I/O, safe to require
 * from any layer (service, route, scheduler, UI).
 *
 * Used by:
 *   • models/quality/ManagementReview.model.js   — validates agenda.code
 *   • services/quality/managementReview.service  — scaffolds new reviews
 *   • routes/managementReview.routes.js          — exposes /reference
 *   • UI                                         — builds the agenda form
 *
 * Design: IDs are slash-delimited slugs scoped by section so the UI
 * can group them (inputs/outputs/phases/types). Thresholds and
 * frequencies are *defaults* — a branch may override at the
 * organization settings layer (phase 13 C11).
 */

// ── Lifecycle ──────────────────────────────────────────────────────

const REVIEW_STATUSES = Object.freeze([
  'scheduled', // calendar slot created, agenda not yet set
  'agenda_set', // agenda locked, inputs being gathered
  'in_progress', // meeting happening / minutes being captured
  'decisions_recorded', // decisions logged, actions not yet assigned
  'actions_assigned', // action items have owners + due dates
  'closed', // all required outputs captured + signed
  'cancelled', // cycle skipped with documented reason
]);

const TERMINAL_STATUSES = Object.freeze(['closed', 'cancelled']);

const REVIEW_TYPES = Object.freeze([
  'periodic', // scheduled 6-monthly / quarterly cycle
  'adhoc', // triggered by incident, audit finding, leadership call
  'annual', // year-end comprehensive review
  'regulatory', // pre-CBAHI/JCI/MOH inspection rehearsal
]);

const DEFAULT_CYCLE_MONTHS = 6; // CBAHI minimum; override per branch

// ── Required Inputs (ISO 9001:2015 §9.3.2) ─────────────────────────

const REVIEW_INPUTS = Object.freeze([
  {
    code: 'input.prev_actions_status',
    nameAr: 'حالة إجراءات المراجعة السابقة',
    nameEn: 'Status of previous management review actions',
    iso: '9.3.2.a',
    required: true,
  },
  {
    code: 'input.context_changes',
    nameAr: 'التغيّرات في القضايا الداخلية والخارجية',
    nameEn: 'Changes in internal & external issues',
    iso: '9.3.2.b',
    required: true,
  },
  {
    code: 'input.customer_satisfaction',
    nameAr: 'رضا المستفيدين والأسر',
    nameEn: 'Customer/beneficiary satisfaction & feedback',
    iso: '9.3.2.c.1',
    required: true,
    dataSource: { service: 'satisfactionSurvey', method: 'getLatestNps' },
  },
  {
    code: 'input.quality_objectives',
    nameAr: 'تحقيق أهداف الجودة',
    nameEn: 'Extent to which quality objectives have been met',
    iso: '9.3.2.c.2',
    required: true,
    dataSource: { service: 'kpi', method: 'getScorecard' },
  },
  {
    code: 'input.process_conformity',
    nameAr: 'أداء العمليات ومطابقة الخدمة',
    nameEn: 'Process performance & service conformity',
    iso: '9.3.2.c.3',
    required: true,
  },
  {
    code: 'input.nonconformities_capa',
    nameAr: 'حالات عدم المطابقة والإجراءات التصحيحية',
    nameEn: 'Non-conformities & corrective actions',
    iso: '9.3.2.c.4',
    required: true,
    dataSource: { service: 'qualityManagement', method: 'getCapaSummary' },
  },
  {
    code: 'input.monitoring_results',
    nameAr: 'نتائج المراقبة والقياس',
    nameEn: 'Monitoring & measurement results',
    iso: '9.3.2.c.5',
    required: true,
  },
  {
    code: 'input.audit_results',
    nameAr: 'نتائج التدقيق الداخلي والخارجي',
    nameEn: 'Audit results (internal + external)',
    iso: '9.3.2.c.6',
    required: true,
    dataSource: { service: 'internalAudit', method: 'getOpenFindings' },
  },
  {
    code: 'input.external_providers',
    nameAr: 'أداء الموردين والمقدمين الخارجيين',
    nameEn: 'Performance of external providers',
    iso: '9.3.2.c.7',
    required: true,
  },
  {
    code: 'input.resources_adequacy',
    nameAr: 'كفاية الموارد',
    nameEn: 'Adequacy of resources',
    iso: '9.3.2.d',
    required: true,
  },
  {
    code: 'input.risk_actions',
    nameAr: 'فعالية الإجراءات المتخذة تجاه المخاطر والفرص',
    nameEn: 'Effectiveness of risk & opportunity actions',
    iso: '9.3.2.e',
    required: true,
    dataSource: { service: 'qualityManagement', method: 'getRiskRegister' },
  },
  {
    code: 'input.improvement_opportunities',
    nameAr: 'فرص التحسين',
    nameEn: 'Opportunities for improvement',
    iso: '9.3.2.f',
    required: true,
  },

  // ── CBAHI-specific extensions (Saudi rehabilitation) ────────────
  {
    code: 'input.cbahi_patient_safety',
    nameAr: 'مؤشرات سلامة المستفيدين (CBAHI)',
    nameEn: 'Patient safety indicators (CBAHI)',
    iso: 'cbahi.PS',
    required: true,
    dataSource: { service: 'incidentsAnalytics', method: 'getSafetySummary' },
  },
  {
    code: 'input.cbahi_complaints_trend',
    nameAr: 'اتجاه الشكاوى وأوقات الحل',
    nameEn: 'Complaint trends & resolution times',
    iso: 'cbahi.PR.4',
    required: true,
    dataSource: { service: 'complaintsAnalytics', method: 'getTrend' },
  },
  {
    code: 'input.cbahi_workforce_competency',
    nameAr: 'كفاءة القوى العاملة والتدريب',
    nameEn: 'Workforce competency & training status',
    iso: 'cbahi.HR',
    required: true,
    dataSource: { service: 'hrDashboard', method: 'getCompetencyStatus' },
  },
]);

// ── Required Outputs (ISO 9001:2015 §9.3.3) ────────────────────────

const REVIEW_OUTPUTS = Object.freeze([
  {
    code: 'output.improvement_opportunities',
    nameAr: 'فرص التحسين المُقرّرة',
    nameEn: 'Improvement opportunities decided',
    iso: '9.3.3.a',
    required: true,
  },
  {
    code: 'output.qms_changes',
    nameAr: 'التغييرات المطلوبة على نظام الجودة',
    nameEn: 'Any need for changes to the QMS',
    iso: '9.3.3.b',
    required: true,
  },
  {
    code: 'output.resource_needs',
    nameAr: 'الاحتياجات من الموارد',
    nameEn: 'Resource needs identified',
    iso: '9.3.3.c',
    required: true,
  },
]);

// ── Decisions vs Actions (two distinct output types) ───────────────
// A "decision" is a policy-level call by leadership (immutable once
// closed). An "action" is a concrete task with owner + due date,
// tracked through ImprovementProject or CAPA downstream.

const DECISION_TYPES = Object.freeze([
  'policy_change',
  'resource_allocation',
  'qms_scope_change',
  'objective_update',
  'escalation',
  'waiver_granted',
  'noted_only',
]);

const ACTION_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

const ACTION_DEFAULT_SLA_DAYS = Object.freeze({
  low: 90,
  medium: 60,
  high: 30,
  critical: 7,
});

// ── Attendance roles (quorum check) ────────────────────────────────

const REQUIRED_ATTENDEE_ROLES = Object.freeze([
  'ceo', // or delegated senior leader
  'quality_manager',
  'medical_director', // clinical representative
  'hr_manager',
  'finance_manager',
]);

const QUORUM_MIN = 3; // of the 5 required roles

// ── Helper ─────────────────────────────────────────────────────────

/**
 * Validate that a review about to close has satisfied every required
 * input & output. Returns `{ ok: boolean, missing: string[] }`.
 *
 * @param {object} review  a ManagementReview doc (or plain object)
 * @returns {{ok: boolean, missing: string[]}}
 */
function validateClosure(review) {
  const missing = [];
  const inputCodes = new Set((review.inputs || []).map(i => i.code));
  const outputCodes = new Set((review.outputs || []).map(o => o.code));

  for (const inp of REVIEW_INPUTS) {
    if (inp.required && !inputCodes.has(inp.code)) {
      missing.push(`input:${inp.code}`);
    }
  }
  for (const out of REVIEW_OUTPUTS) {
    if (out.required && !outputCodes.has(out.code)) {
      missing.push(`output:${out.code}`);
    }
  }

  const attendeeRoles = new Set((review.attendees || []).map(a => a.role));
  const presentRequired = REQUIRED_ATTENDEE_ROLES.filter(r => attendeeRoles.has(r)).length;
  if (presentRequired < QUORUM_MIN) {
    missing.push(`quorum:${presentRequired}/${QUORUM_MIN}`);
  }

  return { ok: missing.length === 0, missing };
}

module.exports = {
  REVIEW_STATUSES,
  TERMINAL_STATUSES,
  REVIEW_TYPES,
  REVIEW_INPUTS,
  REVIEW_OUTPUTS,
  DECISION_TYPES,
  ACTION_PRIORITIES,
  ACTION_DEFAULT_SLA_DAYS,
  REQUIRED_ATTENDEE_ROLES,
  QUORUM_MIN,
  DEFAULT_CYCLE_MONTHS,
  validateClosure,
};
