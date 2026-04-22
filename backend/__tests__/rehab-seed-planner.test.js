/**
 * rehab-seed-planner.test.js — Phase 9 Commit 6.
 *
 * Unit tests over services/rehabSeedPlanner.js. No DB, no CLI output —
 * just verifies the plan shape + dedup + legacy-category mapping.
 */

'use strict';

const planner = require('../services/rehabSeedPlanner');
const { DISCIPLINES } = require('../config/rehab-disciplines.registry');

describe('rehabSeedPlanner — buildMeasurePlan()', () => {
  it('dedupes measures by code and tracks all referencing disciplines', () => {
    const plan = planner.buildMeasurePlan();
    expect(plan.total).toBeGreaterThan(0);
    expect(plan.totalReferences).toBeGreaterThanOrEqual(plan.total);
    // VINELAND-3 shows up under LS, IL, ABA
    const vineland = plan.uniqueMeasures.find(m => m.code === 'VINELAND-3');
    expect(vineland).toBeDefined();
    expect(vineland.disciplineCodes.length).toBeGreaterThan(1);
  });

  it('every unique measure carries code + nameEn + standardBody + instrumentType', () => {
    const plan = planner.buildMeasurePlan();
    for (const m of plan.uniqueMeasures) {
      expect(typeof m.code).toBe('string');
      expect(typeof m.nameEn).toBe('string');
      expect(typeof m.standardBody).toBe('string');
      expect(typeof m.instrumentType).toBe('string');
      expect(Array.isArray(m.disciplines)).toBe(true);
      expect(m.disciplines.length).toBeGreaterThan(0);
    }
  });

  it('total references equals the sum of recommendedMeasures across disciplines', () => {
    const plan = planner.buildMeasurePlan();
    const expected = DISCIPLINES.reduce((s, d) => s + d.recommendedMeasures.length, 0);
    expect(plan.totalReferences).toBe(expected);
  });
});

describe('rehabSeedPlanner — buildProgramPlan()', () => {
  it('errors when branchId is missing', () => {
    const p = planner.buildProgramPlan();
    expect(p.error).toBeDefined();
    expect(p.programs).toEqual([]);
  });

  it('errors when branchId is empty string', () => {
    const p = planner.buildProgramPlan({ branchId: '' });
    expect(p.error).toBeDefined();
  });

  it('produces one program per template with branchId stamped on each', () => {
    const p = planner.buildProgramPlan({ branchId: 'branch-001' });
    expect(p.total).toBeGreaterThan(0);
    const expectedTotal = DISCIPLINES.reduce((s, d) => s + d.programTemplates.length, 0);
    expect(p.total).toBe(expectedTotal);
    for (const pr of p.programs) {
      expect(pr.branchId).toBe('branch-001');
      expect(typeof pr.code).toBe('string');
      expect(typeof pr.disciplineId).toBe('string');
      expect(typeof pr.deliveryMode).toBe('string');
      expect(typeof pr.legacyCategory).toBe('string');
    }
  });
});

describe('rehabSeedPlanner — disciplineToLegacyCategory()', () => {
  it('maps the clinical therapies to their legacy-enum match', () => {
    const pt = DISCIPLINES.find(d => d.code === 'PT');
    const ot = DISCIPLINES.find(d => d.code === 'OT');
    const slp = DISCIPLINES.find(d => d.code === 'SLP');
    expect(planner._disciplineToLegacyCategory(pt)).toBe('physical');
    expect(planner._disciplineToLegacyCategory(ot)).toBe('occupational');
    expect(planner._disciplineToLegacyCategory(slp)).toBe('speech');
  });

  it('maps behavioral/psychosocial to behavioral', () => {
    const aba = DISCIPLINES.find(d => d.code === 'ABA');
    const psy = DISCIPLINES.find(d => d.code === 'PSY');
    expect(planner._disciplineToLegacyCategory(aba)).toBe('behavioral');
    expect(planner._disciplineToLegacyCategory(psy)).toBe('behavioral');
  });

  it('maps independent-living to vocational', () => {
    const il = DISCIPLINES.find(d => d.code === 'IL');
    expect(planner._disciplineToLegacyCategory(il)).toBe('vocational');
  });

  it('maps academic and life-skills to educational', () => {
    const acad = DISCIPLINES.find(d => d.code === 'ACAD');
    const ls = DISCIPLINES.find(d => d.code === 'LS');
    expect(planner._disciplineToLegacyCategory(acad)).toBe('educational');
    expect(planner._disciplineToLegacyCategory(ls)).toBe('educational');
  });

  it('every mapping returns a valid legacy enum value', () => {
    const legacyEnum = new Set([
      'physical',
      'cognitive',
      'occupational',
      'speech',
      'behavioral',
      'educational',
      'vocational',
    ]);
    for (const d of DISCIPLINES) {
      expect(legacyEnum.has(planner._disciplineToLegacyCategory(d))).toBe(true);
    }
  });
});

describe('rehabSeedPlanner — buildInterventionPlan()', () => {
  it('returns every intervention with its disciplines', () => {
    const plan = planner.buildInterventionPlan();
    expect(plan.total).toBeGreaterThan(0);
    const expected = DISCIPLINES.reduce((s, d) => s + d.recommendedInterventions.length, 0);
    expect(plan.totalReferences).toBe(expected);
    for (const iv of plan.uniqueInterventions) {
      expect(typeof iv.code).toBe('string');
      expect(typeof iv.technique).toBe('string');
      expect(Array.isArray(iv.disciplines)).toBe(true);
    }
  });
});

describe('rehabSeedPlanner — buildGoalTemplatePlan()', () => {
  it('does NOT dedupe goal templates (each discipline keeps its own)', () => {
    const plan = planner.buildGoalTemplatePlan();
    const expected = DISCIPLINES.reduce((s, d) => s + d.goalTemplates.length, 0);
    expect(plan.total).toBe(expected);
  });

  it('byDiscipline rollup sums to total', () => {
    const plan = planner.buildGoalTemplatePlan();
    const sum = plan.byDiscipline.reduce((s, r) => s + r.count, 0);
    expect(sum).toBe(plan.total);
  });

  it('every template carries SMART-shaped fields', () => {
    const plan = planner.buildGoalTemplatePlan();
    for (const g of plan.templates) {
      expect(typeof g.metric).toBe('string');
      expect(typeof g.unit).toBe('string');
      expect(typeof g.baseline).toBe('number');
      expect(typeof g.target).toBe('number');
      expect(typeof g.masteryCriteria).toBe('string');
    }
  });
});

describe('rehabSeedPlanner — buildFullPlan()', () => {
  it('aggregates all four sub-plans + generatedAt stamp', () => {
    const p = planner.buildFullPlan({ branchId: 'b-xyz' });
    expect(typeof p.generatedAt).toBe('string');
    expect(p.disciplines.total).toBe(DISCIPLINES.length);
    expect(p.measures.total).toBeGreaterThan(0);
    expect(p.interventions.total).toBeGreaterThan(0);
    expect(p.goalTemplates.total).toBeGreaterThan(0);
    expect(p.programs.total).toBeGreaterThan(0);
    expect(p.programs.branchId).toBe('b-xyz');
  });

  it('omits program computation when no branchId is supplied', () => {
    const p = planner.buildFullPlan();
    expect(p.programs.note).toBeDefined();
    expect(p.programs.programs).toBeUndefined();
  });
});
