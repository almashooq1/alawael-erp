'use strict';

/**
 * purchase-request-registry.test.js — Phase 16 Commit 4 (4.0.69).
 *
 * Shape + drift invariants over the PR registry.
 */

const {
  PR_STATUSES,
  PR_TERMINAL_STATUSES,
  PR_PAUSE_STATUSES,
  PR_TRANSITIONS,
  APPROVAL_TIERS,
  PURCHASE_METHODS,
  PRIORITIES,
  tierForValue,
  canTransition,
  eventForTransition,
  isTerminal,
  slaPolicyForApproval,
  slaPolicyForPoIssuance,
  competitiveBiddingRequiredFor,
  validate,
} = require('../config/purchaseRequest.registry');

describe('PR registry — sanity', () => {
  it('has exactly 8 canonical statuses', () => {
    expect(PR_STATUSES.length).toBe(8);
    for (const s of [
      'draft',
      'submitted',
      'under_review',
      'approved',
      'returned_for_clarification',
      'rejected',
      'converted_to_po',
      'cancelled',
    ]) {
      expect(PR_STATUSES).toContain(s);
    }
  });

  it('registries are frozen', () => {
    expect(Object.isFrozen(PR_STATUSES)).toBe(true);
    expect(Object.isFrozen(PR_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(APPROVAL_TIERS)).toBe(true);
    expect(Object.isFrozen(PURCHASE_METHODS)).toBe(true);
    expect(Object.isFrozen(PRIORITIES)).toBe(true);
  });

  it('terminal statuses have no outgoing transitions', () => {
    for (const t of PR_TERMINAL_STATUSES) {
      expect(PR_TRANSITIONS[t]).toEqual([]);
    }
  });

  it('pause status matches SLA policy pauseOnStates', () => {
    const sla = require('../config/sla.registry').byId('procurement.pr.approval');
    expect(sla).toBeTruthy();
    for (const p of PR_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(p);
    }
  });
});

describe('PR registry — approval tiers', () => {
  it('has 4 tiers ordered by maxValue ascending with last null', () => {
    expect(APPROVAL_TIERS.length).toBe(4);
    expect(APPROVAL_TIERS[0].name).toBe('simple');
    expect(APPROVAL_TIERS[APPROVAL_TIERS.length - 1].maxValue).toBeNull();
  });

  it('tierForValue picks simple for ≤5000', () => {
    expect(tierForValue(0).name).toBe('simple');
    expect(tierForValue(5000).name).toBe('simple');
  });

  it('tierForValue picks standard for 5001..50000', () => {
    expect(tierForValue(5001).name).toBe('standard');
    expect(tierForValue(50000).name).toBe('standard');
  });

  it('tierForValue picks complex for 50001..500000', () => {
    expect(tierForValue(50001).name).toBe('complex');
    expect(tierForValue(500000).name).toBe('complex');
  });

  it('tierForValue picks special for > 500000', () => {
    expect(tierForValue(500001).name).toBe('special');
    expect(tierForValue(999999999).name).toBe('special');
  });

  it('each chain is monotonic on level', () => {
    for (const t of APPROVAL_TIERS) {
      let prev = 0;
      for (const step of t.chain) {
        expect(step.level).toBeGreaterThan(prev);
        prev = step.level;
      }
    }
  });

  it('negative / invalid values fall back to simple', () => {
    expect(tierForValue(-100).name).toBe('simple');
    expect(tierForValue('bogus').name).toBe('simple');
  });
});

describe('PR registry — transitions', () => {
  it('canTransition: draft → submitted legal', () => {
    expect(canTransition('draft', 'submitted')).toBe(true);
  });

  it('canTransition: draft → approved illegal', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
  });

  it('canTransition: approved → converted_to_po legal', () => {
    expect(canTransition('approved', 'converted_to_po')).toBe(true);
  });

  it('canTransition: submitted → returned_for_clarification legal (pause)', () => {
    expect(canTransition('submitted', 'returned_for_clarification')).toBe(true);
  });

  it('canTransition: returned → under_review legal (resume)', () => {
    expect(canTransition('returned_for_clarification', 'under_review')).toBe(true);
  });

  it('eventForTransition returns event name for legal edge', () => {
    expect(eventForTransition('draft', 'submitted')).toBe('submitted');
    expect(eventForTransition('approved', 'converted_to_po')).toBe('converted_to_po');
  });

  it('eventForTransition returns null for illegal edge', () => {
    expect(eventForTransition('draft', 'approved')).toBeNull();
  });

  it('isTerminal correctly identifies terminal states', () => {
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('converted_to_po')).toBe(true);
    expect(isTerminal('draft')).toBe(false);
  });
});

describe('PR registry — SLA policy helpers', () => {
  it('slaPolicyForApproval returns procurement.pr.approval', () => {
    expect(slaPolicyForApproval()).toBe('procurement.pr.approval');
  });

  it('slaPolicyForPoIssuance returns procurement.po.issuance', () => {
    expect(slaPolicyForPoIssuance()).toBe('procurement.po.issuance');
  });
});

describe('PR registry — competitive bidding threshold', () => {
  it('uses default 10,000 SAR', () => {
    delete process.env.PR_COMPETITIVE_BIDDING_THRESHOLD;
    expect(competitiveBiddingRequiredFor(10000)).toBe(true);
    expect(competitiveBiddingRequiredFor(9999)).toBe(false);
  });

  it('respects env override', () => {
    process.env.PR_COMPETITIVE_BIDDING_THRESHOLD = '50000';
    expect(competitiveBiddingRequiredFor(49999)).toBe(false);
    expect(competitiveBiddingRequiredFor(50000)).toBe(true);
    delete process.env.PR_COMPETITIVE_BIDDING_THRESHOLD;
  });
});

describe('PR registry — validate()', () => {
  it('passes on the shipped registry', () => {
    expect(() => validate()).not.toThrow();
  });
});
