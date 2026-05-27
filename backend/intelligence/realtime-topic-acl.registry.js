'use strict';

/**
 * realtime-topic-acl.registry.js — Wave 427 (Phase A1 — Real-Time Backbone).
 *
 * Authoritative allowlist mapping role → realtime topic prefixes a user
 * may subscribe to via the SSE Gateway (/api/realtime/stream).
 *
 * Default-deny: a role NOT listed here gets ZERO topics. Add explicit
 * entries — never sprinkle * in production.
 *
 * Topic prefix matching:
 *   'quality.capa.*'          → matches 'quality.capa.overdue',
 *                                'quality.capa.transitioned', etc.
 *   'beneficiary.status_changed' → exact match only
 *
 * The integrationBus + qualityEventBus both publish dotted names. The
 * gateway calls isTopicAllowed(role, topic) once per delivery; if false,
 * the event is dropped silently (never even reaches the SSE socket).
 *
 * Why centralized:
 *   • One place to audit (PDPL + clinical-data exposure review)
 *   • Drift guard test asserts no role gets '*' in production
 *   • Adding a new topic prefix forces an explicit role-mapping decision
 */

const ROLE_TOPIC_ALLOWLIST = Object.freeze({
  // ── Cross-branch ops + administration ─────────────────────────────
  super_admin: ['*'], // platform owner — full firehose
  head_office_admin: ['*'], // group HQ — full firehose
  admin: [
    'quality.*',
    'compliance.*',
    'system.*',
    'integration.*',
    'audit.*',
    'beneficiary.status_changed',
    'beneficiary.profile_updated',
    'episode.*',
    'careplan.*',
    'session.*',
    'assessment.*',
    'ai.*',
    'cache.*',
    // W506 Phase C — outcome measure alerts on the /admin/ops/measures-outcomes
    // dashboard. Not `medical.*` (admin role isn't a clinical viewer for the
    // full medical surface) — single explicit topic.
    'medical.measure_alert.raised',
  ],

  // ── Branch leadership ─────────────────────────────────────────────
  manager: [
    'quality.capa.*',
    'compliance.evidence.*',
    'beneficiary.status_changed',
    'episode.*',
    'careplan.*',
    'session.*',
    'assessment.*',
    'attendance.*',
    'ai.*',
    'finance.budget.threshold_reached',
    'hr.absence.detected',
    // W506: branch manager sees outcome alerts for ops triage.
    'medical.measure_alert.raised',
  ],
  supervisor: [
    'quality.capa.*',
    'beneficiary.status_changed',
    'episode.*',
    'careplan.*',
    'session.completed',
    'assessment.completed',
    'ai.recommendation_generated',
    'ai.risk_elevated',
    'goal.achieved',
    'behavior.incident_recorded',
    // W506: clinical supervisor picks up forecast off-track + regression
    // alerts for the supervisor inbox (SmartInboxRanker W431).
    'medical.measure_alert.raised',
  ],

  // ── Clinical roles ────────────────────────────────────────────────
  doctor: [
    'beneficiary.status_changed',
    'episode.*',
    'careplan.*',
    'session.completed',
    'assessment.completed',
    'ai.recommendation_generated',
    'ai.risk_elevated',
    'medical.*',
  ],
  therapist: [
    'session.*',
    'assessment.completed',
    'careplan.activated',
    'careplan.completed',
    'goal.achieved',
    'ai.recommendation_generated',
  ],
  nurse: ['session.completed', 'medical.*', 'beneficiary.status_changed'],
  nursing_supervisor: ['session.*', 'medical.*', 'beneficiary.status_changed', 'quality.capa.*'],
  head_nurse: ['session.*', 'medical.*', 'beneficiary.status_changed', 'quality.capa.*'],
  teacher: ['session.*', 'goal.achieved', 'careplan.activated'],

  // ── HR + Finance ──────────────────────────────────────────────────
  hr: ['hr.*', 'attendance.*'],
  hr_manager: ['hr.*', 'attendance.*', 'system.error.occurred'],
  accountant: ['finance.*'],
  finance: ['finance.*'],

  // ── CRM / Front desk ──────────────────────────────────────────────
  receptionist: [
    'beneficiary.status_changed',
    'episode.created',
    'session.scheduled',
    'attendance.*',
  ],
  patient_relations_officer: ['beneficiary.status_changed', 'quality.complaint.*', 'crm.*'],
  crm_supervisor: [
    'beneficiary.status_changed',
    'quality.complaint.*',
    'crm.*',
    'ai.risk_elevated',
  ],

  // ── DPO (PDPL) ────────────────────────────────────────────────────
  dpo: ['audit.*', 'compliance.*', 'system.error.occurred', 'pdpl.*'],

  // ── Data entry: NO realtime topics. Polling-only by design. ───────
  data_entry: [],

  // ── Parent portal: only their own beneficiary events. ─────────────
  // Branch + beneficiary scoping enforced at the SSE filter layer —
  // this list only controls TOPIC categories.
  parent: ['session.completed', 'goal.achieved', 'careplan.activated', 'assessment.completed'],

  // ── Read-only viewer + unauthenticated guest get NOTHING ──────────
  viewer: [],
  user: [],
  guest: [],
});

/**
 * Match `topic` (e.g. 'quality.capa.overdue') against an allowlist entry
 * which is either an exact name or a prefix ending in '.*' (or '*').
 *
 * @param {string} entry — registry entry (e.g. 'quality.capa.*' or 'session.completed')
 * @param {string} topic — actual dotted event name being delivered
 * @returns {boolean}
 */
function _entryMatches(entry, topic) {
  if (entry === '*') return true;
  if (entry === topic) return true;
  if (entry.endsWith('.*')) {
    const prefix = entry.slice(0, -2);
    return topic === prefix || topic.startsWith(prefix + '.');
  }
  return false;
}

/**
 * Is `role` allowed to subscribe to `topic`?
 *
 * Unknown roles return false (default-deny). Empty role allowlist also
 * returns false. The * wildcard short-circuits to true (super_admin +
 * head_office_admin only).
 *
 * @param {string} role
 * @param {string} topic
 * @returns {boolean}
 */
function isTopicAllowed(role, topic) {
  if (!role || typeof role !== 'string') return false;
  if (!topic || typeof topic !== 'string') return false;
  const entries = ROLE_TOPIC_ALLOWLIST[role];
  if (!Array.isArray(entries) || entries.length === 0) return false;
  for (const entry of entries) {
    if (_entryMatches(entry, topic)) return true;
  }
  return false;
}

/**
 * List the topic-prefix patterns a role may subscribe to. Used by the
 * SSE gateway when the client subscribes without a `topic=` filter —
 * the gateway returns events of any allowed topic but never others.
 *
 * @param {string} role
 * @returns {string[]} frozen list of patterns
 */
function allowedTopicsFor(role) {
  const entries = ROLE_TOPIC_ALLOWLIST[role];
  return Array.isArray(entries) ? Object.freeze([...entries]) : Object.freeze([]);
}

/**
 * Total roles in the registry — diagnostic for drift-guard tests.
 */
function knownRoles() {
  return Object.freeze(Object.keys(ROLE_TOPIC_ALLOWLIST));
}

module.exports = {
  ROLE_TOPIC_ALLOWLIST,
  isTopicAllowed,
  allowedTopicsFor,
  knownRoles,
  _entryMatches, // exported for targeted unit tests
};
