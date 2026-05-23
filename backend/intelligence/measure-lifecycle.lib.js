'use strict';

/**
 * W325 Pass 2 — MeasurementMaster lifecycle state machine.
 *
 * Pure-function lib so it can be unit-tested under jest.mock('mongoose').
 * Mongoose schema hooks compose this lib; the lib never imports Mongoose.
 *
 * States:
 *   DRAFT      — being authored, not used for new MeasurementResults
 *   ACTIVE     — in production, available for assessment
 *   DEPRECATED — soft-retired; existing Results stay readable, no new ones for ~30 days
 *   RETIRED    — terminal; no new Results, archived for audit only
 *
 * Transitions (DAG, no cycles in the closure of forward edges):
 *   DRAFT      → ACTIVE                 (publish, requires MFA tier 2)
 *   ACTIVE     → DEPRECATED             (deprecate, requires reasonCode)
 *   DEPRECATED → ACTIVE                 (restore, requires Clinical Director + Quality)
 *   DEPRECATED → RETIRED                (auto after 30 days or manual)
 *
 * Forbidden (drift guard catches if accidentally allowed):
 *   ANY        → DRAFT                  (cannot un-publish)
 *   RETIRED    → ANY                    (terminal)
 *   DRAFT      → DEPRECATED / RETIRED   (must go through ACTIVE first)
 *   ACTIVE     → RETIRED                (must go through DEPRECATED first)
 */

const LIFECYCLE_STATES = Object.freeze(['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED']);

const VALID_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(['ACTIVE']),
  ACTIVE: Object.freeze(['DEPRECATED']),
  DEPRECATED: Object.freeze(['ACTIVE', 'RETIRED']),
  RETIRED: Object.freeze([]),
});

const REQUIRED_REASON_TRANSITIONS = Object.freeze([
  ['ACTIVE', 'DEPRECATED'],
  ['DEPRECATED', 'ACTIVE'],
]);

const REQUIRED_MFA_TIER_TRANSITIONS = Object.freeze({
  'DRAFT->ACTIVE': 2,
  'ACTIVE->DEPRECATED': 2,
  'DEPRECATED->ACTIVE': 2,
  'DEPRECATED->RETIRED': 1,
});

function isLifecycleState(s) {
  return LIFECYCLE_STATES.includes(s);
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
 * Build the history entry for a transition. Pure function — callers persist
 * the result however they want (push to lifecycleHistory array, send to event
 * bus, etc.). Does NOT mutate input.
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
 * Validate a transition request end-to-end. Returns:
 *   { ok: true, entry }                        — proceed, push entry to history + update status
 *   { ok: false, code, message }               — caller should reject
 */
function validateTransition({ from, to, actor, reasonCode, notes, mfaTier }) {
  if (!isValidLifecycleTransition(from, to)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `Lifecycle transition ${from} → ${to} is not permitted`,
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

/**
 * Cycle-prevention check for COMPOSITE scoringType. A composite measure
 * cannot reference itself (direct cycle). Multi-hop cycle detection (A→B→A)
 * needs a graph walk against the collection; that's a service-layer concern.
 *
 * @param {Object} args
 * @param {string|null} args.selfId        — the measure's own _id (string)
 * @param {Array<{measureId: string}>} args.compositeOf
 * @returns {{ok: true} | {ok: false, code: 'SELF_REFERENCE', offender: string}}
 */
function checkCompositeNoSelfReference({ selfId, compositeOf }) {
  if (!selfId || !Array.isArray(compositeOf) || compositeOf.length === 0) {
    return { ok: true };
  }
  for (const ref of compositeOf) {
    const refId = ref?.measureId?.toString?.() ?? String(ref?.measureId ?? '');
    if (refId && refId === String(selfId)) {
      return { ok: false, code: 'SELF_REFERENCE', offender: refId };
    }
  }
  return { ok: true };
}

module.exports = {
  LIFECYCLE_STATES,
  VALID_TRANSITIONS,
  REQUIRED_REASON_TRANSITIONS,
  REQUIRED_MFA_TIER_TRANSITIONS,
  isLifecycleState,
  isValidLifecycleTransition,
  reasonCodeRequired,
  requiredMfaTier,
  buildTransitionEntry,
  validateTransition,
  checkCompositeNoSelfReference,
};
