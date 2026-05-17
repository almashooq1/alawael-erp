'use strict';
/**
 * Unit tests — rehab-program-templates.js
 * Pure catalog + logic tests, no HTTP/DB.
 */

const {
  PROGRAM_TEMPLATES,
  ACTIVITY_BANKS,
  matchProgramTemplates,
  buildCustomPlan,
  listTemplates,
  getTemplate,
} = require('../../rehabilitation-services/rehab-program-templates');

// ─────────────────────────────────────────────────────────────────────────────
describe('PROGRAM_TEMPLATES catalog', () => {
  const keys = Object.keys(PROGRAM_TEMPLATES);

  it('contains at least 7 templates', () => {
    expect(keys.length).toBeGreaterThanOrEqual(7);
  });

  it('every template has id, name_ar, diagnosis, durationWeeks, sessionsPerWeek', () => {
    for (const [key, tpl] of Object.entries(PROGRAM_TEMPLATES)) {
      expect(tpl).toHaveProperty('id', expect.any(String));
      expect(tpl).toHaveProperty('name_ar', expect.any(String));
      expect(Array.isArray(tpl.diagnosis)).toBe(true);
      expect(tpl.diagnosis.length).toBeGreaterThan(0);
      expect(typeof tpl.durationWeeks).toBe('number');
      expect(tpl).toHaveProperty('sessionsPerWeek');
      expect(typeof tpl.sessionsPerWeek.min).toBe('number');
      expect(typeof tpl.sessionsPerWeek.max).toBe('number');
      // sessionsPerWeek min <= max
      expect(tpl.sessionsPerWeek.min).toBeLessThanOrEqual(tpl.sessionsPerWeek.max);
      // context: key used in test = ${key}
      void key;
    }
  });

  it('known template keys exist: CP_GMFCS_1_2, ASD_EARLY_INTENSIVE, SCI_REHAB', () => {
    expect(PROGRAM_TEMPLATES).toHaveProperty('CP_GMFCS_1_2');
    expect(PROGRAM_TEMPLATES).toHaveProperty('ASD_EARLY_INTENSIVE');
    expect(PROGRAM_TEMPLATES).toHaveProperty('SCI_REHAB');
  });

  it('CP_GMFCS_1_2 targets شلل دماغي diagnosis', () => {
    expect(PROGRAM_TEMPLATES.CP_GMFCS_1_2.diagnosis).toContain('شلل دماغي');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ACTIVITY_BANKS catalog', () => {
  it('physioTherapy bank exists with at least one sub-bank', () => {
    expect(ACTIVITY_BANKS).toHaveProperty('physioTherapy');
    const subBanks = Object.keys(ACTIVITY_BANKS.physioTherapy);
    expect(subBanks.length).toBeGreaterThan(0);
  });

  it('each activity has id and name_ar', () => {
    for (const bank of Object.values(ACTIVITY_BANKS)) {
      for (const activities of Object.values(bank)) {
        for (const act of activities) {
          expect(typeof act.id).toBe('string');
          expect(typeof act.name_ar).toBe('string');
        }
      }
    }
  });

  it('activity IDs within a bank are unique', () => {
    for (const [bankName, bank] of Object.entries(ACTIVITY_BANKS)) {
      const ids = Object.values(bank)
        .flat()
        .map(a => a.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length); // context: ${bankName}
      void bankName;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('listTemplates()', () => {
  it('returns an array with the same count as PROGRAM_TEMPLATES', () => {
    const list = listTemplates();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(Object.keys(PROGRAM_TEMPLATES).length);
  });

  it('each summary entry has key, name_ar, durationWeeks, goalsCount', () => {
    const list = listTemplates();
    for (const entry of list) {
      expect(typeof entry.key).toBe('string');
      expect(typeof entry.name_ar).toBe('string');
      expect(typeof entry.durationWeeks).toBe('number');
      expect(typeof entry.goalsCount).toBe('number');
    }
  });

  it('does NOT include full sessionPlan (lightweight view)', () => {
    const list = listTemplates();
    for (const entry of list) {
      expect(entry).not.toHaveProperty('sessionPlan');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getTemplate()', () => {
  it('returns full template for known key', () => {
    const tpl = getTemplate('CP_GMFCS_1_2');
    expect(tpl).not.toBeNull();
    expect(tpl.id).toBeDefined();
    expect(tpl.name_ar).toBeDefined();
  });

  it('returns null for unknown key', () => {
    expect(getTemplate('NONEXISTENT_KEY')).toBeNull();
  });

  it('CP_GMFCS_1_2 has sessionPlan with phases', () => {
    const tpl = getTemplate('CP_GMFCS_1_2');
    expect(tpl.sessionPlan).toBeDefined();
    expect(Object.keys(tpl.sessionPlan).length).toBeGreaterThan(0);
  });

  it('SCI_REHAB template has goals array', () => {
    const tpl = getTemplate('SCI_REHAB');
    expect(Array.isArray(tpl.goals)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('matchProgramTemplates()', () => {
  it('returns array', () => {
    const results = matchProgramTemplates({ diagnosis: 'شلل دماغي', age: 6 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('matches CP templates for شلل دماغي diagnosis', () => {
    const results = matchProgramTemplates({ diagnosis: 'شلل دماغي', age: 6 });
    expect(results.length).toBeGreaterThan(0);
    const keys = results.map(r => r.key);
    expect(keys.some(k => k.startsWith('CP_'))).toBe(true);
  });

  it('each result has key, template, score properties', () => {
    const results = matchProgramTemplates({ diagnosis: 'شلل دماغي', age: 6 });
    for (const r of results) {
      expect(typeof r.key).toBe('string');
      expect(typeof r.score).toBe('number');
      expect(r.template).toBeDefined();
    }
  });

  it('returns empty for completely unrelated diagnosis', () => {
    const results = matchProgramTemplates({ diagnosis: 'diagnosis_xyz_unknown_99', age: 6 });
    expect(results).toHaveLength(0);
  });

  it('CP_GMFCS_1_2 scores higher than CP_GMFCS_3_4 when functionalLevel is GMFCS_1', () => {
    const results = matchProgramTemplates({
      diagnosis: 'شلل دماغي',
      age: 6,
      functionalLevel: 'GMFCS_1',
    });
    const cp12 = results.find(r => r.key === 'CP_GMFCS_1_2');
    const cp34 = results.find(r => r.key === 'CP_GMFCS_3_4');
    expect(cp12).toBeDefined();
    expect(cp34).toBeDefined();
    expect(cp12.score).toBeGreaterThan(cp34.score);
  });

  it('results are sorted by score descending', () => {
    const results = matchProgramTemplates({ diagnosis: 'شلل دماغي', age: 6 });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('ASD_EARLY_INTENSIVE matches for اضطراب طيف التوحد + young child', () => {
    const results = matchProgramTemplates({ diagnosis: 'اضطراب طيف التوحد', age: 3 });
    const keys = results.map(r => r.key);
    expect(keys).toContain('ASD_EARLY_INTENSIVE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('buildCustomPlan()', () => {
  const beneficiary = { name_ar: 'أحمد محمد', age: 8, diagnosis: 'شلل دماغي' };

  it('returns error object for unknown template key', () => {
    const result = buildCustomPlan('UNKNOWN_KEY', beneficiary);
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });

  it('returns a plan object with all expected top-level keys', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    expect(plan).not.toHaveProperty('error');
    expect(plan).toHaveProperty('templateKey', 'CP_GMFCS_1_2');
    expect(plan).toHaveProperty('template');
    expect(plan).toHaveProperty('beneficiary');
    expect(plan).toHaveProperty('startDate');
    expect(plan).toHaveProperty('endDate');
    expect(plan).toHaveProperty('goals');
    expect(plan).toHaveProperty('phases');
    expect(plan).toHaveProperty('totalEstimatedSessions');
  });

  it('phases is an array with at least one phase', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    expect(Array.isArray(plan.phases)).toBe(true);
    expect(plan.phases.length).toBeGreaterThan(0);
  });

  it('each phase has activitiesDetail array', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    for (const phase of plan.phases) {
      expect(Array.isArray(phase.activitiesDetail)).toBe(true);
    }
  });

  it('endDate is after startDate', () => {
    const start = new Date('2026-01-01');
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary, start);
    expect(new Date(plan.endDate).getTime()).toBeGreaterThan(new Date(plan.startDate).getTime());
  });

  it('startDate defaults to today when not provided', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    const today = new Date().toISOString().split('T')[0];
    expect(plan.startDate).toBe(today);
  });

  it('totalEstimatedSessions equals durationWeeks * avgSessionsPerWeek', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    const tpl = getTemplate('CP_GMFCS_1_2');
    const avgSessions = (tpl.sessionsPerWeek.min + tpl.sessionsPerWeek.max) / 2;
    const expected = tpl.durationWeeks * avgSessions;
    expect(plan.totalEstimatedSessions).toBe(expected);
  });

  it('beneficiary is echoed back into the plan', () => {
    const plan = buildCustomPlan('CP_GMFCS_1_2', beneficiary);
    expect(plan.beneficiary).toEqual(beneficiary);
  });
});
