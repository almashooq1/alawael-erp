/**
 * workflow-lib-wave94.test.js — Wave 94 (partial U4 closure).
 *
 * Direct tests for the canonical workflow.lib state-machine engine.
 * Five services on the platform re-implement these same primitives;
 * this lib is the first step toward unification.
 */

'use strict';

const { defineWorkflow } = require('../intelligence/workflow.lib');

const sampleDef = () => ({
  id: 'sample',
  states: ['draft', 'active', 'archived', 'deleted'],
  transitions: [
    { id: 'admit', from: ['draft'], to: 'active' },
    { id: 'archive', from: ['active'], to: 'archived' },
    { id: 'delete', from: ['active', 'archived'], to: 'deleted' },
    { id: 'restore', from: ['archived'], to: 'active' },
  ],
  finalStates: ['deleted'],
});

describe('workflow.lib — defineWorkflow construction (Wave 94)', () => {
  test('builds a frozen workflow object', () => {
    const wf = defineWorkflow(sampleDef());
    expect(Object.isFrozen(wf)).toBe(true);
    expect(Object.isFrozen(wf.states)).toBe(true);
    expect(Object.isFrozen(wf.transitions)).toBe(true);
    expect(Object.isFrozen(wf.transitionsById)).toBe(true);
  });

  test('every transition record is frozen', () => {
    const wf = defineWorkflow(sampleDef());
    for (const t of wf.transitions) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  test('exposes states + transitions + transitionsById', () => {
    const wf = defineWorkflow(sampleDef());
    expect(wf.states).toEqual(['draft', 'active', 'archived', 'deleted']);
    expect(wf.transitions).toHaveLength(4);
    expect(wf.transitionsById.admit.to).toBe('active');
  });

  test('id required', () => {
    expect(() => defineWorkflow({ ...sampleDef(), id: '' })).toThrow(/id .* required/);
    expect(() => defineWorkflow({ ...sampleDef(), id: null })).toThrow(/id .* required/);
  });

  test('states[] non-empty required', () => {
    expect(() => defineWorkflow({ ...sampleDef(), states: [] })).toThrow(/states.* non-empty/);
    expect(() => defineWorkflow({ ...sampleDef(), states: null })).toThrow(/states.* non-empty/);
  });

  test('transitions[] required as array', () => {
    expect(() => defineWorkflow({ ...sampleDef(), transitions: null })).toThrow(
      /transitions.* array/
    );
  });

  test('duplicate transition id throws', () => {
    expect(() =>
      defineWorkflow({
        ...sampleDef(),
        transitions: [
          { id: 'admit', from: ['draft'], to: 'active' },
          { id: 'admit', from: ['active'], to: 'archived' },
        ],
      })
    ).toThrow(/duplicate transition id/);
  });

  test('transition.from contains unknown state throws', () => {
    expect(() =>
      defineWorkflow({
        ...sampleDef(),
        transitions: [{ id: 'bad', from: ['nope'], to: 'active' }],
      })
    ).toThrow(/unknown state "nope"/);
  });

  test('transition.to not in states[] throws', () => {
    expect(() =>
      defineWorkflow({
        ...sampleDef(),
        transitions: [{ id: 'bad', from: ['draft'], to: 'nowhere' }],
      })
    ).toThrow(/to "nowhere" is not in states/);
  });

  test('transition.from empty throws', () => {
    expect(() =>
      defineWorkflow({
        ...sampleDef(),
        transitions: [{ id: 'bad', from: [], to: 'active' }],
      })
    ).toThrow(/from.* non-empty/);
  });

  test('finalState not in states throws', () => {
    expect(() => defineWorkflow({ ...sampleDef(), finalStates: ['phantom'] })).toThrow(
      /finalState "phantom" is not in states/
    );
  });
});

describe('workflow.lib — getTransition / getAllowedTransitionsFrom (Wave 94)', () => {
  const wf = defineWorkflow(sampleDef());

  test('getTransition returns by id', () => {
    const t = wf.getTransition('admit');
    expect(t.id).toBe('admit');
    expect(t.to).toBe('active');
  });

  test('getTransition returns null for unknown', () => {
    expect(wf.getTransition('nope')).toBeNull();
  });

  test('getAllowedTransitionsFrom returns transitions whose from includes state', () => {
    const fromActive = wf.getAllowedTransitionsFrom('active');
    expect(fromActive.map(t => t.id).sort()).toEqual(['archive', 'delete']);
  });

  test('getAllowedTransitionsFrom returns [] for state with no outgoing', () => {
    expect(wf.getAllowedTransitionsFrom('deleted')).toEqual([]);
  });
});

describe('workflow.lib — validateTransition (Wave 94)', () => {
  const wf = defineWorkflow(sampleDef());

  test('valid request → { valid:true, transition }', () => {
    const r = wf.validateTransition({ fromState: 'draft', transitionId: 'admit' });
    expect(r.valid).toBe(true);
    expect(r.transition.to).toBe('active');
  });

  test('unknown transition → UNKNOWN_TRANSITION', () => {
    const r = wf.validateTransition({ fromState: 'draft', transitionId: 'nope' });
    expect(r).toEqual({ valid: false, reason: 'UNKNOWN_TRANSITION' });
  });

  test('wrong fromState → INVALID_FROM_STATE with allowed[] + requested', () => {
    const r = wf.validateTransition({ fromState: 'archived', transitionId: 'admit' });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('INVALID_FROM_STATE');
    expect(r.allowed).toEqual(['draft']);
    expect(r.requested).toBe('archived');
  });

  test('missing fromState/transitionId → graceful', () => {
    expect(wf.validateTransition({}).valid).toBe(false);
    expect(wf.validateTransition({ fromState: 'draft' }).valid).toBe(false);
    expect(wf.validateTransition({ transitionId: 'admit' }).valid).toBe(false);
  });
});

describe('workflow.lib — isFinalState (Wave 94)', () => {
  const wf = defineWorkflow(sampleDef());

  test('returns true for declared final states', () => {
    expect(wf.isFinalState('deleted')).toBe(true);
  });

  test('returns false for non-final states', () => {
    expect(wf.isFinalState('active')).toBe(false);
    expect(wf.isFinalState('archived')).toBe(false);
  });

  test('returns false for unknown state', () => {
    expect(wf.isFinalState('phantom')).toBe(false);
  });

  test('empty finalStates → no state is final', () => {
    const wf2 = defineWorkflow({ ...sampleDef(), finalStates: [] });
    for (const s of wf2.states) {
      expect(wf2.isFinalState(s)).toBe(false);
    }
  });
});

describe("workflow.lib — multiple workflows don't interfere (Wave 94)", () => {
  test('two workflows have independent transition lookup', () => {
    const a = defineWorkflow({
      id: 'a',
      states: ['s1', 's2'],
      transitions: [{ id: 'move', from: ['s1'], to: 's2' }],
    });
    const b = defineWorkflow({
      id: 'b',
      states: ['x1', 'x2'],
      transitions: [{ id: 'move', from: ['x1'], to: 'x2' }], // same id intentionally
    });
    expect(a.getTransition('move').to).toBe('s2');
    expect(b.getTransition('move').to).toBe('x2');
  });
});
