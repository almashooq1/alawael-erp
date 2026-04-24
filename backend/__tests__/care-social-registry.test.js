'use strict';

/**
 * care-social-registry.test.js — Phase 17 Commit 2 (4.0.84).
 */

const {
  CASE_TYPES,
  RISK_LEVELS,
  CASE_STATUSES,
  CASE_TERMINAL_STATUSES,
  CASE_PAUSE_STATUSES,
  CASE_TRANSITIONS,
  ASSESSMENT_DOMAINS,
  ASSESSMENT_DOMAIN_CODES,
  DOMAIN_SCORE_MIN,
  DOMAIN_SCORE_MAX,
  INTERVENTION_TYPES,
  CLOSURE_OUTCOMES,
  canTransition,
  eventForTransition,
  requiredFieldsForTransition,
  isTerminal,
  isPaused,
  isHighRisk,
  slaPolicyForIntake,
  slaPolicyForPlan,
  slaPolicyForHighRisk,
  assessmentDomainByCode,
  validate,
} = require('../config/care/social.registry');

describe('Social registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });

  it('frozen taxonomies', () => {
    expect(Object.isFrozen(CASE_STATUSES)).toBe(true);
    expect(Object.isFrozen(CASE_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(RISK_LEVELS)).toBe(true);
    expect(Object.isFrozen(ASSESSMENT_DOMAINS)).toBe(true);
    expect(Object.isFrozen(INTERVENTION_TYPES)).toBe(true);
    expect(Object.isFrozen(CLOSURE_OUTCOMES)).toBe(true);
  });

  it('≥ 7 case types, 4 risk levels, 11 statuses, 8 domains, 10 intervention types', () => {
    expect(CASE_TYPES.length).toBeGreaterThanOrEqual(7);
    expect(RISK_LEVELS.length).toBe(4);
    expect(CASE_STATUSES.length).toBeGreaterThanOrEqual(11);
    expect(ASSESSMENT_DOMAINS.length).toBe(8);
    expect(INTERVENTION_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(CLOSURE_OUTCOMES.length).toBeGreaterThanOrEqual(7);
  });

  it('domain score band is 1..5', () => {
    expect(DOMAIN_SCORE_MIN).toBe(1);
    expect(DOMAIN_SCORE_MAX).toBe(5);
  });
});

describe('Social registry — transitions', () => {
  it('intake → assessment legal', () => {
    expect(canTransition('intake', 'assessment')).toBe(true);
  });

  it('intake → closed illegal (must go through intervention_planned or close via closing)', () => {
    expect(canTransition('intake', 'closed')).toBe(false);
  });

  it('assessment → intervention_planned requires assessmentSummary', () => {
    expect(requiredFieldsForTransition('assessment', 'intervention_planned')).toContain(
      'assessmentSummary'
    );
  });

  it('any → closed requires closureOutcome + closureSummary', () => {
    expect(requiredFieldsForTransition('closing', 'closed')).toEqual(
      expect.arrayContaining(['closureOutcome', 'closureSummary'])
    );
  });

  it('any → cancelled requires closureReason', () => {
    expect(requiredFieldsForTransition('intake', 'cancelled')).toContain('closureReason');
    expect(requiredFieldsForTransition('assessment', 'cancelled')).toContain('closureReason');
  });

  it('active ↔ monitoring both directions', () => {
    expect(canTransition('active', 'monitoring')).toBe(true);
    expect(canTransition('monitoring', 'active')).toBe(true);
  });

  it('pause states accept resumed event', () => {
    expect(eventForTransition('awaiting_family_consent', 'assessment')).toBe('resumed');
    expect(eventForTransition('awaiting_documents', 'intervention_planned')).toBe('resumed');
  });

  it('closed → active (reopened) legal for 90-day reopen', () => {
    expect(canTransition('closed', 'active')).toBe(true);
    expect(eventForTransition('closed', 'active')).toBe('reopened');
  });

  it('transferred / cancelled are terminal', () => {
    for (const t of ['transferred', 'cancelled']) {
      expect(CASE_TRANSITIONS[t]).toEqual([]);
      expect(isTerminal(t)).toBe(true);
    }
  });

  it('transferred requires transferredToWorkerId', () => {
    expect(requiredFieldsForTransition('assessment', 'transferred')).toContain(
      'transferredToWorkerId'
    );
    expect(requiredFieldsForTransition('active', 'transferred')).toContain('transferredToWorkerId');
  });
});

describe('Social registry — risk helpers', () => {
  it('isHighRisk identifies high/critical', () => {
    expect(isHighRisk('high')).toBe(true);
    expect(isHighRisk('critical')).toBe(true);
    expect(isHighRisk('low')).toBe(false);
    expect(isHighRisk('medium')).toBe(false);
  });

  it('RISK_LEVELS ordered low → critical', () => {
    expect(RISK_LEVELS).toEqual(['low', 'medium', 'high', 'critical']);
  });
});

describe('Social registry — pause alignment with SLA', () => {
  it('CASE_PAUSE_STATUSES match SLA policy pauseOnStates', () => {
    const sla = require('../config/sla.registry');
    const intakeSla = sla.byId('social.case.intake_to_assessment');
    const planSla = sla.byId('social.case.assessment_to_plan');
    expect(intakeSla).toBeTruthy();
    expect(planSla).toBeTruthy();
    for (const p of CASE_PAUSE_STATUSES) {
      expect(intakeSla.pauseOnStates).toContain(p);
      expect(planSla.pauseOnStates).toContain(p);
    }
  });

  it('all 3 social SLA policies exist', () => {
    const sla = require('../config/sla.registry');
    expect(sla.byId('social.case.intake_to_assessment')).toBeTruthy();
    expect(sla.byId('social.case.assessment_to_plan')).toBeTruthy();
    expect(sla.byId('social.case.high_risk_review')).toBeTruthy();
  });

  it('high-risk SLA is 24/7 (not business-hours-only)', () => {
    const sla = require('../config/sla.registry').byId('social.case.high_risk_review');
    expect(sla.businessHoursOnly).toBe(false);
    expect(sla.severity).toBe('critical');
  });
});

describe('Social registry — SLA helpers', () => {
  it('slaPolicyForIntake returns social.case.intake_to_assessment', () => {
    expect(slaPolicyForIntake()).toBe('social.case.intake_to_assessment');
  });
  it('slaPolicyForPlan returns social.case.assessment_to_plan', () => {
    expect(slaPolicyForPlan()).toBe('social.case.assessment_to_plan');
  });
  it('slaPolicyForHighRisk returns social.case.high_risk_review', () => {
    expect(slaPolicyForHighRisk()).toBe('social.case.high_risk_review');
  });
});

describe('Social registry — assessment domains', () => {
  it('ASSESSMENT_DOMAIN_CODES matches domain count', () => {
    expect(ASSESSMENT_DOMAIN_CODES.length).toBe(ASSESSMENT_DOMAINS.length);
  });

  it('assessmentDomainByCode works', () => {
    expect(assessmentDomainByCode('economic')).toBeTruthy();
    expect(assessmentDomainByCode('economic').labelAr).toBe('الوضع الاقتصادي');
    expect(assessmentDomainByCode('not_a_domain')).toBeNull();
  });

  it('all domain codes are unique', () => {
    expect(new Set(ASSESSMENT_DOMAIN_CODES).size).toBe(ASSESSMENT_DOMAIN_CODES.length);
  });
});

describe('Social registry — graph reachability', () => {
  it('every status reachable from intake', () => {
    const reachable = new Set(['intake']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(CASE_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const edge of edges) {
          if (!reachable.has(edge.to)) {
            reachable.add(edge.to);
            added = true;
          }
        }
      }
    }
    for (const s of CASE_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });
});

describe('Social registry — pause + terminal disjoint', () => {
  it('pause and terminal sets disjoint', () => {
    for (const p of CASE_PAUSE_STATUSES) {
      expect(CASE_TERMINAL_STATUSES).not.toContain(p);
    }
  });

  it('every pause status is valid CASE_STATUSES member', () => {
    for (const p of CASE_PAUSE_STATUSES) {
      expect(CASE_STATUSES).toContain(p);
      expect(isPaused(p)).toBe(true);
    }
  });
});
