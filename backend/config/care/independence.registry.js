'use strict';

/**
 * care/independence.registry.js — Phase 17 Commit 6 (4.0.88).
 *
 * Three coupled vocabularies for the Life-Independence layer:
 *
 *   1) TransitionReadiness — structured assessment of a
 *      beneficiary's readiness to move to an adult / independent
 *      / supported setting. Covers several life domains with
 *      per-domain scoring; produces an overall readiness tier
 *      + identified barriers + goal list.
 *
 *   2) IADL (Instrumental ADL) — Lawton-scale 8-domain assessment
 *      (telephone use, shopping, food preparation, housekeeping,
 *      laundry, transportation, medications, finances) scored
 *      0..3 per domain, total 0..24.
 *
 *   3) CommunityParticipation — a log of actual community
 *      activities the beneficiary engaged in (volunteering,
 *      employment, social events, religious activities, etc.)
 *      with support-level rating + optional link to a C4
 *      CommunityPartner.
 *
 * No SLA policies — these are longitudinal / planning subjects,
 * not time-bound process work.
 */

// ── 1. Transition readiness ─────────────────────────────────────────

const TRANSITION_TARGETS = Object.freeze([
  'adult_services', // aging out of youth programming
  'independent_living', // moving to own home
  'supported_living', // group home / shared accommodation
  'supported_employment', // job with coaching
  'vocational_training',
  'family_reintegration', // returning to family home from residence
  'discharge_to_community',
  'post_secondary_education',
  'other',
]);

const TRANSITION_DOMAINS = Object.freeze([
  { code: 'self_care', labelEn: 'Self-care', labelAr: 'العناية الذاتية' },
  { code: 'community_safety', labelEn: 'Community safety', labelAr: 'السلامة في المجتمع' },
  { code: 'money_management', labelEn: 'Money management', labelAr: 'إدارة المال' },
  { code: 'employment_readiness', labelEn: 'Employment readiness', labelAr: 'الجاهزية للعمل' },
  { code: 'social_skills', labelEn: 'Social skills', labelAr: 'المهارات الاجتماعية' },
  { code: 'self_advocacy', labelEn: 'Self-advocacy', labelAr: 'الدفاع عن الذات' },
  {
    code: 'medical_self_mgmt',
    labelEn: 'Medical self-management',
    labelAr: 'إدارة الرعاية الصحية الذاتية',
  },
  { code: 'transportation', labelEn: 'Transportation', labelAr: 'التنقل' },
  { code: 'daily_routines', labelEn: 'Daily routines', labelAr: 'الروتين اليومي' },
  { code: 'housing_readiness', labelEn: 'Housing readiness', labelAr: 'الجاهزية السكنية' },
]);
const TRANSITION_DOMAIN_CODES = Object.freeze(TRANSITION_DOMAINS.map(d => d.code));

// Per-domain score: 0..3
const DOMAIN_SCORE_MIN = 0;
const DOMAIN_SCORE_MAX = 3;
const DOMAIN_SCORE_LABELS = Object.freeze({
  0: 'not_ready',
  1: 'emerging',
  2: 'developing',
  3: 'ready',
});

// Overall readiness tier (derived from per-domain averages)
const READINESS_TIERS = Object.freeze(['not_ready', 'emerging', 'developing', 'ready']);

const TRANSITION_STATUSES = Object.freeze([
  'draft',
  'in_progress', // partial scoring done, still being worked
  'completed', // finalized
  'superseded', // replaced by a more recent reassessment
  'archived',
  'cancelled',
]);

const TRANSITION_TERMINAL_STATUSES = Object.freeze(['superseded', 'archived', 'cancelled']);

const TRANSITION_TRANSITIONS = Object.freeze({
  draft: [
    { to: 'in_progress', event: 'started' },
    { to: 'completed', event: 'completed', required: ['overallReadiness'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  in_progress: [
    { to: 'completed', event: 'completed', required: ['overallReadiness'] },
    { to: 'cancelled', event: 'cancelled', required: ['cancellationReason'] },
  ],
  completed: [
    { to: 'superseded', event: 'superseded', required: ['supersededByAssessmentId'] },
    { to: 'archived', event: 'archived' },
  ],
  superseded: [{ to: 'archived', event: 'archived' }],
  archived: [],
  cancelled: [],
});

// ── 2. IADL ─────────────────────────────────────────────────────────

const IADL_DOMAINS = Object.freeze([
  { code: 'telephone_use', labelEn: 'Telephone use', labelAr: 'استخدام الهاتف' },
  { code: 'shopping', labelEn: 'Shopping', labelAr: 'التسوق' },
  { code: 'food_preparation', labelEn: 'Food preparation', labelAr: 'تحضير الطعام' },
  { code: 'housekeeping', labelEn: 'Housekeeping', labelAr: 'الأعمال المنزلية' },
  { code: 'laundry', labelEn: 'Laundry', labelAr: 'الغسيل' },
  { code: 'transportation', labelEn: 'Transportation', labelAr: 'المواصلات' },
  { code: 'medications', labelEn: 'Medications', labelAr: 'إدارة الأدوية' },
  { code: 'finances', labelEn: 'Finances', labelAr: 'الشؤون المالية' },
]);
const IADL_DOMAIN_CODES = Object.freeze(IADL_DOMAINS.map(d => d.code));

// Lawton scoring: 0 = fully dependent, 3 = independent.
const IADL_SCORE_MIN = 0;
const IADL_SCORE_MAX = 3;
const IADL_TOTAL_MIN = 0;
const IADL_TOTAL_MAX = IADL_DOMAIN_CODES.length * IADL_SCORE_MAX; // 8 × 3 = 24

const IADL_BANDS = Object.freeze([
  { minScore: 0, maxScore: 7, label: 'fully_dependent', action: 'intensive_support' },
  { minScore: 8, maxScore: 15, label: 'partially_dependent', action: 'structured_support' },
  { minScore: 16, maxScore: 20, label: 'mostly_independent', action: 'coaching' },
  { minScore: 21, maxScore: 24, label: 'fully_independent', action: 'monitor_only' },
]);

// ── 3. Community participation ──────────────────────────────────────

const PARTICIPATION_TYPES = Object.freeze([
  'volunteering',
  'employment',
  'supported_employment',
  'social_event',
  'religious_activity',
  'recreation',
  'educational_activity',
  'family_gathering',
  'advocacy',
  'vocational_internship',
  'other',
]);

const SUPPORT_LEVELS = Object.freeze([
  'none', // fully independent
  'minimal', // prompting only
  'moderate', // some physical / verbal support
  'maximal', // continuous support needed
]);

const PARTICIPATION_OUTCOMES = Object.freeze([
  'very_positive',
  'positive',
  'neutral',
  'challenging',
  'unsuccessful',
]);

// ── Helpers ─────────────────────────────────────────────────────────

function transitionDomainByCode(code) {
  return TRANSITION_DOMAINS.find(d => d.code === code) || null;
}

function iadlDomainByCode(code) {
  return IADL_DOMAINS.find(d => d.code === code) || null;
}

function canTransitionStatus(from, to) {
  const edges = TRANSITION_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function transitionEventFor(from, to) {
  const edges = TRANSITION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function transitionRequiredFields(from, to) {
  const edges = TRANSITION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge?.required ?? [];
}

function isTransitionTerminal(status) {
  return TRANSITION_TERMINAL_STATUSES.includes(status);
}

/**
 * Derive an overall readiness tier from per-domain scores.
 * Uses the average — rounded down — to pick a tier from
 * READINESS_TIERS (0=not_ready, 1=emerging, 2=developing, 3=ready).
 */
function deriveReadinessTier(domainScores) {
  if (!Array.isArray(domainScores) || domainScores.length === 0) return null;
  const total = domainScores.reduce((s, v) => s + (Number(v) || 0), 0);
  const avg = total / domainScores.length;
  const idx = Math.max(0, Math.min(Math.floor(avg), READINESS_TIERS.length - 1));
  return READINESS_TIERS[idx];
}

/**
 * Score an IADL assessment.
 * @param {number[]} domainScores - length must match IADL_DOMAIN_CODES (8)
 * @returns {object} { total, band, action }
 */
function scoreIadl(domainScores) {
  if (!Array.isArray(domainScores)) {
    throw new Error('domainScores must be an array');
  }
  if (domainScores.length !== IADL_DOMAIN_CODES.length) {
    throw new Error(`IADL expects ${IADL_DOMAIN_CODES.length} scores, got ${domainScores.length}`);
  }
  for (let i = 0; i < domainScores.length; i++) {
    const v = domainScores[i];
    if (typeof v !== 'number' || v < IADL_SCORE_MIN || v > IADL_SCORE_MAX) {
      throw new Error(`IADL domain[${i}]=${v} out of range [${IADL_SCORE_MIN}, ${IADL_SCORE_MAX}]`);
    }
  }
  const total = domainScores.reduce((s, v) => s + v, 0);
  const band = IADL_BANDS.find(b => total >= b.minScore && total <= b.maxScore);
  return {
    total,
    band: band ? band.label : 'unknown',
    action: band ? band.action : 'unknown',
  };
}

function isValidParticipationType(t) {
  return PARTICIPATION_TYPES.includes(t);
}

function isValidSupportLevel(l) {
  return SUPPORT_LEVELS.includes(l);
}

// ── Validate ────────────────────────────────────────────────────────

function validate() {
  // TransitionReadiness — every status has a transitions entry
  for (const s of TRANSITION_STATUSES) {
    if (TRANSITION_TRANSITIONS[s] === undefined) {
      throw new Error(`independence registry: transition status '${s}' missing entry`);
    }
  }
  for (const [from, edges] of Object.entries(TRANSITION_TRANSITIONS)) {
    if (!TRANSITION_STATUSES.includes(from)) {
      throw new Error(`independence registry: transition source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!TRANSITION_STATUSES.includes(e.to)) {
        throw new Error(`independence registry: transition ${from}→${e.to} unknown`);
      }
      if (!e.event) {
        throw new Error(`independence registry: transition ${from}→${e.to} missing event`);
      }
    }
  }
  // IADL bands cover the full total range contiguously
  let cursor = IADL_TOTAL_MIN;
  for (const b of IADL_BANDS) {
    if (b.minScore !== cursor) {
      throw new Error(
        `independence registry: IADL gap before band '${b.label}' (expected ${cursor}, got ${b.minScore})`
      );
    }
    cursor = b.maxScore + 1;
  }
  if (cursor - 1 !== IADL_TOTAL_MAX) {
    throw new Error(`independence registry: IADL bands don't reach totalMax ${IADL_TOTAL_MAX}`);
  }
  // Vocabulary uniqueness
  for (const arr of [
    TRANSITION_TARGETS,
    TRANSITION_DOMAIN_CODES,
    IADL_DOMAIN_CODES,
    PARTICIPATION_TYPES,
    SUPPORT_LEVELS,
    PARTICIPATION_OUTCOMES,
    READINESS_TIERS,
  ]) {
    if (new Set(arr).size !== arr.length) {
      throw new Error(`independence registry: duplicate vocabulary`);
    }
  }
  return true;
}

module.exports = {
  // Transition Readiness
  TRANSITION_TARGETS,
  TRANSITION_DOMAINS,
  TRANSITION_DOMAIN_CODES,
  DOMAIN_SCORE_MIN,
  DOMAIN_SCORE_MAX,
  DOMAIN_SCORE_LABELS,
  READINESS_TIERS,
  TRANSITION_STATUSES,
  TRANSITION_TERMINAL_STATUSES,
  TRANSITION_TRANSITIONS,
  transitionDomainByCode,
  canTransitionStatus,
  transitionEventFor,
  transitionRequiredFields,
  isTransitionTerminal,
  deriveReadinessTier,
  // IADL
  IADL_DOMAINS,
  IADL_DOMAIN_CODES,
  IADL_SCORE_MIN,
  IADL_SCORE_MAX,
  IADL_TOTAL_MIN,
  IADL_TOTAL_MAX,
  IADL_BANDS,
  iadlDomainByCode,
  scoreIadl,
  // Participation
  PARTICIPATION_TYPES,
  SUPPORT_LEVELS,
  PARTICIPATION_OUTCOMES,
  isValidParticipationType,
  isValidSupportLevel,
  // Validate
  validate,
};
