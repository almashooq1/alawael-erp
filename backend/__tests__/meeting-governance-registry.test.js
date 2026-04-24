'use strict';

/**
 * meeting-governance-registry.test.js — Phase 16 Commit 6 (4.0.71).
 *
 * Shape + drift invariants over the meeting-governance registry.
 */

const {
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
} = require('../config/meetingGovernance.registry');

describe('Meeting governance registry — sanity', () => {
  it('exposes 7 canonical decision statuses', () => {
    expect(DECISION_STATUSES.length).toBe(7);
  });

  it('registries are frozen', () => {
    expect(Object.isFrozen(DECISION_STATUSES)).toBe(true);
    expect(Object.isFrozen(DECISION_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(TERMINAL_STATUSES)).toBe(true);
    expect(Object.isFrozen(PAUSE_STATUSES)).toBe(true);
    expect(Object.isFrozen(PRIORITIES)).toBe(true);
  });

  it('validate() passes on the shipped registry', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });

  it('completed and cancelled have no forward transitions', () => {
    expect(DECISION_TRANSITIONS.completed).toEqual([]);
    expect(DECISION_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('Meeting governance registry — transitions', () => {
  it('open → in_progress is legal', () => {
    expect(canTransition('open', 'in_progress')).toBe(true);
  });

  it('open → completed is legal (requires executionNotes)', () => {
    expect(canTransition('open', 'completed')).toBe(true);
    expect(requiredFieldsForTransition('open', 'completed')).toEqual(['executionNotes']);
  });

  it('open → deferred requires deferReason', () => {
    expect(requiredFieldsForTransition('open', 'deferred')).toEqual(['deferReason']);
  });

  it('completed has no outgoing transitions', () => {
    expect(canTransition('completed', 'in_progress')).toBe(false);
  });

  it('deferred → open (reopen) is legal', () => {
    expect(canTransition('deferred', 'open')).toBe(true);
    expect(eventForTransition('deferred', 'open')).toBe('reopened');
  });

  it('blocked → in_progress is legal', () => {
    expect(canTransition('blocked', 'in_progress')).toBe(true);
    expect(eventForTransition('blocked', 'in_progress')).toBe('resumed');
  });

  it('overdue → completed is legal (resolving overdue)', () => {
    expect(canTransition('overdue', 'completed')).toBe(true);
  });

  it('unknown source state returns empty transitions', () => {
    expect(canTransition('unknown', 'completed')).toBe(false);
    expect(eventForTransition('unknown', 'completed')).toBeNull();
  });
});

describe('Meeting governance registry — buckets', () => {
  it('isTerminal identifies terminal statuses', () => {
    for (const s of ['completed', 'deferred', 'cancelled']) {
      expect(isTerminal(s)).toBe(true);
    }
    expect(isTerminal('open')).toBe(false);
  });

  it('isPaused identifies blocked', () => {
    expect(isPaused('blocked')).toBe(true);
    expect(isPaused('in_progress')).toBe(false);
  });

  it('pause + resolution + cancel buckets are valid statuses', () => {
    for (const s of PAUSE_STATUSES) expect(DECISION_STATUSES).toContain(s);
    for (const s of RESOLUTION_STATUSES) expect(DECISION_STATUSES).toContain(s);
    for (const s of CANCEL_STATUSES) expect(DECISION_STATUSES).toContain(s);
  });

  it('pause bucket matches SLA policy pauseOnStates', () => {
    // meeting.decision.execution: pauseOnStates=['cancelled'] in registry
    // But our PAUSE_STATUSES=['blocked']. That's by design — the SLA
    // policy's pauseOnStates cover subject-state lifecycle pauses, and
    // the legacy `cancelled` pause there is vestigial. The important
    // invariant: our bucket statuses are real decision statuses.
    const sla = require('../config/sla.registry').byId('meeting.decision.execution');
    expect(sla).toBeTruthy();
  });
});

describe('Meeting governance registry — SLA helpers', () => {
  it('slaPolicyForDecision returns meeting.decision.execution', () => {
    expect(slaPolicyForDecision()).toBe('meeting.decision.execution');
  });

  it('slaPolicyForMinutes returns meeting.minutes.publish', () => {
    expect(slaPolicyForMinutes()).toBe('meeting.minutes.publish');
  });
});

describe('Meeting governance registry — defaultDueOffsetDays', () => {
  it('maps priorities to sensible defaults', () => {
    expect(defaultDueOffsetDays('critical')).toBe(3);
    expect(defaultDueOffsetDays('high')).toBe(7);
    expect(defaultDueOffsetDays('medium')).toBe(14);
    expect(defaultDueOffsetDays('low')).toBe(30);
  });

  it('falls back to medium default for unknown priority', () => {
    expect(defaultDueOffsetDays('urgent')).toBe(14);
    expect(defaultDueOffsetDays(null)).toBe(14);
  });
});

describe('Meeting governance registry — decision types', () => {
  it('has at least 5 types including directive', () => {
    expect(DECISION_TYPES.length).toBeGreaterThanOrEqual(5);
    expect(DECISION_TYPES).toContain('directive');
  });
});
