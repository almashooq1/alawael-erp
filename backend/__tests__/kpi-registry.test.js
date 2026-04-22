/**
 * kpi-registry.test.js — Phase 8 Commit 1.
 *
 * Shape + drift invariants over the canonical KPI catalogue
 * (config/kpi.registry.js). Pure-data tests — no DB, no I/O.
 *
 * The registry is going to be referenced by the executive BI
 * dashboard (commit 2), alert aggregator (commit 3), and compliance
 * evidence packs (commit 4). Keeping its shape rigid here means
 * those downstream layers can trust the contract.
 */

'use strict';

const {
  KPIS,
  DOMAINS,
  UNITS,
  DIRECTIONS,
  FREQUENCIES,
  byId,
  byDomain,
  byOwner,
  byCompliance,
  classify,
} = require('../config/kpi.registry');
const { ROLES } = require('../config/rbac.config');

const ROLE_SET = new Set(Object.values(ROLES));

describe('KPI registry — sanity', () => {
  it('has at least 20 canonical KPIs seeded', () => {
    expect(KPIS.length).toBeGreaterThanOrEqual(20);
  });

  it('registry is frozen (immutable at runtime)', () => {
    expect(Object.isFrozen(KPIS)).toBe(true);
  });

  it('taxonomy sets are frozen', () => {
    expect(Object.isFrozen(DOMAINS)).toBe(true);
    expect(Object.isFrozen(UNITS)).toBe(true);
    expect(Object.isFrozen(DIRECTIONS)).toBe(true);
    expect(Object.isFrozen(FREQUENCIES)).toBe(true);
  });
});

describe('KPI registry — per-entry shape', () => {
  it.each(KPIS.map(k => [k.id, k]))('%s has all required string fields', (_, kpi) => {
    for (const field of [
      'id',
      'nameEn',
      'nameAr',
      'domain',
      'unit',
      'direction',
      'frequency',
      'owner',
    ]) {
      expect(typeof kpi[field]).toBe('string');
      expect(kpi[field].length).toBeGreaterThan(0);
    }
  });

  it.each(KPIS.map(k => [k.id, k]))('%s has well-typed thresholds', (_, kpi) => {
    // target / warningThreshold / criticalThreshold are either
    // numbers or null (null = business-set, tracked as "unknown").
    for (const field of ['target', 'warningThreshold', 'criticalThreshold']) {
      const v = kpi[field];
      expect(v === null || typeof v === 'number').toBe(true);
    }
  });

  it.each(KPIS.map(k => [k.id, k]))('%s dataSource is well-formed', (_, kpi) => {
    expect(kpi.dataSource).toBeDefined();
    expect(typeof kpi.dataSource.service).toBe('string');
    expect(typeof kpi.dataSource.method).toBe('string');
    expect(typeof kpi.dataSource.path).toBe('string');
  });

  it.each(KPIS.map(k => [k.id, k]))('%s compliance is an array of strings', (_, kpi) => {
    expect(Array.isArray(kpi.compliance)).toBe(true);
    for (const tag of kpi.compliance) expect(typeof tag).toBe('string');
  });
});

describe('KPI registry — taxonomy invariants', () => {
  it('every domain is from DOMAINS', () => {
    const allowed = new Set(DOMAINS);
    for (const k of KPIS) expect(allowed.has(k.domain)).toBe(true);
  });

  it('every unit is from UNITS', () => {
    const allowed = new Set(UNITS);
    for (const k of KPIS) expect(allowed.has(k.unit)).toBe(true);
  });

  it('every direction is from DIRECTIONS', () => {
    const allowed = new Set(DIRECTIONS);
    for (const k of KPIS) expect(allowed.has(k.direction)).toBe(true);
  });

  it('every frequency is from FREQUENCIES', () => {
    const allowed = new Set(FREQUENCIES);
    for (const k of KPIS) expect(allowed.has(k.frequency)).toBe(true);
  });

  it('every owner resolves to a canonical RBAC role', () => {
    for (const k of KPIS) {
      expect(ROLE_SET.has(k.owner)).toBe(true);
    }
  });
});

describe('KPI registry — id uniqueness + shape', () => {
  it('every id is unique across the catalogue', () => {
    const seen = new Set();
    for (const k of KPIS) {
      expect(seen.has(k.id)).toBe(false);
      seen.add(k.id);
    }
  });

  it('every id follows the domain.slug[.qualifier] slug convention', () => {
    for (const k of KPIS) {
      expect(k.id).toMatch(/^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+){1,4}$/);
    }
  });
});

describe('KPI registry — threshold ordering', () => {
  it('lower_is_better: target <= warning <= critical when all set', () => {
    for (const k of KPIS) {
      if (k.direction !== 'lower_is_better') continue;
      if (k.target == null || k.warningThreshold == null || k.criticalThreshold == null) continue;
      expect(k.target).toBeLessThanOrEqual(k.warningThreshold);
      expect(k.warningThreshold).toBeLessThanOrEqual(k.criticalThreshold);
    }
  });

  it('higher_is_better: target >= warning >= critical when all set', () => {
    for (const k of KPIS) {
      if (k.direction !== 'higher_is_better') continue;
      if (k.target == null || k.warningThreshold == null || k.criticalThreshold == null) continue;
      expect(k.target).toBeGreaterThanOrEqual(k.warningThreshold);
      expect(k.warningThreshold).toBeGreaterThanOrEqual(k.criticalThreshold);
    }
  });
});

describe('KPI registry — lookup helpers', () => {
  it('byId returns the matching entry', () => {
    const first = KPIS[0];
    expect(byId(first.id)).toBe(first);
  });

  it('byId returns null for an unknown id', () => {
    expect(byId('never.gonna.exist')).toBe(null);
  });

  it('byDomain filters correctly and returns the known-expected domains', () => {
    const quality = byDomain('quality');
    expect(quality.length).toBeGreaterThan(0);
    expect(quality.every(k => k.domain === 'quality')).toBe(true);
  });

  it('byOwner returns KPIs owned by the given role', () => {
    const hr = byOwner('hr_manager');
    expect(hr.length).toBeGreaterThan(0);
    expect(hr.every(k => k.owner === 'hr_manager')).toBe(true);
  });

  it('byCompliance filters KPIs tagged with the given framework', () => {
    const cbahi = byCompliance('CBAHI 8.7');
    expect(cbahi.length).toBeGreaterThan(0);
    expect(cbahi.every(k => k.compliance.includes('CBAHI 8.7'))).toBe(true);
  });
});

describe('KPI registry — classify()', () => {
  const lowerBetter = {
    direction: 'lower_is_better',
    target: 5,
    warningThreshold: 10,
    criticalThreshold: 20,
  };
  const higherBetter = {
    direction: 'higher_is_better',
    target: 95,
    warningThreshold: 80,
    criticalThreshold: 60,
  };

  it('lower_is_better — under warning → green', () => {
    expect(classify(lowerBetter, 4)).toBe('green');
  });

  it('lower_is_better — at warning → amber', () => {
    expect(classify(lowerBetter, 10)).toBe('amber');
  });

  it('lower_is_better — at critical → red', () => {
    expect(classify(lowerBetter, 20)).toBe('red');
  });

  it('lower_is_better — over critical → red', () => {
    expect(classify(lowerBetter, 99)).toBe('red');
  });

  it('higher_is_better — over warning → green', () => {
    expect(classify(higherBetter, 97)).toBe('green');
  });

  it('higher_is_better — at warning → amber', () => {
    expect(classify(higherBetter, 80)).toBe('amber');
  });

  it('higher_is_better — at critical → red', () => {
    expect(classify(higherBetter, 60)).toBe('red');
  });

  it('null value → unknown', () => {
    expect(classify(lowerBetter, null)).toBe('unknown');
  });

  it('NaN value → unknown', () => {
    expect(classify(lowerBetter, NaN)).toBe('unknown');
  });

  it('null thresholds (business-set KPI) → unknown regardless of value', () => {
    const noThresholds = {
      direction: 'higher_is_better',
      target: null,
      warningThreshold: null,
      criticalThreshold: null,
    };
    expect(classify(noThresholds, 1_000_000)).toBe('unknown');
  });

  it('string numeric value is coerced', () => {
    expect(classify(lowerBetter, '3')).toBe('green');
  });
});
