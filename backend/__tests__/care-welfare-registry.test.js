'use strict';

/**
 * care-welfare-registry.test.js — Phase 17 Commit 4 (4.0.86).
 */

const {
  APPLICATION_TYPES,
  TARGET_AGENCIES,
  APPLICATION_STATUSES,
  APPLICATION_TERMINAL_STATUSES,
  APPLICATION_PAUSE_STATUSES,
  APPLICATION_TRANSITIONS,
  DISBURSEMENT_FREQUENCIES,
  CANCELLATION_REASONS,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isPaused,
  isSuccessful,
  isRejectedTerminal,
  validate,
} = require('../config/care/welfare.registry');

describe('Welfare registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });

  it('frozen taxonomies', () => {
    for (const t of [
      APPLICATION_TYPES,
      TARGET_AGENCIES,
      APPLICATION_STATUSES,
      APPLICATION_TERMINAL_STATUSES,
      APPLICATION_PAUSE_STATUSES,
      APPLICATION_TRANSITIONS,
      DISBURSEMENT_FREQUENCIES,
      CANCELLATION_REASONS,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has ≥ 10 application types + 8 agencies + 13 statuses', () => {
    expect(APPLICATION_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(TARGET_AGENCIES.length).toBeGreaterThanOrEqual(8);
    expect(APPLICATION_STATUSES.length).toBeGreaterThanOrEqual(13);
  });

  it('all vocabularies are unique', () => {
    for (const arr of [
      APPLICATION_TYPES,
      TARGET_AGENCIES,
      APPLICATION_STATUSES,
      CANCELLATION_REASONS,
    ]) {
      expect(new Set(arr).size).toBe(arr.length);
    }
  });

  it('isTerminal returns true only for resolution statuses', () => {
    for (const t of APPLICATION_TERMINAL_STATUSES) {
      expect(isTerminal(t)).toBe(true);
    }
    expect(isTerminal('draft')).toBe(false);
    expect(isTerminal('submitted')).toBe(false);
    expect(isTerminal('under_review')).toBe(false);
  });

  it('final states closed + cancelled have zero outgoing edges', () => {
    expect(APPLICATION_TRANSITIONS.closed).toEqual([]);
    expect(APPLICATION_TRANSITIONS.cancelled).toEqual([]);
  });

  it('pause states are a subset of non-terminal statuses', () => {
    for (const p of APPLICATION_PAUSE_STATUSES) {
      expect(APPLICATION_STATUSES).toContain(p);
      expect(APPLICATION_TERMINAL_STATUSES).not.toContain(p);
      expect(isPaused(p)).toBe(true);
    }
    expect(isPaused('submitted')).toBe(false);
  });

  it('every status has a transitions entry (even if empty)', () => {
    for (const s of APPLICATION_STATUSES) {
      expect(APPLICATION_TRANSITIONS[s]).toBeDefined();
    }
  });
});

describe('Welfare registry — transitions', () => {
  it('draft → submitted requires submittedAt', () => {
    expect(canTransition('draft', 'submitted')).toBe(true);
    expect(requiredFieldsForTransition('draft', 'submitted')).toContain('submittedAt');
  });

  it('submitted → approved requires approvedAt', () => {
    expect(canTransition('submitted', 'approved')).toBe(true);
    expect(requiredFieldsForTransition('submitted', 'approved')).toContain('approvedAt');
  });

  it('submitted → partially_approved requires approvedAt + approvedAmount', () => {
    expect(canTransition('submitted', 'partially_approved')).toBe(true);
    const req = requiredFieldsForTransition('submitted', 'partially_approved');
    expect(req).toContain('approvedAt');
    expect(req).toContain('approvedAmount');
  });

  it('submitted → rejected requires rejectionReason', () => {
    expect(canTransition('submitted', 'rejected')).toBe(true);
    expect(requiredFieldsForTransition('submitted', 'rejected')).toContain('rejectionReason');
  });

  it('rejected → appealed legal, requires appealReason', () => {
    expect(canTransition('rejected', 'appealed')).toBe(true);
    expect(requiredFieldsForTransition('rejected', 'appealed')).toContain('appealReason');
  });

  it('partially_approved → appealed legal (appeal the reduced amount)', () => {
    expect(canTransition('partially_approved', 'appealed')).toBe(true);
  });

  it('appealed → appeal_approved + appeal_rejected both legal', () => {
    expect(canTransition('appealed', 'appeal_approved')).toBe(true);
    expect(canTransition('appealed', 'appeal_rejected')).toBe(true);
  });

  it('approved / appeal_approved → disbursed requires disbursedAt + disbursedAmount', () => {
    const req1 = requiredFieldsForTransition('approved', 'disbursed');
    expect(req1).toEqual(expect.arrayContaining(['disbursedAt', 'disbursedAmount']));
    const req2 = requiredFieldsForTransition('appeal_approved', 'disbursed');
    expect(req2).toEqual(expect.arrayContaining(['disbursedAt', 'disbursedAmount']));
  });

  it('disbursed → closed legal', () => {
    expect(canTransition('disbursed', 'closed')).toBe(true);
  });

  it('terminal statuses have no outbound edges', () => {
    expect(APPLICATION_TRANSITIONS.closed).toEqual([]);
    expect(APPLICATION_TRANSITIONS.cancelled).toEqual([]);
  });

  it('illegal transitions reported false', () => {
    expect(canTransition('draft', 'disbursed')).toBe(false);
    expect(canTransition('approved', 'rejected')).toBe(false);
    expect(canTransition('closed', 'submitted')).toBe(false);
  });

  it('eventForTransition returns correct event names', () => {
    expect(eventForTransition('draft', 'submitted')).toBe('submitted');
    expect(eventForTransition('submitted', 'approved')).toBe('approved');
    expect(eventForTransition('rejected', 'appealed')).toBe('appealed');
    expect(eventForTransition('disbursed', 'closed')).toBe('closed');
  });
});

describe('Welfare registry — helpers', () => {
  it('isSuccessful true only for disbursed', () => {
    expect(isSuccessful('disbursed')).toBe(true);
    expect(isSuccessful('approved')).toBe(false);
    expect(isSuccessful('appeal_approved')).toBe(false);
  });

  it('isRejectedTerminal true for rejected + appeal_rejected + closed', () => {
    expect(isRejectedTerminal('rejected')).toBe(true);
    expect(isRejectedTerminal('appeal_rejected')).toBe(true);
    expect(isRejectedTerminal('closed')).toBe(true);
    expect(isRejectedTerminal('disbursed')).toBe(false);
  });
});

describe('Welfare registry — graph reachability', () => {
  it('every status reachable from draft', () => {
    const reachable = new Set(['draft']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(APPLICATION_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of APPLICATION_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });
});
