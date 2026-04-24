'use strict';

/**
 * care-home-visit-registry.test.js — Phase 17 Commit 3 (4.0.85).
 */

const {
  VISIT_TYPES,
  VISIT_STATUSES,
  VISIT_TERMINAL_STATUSES,
  VISIT_TRANSITIONS,
  OBSERVATION_DOMAINS,
  OBSERVATION_DOMAIN_CODES,
  OBSERVATION_CONCERN_LEVELS,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  CANCELLATION_REASONS,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isCriticalConcern,
  slaPolicyForFollowup,
  observationDomainByCode,
  validate,
} = require('../config/care/homeVisit.registry');

describe('HomeVisit registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });

  it('frozen taxonomies', () => {
    for (const t of [
      VISIT_TYPES,
      VISIT_STATUSES,
      VISIT_TRANSITIONS,
      OBSERVATION_DOMAINS,
      OBSERVATION_CONCERN_LEVELS,
      ACTION_ITEM_PRIORITIES,
      ACTION_ITEM_STATUSES,
      CANCELLATION_REASONS,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has ≥ 7 visit types + 7 statuses + 7 observation domains + 4 concern levels', () => {
    expect(VISIT_TYPES.length).toBeGreaterThanOrEqual(7);
    expect(VISIT_STATUSES.length).toBe(7);
    expect(OBSERVATION_DOMAINS.length).toBeGreaterThanOrEqual(7);
    expect(OBSERVATION_CONCERN_LEVELS.length).toBe(5);
  });

  it('all terminal statuses have empty edges', () => {
    for (const t of VISIT_TERMINAL_STATUSES) {
      expect(VISIT_TRANSITIONS[t]).toEqual([]);
      expect(isTerminal(t)).toBe(true);
    }
    expect(isTerminal('scheduled')).toBe(false);
  });
});

describe('HomeVisit registry — transitions', () => {
  it('scheduled → en_route legal', () => {
    expect(canTransition('scheduled', 'en_route')).toBe(true);
  });

  it('scheduled → in_progress (skip en_route) legal', () => {
    expect(canTransition('scheduled', 'in_progress')).toBe(true);
  });

  it('en_route → completed illegal (must go in_progress first)', () => {
    expect(canTransition('en_route', 'completed')).toBe(false);
  });

  it('in_progress → completed requires visitSummary', () => {
    expect(requiredFieldsForTransition('in_progress', 'completed')).toContain('visitSummary');
  });

  it('scheduled → cancelled requires cancellationReason', () => {
    expect(requiredFieldsForTransition('scheduled', 'cancelled')).toContain('cancellationReason');
  });

  it('en_route → no_answer requires noAnswerNotes', () => {
    expect(requiredFieldsForTransition('en_route', 'no_answer')).toContain('noAnswerNotes');
  });

  it('scheduled → rescheduled requires rescheduledTo', () => {
    expect(requiredFieldsForTransition('scheduled', 'rescheduled')).toContain('rescheduledTo');
  });

  it('eventForTransition returns correct event names', () => {
    expect(eventForTransition('scheduled', 'en_route')).toBe('en_route');
    expect(eventForTransition('en_route', 'in_progress')).toBe('arrived');
    expect(eventForTransition('in_progress', 'completed')).toBe('completed');
  });
});

describe('HomeVisit registry — observation helpers', () => {
  it('observationDomainByCode returns domain', () => {
    const d = observationDomainByCode('home_environment');
    expect(d).toBeTruthy();
    expect(d.labelAr).toBe('البيئة المنزلية');
    expect(observationDomainByCode('not_a_domain')).toBeNull();
  });

  it('OBSERVATION_DOMAIN_CODES matches domain count', () => {
    expect(OBSERVATION_DOMAIN_CODES.length).toBe(OBSERVATION_DOMAINS.length);
  });

  it('all domain codes are unique', () => {
    expect(new Set(OBSERVATION_DOMAIN_CODES).size).toBe(OBSERVATION_DOMAIN_CODES.length);
  });

  it('isCriticalConcern identifies high + critical', () => {
    expect(isCriticalConcern('critical')).toBe(true);
    expect(isCriticalConcern('high')).toBe(true);
    expect(isCriticalConcern('medium')).toBe(false);
    expect(isCriticalConcern('low')).toBe(false);
    expect(isCriticalConcern('none')).toBe(false);
  });

  it('concern levels ordered none→critical', () => {
    expect(OBSERVATION_CONCERN_LEVELS).toEqual(['none', 'low', 'medium', 'high', 'critical']);
  });
});

describe('HomeVisit registry — SLA', () => {
  it('slaPolicyForFollowup returns social.home_visit.followup', () => {
    expect(slaPolicyForFollowup()).toBe('social.home_visit.followup');
  });

  it('follow-up SLA exists in sla.registry', () => {
    const sla = require('../config/sla.registry').byId('social.home_visit.followup');
    expect(sla).toBeTruthy();
    expect(sla.severity).toBe('high');
    expect(sla.resolutionTargetMinutes).toBe(14 * 24 * 60);
  });
});

describe('HomeVisit registry — graph reachability', () => {
  it('every status reachable from scheduled', () => {
    const reachable = new Set(['scheduled']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(VISIT_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of VISIT_STATUSES) expect(reachable.has(s)).toBe(true);
  });
});

describe('HomeVisit registry — cancellation reasons', () => {
  it('cancellation reasons are unique', () => {
    expect(new Set(CANCELLATION_REASONS).size).toBe(CANCELLATION_REASONS.length);
  });
  it('has ≥ 6 cancellation reasons', () => {
    expect(CANCELLATION_REASONS.length).toBeGreaterThanOrEqual(6);
  });
});
