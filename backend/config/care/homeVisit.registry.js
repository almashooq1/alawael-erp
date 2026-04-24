'use strict';

/**
 * care/homeVisit.registry.js — Phase 17 Commit 3 (4.0.85).
 *
 * Vocabulary + state machine for home visits — a compliance-
 * critical activity (CBAHI/HRSD require documented home visits
 * for every social case) that's also daily work for social workers.
 *
 * The visit is tracked as its own record (linked to a SocialCase
 * when one exists) rather than inlined on the case, because:
 *   1. A beneficiary may have a pre-case visit (intake scouting).
 *   2. A visit is a standalone event with its own lifecycle,
 *      GPS trace, photos, and outcome — storing all of that as
 *      case subdocs would bloat the case.
 *   3. Calendar + mobile-driver workflows query visits by date +
 *      worker, not by case.
 *
 * Follow-up SLA (`social.home_visit.followup`, 14 days) is
 * activated when a visit completes and closed when all action
 * items have been resolved.
 */

// ── Visit types (purpose) ───────────────────────────────────────────

const VISIT_TYPES = Object.freeze([
  'initial_assessment', // first-ever visit, gathering baseline
  'follow_up', // routine recurring visit
  'crisis_response', // triggered by red-flag / urgent concern
  'plan_review', // intervention plan mid-point review
  'closing', // final visit before case closure
  'welfare_check', // quick wellness confirmation
  'document_delivery', // deliver forms / benefit cards
]);

// ── Visit lifecycle ─────────────────────────────────────────────────

const VISIT_STATUSES = Object.freeze([
  'scheduled',
  'en_route', // worker left office / driving
  'in_progress', // worker arrived + visit underway
  'completed', // visit done + report written
  'cancelled', // before en_route
  'no_answer', // arrived but no response
  'rescheduled', // moved to another date (keeps record, activates replacement)
]);

const VISIT_TERMINAL_STATUSES = Object.freeze([
  'completed',
  'cancelled',
  'no_answer',
  'rescheduled',
]);

const VISIT_TRANSITIONS = Object.freeze({
  scheduled: [
    { to: 'en_route', event: 'en_route' },
    { to: 'in_progress', event: 'started' }, // skip en_route (on-site arrival)
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
    { to: 'rescheduled', event: 'rescheduled', required: ['rescheduledTo'] },
  ],
  en_route: [
    { to: 'in_progress', event: 'arrived' },
    { to: 'no_answer', event: 'no_answer', required: ['noAnswerNotes'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  in_progress: [
    { to: 'completed', event: 'completed', required: ['visitSummary'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  completed: [],
  cancelled: [],
  no_answer: [],
  rescheduled: [],
});

// ── Observation domains (structured + free-form) ────────────────────
//
// Each visit captures a few key observation axes. These are the
// canonical axes; the worker can still add free-form notes outside.

const OBSERVATION_DOMAINS = Object.freeze([
  { code: 'home_environment', labelAr: 'البيئة المنزلية' },
  { code: 'family_dynamics', labelAr: 'ديناميكيات الأسرة' },
  { code: 'beneficiary_wellbeing', labelAr: 'سلامة المستفيد' },
  { code: 'hygiene_safety', labelAr: 'النظافة والسلامة' },
  { code: 'economic_signals', labelAr: 'مؤشرات اقتصادية' },
  { code: 'school_attendance', labelAr: 'الانتظام الدراسي' },
  { code: 'medication_adherence', labelAr: 'الالتزام بالعلاج' },
]);

const OBSERVATION_DOMAIN_CODES = Object.freeze(OBSERVATION_DOMAINS.map(d => d.code));

const OBSERVATION_CONCERN_LEVELS = Object.freeze([
  'none', // nothing of note
  'low',
  'medium',
  'high',
  'critical', // triggers case flagHighRisk if linked to a case
]);

// ── Action item priorities ──────────────────────────────────────────

const ACTION_ITEM_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

const ACTION_ITEM_STATUSES = Object.freeze(['pending', 'in_progress', 'completed', 'cancelled']);

// ── Cancellation reasons (closed vocabulary) ───────────────────────

const CANCELLATION_REASONS = Object.freeze([
  'family_request',
  'worker_emergency',
  'weather',
  'transport_issue',
  'duplicate',
  'case_closed',
  'other',
]);

// ── Helpers ─────────────────────────────────────────────────────────

function canTransition(from, to) {
  const edges = VISIT_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = VISIT_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function requiredFieldsForTransition(from, to) {
  const edges = VISIT_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isTerminal(status) {
  return VISIT_TERMINAL_STATUSES.includes(status);
}

function isCriticalConcern(level) {
  return level === 'critical' || level === 'high';
}

function slaPolicyForFollowup() {
  return 'social.home_visit.followup';
}

function observationDomainByCode(code) {
  return OBSERVATION_DOMAINS.find(d => d.code === code) || null;
}

// ── Validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(VISIT_TRANSITIONS)) {
    if (!VISIT_STATUSES.includes(from)) {
      throw new Error(`homeVisit registry: transition source '${from}' unknown`);
    }
    for (const edge of edges) {
      if (!VISIT_STATUSES.includes(edge.to)) {
        throw new Error(`homeVisit registry: transition ${from}→${edge.to} unknown`);
      }
      if (!edge.event) {
        throw new Error(`homeVisit registry: transition ${from}→${edge.to} missing event`);
      }
    }
  }
  const seen = new Set();
  for (const d of OBSERVATION_DOMAINS) {
    if (seen.has(d.code)) {
      throw new Error(`homeVisit registry: duplicate observation domain '${d.code}'`);
    }
    seen.add(d.code);
  }
  return true;
}

module.exports = {
  VISIT_TYPES,
  VISIT_STATUSES,
  VISIT_TERMINAL_STATUSES,
  VISIT_TRANSITIONS,
  OBSERVATION_DOMAINS,
  OBSERVATION_DOMAIN_CODES,
  OBSERVATION_CONCERN_LEVELS,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  CANCELLATION_REASONS,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isCriticalConcern,
  slaPolicyForFollowup,
  observationDomainByCode,
  validate,
};
