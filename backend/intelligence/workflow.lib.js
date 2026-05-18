'use strict';

/**
 * workflow.lib.js — Wave 94 (partial unification U4 from the Wave-87
 * Canonical Domain Unification Architect analysis).
 *
 * Minimal canonical state-machine engine. Five services on the platform
 * each re-implement the same primitives:
 *
 *   • beneficiary-lifecycle (Wave 39)  — 9 states / 12 transitions
 *   • care-plan workflow (Wave 41)     — 13 statuses
 *   • access-review-cycle (Wave 74)    — cycle open/build/notify/close
 *   • qms.management-review            — review status
 *   • hr-change-request                — pending/approved/applied
 *
 * Wave 94 deliberately keeps the lib SMALL and OPT-IN — only the pure
 * state-machine primitives (validate, list-allowed-from, is-final) are
 * subsumed. Guard chains, side-effect dispatch, audit hooks, MFA tiers,
 * and SoD checks remain in each service's own code so this wave can't
 * break existing behaviour. Future waves can grow the lib once more
 * services migrate.
 *
 * Design principles:
 *   1. PURE — no I/O, no DB, no Mongoose. Factory takes the workflow
 *      definition, returns helpers. Same input → same output forever.
 *   2. FROZEN — every transition record + the returned helper object
 *      are frozen so a downstream service can't accidentally mutate
 *      another service's workflow.
 *   3. OPT-IN ADAPTERS — beneficiary-lifecycle.registry calls into
 *      this lib for validateTransitionRequest BUT preserves its own
 *      public surface (no caller refactor needed).
 *   4. EXPLICIT REASON CODES — every refusal returns a canonical
 *      string ('UNKNOWN_TRANSITION' | 'INVALID_FROM_STATE') so the
 *      caller can map to HTTP / Mongoose / Error shapes.
 *
 * Public API:
 *
 *   defineWorkflow({
 *     id,                  // 'beneficiary-lifecycle' | 'care-plan' | ...
 *     states,              // [ 'draft', 'active', ... ]
 *     transitions,         // [ { id, from: string[], to, ... }, ... ]
 *     finalStates = [],    // states that block further transitions
 *   }) → frozen {
 *     id, states, transitions, transitionsById, finalStateSet,
 *     getTransition(id),
 *     getAllowedTransitionsFrom(state),
 *     validateTransition({ fromState, transitionId }),
 *     isFinalState(state),
 *   }
 *
 *   The factory validates the definition itself: every transition's
 *   `from`/`to` must be in `states`; ids must be unique; states must
 *   be a non-empty array. A definition with a typo blows up at
 *   require-time, not at runtime.
 */

function _toFrozen(obj) {
  return Object.freeze({ ...obj });
}

function defineWorkflow({ id, states, transitions, finalStates = [] } = {}) {
  if (!id || typeof id !== 'string') {
    throw new Error('defineWorkflow: id (string) is required');
  }
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error('defineWorkflow: states[] must be a non-empty array');
  }
  if (!Array.isArray(transitions)) {
    throw new Error('defineWorkflow: transitions[] must be an array');
  }
  if (!Array.isArray(finalStates)) {
    throw new Error('defineWorkflow: finalStates must be an array');
  }

  const stateSet = new Set(states);
  const finalStateSet = new Set(finalStates);

  for (const fs of finalStates) {
    if (!stateSet.has(fs)) {
      throw new Error(`defineWorkflow[${id}]: finalState "${fs}" is not in states[]`);
    }
  }

  const transitionsById = {};
  const frozenTransitions = [];

  for (const t of transitions) {
    if (!t || typeof t !== 'object') {
      throw new Error(`defineWorkflow[${id}]: transition entry must be an object`);
    }
    if (!t.id || typeof t.id !== 'string') {
      throw new Error(`defineWorkflow[${id}]: transition.id (string) is required`);
    }
    if (transitionsById[t.id]) {
      throw new Error(`defineWorkflow[${id}]: duplicate transition id "${t.id}"`);
    }
    if (!Array.isArray(t.from) || t.from.length === 0) {
      throw new Error(`defineWorkflow[${id}]: transition ${t.id}.from[] must be non-empty`);
    }
    for (const f of t.from) {
      if (!stateSet.has(f)) {
        throw new Error(
          `defineWorkflow[${id}]: transition ${t.id}.from contains unknown state "${f}"`
        );
      }
    }
    if (!t.to || !stateSet.has(t.to)) {
      throw new Error(`defineWorkflow[${id}]: transition ${t.id}.to "${t.to}" is not in states[]`);
    }
    const frozenT = _toFrozen(t);
    transitionsById[t.id] = frozenT;
    frozenTransitions.push(frozenT);
  }

  const frozenTransitionsArray = Object.freeze(frozenTransitions);
  const frozenTransitionsById = Object.freeze(transitionsById);
  const frozenStates = Object.freeze([...states]);

  function getTransition(transitionId) {
    return frozenTransitionsById[transitionId] || null;
  }

  function getAllowedTransitionsFrom(currentState) {
    return frozenTransitionsArray.filter(t => t.from.includes(currentState));
  }

  function validateTransition({ fromState, transitionId } = {}) {
    const t = getTransition(transitionId);
    if (!t) return { valid: false, reason: 'UNKNOWN_TRANSITION' };
    if (!t.from.includes(fromState)) {
      return {
        valid: false,
        reason: 'INVALID_FROM_STATE',
        allowed: [...t.from],
        requested: fromState,
      };
    }
    return { valid: true, transition: t };
  }

  function isFinalState(state) {
    return finalStateSet.has(state);
  }

  return Object.freeze({
    id,
    states: frozenStates,
    transitions: frozenTransitionsArray,
    transitionsById: frozenTransitionsById,
    finalStateSet,
    getTransition,
    getAllowedTransitionsFrom,
    validateTransition,
    isFinalState,
  });
}

module.exports = {
  defineWorkflow,
};
