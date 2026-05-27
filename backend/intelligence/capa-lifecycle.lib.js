'use strict';

/**
 * W337 — CapaItem (Corrective Action / Preventive Action) lifecycle state machine.
 *
 * Pure-function lib (no mongoose dependency) so it can be unit-tested under
 * jest.mock('mongoose'). Mirrors W325 P2 measure-lifecycle.lib.js and
 * W334 ai-recommendation-lifecycle.lib.js patterns.
 *
 * CAPA items are created downstream of:
 *   - audit finding (AuditOccurrence.findings[].linkedCapaId)
 *   - failure mode (FmeaWorksheet.linkedCapaId / relatedCapaIds[])
 *   - root cause investigation (RcaInvestigation.linkedCapaId)
 *   - incident, complaint, or improvement project (polymorphic source)
 *
 * Standard QMS CAPA workflow: action is planned → executed → verified → closed.
 *
 * States (7):
 *   OPEN          — created, owner assigned, action plan drafted
 *   IN_PROGRESS   — owner is executing the action plan
 *   IMPLEMENTED   — action complete; awaiting verification
 *   VERIFIED      — verification passed; ready for closure
 *   CLOSED        — quality officer signed off; terminal
 *   REJECTED      — invalid CAPA (duplicate, out-of-scope); terminal
 *   CANCELLED     — superseded or no-longer-applicable; terminal
 *
 * Transitions:
 *   OPEN          → IN_PROGRESS (owner starts work)
 *   OPEN          → REJECTED    (quality officer rejects; reasonCode required)
 *   OPEN          → CANCELLED   (superseded; reasonCode required)
 *   IN_PROGRESS   → IMPLEMENTED (owner marks complete)
 *   IN_PROGRESS   → REJECTED    (quality officer rejects mid-work)
 *   IN_PROGRESS   → CANCELLED
 *   IMPLEMENTED   → VERIFIED    (verifier confirms action is effective)
 *   IMPLEMENTED   → IN_PROGRESS (verification failed; reasonCode required, back to work)
 *   IMPLEMENTED   → CANCELLED
 *   VERIFIED      → CLOSED      (quality officer signs off; MFA tier 2)
 *
 * Forbidden (drift guard catches if accidentally allowed):
 *   CLOSED/REJECTED/CANCELLED → ANY  (all terminal)
 *   OPEN → IMPLEMENTED               (must go through IN_PROGRESS)
 *   IMPLEMENTED → CLOSED             (must verify before closing)
 *   VERIFIED → IN_PROGRESS           (verified state cannot reopen — supersede instead)
 */

const LIFECYCLE_STATES = Object.freeze([
  'OPEN',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'VERIFIED',
  'CLOSED',
  'REJECTED',
  'CANCELLED',
]);

const VALID_TRANSITIONS = Object.freeze({
  OPEN: Object.freeze(['IN_PROGRESS', 'REJECTED', 'CANCELLED']),
  IN_PROGRESS: Object.freeze(['IMPLEMENTED', 'REJECTED', 'CANCELLED']),
  IMPLEMENTED: Object.freeze(['VERIFIED', 'IN_PROGRESS', 'CANCELLED']),
  VERIFIED: Object.freeze(['CLOSED']),
  CLOSED: Object.freeze([]),
  REJECTED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
});

const TERMINAL_STATES = Object.freeze(new Set(['CLOSED', 'REJECTED', 'CANCELLED']));

// Transitions that REQUIRE a reasonCode in the audit entry.
const REQUIRED_REASON_TRANSITIONS = Object.freeze([
  ['OPEN', 'REJECTED'],
  ['IN_PROGRESS', 'REJECTED'],
  ['OPEN', 'CANCELLED'],
  ['IN_PROGRESS', 'CANCELLED'],
  ['IMPLEMENTED', 'CANCELLED'],
  ['IMPLEMENTED', 'IN_PROGRESS'], // verification failure must explain why
]);

const REQUIRED_MFA_TIER_TRANSITIONS = Object.freeze({
  'VERIFIED->CLOSED': 2, // final sign-off — significant, append-only
  'OPEN->REJECTED': 2, // reject is significant (loses CAPA evidence trail)
  'IN_PROGRESS->REJECTED': 2,
});

const CAPA_TYPES = Object.freeze(['corrective', 'preventive', 'both']);
const PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);
const SOURCE_MODULES = Object.freeze([
  'audit',
  'rca',
  'fmea',
  'incident',
  'complaint',
  'improvement',
  'inspection',
  'management_review',
  'equity', // W503 — auto-CAPA from major equity disparity (Phase G)
  'other',
]);

function isLifecycleState(s) {
  return LIFECYCLE_STATES.includes(s);
}

function isTerminal(s) {
  return TERMINAL_STATES.has(s);
}

function isValidLifecycleTransition(from, to) {
  if (!isLifecycleState(from) || !isLifecycleState(to)) return false;
  return VALID_TRANSITIONS[from].includes(to);
}

function reasonCodeRequired(from, to) {
  return REQUIRED_REASON_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

function requiredMfaTier(from, to) {
  return REQUIRED_MFA_TIER_TRANSITIONS[`${from}->${to}`] ?? null;
}

/**
 * Build the audit-trail entry. Frozen, pure.
 */
function buildTransitionEntry({ from, to, actor, reasonCode, notes, at }) {
  return Object.freeze({
    fromStatus: from,
    toStatus: to,
    actor: actor || null,
    reasonCode: reasonCode || null,
    notes: notes || null,
    at: at || new Date(),
  });
}

/**
 * Validate a transition request end-to-end.
 * @returns {{ok: true, entry}} or {{ok: false, code, message}}
 *   Codes: INVALID_TRANSITION | REASON_CODE_REQUIRED | MFA_TIER_INSUFFICIENT
 */
function validateTransition({ from, to, actor, reasonCode, notes, mfaTier }) {
  if (!isValidLifecycleTransition(from, to)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `CapaItem transition ${from} → ${to} is not permitted`,
    };
  }
  if (reasonCodeRequired(from, to) && !reasonCode) {
    return {
      ok: false,
      code: 'REASON_CODE_REQUIRED',
      message: `Transition ${from} → ${to} requires a reasonCode`,
    };
  }
  const requiredTier = requiredMfaTier(from, to);
  if (requiredTier != null && (mfaTier == null || mfaTier < requiredTier)) {
    return {
      ok: false,
      code: 'MFA_TIER_INSUFFICIENT',
      message: `Transition ${from} → ${to} requires MFA tier ${requiredTier}`,
    };
  }
  return {
    ok: true,
    entry: buildTransitionEntry({ from, to, actor, reasonCode, notes }),
  };
}

module.exports = {
  LIFECYCLE_STATES,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  REQUIRED_REASON_TRANSITIONS,
  REQUIRED_MFA_TIER_TRANSITIONS,
  CAPA_TYPES,
  PRIORITIES,
  SOURCE_MODULES,
  isLifecycleState,
  isTerminal,
  isValidLifecycleTransition,
  reasonCodeRequired,
  requiredMfaTier,
  buildTransitionEntry,
  validateTransition,
};
