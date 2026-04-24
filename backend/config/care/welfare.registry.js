'use strict';

/**
 * care/welfare.registry.js — Phase 17 Commit 4 (4.0.86).
 *
 * Vocabulary + state machine for welfare applications filed on
 * behalf of beneficiaries (HRSD / MoH / charity / municipalities
 * / Tamkeen). Tracks the full lifecycle from draft through
 * submission, government review, approval, disbursement — with
 * a dedicated appeal path for rejections.
 *
 * This is auxiliary to SocialCase (not every welfare app lives
 * under a case), so the application carries its own lifecycle
 * and optional `caseId` backlink.
 *
 * No SLA policies are added here by design. Government response
 * timelines are external and highly variable (2 weeks → 6 months
 * for some benefits). What DOES get SLA-tracked is on the case
 * side — the "submission_prep" window — but that belongs in
 * future work when we add it to the case SLAs.
 */

// ── Application types ───────────────────────────────────────────────

const APPLICATION_TYPES = Object.freeze([
  'ssa_pension', // Social Security / ضمان اجتماعي
  'disability_benefit', // معاش إعاقة
  'housing_assistance', // دعم سكني
  'food_basket', // سلة غذائية
  'medical_aid', // دعم علاجي
  'school_support', // دعم تعليمي
  'charity_monthly', // رواتب جمعيات
  'disaster_relief', // إعانة كوارث
  'orphan_support', // كفالة أيتام
  'rent_assistance', // إيجار
  'other',
]);

// ── Target agencies (closed vocabulary) ─────────────────────────────

const TARGET_AGENCIES = Object.freeze([
  'hrsd', // Ministry of HR & Social Development
  'moh', // Ministry of Health
  'moe', // Ministry of Education
  'municipality',
  'charity', // unspecified — pair with partner name
  'tamkeen',
  'sanad', // Waqf-run benefit schemes
  'ehsan', // Ehsan platform
  'private',
  'other',
]);

// ── Application lifecycle ───────────────────────────────────────────

const APPLICATION_STATUSES = Object.freeze([
  'draft', // being prepared
  'submitted', // sent to agency
  'under_review', // agency acknowledged + reviewing
  'info_requested', // agency asked for more info (pause state)
  'approved', // agency approved
  'partially_approved', // approved at reduced amount
  'disbursed', // benefit actually received by family
  'rejected', // agency said no
  'appealed', // we're fighting a rejection
  'appeal_approved',
  'appeal_rejected',
  'closed', // archived — done with this cycle
  'cancelled', // withdrawn before decision
]);

const APPLICATION_TERMINAL_STATUSES = Object.freeze([
  'disbursed',
  'appeal_approved',
  'appeal_rejected',
  'closed',
  'cancelled',
]);

// Pause states — waiting on external party.
const APPLICATION_PAUSE_STATUSES = Object.freeze(['info_requested']);

const APPLICATION_TRANSITIONS = Object.freeze({
  draft: [
    { to: 'submitted', event: 'submitted', required: ['submittedAt'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  submitted: [
    { to: 'under_review', event: 'acknowledged' },
    { to: 'info_requested', event: 'info_requested' },
    { to: 'approved', event: 'approved', required: ['approvedAt'] },
    {
      to: 'partially_approved',
      event: 'partially_approved',
      required: ['approvedAt', 'approvedAmount'],
    },
    { to: 'rejected', event: 'rejected', required: ['rejectionReason'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  under_review: [
    { to: 'info_requested', event: 'info_requested' },
    { to: 'approved', event: 'approved', required: ['approvedAt'] },
    {
      to: 'partially_approved',
      event: 'partially_approved',
      required: ['approvedAt', 'approvedAmount'],
    },
    { to: 'rejected', event: 'rejected', required: ['rejectionReason'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  info_requested: [
    { to: 'under_review', event: 'resumed' },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  approved: [
    { to: 'disbursed', event: 'disbursed', required: ['disbursedAt', 'disbursedAmount'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  partially_approved: [
    { to: 'disbursed', event: 'disbursed', required: ['disbursedAt', 'disbursedAmount'] },
    { to: 'appealed', event: 'appealed', required: ['appealReason'] }, // appeal the partial
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  rejected: [
    { to: 'appealed', event: 'appealed', required: ['appealReason'] },
    { to: 'closed', event: 'closed' },
  ],
  appealed: [
    { to: 'appeal_approved', event: 'appeal_approved', required: ['approvedAt'] },
    { to: 'appeal_rejected', event: 'appeal_rejected', required: ['rejectionReason'] },
  ],
  appeal_approved: [
    { to: 'disbursed', event: 'disbursed', required: ['disbursedAt', 'disbursedAmount'] },
  ],
  appeal_rejected: [{ to: 'closed', event: 'closed' }],
  disbursed: [{ to: 'closed', event: 'closed' }],
  closed: [],
  cancelled: [],
});

// ── Frequency of disbursement ──────────────────────────────────────

const DISBURSEMENT_FREQUENCIES = Object.freeze(['one_time', 'monthly', 'quarterly', 'annually']);

// ── Cancellation reasons ───────────────────────────────────────────

const CANCELLATION_REASONS = Object.freeze([
  'family_withdrew',
  'not_eligible',
  'duplicate',
  'beneficiary_deceased',
  'better_option_found',
  'admin_error',
  'other',
]);

// ── Helpers ─────────────────────────────────────────────────────────

function canTransition(from, to) {
  const edges = APPLICATION_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = APPLICATION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function requiredFieldsForTransition(from, to) {
  const edges = APPLICATION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isTerminal(status) {
  return APPLICATION_TERMINAL_STATUSES.includes(status);
}

function isPaused(status) {
  return APPLICATION_PAUSE_STATUSES.includes(status);
}

/**
 * Is this a "financial success" terminal — meaning the family
 * actually received the benefit? Used for KPI math.
 */
function isSuccessful(status) {
  return status === 'disbursed';
}

function isRejectedTerminal(status) {
  return ['appeal_rejected', 'rejected'].includes(status) || status === 'closed';
}

// ── Validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(APPLICATION_TRANSITIONS)) {
    if (!APPLICATION_STATUSES.includes(from)) {
      throw new Error(`welfare registry: transition source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!APPLICATION_STATUSES.includes(e.to)) {
        throw new Error(`welfare registry: transition ${from}→${e.to} unknown`);
      }
      if (!e.event) {
        throw new Error(`welfare registry: transition ${from}→${e.to} missing event`);
      }
    }
  }
  return true;
}

module.exports = {
  APPLICATION_TYPES,
  TARGET_AGENCIES,
  APPLICATION_STATUSES,
  APPLICATION_TERMINAL_STATUSES,
  APPLICATION_PAUSE_STATUSES,
  APPLICATION_TRANSITIONS,
  DISBURSEMENT_FREQUENCIES,
  CANCELLATION_REASONS,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isPaused,
  isSuccessful,
  isRejectedTerminal,
  validate,
};
