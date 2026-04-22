/**
 * rehab-disciplines-registry.test.js — Phase 9 Commit 1.
 *
 * Shape + drift invariants over the canonical Rehabilitation-Discipline
 * catalogue (config/rehab-disciplines.registry.js). Pure-data tests —
 * no DB, no I/O.
 *
 * The registry is going to be referenced by: IRP builder, SMART-goal
 * suggestion engine, outcome-measure seeder, discipline-aware red-flag
 * routing, BI dashboard filters, and the plan-review scheduler.
 * Keeping its shape rigid here means those downstream layers can trust
 * the contract.
 */

'use strict';

const {
  DISCIPLINES,
  DOMAINS,
  DELIVERY_MODES,
  AGE_BANDS,
  EVIDENCE_LEVELS,
  INSTRUMENT_TYPES,
  GOAL_METRIC_KINDS,
  byId,
  byCode,
  byDomain,
  byOwnerRole,
  byLeadRole,
  forAgeBand,
  forDeliveryMode,
  withKpi,
  withRedFlag,
  byCompliance,
  recommendedReviewCycleDays,
  suggestInterventions,
  suggestMeasures,
  _resolveKpi,
  _resolveRedFlag,
} = require('../config/rehab-disciplines.registry');

const { ROLES } = require('../config/rbac.config');

const ROLE_SET = new Set(Object.values(ROLES));

// ─── Sanity ────────────────────────────────────────────────────────

describe('Rehab-disciplines registry — sanity', () => {
  it('has at least 11 canonical disciplines seeded', () => {
    expect(DISCIPLINES.length).toBeGreaterThanOrEqual(11);
  });

  it('registry is frozen (immutable at runtime)', () => {
    expect(Object.isFrozen(DISCIPLINES)).toBe(true);
  });

  it('taxonomy sets are frozen', () => {
    expect(Object.isFrozen(DOMAINS)).toBe(true);
    expect(Object.isFrozen(DELIVERY_MODES)).toBe(true);
    expect(Object.isFrozen(AGE_BANDS)).toBe(true);
    expect(Object.isFrozen(EVIDENCE_LEVELS)).toBe(true);
    expect(Object.isFrozen(INSTRUMENT_TYPES)).toBe(true);
    expect(Object.isFrozen(GOAL_METRIC_KINDS)).toBe(true);
  });

  it('covers the eleven user-requested disciplinary categories', () => {
    // Mirrors the spec in the Phase-9 design doc. If a category is
    // dropped or renamed, this test catches it.
    const expected = [
      'rehab.physical_therapy',
      'rehab.occupational_therapy',
      'rehab.speech_language',
      'rehab.behavioral_therapy',
      'rehab.early_intervention',
      'rehab.academic_skills',
      'rehab.life_skills',
      'rehab.independent_living',
      'rehab.psychosocial_support',
      'rehab.family_services',
      'rehab.social_services',
    ];
    for (const id of expected) expect(byId(id)).not.toBeNull();
  });
});

// ─── Per-entry shape ───────────────────────────────────────────────

describe('Rehab-disciplines registry — per-entry shape', () => {
  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has all required string fields', (_, d) => {
    for (const field of [
      'id',
      'code',
      'nameEn',
      'nameAr',
      'domain',
      'ownerRole',
      'leadSpecialistRole',
    ]) {
      expect(typeof d[field]).toBe('string');
      expect(d[field].length).toBeGreaterThan(0);
    }
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has numeric cadence fields', (_, d) => {
    expect(typeof d.defaultReviewCycleDays).toBe('number');
    expect(d.defaultReviewCycleDays).toBeGreaterThan(0);
    expect(d.defaultReviewCycleDays).toBeLessThanOrEqual(365);
    expect(typeof d.assessmentCadenceDays).toBe('number');
    expect(d.assessmentCadenceDays).toBeGreaterThan(0);
    expect(d.assessmentCadenceDays).toBeLessThanOrEqual(365);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has well-typed array fields', (_, d) => {
    for (const field of [
      'assistantRoles',
      'supportedAgeBands',
      'deliveryModes',
      'icfDomains',
      'programTemplates',
      'recommendedInterventions',
      'recommendedMeasures',
      'goalTemplates',
      'kpiLinks',
      'redFlagLinks',
      'compliance',
    ]) {
      expect(Array.isArray(d[field])).toBe(true);
    }
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one supported age band', (_, d) => {
    expect(d.supportedAgeBands.length).toBeGreaterThan(0);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one delivery mode', (_, d) => {
    expect(d.deliveryModes.length).toBeGreaterThan(0);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one recommended measure', (_, d) => {
    expect(d.recommendedMeasures.length).toBeGreaterThan(0);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one program template', (_, d) => {
    expect(d.programTemplates.length).toBeGreaterThan(0);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one intervention', (_, d) => {
    expect(d.recommendedInterventions.length).toBeGreaterThan(0);
  });

  it.each(DISCIPLINES.map(d => [d.id, d]))('%s has at least one goal template', (_, d) => {
    expect(d.goalTemplates.length).toBeGreaterThan(0);
  });
});

// ─── Nested-shape invariants ───────────────────────────────────────

describe('Rehab-disciplines — program templates shape', () => {
  it('every program template has required keys + sane dosing', () => {
    for (const d of DISCIPLINES) {
      for (const p of d.programTemplates) {
        expect(typeof p.code).toBe('string');
        expect(typeof p.nameAr).toBe('string');
        expect(typeof p.nameEn).toBe('string');
        expect(typeof p.deliveryMode).toBe('string');
        expect(DELIVERY_MODES).toContain(p.deliveryMode);
        expect(typeof p.frequencyPerWeek).toBe('number');
        expect(p.frequencyPerWeek).toBeGreaterThan(0);
        expect(p.frequencyPerWeek).toBeLessThanOrEqual(7);
        expect(typeof p.durationMinutes).toBe('number');
        expect(p.durationMinutes).toBeGreaterThanOrEqual(15);
        expect(p.durationMinutes).toBeLessThanOrEqual(240);
        expect(typeof p.cycleWeeks).toBe('number');
        expect(p.cycleWeeks).toBeGreaterThan(0);
        expect(EVIDENCE_LEVELS).toContain(p.evidenceLevel);
      }
    }
  });

  it('program codes are unique across the entire registry', () => {
    const seen = new Set();
    for (const d of DISCIPLINES) {
      for (const p of d.programTemplates) {
        expect(seen.has(p.code)).toBe(false);
        seen.add(p.code);
      }
    }
  });
});

describe('Rehab-disciplines — interventions shape', () => {
  it('every intervention has required keys', () => {
    for (const d of DISCIPLINES) {
      for (const iv of d.recommendedInterventions) {
        expect(typeof iv.code).toBe('string');
        expect(typeof iv.nameAr).toBe('string');
        expect(typeof iv.nameEn).toBe('string');
        expect(typeof iv.technique).toBe('string');
        expect(EVIDENCE_LEVELS).toContain(iv.evidenceLevel);
      }
    }
  });

  it('intervention codes are unique within each discipline', () => {
    for (const d of DISCIPLINES) {
      const codes = d.recommendedInterventions.map(iv => iv.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });
});

describe('Rehab-disciplines — measures shape', () => {
  it('every measure has required keys + valid instrumentType', () => {
    for (const d of DISCIPLINES) {
      for (const m of d.recommendedMeasures) {
        expect(typeof m.code).toBe('string');
        expect(typeof m.nameEn).toBe('string');
        expect(typeof m.standardBody).toBe('string');
        expect(INSTRUMENT_TYPES).toContain(m.instrumentType);
        expect(typeof m.domainTag).toBe('string');
      }
    }
  });
});

describe('Rehab-disciplines — goal templates shape', () => {
  it('every goal template carries a SMART-shape breakdown', () => {
    for (const d of DISCIPLINES) {
      for (const g of d.goalTemplates) {
        expect(typeof g.code).toBe('string');
        expect(typeof g.nameAr).toBe('string');
        expect(typeof g.nameEn).toBe('string');
        expect(GOAL_METRIC_KINDS).toContain(g.metric);
        expect(typeof g.unit).toBe('string');
        // baseline/target — numbers (rubrics may start at 0)
        expect(typeof g.baseline).toBe('number');
        expect(typeof g.target).toBe('number');
        expect(typeof g.masteryCriteria).toBe('string');
        expect(g.masteryCriteria.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Taxonomy invariants ───────────────────────────────────────────

describe('Rehab-disciplines registry — taxonomy invariants', () => {
  it('every domain is from DOMAINS', () => {
    const allowed = new Set(DOMAINS);
    for (const d of DISCIPLINES) expect(allowed.has(d.domain)).toBe(true);
  });

  it('every supported age band is from AGE_BANDS', () => {
    const allowed = new Set(AGE_BANDS);
    for (const d of DISCIPLINES) {
      for (const band of d.supportedAgeBands) expect(allowed.has(band)).toBe(true);
    }
  });

  it('every delivery mode is from DELIVERY_MODES', () => {
    const allowed = new Set(DELIVERY_MODES);
    for (const d of DISCIPLINES) {
      for (const mode of d.deliveryModes) expect(allowed.has(mode)).toBe(true);
    }
  });
});

// ─── Role resolution ───────────────────────────────────────────────

describe('Rehab-disciplines registry — RBAC role resolution', () => {
  it('every ownerRole resolves to a canonical RBAC role', () => {
    for (const d of DISCIPLINES) {
      expect(ROLE_SET.has(d.ownerRole)).toBe(true);
    }
  });

  it('every leadSpecialistRole resolves', () => {
    for (const d of DISCIPLINES) {
      expect(ROLE_SET.has(d.leadSpecialistRole)).toBe(true);
    }
  });

  it('every assistantRole resolves', () => {
    for (const d of DISCIPLINES) {
      for (const r of d.assistantRoles) expect(ROLE_SET.has(r)).toBe(true);
    }
  });
});

// ─── ID + code uniqueness ──────────────────────────────────────────

describe('Rehab-disciplines registry — id + code uniqueness', () => {
  it('every id is unique across the catalogue', () => {
    const seen = new Set();
    for (const d of DISCIPLINES) {
      expect(seen.has(d.id)).toBe(false);
      seen.add(d.id);
    }
  });

  it('every id follows the rehab.<slug> convention', () => {
    for (const d of DISCIPLINES) {
      expect(d.id).toMatch(/^rehab\.[a-z][a-z0-9_]+$/);
    }
  });

  it('every code is unique and uppercase', () => {
    const seen = new Set();
    for (const d of DISCIPLINES) {
      expect(seen.has(d.code)).toBe(false);
      expect(d.code).toBe(d.code.toUpperCase());
      seen.add(d.code);
    }
  });
});

// ─── Cross-reference resolution (drift guards) ─────────────────────

describe('Rehab-disciplines registry — cross-refs resolve', () => {
  it('every kpiLinks entry resolves to an existing KPI', () => {
    for (const d of DISCIPLINES) {
      for (const kpiId of d.kpiLinks) {
        expect(_resolveKpi(kpiId)).not.toBeNull();
      }
    }
  });

  it('every redFlagLinks entry resolves to an existing red-flag', () => {
    for (const d of DISCIPLINES) {
      for (const flagId of d.redFlagLinks) {
        expect(_resolveRedFlag(flagId)).not.toBeNull();
      }
    }
  });
});

// ─── Lookup helpers ────────────────────────────────────────────────

describe('Rehab-disciplines registry — lookup helpers', () => {
  it('byId returns the matching entry', () => {
    const first = DISCIPLINES[0];
    expect(byId(first.id)).toBe(first);
  });

  it('byId returns null for an unknown id', () => {
    expect(byId('never.gonna.exist')).toBe(null);
  });

  it('byCode is case-insensitive', () => {
    expect(byCode('pt').code).toBe('PT');
    expect(byCode('PT').code).toBe('PT');
    expect(byCode('Pt').code).toBe('PT');
    expect(byCode('')).toBe(null);
    expect(byCode(null)).toBe(null);
  });

  it('byDomain filters correctly', () => {
    const clinical = byDomain('clinical');
    expect(clinical.length).toBeGreaterThan(0);
    expect(clinical.every(d => d.domain === 'clinical')).toBe(true);
  });

  it('byOwnerRole returns disciplines owned by the given role', () => {
    const cd = byOwnerRole(ROLES.CLINICAL_DIRECTOR);
    expect(cd.length).toBeGreaterThan(0);
    expect(cd.every(d => d.ownerRole === ROLES.CLINICAL_DIRECTOR)).toBe(true);
  });

  it('byLeadRole surfaces discipline-specialist mappings', () => {
    expect(byLeadRole(ROLES.THERAPIST_PT).map(d => d.code)).toContain('PT');
    expect(byLeadRole(ROLES.THERAPIST_OT).map(d => d.code)).toContain('OT');
    expect(byLeadRole(ROLES.THERAPIST_SLP).map(d => d.code)).toContain('SLP');
  });

  it('forAgeBand filters disciplines that serve a given band', () => {
    const early = forAgeBand('early_0_3');
    expect(early.length).toBeGreaterThan(0);
    expect(early.every(d => d.supportedAgeBands.includes('early_0_3'))).toBe(true);
    expect(early.map(d => d.code)).toContain('EI');
  });

  it('forDeliveryMode filters disciplines by mode', () => {
    const home = forDeliveryMode('home_based');
    expect(home.length).toBeGreaterThan(0);
    expect(home.every(d => d.deliveryModes.includes('home_based'))).toBe(true);
  });

  it('withKpi finds disciplines cross-linked to a KPI', () => {
    const linked = withKpi('rehab.outcomes.goal_progress.pct');
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.every(d => d.kpiLinks.includes('rehab.outcomes.goal_progress.pct'))).toBe(true);
  });

  it('withRedFlag finds disciplines cross-linked to a flag', () => {
    const linked = withRedFlag('clinical.progress.regression.significant');
    expect(linked.length).toBeGreaterThan(0);
  });

  it('byCompliance filters by framework tag', () => {
    const cbahi = byCompliance('CBAHI 8.7');
    expect(cbahi.length).toBeGreaterThan(0);
    expect(cbahi.every(d => d.compliance.includes('CBAHI 8.7'))).toBe(true);
  });
});

// ─── Behavior helpers ──────────────────────────────────────────────

describe('Rehab-disciplines registry — recommendedReviewCycleDays()', () => {
  it('returns 90 default when no disciplines supplied', () => {
    expect(recommendedReviewCycleDays()).toBe(90);
    expect(recommendedReviewCycleDays([])).toBe(90);
    expect(recommendedReviewCycleDays(null)).toBe(90);
  });

  it('returns the tightest cadence across the supplied set', () => {
    // Early-intervention (60d) should dominate PT (90d).
    const days = recommendedReviewCycleDays(['rehab.physical_therapy', 'rehab.early_intervention']);
    expect(days).toBe(60);
  });

  it('ignores unknown discipline ids', () => {
    const days = recommendedReviewCycleDays(['rehab.physical_therapy', 'rehab.bogus']);
    expect(days).toBe(90);
  });

  it('falls back to 90 when all supplied ids are unknown', () => {
    expect(recommendedReviewCycleDays(['rehab.bogus'])).toBe(90);
  });
});

describe('Rehab-disciplines registry — suggestInterventions()', () => {
  it('returns the discipline intervention set when the id is known', () => {
    const pt = suggestInterventions('rehab.physical_therapy');
    expect(pt.length).toBeGreaterThan(0);
    expect(pt[0]).toHaveProperty('code');
  });

  it('returns [] for an unknown discipline', () => {
    expect(suggestInterventions('rehab.bogus')).toEqual([]);
  });
});

describe('Rehab-disciplines registry — suggestMeasures()', () => {
  it('returns the discipline measure set when the id is known', () => {
    const slp = suggestMeasures('rehab.speech_language');
    expect(slp.length).toBeGreaterThan(0);
    expect(slp.map(m => m.code)).toContain('CELF-5-AR');
  });

  it('returns [] when a discipline does not support the given age band', () => {
    // Independent Living is adolescent/adult only — 0-3 should be empty.
    expect(suggestMeasures('rehab.independent_living', 'early_0_3')).toEqual([]);
  });

  it('returns the set when the age band is supported', () => {
    const out = suggestMeasures('rehab.early_intervention', 'early_0_3');
    expect(out.length).toBeGreaterThan(0);
  });
});
