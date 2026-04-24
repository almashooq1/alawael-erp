/**
 * red-flags-registry.test.js — Beneficiary-360 Foundation Commit 1.
 *
 * Shape + drift invariants over the canonical Red-Flag taxonomy
 * (config/red-flags.registry.js). Pure-data tests — no DB, no I/O.
 *
 * The registry is referenced by the beneficiary-360 alert strip,
 * the clinical red-flag engine (commit 2), and the compliance
 * evidence pack. Keeping its shape rigid here means those downstream
 * layers can trust the contract.
 */

'use strict';

const {
  RED_FLAGS,
  DOMAINS,
  SEVERITIES,
  CATEGORIES,
  OPERATORS,
  AUTORESOLVE_TYPES,
  byId,
  byDomain,
  bySeverity,
  byCategory,
  byOwner,
  byCompliance,
  blocking,
  withSlaAtOrUnder,
  resolveKpiLinks,
} = require('../config/red-flags.registry');
const { ROLES } = require('../config/rbac.config');
const { KPIS } = require('../config/kpi.registry');

const ROLE_SET = new Set(Object.values(ROLES));
const KPI_ID_SET = new Set(KPIS.map(k => k.id));

describe('Red-Flag registry — sanity', () => {
  it('has at least 25 canonical flags seeded', () => {
    expect(RED_FLAGS.length).toBeGreaterThanOrEqual(25);
  });

  it('registry is frozen (immutable at runtime)', () => {
    expect(Object.isFrozen(RED_FLAGS)).toBe(true);
  });

  it('taxonomy sets are frozen', () => {
    expect(Object.isFrozen(DOMAINS)).toBe(true);
    expect(Object.isFrozen(SEVERITIES)).toBe(true);
    expect(Object.isFrozen(CATEGORIES)).toBe(true);
    expect(Object.isFrozen(OPERATORS)).toBe(true);
    expect(Object.isFrozen(AUTORESOLVE_TYPES)).toBe(true);
  });
});

describe('Red-Flag registry — per-entry shape', () => {
  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has all required string fields', (_, flag) => {
    for (const field of ['id', 'nameEn', 'nameAr', 'domain', 'severity', 'category', 'owner']) {
      expect(typeof flag[field]).toBe('string');
      expect(flag[field].length).toBeGreaterThan(0);
    }
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has a well-formed trigger.source', (_, flag) => {
    expect(flag.trigger).toBeDefined();
    expect(typeof flag.trigger.source.service).toBe('string');
    expect(typeof flag.trigger.source.method).toBe('string');
    // path is optional for pure-event flags
    if (flag.trigger.source.path !== undefined) {
      expect(typeof flag.trigger.source.path).toBe('string');
    }
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has a well-formed trigger.condition', (_, flag) => {
    expect(flag.trigger.condition).toBeDefined();
    expect(typeof flag.trigger.condition.operator).toBe('string');
    // value is required; shape varies (number, bool, string)
    expect(flag.trigger.condition.value).toBeDefined();
    if (flag.trigger.condition.windowDays !== undefined) {
      expect(typeof flag.trigger.condition.windowDays).toBe('number');
      expect(flag.trigger.condition.windowDays).toBeGreaterThan(0);
    }
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has a well-formed response', (_, flag) => {
    expect(flag.response).toBeDefined();
    expect(typeof flag.response.blocking).toBe('boolean');
    expect(Array.isArray(flag.response.notify)).toBe(true);
    expect(flag.response.notify.length).toBeGreaterThan(0);
    expect(typeof flag.response.escalateTo).toBe('string');
    expect(typeof flag.response.taskTemplate).toBe('string');
    expect(flag.response.taskTemplate.length).toBeGreaterThan(0);
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has non-negative timing fields', (_, flag) => {
    expect(typeof flag.slaHours).toBe('number');
    expect(flag.slaHours).toBeGreaterThanOrEqual(0);
    expect(typeof flag.cooldownHours).toBe('number');
    expect(flag.cooldownHours).toBeGreaterThanOrEqual(0);
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s has a valid autoResolve', (_, flag) => {
    if (flag.autoResolve === null) return;
    expect(AUTORESOLVE_TYPES).toContain(flag.autoResolve.type);
    if (flag.autoResolve.type === 'timer') {
      expect(typeof flag.autoResolve.afterHours).toBe('number');
      expect(flag.autoResolve.afterHours).toBeGreaterThan(0);
    }
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s compliance is an array of strings', (_, flag) => {
    expect(Array.isArray(flag.compliance)).toBe(true);
    for (const tag of flag.compliance) expect(typeof tag).toBe('string');
  });

  it.each(RED_FLAGS.map(f => [f.id, f]))('%s kpiLinks is an array of strings', (_, flag) => {
    expect(Array.isArray(flag.kpiLinks)).toBe(true);
    for (const link of flag.kpiLinks) expect(typeof link).toBe('string');
  });
});

describe('Red-Flag registry — taxonomy invariants', () => {
  it('every domain is from DOMAINS', () => {
    const allowed = new Set(DOMAINS);
    for (const f of RED_FLAGS) expect(allowed.has(f.domain)).toBe(true);
  });

  it('every severity is from SEVERITIES', () => {
    const allowed = new Set(SEVERITIES);
    for (const f of RED_FLAGS) expect(allowed.has(f.severity)).toBe(true);
  });

  it('every category is from CATEGORIES', () => {
    const allowed = new Set(CATEGORIES);
    for (const f of RED_FLAGS) expect(allowed.has(f.category)).toBe(true);
  });

  it('every trigger operator is from OPERATORS', () => {
    const allowed = new Set(OPERATORS);
    for (const f of RED_FLAGS) expect(allowed.has(f.trigger.condition.operator)).toBe(true);
  });

  it('every owner resolves to a canonical RBAC role', () => {
    for (const f of RED_FLAGS) expect(ROLE_SET.has(f.owner)).toBe(true);
  });

  it('every response.escalateTo resolves to a canonical RBAC role', () => {
    for (const f of RED_FLAGS) expect(ROLE_SET.has(f.response.escalateTo)).toBe(true);
  });

  it('every response.notify entry resolves to a canonical RBAC role', () => {
    for (const f of RED_FLAGS) {
      for (const role of f.response.notify) {
        expect(ROLE_SET.has(role)).toBe(true);
      }
    }
  });

  it('every kpiLinks entry resolves to a canonical KPI id', () => {
    for (const f of RED_FLAGS) {
      for (const id of f.kpiLinks) {
        expect(KPI_ID_SET.has(id)).toBe(true);
      }
    }
  });
});

describe('Red-Flag registry — id uniqueness + shape', () => {
  it('every id is unique across the catalogue', () => {
    const seen = new Set();
    for (const f of RED_FLAGS) {
      expect(seen.has(f.id)).toBe(false);
      seen.add(f.id);
    }
  });

  it('every id follows the domain.entity.qualifier slug convention', () => {
    for (const f of RED_FLAGS) {
      expect(f.id).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}$/);
    }
  });

  it('every id prefix matches its declared domain', () => {
    for (const f of RED_FLAGS) {
      const prefix = f.id.split('.')[0];
      expect(prefix).toBe(f.domain);
    }
  });
});

describe('Red-Flag registry — safety invariants', () => {
  it('every blocking flag is severity critical — we do not block care on warnings', () => {
    for (const f of RED_FLAGS) {
      if (f.response.blocking) expect(f.severity).toBe('critical');
    }
  });

  it('every critical flag is addressable within 72 hours', () => {
    for (const f of RED_FLAGS) {
      if (f.severity === 'critical') expect(f.slaHours).toBeLessThanOrEqual(72);
    }
  });

  it('critical medication/consent flags have zero cooldown (never suppress)', () => {
    const neverSuppressed = RED_FLAGS.filter(
      f =>
        f.severity === 'critical' &&
        (f.domain === 'safety' || f.id.includes('consent') || f.id.includes('medication'))
    );
    for (const f of neverSuppressed) {
      if (f.response.blocking) expect(f.cooldownHours).toBe(0);
    }
  });

  it('info flags never block', () => {
    for (const f of RED_FLAGS) {
      if (f.severity === 'info') expect(f.response.blocking).toBe(false);
    }
  });
});

describe('Red-Flag registry — lookup helpers', () => {
  it('byId returns the matching entry', () => {
    const first = RED_FLAGS[0];
    expect(byId(first.id)).toBe(first);
  });

  it('byId returns null for an unknown id', () => {
    expect(byId('never.gonna.exist')).toBe(null);
  });

  it('byDomain filters correctly', () => {
    const clinical = byDomain('clinical');
    expect(clinical.length).toBeGreaterThan(0);
    expect(clinical.every(f => f.domain === 'clinical')).toBe(true);
  });

  it('bySeverity filters correctly and every severity bucket is populated', () => {
    for (const sev of SEVERITIES) {
      const bucket = bySeverity(sev);
      expect(bucket.every(f => f.severity === sev)).toBe(true);
    }
    expect(bySeverity('critical').length).toBeGreaterThan(0);
    expect(bySeverity('warning').length).toBeGreaterThan(0);
  });

  it('byCategory filters correctly', () => {
    const thresholds = byCategory('threshold');
    expect(thresholds.length).toBeGreaterThan(0);
    expect(thresholds.every(f => f.category === 'threshold')).toBe(true);
  });

  it('byOwner returns flags owned by the given role', () => {
    const clinical = byOwner(ROLES.CLINICAL_DIRECTOR);
    expect(clinical.length).toBeGreaterThan(0);
    expect(clinical.every(f => f.owner === ROLES.CLINICAL_DIRECTOR)).toBe(true);
  });

  it('byCompliance filters flags tagged with the given framework', () => {
    const cbahi = byCompliance('CBAHI 8.7');
    expect(cbahi.length).toBeGreaterThan(0);
    expect(cbahi.every(f => f.compliance.includes('CBAHI 8.7'))).toBe(true);
  });

  it('blocking() returns only flags that halt clinical actions', () => {
    const b = blocking();
    expect(b.length).toBeGreaterThan(0);
    expect(b.every(f => f.response.blocking === true)).toBe(true);
    expect(b.every(f => f.severity === 'critical')).toBe(true);
  });

  it('withSlaAtOrUnder picks flags whose SLA meets the bound', () => {
    const urgent = withSlaAtOrUnder(4);
    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.every(f => f.slaHours <= 4)).toBe(true);
  });

  it('resolveKpiLinks returns concrete KPI entries for linked flags', () => {
    const linked = RED_FLAGS.find(f => f.kpiLinks.length > 0);
    expect(linked).toBeDefined();
    const kpis = resolveKpiLinks(linked);
    expect(kpis.length).toBe(linked.kpiLinks.length);
    for (const k of kpis) expect(typeof k.id).toBe('string');
  });

  it('resolveKpiLinks is empty for flags without links and null-safe', () => {
    expect(resolveKpiLinks(null)).toEqual([]);
    expect(resolveKpiLinks({ kpiLinks: [] })).toEqual([]);
  });
});
