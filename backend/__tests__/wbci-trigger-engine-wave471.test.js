'use strict';

/**
 * W471 drift guard — WBCI trigger engine.
 *
 * Pure-lib trigger orchestrator that translates WBCI snapshot triggers
 * into concrete action proposals (dedupe + cooldown + escalation).
 */

const lib = require('../intelligence/wbci-trigger-engine.lib');

describe('W471 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.proposeActions).toBe('function');
    expect(typeof lib.applyCooldown).toBe('function');
    expect(typeof lib.shouldEscalate).toBe('function');
    expect(typeof lib.plan).toBe('function');
  });

  it('exposes PROPOSAL_KINDS + PRIORITIES', () => {
    expect(lib.PROPOSAL_KINDS).toContain('respite_booking');
    expect(lib.PROPOSAL_KINDS).toContain('counselling_session_consult');
    expect(lib.PROPOSAL_KINDS).toContain('counselling_session_urgent');
    expect(lib.PROPOSAL_KINDS).toContain('financial_review');
    expect(lib.PROPOSAL_KINDS).toContain('sibling_referral');
    expect(lib.PRIORITIES).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W471 — proposeActions', () => {
  it('translates W467 trigger actions to proposal kinds', () => {
    const r = lib.proposeActions({
      triggeredActions: [
        { action: 'respite_booking_offered', priority: 'high', reason: 'Burden high' },
        { action: 'family_counsellor_consult', priority: 'high', reason: 'WBCI low' },
      ],
    });
    expect(r.proposals).toHaveLength(2);
    expect(r.proposals[0].kind).toBe('respite_booking');
    expect(r.proposals[1].kind).toBe('counselling_session_consult');
  });

  it('dedupes against active interventions', () => {
    const r = lib.proposeActions(
      {
        triggeredActions: [
          { action: 'respite_booking_offered', priority: 'high' },
          { action: 'family_counsellor_urgent', priority: 'critical' },
        ],
      },
      { activeInterventions: [{ kind: 'respite_booking', status: 'pending' }] }
    );
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0].kind).toBe('counselling_session_urgent');
    expect(r.dedupedKinds).toContain('respite_booking');
  });

  it('returns empty proposals for empty triggeredActions', () => {
    const r = lib.proposeActions({ triggeredActions: [] });
    expect(r.proposals).toEqual([]);
  });

  it('returns empty for null snapshot', () => {
    expect(lib.proposeActions(null).proposals).toEqual([]);
  });

  it('skips unknown action types', () => {
    const r = lib.proposeActions({
      triggeredActions: [
        { action: 'unknown_action', priority: 'medium' },
        { action: 'respite_booking_offered', priority: 'high' },
      ],
    });
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0].kind).toBe('respite_booking');
  });

  it('every proposal carries entityHint with model + service', () => {
    const r = lib.proposeActions({
      triggeredActions: [{ action: 'family_counsellor_urgent', priority: 'critical' }],
    });
    expect(r.proposals[0].entityHint).toMatchObject({
      model: 'FamilyCounsellingSession',
      service: expect.stringContaining('familyCounselling'),
    });
  });

  it('sibling_referral maps to SelfAdvocacyTrainingPlan model', () => {
    const r = lib.proposeActions({
      triggeredActions: [{ action: 'sibling_support_referral', priority: 'medium' }],
    });
    expect(r.proposals[0].entityHint.model).toBe('SelfAdvocacyTrainingPlan');
  });

  it('financial_review maps to FinancialNavigationPlan model', () => {
    const r = lib.proposeActions({
      triggeredActions: [{ action: 'financial_navigation_review', priority: 'medium' }],
    });
    expect(r.proposals[0].entityHint.model).toBe('FinancialNavigationPlan');
  });
});

describe('W471 — applyCooldown', () => {
  it('flags cooledDown=true when same kind proposed in last N days', () => {
    const proposals = [{ kind: 'respite_booking', priority: 'high' }];
    const history = [
      { kind: 'respite_booking', proposedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    ];
    const r = lib.applyCooldown(proposals, history, 7);
    expect(r[0].cooledDown).toBe(true);
  });

  it('flags cooledDown=false when prior proposal is older than cooldown', () => {
    const proposals = [{ kind: 'respite_booking', priority: 'high' }];
    const history = [
      { kind: 'respite_booking', proposedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
    ];
    const r = lib.applyCooldown(proposals, history, 7);
    expect(r[0].cooledDown).toBe(false);
  });

  it('empty history → no cooldown', () => {
    const proposals = [{ kind: 'respite_booking', priority: 'high' }];
    const r = lib.applyCooldown(proposals, [], 7);
    expect(r[0].cooledDown).toBe(false);
  });

  it('preserves other proposal fields', () => {
    const proposals = [{ kind: 'respite_booking', priority: 'high', reason: 'burden' }];
    const r = lib.applyCooldown(proposals, [], 7);
    expect(r[0].reason).toBe('burden');
  });
});

describe('W471 — shouldEscalate', () => {
  it('returns true for crisis band', () => {
    expect(lib.shouldEscalate({ band: 'crisis' }, [])).toBe(true);
  });

  it('returns true for sustained decline regardless of band', () => {
    expect(lib.shouldEscalate({ band: 'stable' }, [], true)).toBe(true);
  });

  it('returns true when ≥2 high/critical proposals stack', () => {
    const proposals = [{ priority: 'high' }, { priority: 'critical' }];
    expect(lib.shouldEscalate({ band: 'monitor' }, proposals)).toBe(true);
  });

  it('returns false for stable band with 0-1 high proposals', () => {
    expect(lib.shouldEscalate({ band: 'stable' }, [])).toBe(false);
    expect(lib.shouldEscalate({ band: 'stable' }, [{ priority: 'high' }])).toBe(false);
  });

  it('cooledDown proposals do not count toward escalation', () => {
    const proposals = [
      { priority: 'high', cooledDown: true },
      { priority: 'high', cooledDown: true },
    ];
    expect(lib.shouldEscalate({ band: 'monitor' }, proposals)).toBe(false);
  });
});

describe('W471 — plan (full pipeline)', () => {
  it('returns proposals + escalate + dedupedKinds', () => {
    const r = lib.plan({
      snapshot: {
        band: 'monitor',
        wbci: 48,
        triggeredActions: [
          { action: 'respite_booking_offered', priority: 'high', reason: 'burden' },
          { action: 'family_counsellor_consult', priority: 'high' },
        ],
      },
      activeInterventions: [],
      proposalHistory: [],
      hasSustainedDecline: false,
    });
    expect(r.proposals).toHaveLength(2);
    expect(typeof r.escalate).toBe('boolean');
    expect(Array.isArray(r.dedupedKinds)).toBe(true);
  });

  it('escalates when band=crisis', () => {
    const r = lib.plan({
      snapshot: {
        band: 'crisis',
        wbci: 25,
        triggeredActions: [{ action: 'family_counsellor_urgent', priority: 'critical' }],
      },
    });
    expect(r.escalate).toBe(true);
  });

  it('does NOT escalate when at_risk + 1 proposal + no decline', () => {
    const r = lib.plan({
      snapshot: {
        band: 'at_risk',
        wbci: 42,
        triggeredActions: [{ action: 'respite_booking_offered', priority: 'high' }],
      },
    });
    expect(r.escalate).toBe(false);
  });

  it('escalates on sustained decline even when band is stable', () => {
    const r = lib.plan({
      snapshot: {
        band: 'stable',
        wbci: 68,
        triggeredActions: [{ action: 'respite_booking_offered', priority: 'high' }],
      },
      hasSustainedDecline: true,
    });
    expect(r.escalate).toBe(true);
  });

  it('respects activeInterventions + cooldown together', () => {
    const r = lib.plan({
      snapshot: {
        band: 'monitor',
        triggeredActions: [
          { action: 'respite_booking_offered', priority: 'high' },
          { action: 'family_counsellor_consult', priority: 'high' },
        ],
      },
      activeInterventions: [{ kind: 'respite_booking', status: 'pending' }],
      proposalHistory: [
        {
          kind: 'counselling_session_consult',
          proposedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ],
      cooldownDays: 7,
    });
    // respite deduped because active; counselling proposal exists but cooledDown=true
    expect(r.dedupedKinds).toContain('respite_booking');
    expect(r.proposals[0]?.kind).toBe('counselling_session_consult');
    expect(r.proposals[0]?.cooledDown).toBe(true);
  });
});
