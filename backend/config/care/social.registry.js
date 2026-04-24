'use strict';

/**
 * care/social.registry.js — Phase 17 Commit 2 (4.0.84).
 *
 * Canonical vocabulary + state machine for social services
 * (SocialCase lifecycle, assessment domains, intervention types,
 * risk levels, closure outcomes). Pure data, validated at boot.
 *
 * Context — Phase-17 audit showed social at ~20% maturity (just
 * a skeleton `caseManagement` route file). This commit ships the
 * full domain: `SocialCase` model with embedded assessment +
 * intervention plan, service layer with state-machine transitions
 * + SLA hooks, and routes.
 *
 * Why embed assessment + intervention in SocialCase vs. separate
 * collections:
 *   1. Both are 1:1 with case — splitting would require joins
 *      everywhere and buy no normalisation win.
 *   2. Case-worker dashboards need everything in one place; embed
 *      makes that render cheap.
 *   3. Audit trail lives on the case anyway; embedded children
 *      inherit it naturally.
 */

// ── Case type (classification) ──────────────────────────────────────

const CASE_TYPES = Object.freeze([
  'intake', // new beneficiary onboarding
  'ongoing', // regular follow-up + support
  'crisis', // acute family/welfare crisis
  'welfare_only', // just helping with benefits/entitlements
  'family_support', // family-focused intervention
  'school_liaison', // bridge with schools
  'legal_support', // legal aid coordination
]);

// ── Risk level (drives the high-risk-review SLA) ────────────────────

const RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

// ── Case status machine ─────────────────────────────────────────────

const CASE_STATUSES = Object.freeze([
  'intake', // case just opened, awaiting assessment
  'assessment', // social worker gathering info
  'awaiting_family_consent', // pause state
  'awaiting_documents', // pause state
  'intervention_planned', // plan created, waiting to start
  'active', // interventions in progress
  'monitoring', // stable, periodic check-ins
  'closing', // wrapping up
  'closed', // terminal (with outcome recorded)
  'transferred', // moved to another worker/branch/org
  'cancelled', // never proceeded
]);

const CASE_TERMINAL_STATUSES = Object.freeze(['closed', 'transferred', 'cancelled']);

// Match sla.registry pauseOnStates for social.case.* policies.
const CASE_PAUSE_STATUSES = Object.freeze(['awaiting_family_consent', 'awaiting_documents']);

const CASE_TRANSITIONS = Object.freeze({
  intake: [
    { to: 'assessment', event: 'assessment_started' },
    { to: 'awaiting_family_consent', event: 'awaiting_consent' },
    { to: 'awaiting_documents', event: 'awaiting_documents' },
    { to: 'cancelled', event: 'cancelled', required: ['closureReason'] },
  ],
  assessment: [
    { to: 'intervention_planned', event: 'assessment_completed', required: ['assessmentSummary'] },
    { to: 'awaiting_family_consent', event: 'awaiting_consent' },
    { to: 'awaiting_documents', event: 'awaiting_documents' },
    { to: 'transferred', event: 'transferred', required: ['transferredToWorkerId'] },
    { to: 'cancelled', event: 'cancelled', required: ['closureReason'] },
  ],
  awaiting_family_consent: [
    { to: 'assessment', event: 'resumed' },
    { to: 'intervention_planned', event: 'resumed' }, // if consent came after assessment done
    { to: 'cancelled', event: 'cancelled', required: ['closureReason'] },
  ],
  awaiting_documents: [
    { to: 'assessment', event: 'resumed' },
    { to: 'intervention_planned', event: 'resumed' },
    { to: 'cancelled', event: 'cancelled', required: ['closureReason'] },
  ],
  intervention_planned: [
    { to: 'active', event: 'intervention_started' },
    { to: 'awaiting_family_consent', event: 'awaiting_consent' },
    { to: 'transferred', event: 'transferred', required: ['transferredToWorkerId'] },
    { to: 'cancelled', event: 'cancelled', required: ['closureReason'] },
  ],
  active: [
    { to: 'monitoring', event: 'stabilised' },
    { to: 'closing', event: 'closure_started' },
    { to: 'transferred', event: 'transferred', required: ['transferredToWorkerId'] },
  ],
  monitoring: [
    { to: 'active', event: 'reactivated' }, // if new crisis comes up
    { to: 'closing', event: 'closure_started' },
    { to: 'transferred', event: 'transferred', required: ['transferredToWorkerId'] },
  ],
  closing: [
    { to: 'closed', event: 'closed', required: ['closureOutcome', 'closureSummary'] },
    { to: 'active', event: 'reopened' }, // closure blocked, resume
  ],
  closed: [{ to: 'active', event: 'reopened' }], // up to 90 days after close
  transferred: [],
  cancelled: [],
});

// ── Assessment domains (structured scoring) ─────────────────────────

const ASSESSMENT_DOMAINS = Object.freeze([
  { code: 'economic', labelAr: 'الوضع الاقتصادي' },
  { code: 'housing', labelAr: 'السكن والبيئة' },
  { code: 'family', labelAr: 'ديناميكيات الأسرة' },
  { code: 'education', labelAr: 'التعليم' },
  { code: 'employment', labelAr: 'العمل والتوظيف' },
  { code: 'health_access', labelAr: 'الوصول للخدمات الصحية' },
  { code: 'social_support', labelAr: 'الدعم الاجتماعي والشبكات' },
  { code: 'legal', labelAr: 'القضايا القانونية' },
]);

const ASSESSMENT_DOMAIN_CODES = Object.freeze(ASSESSMENT_DOMAINS.map(d => d.code));

// Per-domain score band: 1 = strong / 5 = critical need
const DOMAIN_SCORE_MIN = 1;
const DOMAIN_SCORE_MAX = 5;

// ── Intervention types (what we do about findings) ──────────────────

const INTERVENTION_TYPES = Object.freeze([
  'counseling',
  'welfare_application',
  'govt_referral', // HRSD, Tawakkalna, Tamkeen
  'charity_referral',
  'family_mediation',
  'home_visit',
  'school_liaison',
  'employment_support',
  'legal_aid_referral',
  'housing_assistance',
  'transportation_support',
  'awareness_training',
  'other',
]);

// ── Closure outcomes ────────────────────────────────────────────────

const CLOSURE_OUTCOMES = Object.freeze([
  'goals_met', // plan objectives achieved
  'partial_progress', // some objectives achieved
  'no_progress', // intervention unsuccessful
  'family_withdrew', // family opted out
  'beneficiary_graduated', // aged out / discharged from org
  'transferred_out', // moved to another provider
  'deceased',
  'other',
]);

// ── Helpers ─────────────────────────────────────────────────────────

function canTransition(from, to) {
  const edges = CASE_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = CASE_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function requiredFieldsForTransition(from, to) {
  const edges = CASE_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isTerminal(status) {
  return CASE_TERMINAL_STATUSES.includes(status);
}

function isPaused(status) {
  return CASE_PAUSE_STATUSES.includes(status);
}

function isHighRisk(level) {
  return level === 'high' || level === 'critical';
}

function slaPolicyForIntake() {
  return 'social.case.intake_to_assessment';
}

function slaPolicyForPlan() {
  return 'social.case.assessment_to_plan';
}

function slaPolicyForHighRisk() {
  return 'social.case.high_risk_review';
}

function assessmentDomainByCode(code) {
  return ASSESSMENT_DOMAINS.find(d => d.code === code) || null;
}

// ── Validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(CASE_TRANSITIONS)) {
    if (!CASE_STATUSES.includes(from)) {
      throw new Error(`social registry: transition source '${from}' unknown`);
    }
    for (const edge of edges) {
      if (!CASE_STATUSES.includes(edge.to)) {
        throw new Error(`social registry: transition ${from}→${edge.to} unknown target`);
      }
      if (!edge.event) {
        throw new Error(`social registry: transition ${from}→${edge.to} missing event`);
      }
    }
  }
  for (const p of CASE_PAUSE_STATUSES) {
    if (!CASE_STATUSES.includes(p)) {
      throw new Error(`social registry: pause status '${p}' unknown`);
    }
  }
  const domainCodes = new Set();
  for (const d of ASSESSMENT_DOMAINS) {
    if (domainCodes.has(d.code)) {
      throw new Error(`social registry: duplicate assessment domain '${d.code}'`);
    }
    domainCodes.add(d.code);
  }
  return true;
}

module.exports = {
  CASE_TYPES,
  RISK_LEVELS,
  CASE_STATUSES,
  CASE_TERMINAL_STATUSES,
  CASE_PAUSE_STATUSES,
  CASE_TRANSITIONS,
  ASSESSMENT_DOMAINS,
  ASSESSMENT_DOMAIN_CODES,
  DOMAIN_SCORE_MIN,
  DOMAIN_SCORE_MAX,
  INTERVENTION_TYPES,
  CLOSURE_OUTCOMES,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isPaused,
  isHighRisk,
  slaPolicyForIntake,
  slaPolicyForPlan,
  slaPolicyForHighRisk,
  assessmentDomainByCode,
  validate,
};
