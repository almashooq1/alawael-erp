'use strict';

/**
 * care-retention-registry.test.js — Phase 17 Commit 8 (4.0.90).
 */

const registry = require('../config/care/retention.registry');

describe('Retention registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => registry.validate()).not.toThrow();
    expect(registry.validate()).toBe(true);
  });

  it('all taxonomies are frozen', () => {
    for (const t of [
      registry.RISK_BANDS,
      registry.RISK_BAND_CODES,
      registry.RISK_FACTORS,
      registry.RISK_FACTOR_CODES,
      registry.INTERVENTION_TYPES,
      registry.BAND_INTERVENTION_MATRIX,
      registry.TREND_DIRECTIONS,
      registry.THRESHOLDS,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has exactly 4 bands: low / moderate / high / imminent', () => {
    expect(registry.RISK_BAND_CODES).toEqual(['low', 'moderate', 'high', 'imminent']);
  });

  it('bands cover 0..100 contiguously', () => {
    let cursor = 0;
    for (const b of registry.RISK_BANDS) {
      expect(b.minScore).toBe(cursor);
      cursor = b.maxScore + 1;
    }
    expect(cursor - 1).toBe(100);
  });

  it('at least 10 risk factors registered', () => {
    expect(registry.RISK_FACTOR_CODES.length).toBeGreaterThanOrEqual(10);
  });

  it('every factor has weight + labels', () => {
    for (const code of registry.RISK_FACTOR_CODES) {
      const f = registry.getFactor(code);
      expect(f).toBeTruthy();
      expect(typeof f.weight).toBe('number');
      expect(f.labelEn).toBeTruthy();
      expect(f.labelAr).toBeTruthy();
    }
  });

  it('mitigating factors have negative weights', () => {
    expect(registry.RISK_FACTORS.upcoming_home_visit.weight).toBeLessThan(0);
    expect(registry.RISK_FACTORS.active_mdt.weight).toBeLessThan(0);
  });

  it('aggravating factors have positive weights', () => {
    for (const code of [
      'no_recent_home_visit',
      'stale_critical_flag',
      'safety_plan_overdue',
      'isolation_no_linkages',
    ]) {
      expect(registry.RISK_FACTORS[code].weight).toBeGreaterThan(0);
    }
  });

  it('band intervention matrix has entry for every band', () => {
    for (const b of registry.RISK_BAND_CODES) {
      expect(registry.BAND_INTERVENTION_MATRIX[b]).toBeDefined();
      expect(Array.isArray(registry.BAND_INTERVENTION_MATRIX[b])).toBe(true);
    }
  });

  it('imminent band triggers escalation interventions', () => {
    const imminent = registry.BAND_INTERVENTION_MATRIX.imminent;
    expect(imminent).toContain('raise_psych_flag');
    expect(imminent).toContain('schedule_mdt');
  });

  it('low band does nothing but track', () => {
    expect(registry.BAND_INTERVENTION_MATRIX.low).toEqual(['track_only']);
  });
});

describe('Retention registry — bandForScore', () => {
  it('0 → low, 24 → low, 25 → moderate', () => {
    expect(registry.bandForScore(0)).toBe('low');
    expect(registry.bandForScore(24)).toBe('low');
    expect(registry.bandForScore(25)).toBe('moderate');
  });

  it('49 → moderate, 50 → high', () => {
    expect(registry.bandForScore(49)).toBe('moderate');
    expect(registry.bandForScore(50)).toBe('high');
  });

  it('74 → high, 75 → imminent, 100 → imminent', () => {
    expect(registry.bandForScore(74)).toBe('high');
    expect(registry.bandForScore(75)).toBe('imminent');
    expect(registry.bandForScore(100)).toBe('imminent');
  });
});

describe('Retention registry — trendFor', () => {
  it('no prior → unknown', () => {
    expect(registry.trendFor(null, 50)).toBe('unknown');
  });

  it('score dropped 5+ → improving', () => {
    expect(registry.trendFor(50, 40)).toBe('improving');
    expect(registry.trendFor(50, 45)).toBe('improving'); // exactly -5
  });

  it('score rose 5+ → worsening', () => {
    expect(registry.trendFor(50, 60)).toBe('worsening');
    expect(registry.trendFor(50, 55)).toBe('worsening'); // exactly +5
  });

  it('change less than threshold → stable', () => {
    expect(registry.trendFor(50, 52)).toBe('stable');
    expect(registry.trendFor(50, 48)).toBe('stable');
    expect(registry.trendFor(50, 50)).toBe('stable');
  });
});

describe('Retention registry — interventionsForBand', () => {
  it('returns a copy not the original', () => {
    const a = registry.interventionsForBand('high');
    a.push('bogus');
    const b = registry.interventionsForBand('high');
    expect(b).not.toContain('bogus');
  });

  it('unknown band returns empty array', () => {
    expect(registry.interventionsForBand('bogus')).toEqual([]);
  });
});
