'use strict';

/**
 * care-independence-registry.test.js — Phase 17 Commit 6 (4.0.88).
 */

const registry = require('../config/care/independence.registry');

describe('Independence registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => registry.validate()).not.toThrow();
    expect(registry.validate()).toBe(true);
  });

  it('all taxonomies are frozen', () => {
    for (const t of [
      registry.TRANSITION_TARGETS,
      registry.TRANSITION_DOMAINS,
      registry.TRANSITION_DOMAIN_CODES,
      registry.READINESS_TIERS,
      registry.TRANSITION_STATUSES,
      registry.TRANSITION_TRANSITIONS,
      registry.IADL_DOMAINS,
      registry.IADL_DOMAIN_CODES,
      registry.IADL_BANDS,
      registry.PARTICIPATION_TYPES,
      registry.SUPPORT_LEVELS,
      registry.PARTICIPATION_OUTCOMES,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has ≥ 7 transition targets', () => {
    expect(registry.TRANSITION_TARGETS.length).toBeGreaterThanOrEqual(7);
    expect(registry.TRANSITION_TARGETS).toContain('independent_living');
    expect(registry.TRANSITION_TARGETS).toContain('adult_services');
  });

  it('transition domain codes match domain objects', () => {
    expect(registry.TRANSITION_DOMAIN_CODES.length).toBe(registry.TRANSITION_DOMAINS.length);
    for (const code of registry.TRANSITION_DOMAIN_CODES) {
      expect(registry.transitionDomainByCode(code)).toBeTruthy();
    }
  });

  it('readiness tiers ordered least → most ready', () => {
    expect(registry.READINESS_TIERS).toEqual(['not_ready', 'emerging', 'developing', 'ready']);
  });

  it('IADL has exactly 8 domains (Lawton)', () => {
    expect(registry.IADL_DOMAINS.length).toBe(8);
    for (const code of [
      'telephone_use',
      'shopping',
      'food_preparation',
      'housekeeping',
      'laundry',
      'transportation',
      'medications',
      'finances',
    ]) {
      expect(registry.IADL_DOMAIN_CODES).toContain(code);
    }
  });

  it('IADL_TOTAL_MAX = 24 (8 × 3)', () => {
    expect(registry.IADL_TOTAL_MAX).toBe(24);
  });

  it('participation types + support levels + outcomes complete', () => {
    expect(registry.PARTICIPATION_TYPES).toContain('volunteering');
    expect(registry.PARTICIPATION_TYPES).toContain('employment');
    expect(registry.SUPPORT_LEVELS).toEqual(['none', 'minimal', 'moderate', 'maximal']);
    expect(registry.PARTICIPATION_OUTCOMES).toContain('very_positive');
    expect(registry.PARTICIPATION_OUTCOMES).toContain('unsuccessful');
  });
});

describe('Independence registry — transition state machine', () => {
  it('draft → in_progress legal (no required fields)', () => {
    expect(registry.canTransitionStatus('draft', 'in_progress')).toBe(true);
    expect(registry.transitionRequiredFields('draft', 'in_progress')).toEqual([]);
  });

  it('draft → completed requires overallReadiness', () => {
    expect(registry.canTransitionStatus('draft', 'completed')).toBe(true);
    expect(registry.transitionRequiredFields('draft', 'completed')).toContain('overallReadiness');
  });

  it('in_progress → completed requires overallReadiness', () => {
    expect(registry.transitionRequiredFields('in_progress', 'completed')).toContain(
      'overallReadiness'
    );
  });

  it('completed → superseded requires supersededByAssessmentId', () => {
    expect(registry.transitionRequiredFields('completed', 'superseded')).toContain(
      'supersededByAssessmentId'
    );
  });

  it('completed → archived legal', () => {
    expect(registry.canTransitionStatus('completed', 'archived')).toBe(true);
  });

  it('archived + cancelled are final (no outgoing edges)', () => {
    expect(registry.TRANSITION_TRANSITIONS.archived).toEqual([]);
    expect(registry.TRANSITION_TRANSITIONS.cancelled).toEqual([]);
  });

  it('completed → cancelled illegal (must supersede)', () => {
    expect(registry.canTransitionStatus('completed', 'cancelled')).toBe(false);
  });

  it('isTransitionTerminal true for superseded/archived/cancelled', () => {
    expect(registry.isTransitionTerminal('superseded')).toBe(true);
    expect(registry.isTransitionTerminal('archived')).toBe(true);
    expect(registry.isTransitionTerminal('cancelled')).toBe(true);
    expect(registry.isTransitionTerminal('draft')).toBe(false);
  });

  it('transitionEventFor returns known events', () => {
    expect(registry.transitionEventFor('draft', 'in_progress')).toBe('started');
    expect(registry.transitionEventFor('in_progress', 'completed')).toBe('completed');
  });
});

describe('Independence registry — deriveReadinessTier', () => {
  it('all zeros → not_ready', () => {
    expect(registry.deriveReadinessTier([0, 0, 0])).toBe('not_ready');
  });

  it('all threes → ready', () => {
    expect(registry.deriveReadinessTier([3, 3, 3])).toBe('ready');
  });

  it('mixed with avg=1 → emerging', () => {
    expect(registry.deriveReadinessTier([0, 1, 2])).toBe('emerging'); // avg=1, floor=1
  });

  it('mixed with avg=2 → developing', () => {
    expect(registry.deriveReadinessTier([2, 2, 2])).toBe('developing');
  });

  it('empty or null returns null', () => {
    expect(registry.deriveReadinessTier([])).toBeNull();
    expect(registry.deriveReadinessTier(null)).toBeNull();
  });
});

describe('Independence registry — scoreIadl', () => {
  it('all zeros → fully_dependent', () => {
    const out = registry.scoreIadl([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(out.total).toBe(0);
    expect(out.band).toBe('fully_dependent');
    expect(out.action).toBe('intensive_support');
  });

  it('all threes → fully_independent', () => {
    const out = registry.scoreIadl([3, 3, 3, 3, 3, 3, 3, 3]);
    expect(out.total).toBe(24);
    expect(out.band).toBe('fully_independent');
    expect(out.action).toBe('monitor_only');
  });

  it('mixed score in partially_dependent band', () => {
    const out = registry.scoreIadl([1, 1, 2, 1, 2, 1, 2, 2]);
    expect(out.total).toBe(12);
    expect(out.band).toBe('partially_dependent');
  });

  it('mostly_independent boundary 16', () => {
    const out = registry.scoreIadl([2, 2, 2, 2, 2, 2, 2, 2]);
    expect(out.total).toBe(16);
    expect(out.band).toBe('mostly_independent');
  });

  it('throws on wrong array length', () => {
    expect(() => registry.scoreIadl([0, 0, 0])).toThrow(/expects 8 scores/);
  });

  it('throws on out-of-range score', () => {
    expect(() => registry.scoreIadl([0, 0, 0, 0, 0, 0, 0, 5])).toThrow(/out of range/);
  });

  it('IADL bands cover full 0..24 range contiguously', () => {
    let cursor = 0;
    for (const b of registry.IADL_BANDS) {
      expect(b.minScore).toBe(cursor);
      cursor = b.maxScore + 1;
    }
    expect(cursor - 1).toBe(registry.IADL_TOTAL_MAX);
  });
});

describe('Independence registry — helpers', () => {
  it('isValidParticipationType', () => {
    expect(registry.isValidParticipationType('volunteering')).toBe(true);
    expect(registry.isValidParticipationType('bogus')).toBe(false);
  });

  it('isValidSupportLevel', () => {
    expect(registry.isValidSupportLevel('none')).toBe(true);
    expect(registry.isValidSupportLevel('maximal')).toBe(true);
    expect(registry.isValidSupportLevel('bogus')).toBe(false);
  });

  it('iadlDomainByCode returns domain object', () => {
    const d = registry.iadlDomainByCode('finances');
    expect(d).toBeTruthy();
    expect(d.labelAr).toBe('الشؤون المالية');
    expect(registry.iadlDomainByCode('bogus')).toBeNull();
  });
});

describe('Independence registry — graph reachability', () => {
  it('every transition status reachable from draft', () => {
    const reachable = new Set(['draft']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(registry.TRANSITION_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of registry.TRANSITION_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });
});
