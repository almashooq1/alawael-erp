'use strict';

/**
 * work-order-registry.test.js — Phase 16 Commit 2 (4.0.67).
 *
 * Shape + invariants over the WO state-machine registry.
 */

const {
  WO_STATES,
  LEGACY_ALIASES,
  TERMINAL_STATES,
  PAUSE_STATES,
  RESPONSE_STATES,
  RESOLUTION_STATES,
  TRANSITIONS,
  canonical,
  isTerminal,
  isPaused,
  allowedTransitions,
  canTransition,
  eventForTransition,
  slaPolicyFor,
  validate,
} = require('../config/workOrder.registry');

describe('WO registry — sanity', () => {
  it('exposes the 14 canonical states', () => {
    expect(WO_STATES.length).toBe(14);
  });

  it('frozen at runtime', () => {
    expect(Object.isFrozen(WO_STATES)).toBe(true);
    expect(Object.isFrozen(TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(TERMINAL_STATES)).toBe(true);
    expect(Object.isFrozen(PAUSE_STATES)).toBe(true);
  });

  it('terminal states have no outgoing transitions except reopen', () => {
    // 'closed' can reopen; 'cancelled' / 'rejected' have none.
    expect(TRANSITIONS.closed).toHaveLength(1);
    expect(TRANSITIONS.closed[0].to).toBe('reopened');
    expect(TRANSITIONS.cancelled).toHaveLength(0);
    expect(TRANSITIONS.rejected).toHaveLength(0);
  });

  it('pause states are all valid canonical states', () => {
    for (const p of PAUSE_STATES) expect(WO_STATES).toContain(p);
  });

  it('response states are all valid canonical states', () => {
    for (const r of RESPONSE_STATES) expect(WO_STATES).toContain(r);
  });

  it('resolution states are all valid canonical states', () => {
    for (const r of RESOLUTION_STATES) expect(WO_STATES).toContain(r);
  });
});

describe('WO registry — validate()', () => {
  it('passes on the shipped registry', () => {
    expect(() => validate()).not.toThrow();
  });
});

describe('WO registry — canonical()', () => {
  it('returns null for unknown state', () => {
    expect(canonical('blah')).toBeNull();
  });

  it('returns the same string when already canonical', () => {
    expect(canonical('in_progress')).toBe('in_progress');
  });

  it('resolves legacy aliases', () => {
    expect(canonical('pending')).toBe('submitted');
  });

  it('is case-insensitive', () => {
    expect(canonical('IN_PROGRESS')).toBe('in_progress');
    expect(canonical('Pending')).toBe('submitted');
  });
});

describe('WO registry — transition checks', () => {
  it('canTransition: draft → submitted is legal', () => {
    expect(canTransition('draft', 'submitted')).toBe(true);
  });

  it('canTransition: draft → completed is illegal', () => {
    expect(canTransition('draft', 'completed')).toBe(false);
  });

  it('canTransition: resolves legacy alias on both sides', () => {
    expect(canTransition('pending', 'approved')).toBe(true);
  });

  it('allowedTransitions returns edge array for known state', () => {
    const edges = allowedTransitions('approved');
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      expect(typeof e.to).toBe('string');
      expect(typeof e.event).toBe('string');
    }
  });

  it('allowedTransitions is empty for unknown state', () => {
    expect(allowedTransitions('blah')).toEqual([]);
  });

  it('eventForTransition returns the event name for a legal edge', () => {
    expect(eventForTransition('draft', 'submitted')).toBe('submitted');
    expect(eventForTransition('in_progress', 'completed')).toBe('completed');
  });

  it('eventForTransition returns null for illegal edge', () => {
    expect(eventForTransition('draft', 'completed')).toBeNull();
  });
});

describe('WO registry — terminal + pause', () => {
  it('isTerminal identifies closed/cancelled/rejected', () => {
    expect(isTerminal('closed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('in_progress')).toBe(false);
  });

  it('isPaused identifies on_hold/blocked', () => {
    expect(isPaused('on_hold')).toBe(true);
    expect(isPaused('blocked')).toBe(true);
    expect(isPaused('in_progress')).toBe(false);
  });
});

describe('WO registry — slaPolicyFor()', () => {
  it('critical priority → critical policy', () => {
    expect(slaPolicyFor({ type: 'corrective', priority: 'critical' })).toBe(
      'maintenance.wo.critical'
    );
  });

  it('emergency type → critical policy (regardless of priority)', () => {
    expect(slaPolicyFor({ type: 'emergency', priority: 'normal' })).toBe('maintenance.wo.critical');
  });

  it('preventive type → preventive policy', () => {
    expect(slaPolicyFor({ type: 'preventive', priority: 'low' })).toBe('maintenance.wo.preventive');
  });

  it('high priority → high policy', () => {
    expect(slaPolicyFor({ type: 'corrective', priority: 'high' })).toBe('maintenance.wo.high');
  });

  it('normal/low corrective → null (no tracked SLA)', () => {
    expect(slaPolicyFor({ type: 'corrective', priority: 'normal' })).toBeNull();
    expect(slaPolicyFor({ type: 'corrective', priority: 'low' })).toBeNull();
  });
});

describe('WO registry — graph reachability', () => {
  it('every canonical state is reachable from somewhere', () => {
    const reachable = new Set(['draft']);
    let added = true;
    while (added) {
      added = false;
      for (const [, edges] of Object.entries(TRANSITIONS)) {
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of WO_STATES) {
      expect(reachable.has(s)).toBe(true);
    }
  });

  it('aliases object is frozen', () => {
    expect(Object.isFrozen(LEGACY_ALIASES)).toBe(true);
  });
});
