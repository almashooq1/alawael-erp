'use strict';

/**
 * meetingGovernance.registry.js — Phase 16 Commit 6 (4.0.71).
 *
 * Canonical vocabulary for the meeting-governance subsystem. Pure
 * data, validated at boot.
 *
 * Context — the existing `Meeting.js` model has an inline
 * `decisions[]` string array and an `actionItems[]` array with
 * pending/done status only. That's fine for a note-taking tool
 * but useless for the ops control tower: no due dates,
 * ownership, priority, SLA tracking, or cross-meeting follow-up
 * view. This commit promotes decisions to a first-class
 * `MeetingDecision` collection with a proper lifecycle, and
 * wires it to the two `meeting.*` SLAs we shipped in C1:
 *
 *   • `meeting.minutes.publish`       — starts on `ops.meeting.ended`
 *     (2-day default target). Resolved when minutes are published.
 *
 *   • `meeting.decision.execution`    — starts on
 *     `ops.meeting.decision_assigned`. Resolved when the decision
 *     hits a terminal status (completed / cancelled / deferred).
 */

// ── decision types (classification) ─────────────────────────────────

const DECISION_TYPES = Object.freeze([
  'directive', // leadership directive to execute
  'resolution', // formal resolution, usually governance
  'approval', // approves a plan/budget/proposal
  'policy_change', // updates a policy/SOP
  'investment', // spend / capex decision
  'other',
]);

const PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

// ── status machine ──────────────────────────────────────────────────

const DECISION_STATUSES = Object.freeze([
  'open', // freshly assigned
  'in_progress', // owner has started work
  'blocked', // pause — waiting on external input
  'completed', // done
  'deferred', // accepted + pushed to later cycle
  'cancelled', // withdrawn
  'overdue', // past due-date and still open
]);

const TERMINAL_STATUSES = Object.freeze(['completed', 'deferred', 'cancelled']);

// SLA pause states — entering these triggers
// `slaEngine.observe('state_changed')`.
const PAUSE_STATUSES = Object.freeze(['blocked']);

// Resolution (SLA met) — entering these fires `observe('resolved')`.
const RESOLUTION_STATUSES = Object.freeze(['completed', 'deferred']);

// Cancel (SLA cancelled) — entering these fires `observe('cancelled')`.
const CANCEL_STATUSES = Object.freeze(['cancelled']);

// Decision-status transition graph.
// `overdue` is set by the scheduler, not a user action, so it's
// reachable from any open state but not a user-invoked target.
const DECISION_TRANSITIONS = Object.freeze({
  open: [
    { to: 'in_progress', event: 'started' },
    { to: 'blocked', event: 'blocked' },
    { to: 'completed', event: 'completed', required: ['executionNotes'] },
    { to: 'deferred', event: 'deferred', required: ['deferReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  in_progress: [
    { to: 'blocked', event: 'blocked' },
    { to: 'completed', event: 'completed', required: ['executionNotes'] },
    { to: 'deferred', event: 'deferred', required: ['deferReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  blocked: [
    { to: 'in_progress', event: 'resumed' },
    { to: 'cancelled', event: 'cancelled' },
    { to: 'deferred', event: 'deferred', required: ['deferReason'] },
  ],
  overdue: [
    // When overdue, you can still move forward — resolving / cancelling / deferring
    // is the whole point. The scheduler lifts the `overdue` flag as a *side*
    // effect when the doc transitions out.
    { to: 'in_progress', event: 'resumed' },
    { to: 'completed', event: 'completed', required: ['executionNotes'] },
    { to: 'deferred', event: 'deferred', required: ['deferReason'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  completed: [],
  deferred: [{ to: 'open', event: 'reopened' }], // deferred can re-enter the flow
  cancelled: [],
});

// ── helpers ─────────────────────────────────────────────────────────

function canTransition(from, to) {
  const edges = DECISION_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = DECISION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function requiredFieldsForTransition(from, to) {
  const edges = DECISION_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge && edge.required ? edge.required : [];
}

function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

function isPaused(status) {
  return PAUSE_STATUSES.includes(status);
}

function slaPolicyForDecision() {
  return 'meeting.decision.execution';
}

function slaPolicyForMinutes() {
  return 'meeting.minutes.publish';
}

/**
 * Default due-date offset by priority — when a decision is assigned
 * without an explicit `dueDate`, the service uses this.
 */
function defaultDueOffsetDays(priority) {
  switch (priority) {
    case 'critical':
      return 3;
    case 'high':
      return 7;
    case 'medium':
      return 14;
    case 'low':
      return 30;
    default:
      return 14;
  }
}

// ── validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(DECISION_TRANSITIONS)) {
    if (!DECISION_STATUSES.includes(from)) {
      throw new Error(`meeting-governance registry: transition source '${from}' unknown`);
    }
    for (const edge of edges) {
      if (!DECISION_STATUSES.includes(edge.to)) {
        throw new Error(
          `meeting-governance registry: transition ${from}→${edge.to}: unknown target`
        );
      }
      if (!edge.event) {
        throw new Error(`meeting-governance registry: transition ${from}→${edge.to} missing event`);
      }
    }
  }
  for (const p of PAUSE_STATUSES) {
    if (!DECISION_STATUSES.includes(p)) {
      throw new Error(`meeting-governance registry: pause status '${p}' unknown`);
    }
  }
  return true;
}

module.exports = {
  DECISION_TYPES,
  DECISION_STATUSES,
  TERMINAL_STATUSES,
  PAUSE_STATUSES,
  RESOLUTION_STATUSES,
  CANCEL_STATUSES,
  DECISION_TRANSITIONS,
  PRIORITIES,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isPaused,
  slaPolicyForDecision,
  slaPolicyForMinutes,
  defaultDueOffsetDays,
  validate,
};
