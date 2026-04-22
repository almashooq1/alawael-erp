/**
 * rehab-discipline-service.test.js — Phase 9 Commit 5.
 *
 * Unit tests over services/rehabDisciplineService.js. No HTTP, no DB —
 * just verifies the pure shape + composition logic.
 */

'use strict';

const service = require('../services/rehabDisciplineService');
const { DISCIPLINES, byId: disciplineById } = require('../config/rehab-disciplines.registry');

describe('rehabDisciplineService — ageMonthsToBand()', () => {
  it('returns null for non-numeric input', () => {
    expect(service.ageMonthsToBand(null)).toBeNull();
    expect(service.ageMonthsToBand(undefined)).toBeNull();
    expect(service.ageMonthsToBand('12')).toBeNull();
    expect(service.ageMonthsToBand(NaN)).toBeNull();
    expect(service.ageMonthsToBand(-5)).toBeNull();
  });

  it('maps infant months into early_0_3', () => {
    expect(service.ageMonthsToBand(0)).toBe('early_0_3');
    expect(service.ageMonthsToBand(24)).toBe('early_0_3');
    expect(service.ageMonthsToBand(36)).toBe('early_0_3');
  });

  it('maps preschool months into early_3_6', () => {
    expect(service.ageMonthsToBand(37)).toBe('early_3_6');
    expect(service.ageMonthsToBand(60)).toBe('early_3_6');
    expect(service.ageMonthsToBand(72)).toBe('early_3_6');
  });

  it('maps school-age months into child_6_12', () => {
    expect(service.ageMonthsToBand(73)).toBe('child_6_12');
    expect(service.ageMonthsToBand(120)).toBe('child_6_12');
    expect(service.ageMonthsToBand(144)).toBe('child_6_12');
  });

  it('maps adolescent months into adolescent_12_18', () => {
    expect(service.ageMonthsToBand(145)).toBe('adolescent_12_18');
    expect(service.ageMonthsToBand(180)).toBe('adolescent_12_18');
    expect(service.ageMonthsToBand(216)).toBe('adolescent_12_18');
  });

  it('maps adult months into adult_18_plus', () => {
    expect(service.ageMonthsToBand(217)).toBe('adult_18_plus');
    expect(service.ageMonthsToBand(360)).toBe('adult_18_plus');
    expect(service.ageMonthsToBand(1200)).toBe('adult_18_plus');
  });
});

describe('rehabDisciplineService — list()', () => {
  it('with no filters returns every discipline in summary shape', () => {
    const out = service.list();
    expect(out.length).toBe(DISCIPLINES.length);
    for (const row of out) {
      expect(typeof row.id).toBe('string');
      expect(typeof row.code).toBe('string');
      expect(typeof row.nameAr).toBe('string');
      expect(typeof row.programCount).toBe('number');
      expect(row.programCount).toBeGreaterThan(0);
      // Summary must NOT leak full program/intervention arrays
      expect(row).not.toHaveProperty('programTemplates');
      expect(row).not.toHaveProperty('recommendedInterventions');
    }
  });

  it('filters by domain', () => {
    const clinical = service.list({ domain: 'clinical' });
    expect(clinical.length).toBeGreaterThan(0);
    expect(clinical.every(d => d.domain === 'clinical')).toBe(true);
  });

  it('filters by ageBand', () => {
    const early = service.list({ ageBand: 'early_0_3' });
    expect(early.length).toBeGreaterThan(0);
    expect(early.every(d => d.supportedAgeBands.includes('early_0_3'))).toBe(true);
    expect(early.map(d => d.code)).toContain('EI');
  });

  it('filters by deliveryMode', () => {
    const home = service.list({ deliveryMode: 'home_based' });
    expect(home.length).toBeGreaterThan(0);
    expect(home.every(d => d.deliveryModes.includes('home_based'))).toBe(true);
  });

  it('stacks multiple filters', () => {
    const out = service.list({ domain: 'clinical', ageBand: 'child_6_12' });
    expect(out.every(d => d.domain === 'clinical')).toBe(true);
    expect(out.every(d => d.supportedAgeBands.includes('child_6_12'))).toBe(true);
  });
});

describe('rehabDisciplineService — get()', () => {
  it('returns the registry entry for a known id', () => {
    const d = service.get('rehab.physical_therapy');
    expect(d).not.toBeNull();
    expect(d.code).toBe('PT');
  });

  it('returns null for an unknown id', () => {
    expect(service.get('rehab.never.exists')).toBeNull();
  });
});

describe('rehabDisciplineService — bundle()', () => {
  it('returns null for an unknown id', () => {
    expect(service.bundle('rehab.never.exists')).toBeNull();
  });

  it('composes a full bundle for PT with resolved kpis + flags', () => {
    const out = service.bundle('rehab.physical_therapy');
    expect(out).not.toBeNull();
    expect(out.discipline.code).toBe('PT');
    expect(Array.isArray(out.kpis)).toBe(true);
    expect(out.kpis.length).toBeGreaterThan(0);
    for (const k of out.kpis) {
      expect(typeof k.id).toBe('string');
      expect(typeof k.nameAr).toBe('string');
      expect(typeof k.unit).toBe('string');
    }
    expect(Array.isArray(out.flags)).toBe(true);
    expect(out.flags.length).toBeGreaterThan(0);
    for (const f of out.flags) {
      expect(typeof f.id).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(f.severity);
    }
    expect(out.programTemplates.length).toBeGreaterThan(0);
    expect(out.interventions.length).toBeGreaterThan(0);
    expect(out.measures.length).toBeGreaterThan(0);
    expect(out.goalTemplates.length).toBeGreaterThan(0);
  });

  it('bundle returns independent copies (no registry mutation leakage)', () => {
    const out = service.bundle('rehab.physical_therapy');
    out.programTemplates[0].nameEn = 'MUTATED';
    const reloaded = disciplineById('rehab.physical_therapy');
    expect(reloaded.programTemplates[0].nameEn).not.toBe('MUTATED');
  });
});

describe('rehabDisciplineService — suggestForAge()', () => {
  it('returns [] for negative / invalid age', () => {
    expect(service.suggestForAge(-1)).toEqual([]);
    expect(service.suggestForAge(NaN)).toEqual([]);
    expect(service.suggestForAge('two')).toEqual([]);
  });

  it('suggests early-intervention for infants', () => {
    const out = service.suggestForAge(18);
    expect(out.length).toBeGreaterThan(0);
    expect(out.map(d => d.code)).toContain('EI');
  });

  it('suggests academic + life-skills for school-age', () => {
    const out = service.suggestForAge(108);
    const codes = out.map(d => d.code);
    expect(codes).toContain('ACAD');
    expect(codes).toContain('LS');
  });

  it('suggests independent-living for adults', () => {
    const out = service.suggestForAge(300);
    expect(out.map(d => d.code)).toContain('IL');
  });
});

describe('rehabDisciplineService — planReviewCycleForDisciplines()', () => {
  it('falls back to 90 when called with no args', () => {
    expect(service.planReviewCycleForDisciplines()).toBe(90);
    expect(service.planReviewCycleForDisciplines([])).toBe(90);
  });

  it('returns the tightest cadence across the supplied set', () => {
    expect(
      service.planReviewCycleForDisciplines(['rehab.physical_therapy', 'rehab.early_intervention'])
    ).toBe(60);
  });
});

describe('rehabDisciplineService — healthCheck()', () => {
  it('reports all 11 disciplines + zero orphans in a healthy state', () => {
    const h = service.healthCheck();
    expect(h.totalDisciplines).toBe(DISCIPLINES.length);
    expect(h.kpiOrphans).toBe(0);
    expect(h.flagOrphans).toBe(0);
    expect(h.healthy).toBe(true);
    expect(h.orphanDetails).toEqual([]);
  });

  it('byDomain rollup sums to total', () => {
    const h = service.healthCheck();
    const sum = h.byDomain.reduce((acc, x) => acc + x.count, 0);
    expect(sum).toBe(h.totalDisciplines);
  });
});
