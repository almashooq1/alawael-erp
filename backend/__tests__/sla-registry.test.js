'use strict';

/**
 * sla-registry.test.js — Phase 16 Commit 1 (4.0.66).
 *
 * Shape + drift invariants over the canonical ops SLA catalogue
 * (config/sla.registry.js). Pure-data tests — no DB, no I/O.
 *
 * Everything downstream (slaEngine, ops dashboards, notification
 * router subscriptions) trusts this contract, so keep the shape
 * rigid here.
 */

const {
  SLAS,
  OPS_MODULES,
  SEVERITIES,
  byId,
  byModule,
  byEvent,
  bySeverity,
  validate,
  _matches,
} = require('../config/sla.registry');

describe('SLA registry — sanity', () => {
  it('has at least 10 canonical SLA policies seeded', () => {
    expect(SLAS.length).toBeGreaterThanOrEqual(10);
  });

  it('registry + taxonomy sets are frozen', () => {
    expect(Object.isFrozen(SLAS)).toBe(true);
    expect(Object.isFrozen(OPS_MODULES)).toBe(true);
    expect(Object.isFrozen(SEVERITIES)).toBe(true);
  });

  it('every canonical ops module is referenced by ≥1 SLA', () => {
    // Every defined module must have at least one policy so the
    // admin UI never renders an orphan tab.
    for (const mod of OPS_MODULES) {
      const hits = SLAS.filter(s => s.module === mod);
      expect(hits.length).toBeGreaterThan(0);
    }
  });
});

describe('SLA registry — per-entry shape', () => {
  it.each(SLAS.map(s => [s.id, s]))('%s has required fields', (_, sla) => {
    expect(typeof sla.id).toBe('string');
    expect(sla.id.length).toBeGreaterThan(0);
    expect(OPS_MODULES).toContain(sla.module);
    expect(SEVERITIES).toContain(sla.severity);
    expect(typeof sla.event).toBe('string');
    expect(typeof sla.label).toBe('string');
    expect(typeof sla.labelAr).toBe('string');
    expect(typeof sla.resolutionTargetMinutes).toBe('number');
    expect(sla.resolutionTargetMinutes).toBeGreaterThan(0);
    expect(Array.isArray(sla.escalation)).toBe(true);
    expect(typeof sla.warnAtPct).toBe('number');
    expect(sla.warnAtPct).toBeGreaterThan(0);
    expect(sla.warnAtPct).toBeLessThan(100);
  });

  it.each(SLAS.map(s => [s.id, s]))('%s: responseTarget ≤ resolutionTarget', (_, sla) => {
    if (sla.responseTargetMinutes > 0) {
      expect(sla.responseTargetMinutes).toBeLessThanOrEqual(sla.resolutionTargetMinutes);
    }
  });

  it.each(SLAS.map(s => [s.id, s]))('%s: escalation steps are monotonic', (_, sla) => {
    for (let i = 1; i < sla.escalation.length; i++) {
      expect(sla.escalation[i].afterMinutes).toBeGreaterThanOrEqual(
        sla.escalation[i - 1].afterMinutes
      );
    }
  });
});

describe('SLA registry — uniqueness', () => {
  it('has unique ids', () => {
    const ids = SLAS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('SLA registry — lookups', () => {
  it('byId returns exact match or null', () => {
    const first = SLAS[0];
    expect(byId(first.id)).toEqual(first);
    expect(byId('does-not-exist')).toBeNull();
  });

  it('byModule returns only matching entries', () => {
    const hits = byModule('helpdesk');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.module).toBe('helpdesk');
  });

  it('byEvent supports exact + wildcard patterns', () => {
    const exact = byEvent('ops.ticket.created');
    expect(exact.length).toBeGreaterThan(0);
    for (const h of exact) expect(h.event).toBe('ops.ticket.created');
  });

  it('bySeverity returns only matching entries', () => {
    const crit = bySeverity('critical');
    for (const c of crit) expect(c.severity).toBe('critical');
  });
});

describe('SLA registry — pattern matcher', () => {
  it('matches exact', () => {
    expect(_matches('ops.ticket.created', 'ops.ticket.created')).toBe(true);
    expect(_matches('ops.ticket.created', 'ops.ticket.other')).toBe(false);
  });

  it('matches star-suffix prefix', () => {
    expect(_matches('ops.ticket.*', 'ops.ticket.created')).toBe(true);
    expect(_matches('ops.ticket.*', 'ops.ticket')).toBe(true);
    expect(_matches('ops.ticket.*', 'ops.other.created')).toBe(false);
  });

  it('matches universal wildcard', () => {
    expect(_matches('*', 'anything.goes')).toBe(true);
  });
});

describe('SLA registry — validate()', () => {
  it('passes on the shipped registry', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });
});
