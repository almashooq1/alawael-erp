/**
 * alert-registry.test.js — Phase 18 Commit 8.
 *
 * Drift / shape invariants over the dashboard alert policy catalogue.
 */

'use strict';

const {
  POLICIES,
  ESCALATION_LADDERS,
  SEVERITIES,
  byId,
  forKpi,
  ladderFor,
} = require('../config/alert.registry');
const { byId: kpiById } = require('../config/kpi.registry');
const { ROLES } = require('../config/rbac.config');

const ROLE_SET = new Set(Object.values(ROLES));
const SEV_SET = new Set(SEVERITIES);

describe('alert registry — sanity', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(POLICIES)).toBe(true);
    expect(Object.isFrozen(ESCALATION_LADDERS)).toBe(true);
    expect(Object.isFrozen(SEVERITIES)).toBe(true);
  });

  it('has at least 8 seed policies covering the core dashboards', () => {
    expect(POLICIES.length).toBeGreaterThanOrEqual(8);
  });

  it('every id is unique', () => {
    const ids = new Set();
    for (const p of POLICIES) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
    }
  });
});

describe('alert registry — per-policy shape', () => {
  it.each(POLICIES.map(p => [p.id, p]))('%s has required fields', (_, p) => {
    expect(typeof p.id).toBe('string');
    expect(typeof p.kpiId).toBe('string');
    expect(SEV_SET.has(p.severity)).toBe(true);
    expect(typeof p.trigger).toBe('object');
    expect(['green', 'amber', 'red', 'unknown']).toContain(p.trigger.on);
    expect(typeof p.trigger.minConsecutiveTicks).toBe('number');
    expect(p.trigger.minConsecutiveTicks).toBeGreaterThan(0);
    expect(typeof p.dedupWindowMs).toBe('number');
    expect(p.dedupWindowMs).toBeGreaterThan(0);
    expect(typeof p.escalationLadderId).toBe('string');
  });

  it.each(POLICIES.map(p => [p.id, p]))('%s kpiId resolves to a real KPI or *', (_, p) => {
    if (p.kpiId === '*') return;
    const kpi = kpiById(p.kpiId);
    expect(kpi).toBeTruthy();
  });

  it.each(POLICIES.map(p => [p.id, p]))('%s escalationLadderId resolves', (_, p) => {
    const ladder = ESCALATION_LADDERS[p.escalationLadderId];
    expect(Array.isArray(ladder)).toBe(true);
    expect(ladder.length).toBeGreaterThan(0);
    for (const step of ladder) {
      expect(typeof step.afterMs).toBe('number');
      expect(Array.isArray(step.roles)).toBe(true);
      for (const role of step.roles) expect(ROLE_SET.has(role)).toBe(true);
      expect(Array.isArray(step.channels)).toBe(true);
    }
  });

  it('quiet hours, when defined, span 0..24', () => {
    for (const p of POLICIES) {
      if (!p.quietHours) continue;
      expect(p.quietHours.start).toBeGreaterThanOrEqual(0);
      expect(p.quietHours.start).toBeLessThan(24);
      expect(p.quietHours.end).toBeGreaterThanOrEqual(0);
      expect(p.quietHours.end).toBeLessThan(24);
    }
  });
});

describe('alert registry — helpers', () => {
  it('byId returns null for unknown ids', () => {
    expect(byId('nope')).toBeNull();
  });
  it('byId returns the policy for known ids', () => {
    expect(byId('exec.dso.breach')).toBeTruthy();
  });
  it('forKpi returns policies for the specific KPI', () => {
    const policies = forKpi('finance.ar.dso.days');
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies)
      expect(p.kpiId === 'finance.ar.dso.days' || p.kpiId === '*').toBe(true);
  });
  it('ladderFor returns the ladder steps for a policy', () => {
    const p = byId('exec.dso.breach');
    const steps = ladderFor(p);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].afterMs).toBe(0);
  });
});

describe('alert registry — escalation ladder invariants', () => {
  it('every ladder starts with afterMs=0', () => {
    for (const [name, steps] of Object.entries(ESCALATION_LADDERS)) {
      expect(steps[0].afterMs).toBe(0);
      // afterMs monotonically increases
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i].afterMs).toBeGreaterThan(steps[i - 1].afterMs);
      }
      expect(typeof name).toBe('string');
    }
  });
});
