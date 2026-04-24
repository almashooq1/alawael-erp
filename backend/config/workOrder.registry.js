'use strict';

/**
 * workOrder.registry.js — Phase 16 Commit 2 (4.0.67).
 *
 * Canonical state machine for maintenance work orders. Pure data.
 *
 * Context: the existing `MaintenanceWorkOrder` model shipped with a
 * 6-state enum (pending / approved / in_progress / on_hold /
 * completed / cancelled). That's enough for a CMMS but not enough
 * for an ops control tower — we need:
 *
 *   • a triage step so not every request is auto-approved
 *   • an explicit scheduled state (distinct from approved, because
 *     approval is a budget/authority decision; scheduling commits
 *     a resource + time slot)
 *   • a blocked state (waiting on parts/vendor) distinct from
 *     on_hold (administrative pause)
 *   • a verified state so QA on the fix precedes final closure
 *   • a reopened state for warranty/regression reworks
 *   • a rejected state for triaged-and-rejected requests
 *
 * Design notes:
 *
 *   1. **Legacy aliases** — the old 6 states all still exist and map
 *      to canonical names. `pending` is an alias for `submitted`;
 *      `completed` is still valid and can either remain terminal
 *      (legacy flow) or transition onward to verified/closed (new
 *      flow) as the caller chooses.
 *
 *   2. **Pause states** (`on_hold`, `blocked`) freeze the SLA clock
 *      via `slaEngine.observe('state_changed')`. Matches
 *      `maintenance.wo.*` policies in `sla.registry.js`.
 *
 *   3. **Transitions are a graph, not a line** — we ship the full
 *      adjacency matrix rather than a sequence so recovery/rework
 *      paths (e.g. completed → reopened → in_progress) work
 *      without special cases.
 *
 *   4. **Response milestone** — entering `triaged` or `scheduled`
 *      (whichever happens first) counts as first-response for SLA
 *      purposes. This is the earliest point a human owner has
 *      acknowledged the WO.
 *
 * Transition shape (validated at boot):
 *
 *   TRANSITIONS[fromState] = [{ to, event, required? }]
 *     - `event` is the bus topic to emit (under `ops.wo.`)
 *     - `required` is a list of field names that MUST be set on
 *       the doc before the transition is allowed
 */

// ── canonical states ────────────────────────────────────────────────

const WO_STATES = Object.freeze([
  'draft',
  'submitted',
  'triaged',
  'approved',
  'rejected',
  'scheduled',
  'in_progress',
  'on_hold',
  'blocked',
  'completed',
  'verified',
  'closed',
  'cancelled',
  'reopened',
]);

// Legacy alias → canonical state. When a caller passes `pending`
// we normalise it to `submitted` before transition lookup.
const LEGACY_ALIASES = Object.freeze({
  pending: 'submitted',
});

// Terminal states — no outgoing transitions except reopen.
const TERMINAL_STATES = Object.freeze(['closed', 'cancelled', 'rejected']);

// States that pause the SLA clock (match sla.registry pauseOnStates).
const PAUSE_STATES = Object.freeze(['on_hold', 'blocked']);

// Response milestone — entering any of these counts as
// first-response for SLA tracking.
const RESPONSE_STATES = Object.freeze(['triaged', 'scheduled']);

// Resolution milestone — entering any of these marks the clock
// resolved against the SLA target.
const RESOLUTION_STATES = Object.freeze(['completed', 'verified', 'closed']);

// Cancellation milestone — mark SLA as cancelled (no outcome).
const CANCEL_STATES = Object.freeze(['cancelled', 'rejected']);

// ── transition graph ───────────────────────────────────────────────

const TRANSITIONS = Object.freeze({
  draft: [
    { to: 'submitted', event: 'submitted', required: ['title', 'assetId', 'priority'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  submitted: [
    { to: 'triaged', event: 'triaged' },
    { to: 'approved', event: 'approved' }, // fast-path for criticals
    { to: 'rejected', event: 'rejected', required: ['resolution'] }, // must explain
    { to: 'cancelled', event: 'cancelled' },
  ],
  triaged: [
    { to: 'approved', event: 'approved' },
    { to: 'rejected', event: 'rejected', required: ['resolution'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  approved: [
    { to: 'scheduled', event: 'scheduled', required: ['scheduledDate'] },
    { to: 'in_progress', event: 'started' }, // criticals may skip scheduling
    { to: 'cancelled', event: 'cancelled' },
  ],
  scheduled: [
    { to: 'in_progress', event: 'started' },
    { to: 'on_hold', event: 'held' },
    { to: 'blocked', event: 'blocked' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  in_progress: [
    { to: 'on_hold', event: 'held' },
    { to: 'blocked', event: 'blocked' },
    { to: 'completed', event: 'completed', required: ['resolution'] },
    { to: 'cancelled', event: 'cancelled' },
  ],
  on_hold: [
    { to: 'in_progress', event: 'resumed' },
    { to: 'scheduled', event: 'rescheduled' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  blocked: [
    { to: 'in_progress', event: 'resumed' },
    { to: 'on_hold', event: 'held' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  completed: [
    { to: 'verified', event: 'verified' },
    { to: 'reopened', event: 'reopened' }, // QA bounced it back
    { to: 'closed', event: 'closed' }, // legacy flow skips verify
  ],
  verified: [{ to: 'closed', event: 'closed' }],
  closed: [{ to: 'reopened', event: 'reopened' }], // warranty/regression
  reopened: [
    { to: 'in_progress', event: 'started' },
    { to: 'scheduled', event: 'rescheduled', required: ['scheduledDate'] },
  ],
  cancelled: [],
  rejected: [],
});

// ── helpers ─────────────────────────────────────────────────────────

/**
 * Normalise a caller-provided state name to the canonical form,
 * accepting legacy aliases.
 */
function canonical(state) {
  if (!state) return null;
  const lower = String(state).toLowerCase();
  return LEGACY_ALIASES[lower] || (WO_STATES.includes(lower) ? lower : null);
}

function isTerminal(state) {
  return TERMINAL_STATES.includes(canonical(state));
}

function isPaused(state) {
  return PAUSE_STATES.includes(canonical(state));
}

function allowedTransitions(fromState) {
  const from = canonical(fromState);
  if (!from) return [];
  return TRANSITIONS[from] || [];
}

function canTransition(fromState, toState) {
  const to = canonical(toState);
  return allowedTransitions(fromState).some(t => t.to === to);
}

function eventForTransition(fromState, toState) {
  const to = canonical(toState);
  const edge = allowedTransitions(fromState).find(t => t.to === to);
  return edge ? edge.event : null;
}

/**
 * Map a work order's (type, priority) tuple to the SLA policy id
 * in `sla.registry.js`. Returns null if the WO should not have a
 * tracked SLA (unknown priority or explicitly opted-out type).
 */
function slaPolicyFor({ type, priority }) {
  if (type === 'preventive') return 'maintenance.wo.preventive';
  if (priority === 'critical' || type === 'emergency') return 'maintenance.wo.critical';
  if (priority === 'high') return 'maintenance.wo.high';
  return null; // normal / low corrective WOs: no tracked SLA by default
}

// ── validation ──────────────────────────────────────────────────────

/**
 * Boot-time drift check — throws on the first violation.
 */
function validate() {
  // Every TRANSITIONS key must be a canonical state.
  for (const state of Object.keys(TRANSITIONS)) {
    if (!WO_STATES.includes(state)) {
      throw new Error(`WO registry: transition source '${state}' not in WO_STATES`);
    }
    for (const edge of TRANSITIONS[state]) {
      if (!WO_STATES.includes(edge.to)) {
        throw new Error(`WO registry: transition ${state}→${edge.to}: unknown target`);
      }
      if (typeof edge.event !== 'string' || !edge.event) {
        throw new Error(`WO registry: transition ${state}→${edge.to}: event required`);
      }
    }
  }
  // Every canonical state must appear as a source or at least be reachable.
  const reachable = new Set(['draft']);
  for (const [from, edges] of Object.entries(TRANSITIONS)) {
    for (const e of edges) reachable.add(e.to);
    reachable.add(from);
  }
  for (const s of WO_STATES) {
    if (!reachable.has(s)) {
      throw new Error(`WO registry: state '${s}' is orphan (not reachable)`);
    }
  }
  return true;
}

module.exports = {
  WO_STATES,
  LEGACY_ALIASES,
  TERMINAL_STATES,
  PAUSE_STATES,
  RESPONSE_STATES,
  RESOLUTION_STATES,
  CANCEL_STATES,
  TRANSITIONS,
  canonical,
  isTerminal,
  isPaused,
  allowedTransitions,
  canTransition,
  eventForTransition,
  slaPolicyFor,
  validate,
};
