/**
 * goal-suggestion-service.test.js — Phase 9 Commit 8.
 *
 * Unit tests over services/goalSuggestionService.js. No HTTP, no DB.
 */

'use strict';

const svc = require('../services/goalSuggestionService');
const { DISCIPLINES } = require('../config/rehab-disciplines.registry');

const totalGoalTemplateCount = DISCIPLINES.reduce((s, d) => s + d.goalTemplates.length, 0);

describe('goalSuggestionService — _allTemplates()', () => {
  it('flattens every goal template across disciplines', () => {
    const all = svc._allTemplates();
    expect(all.length).toBe(totalGoalTemplateCount);
    for (const t of all) {
      expect(typeof t.code).toBe('string');
      expect(typeof t._disciplineId).toBe('string');
      expect(Array.isArray(t._supportedAgeBands)).toBe(true);
    }
  });
});

describe('goalSuggestionService — suggestGoalsForContext()', () => {
  it('returns all templates when no filters applied (score 0)', () => {
    const out = svc.suggestGoalsForContext({ limit: 1000 });
    expect(out.evaluated).toBe(totalGoalTemplateCount);
    for (const s of out.suggestions) {
      expect(typeof s.score).toBe('number');
    }
  });

  it('excludes templates listed in existingGoalCodes', () => {
    const anyTemplate = svc._allTemplates()[0];
    const out = svc.suggestGoalsForContext({
      existingGoalCodes: [anyTemplate.code],
      limit: 1000,
    });
    const codes = out.suggestions.map(s => s.code);
    expect(codes).not.toContain(anyTemplate.code);
    expect(out.evaluated).toBe(totalGoalTemplateCount - 1);
  });

  it('ranks templates in active disciplines higher', () => {
    const out = svc.suggestGoalsForContext({
      disciplineIds: ['rehab.speech_language'],
      limit: 100,
    });
    const slpSuggestions = out.suggestions.filter(s => s.discipline.id === 'rehab.speech_language');
    expect(slpSuggestions.length).toBeGreaterThan(0);
    const otherSuggestions = out.suggestions.filter(
      s => s.discipline.id !== 'rehab.speech_language'
    );
    // Every SLP suggestion should out-score every non-SLP suggestion
    for (const slp of slpSuggestions) {
      for (const other of otherSuggestions) {
        expect(slp.score).toBeGreaterThanOrEqual(other.score);
      }
    }
  });

  it('boosts templates whose discipline supports the given age band', () => {
    const out = svc.suggestGoalsForContext({
      ageMonths: 24, // → early_0_3
      limit: 100,
    });
    expect(out.ageBand).toBe('early_0_3');
    const eiSuggestions = out.suggestions.filter(s => s.discipline.code === 'EI');
    expect(eiSuggestions.length).toBeGreaterThan(0);
    for (const s of eiSuggestions) {
      expect(s.reasons).toContain('age_band_match');
    }
  });

  it('combines discipline match + age band for top ranks', () => {
    const out = svc.suggestGoalsForContext({
      disciplineIds: ['rehab.early_intervention'],
      ageMonths: 18,
      limit: 5,
    });
    // Top suggestion should be an EI template with both reasons
    const top = out.suggestions[0];
    expect(top.discipline.code).toBe('EI');
    expect(top.reasons).toContain('active_discipline_match');
    expect(top.reasons).toContain('age_band_match');
  });

  it('limit honours the requested cap', () => {
    const out = svc.suggestGoalsForContext({ limit: 3 });
    expect(out.suggestions.length).toBe(3);
    // But evaluated still reflects the full pool
    expect(out.evaluated).toBe(totalGoalTemplateCount);
  });

  it('ranking is deterministic across calls with same input', () => {
    const a = svc.suggestGoalsForContext({
      disciplineIds: ['rehab.physical_therapy'],
      ageMonths: 60,
      limit: 10,
    });
    const b = svc.suggestGoalsForContext({
      disciplineIds: ['rehab.physical_therapy'],
      ageMonths: 60,
      limit: 10,
    });
    expect(a.suggestions.map(s => s.code)).toEqual(b.suggestions.map(s => s.code));
  });

  it('treats invalid ageMonths as "no age signal"', () => {
    const out = svc.suggestGoalsForContext({ ageMonths: -1, limit: 100 });
    expect(out.ageBand).toBeNull();
    for (const s of out.suggestions) {
      expect(s.reasons).not.toContain('age_band_match');
    }
  });
});

describe('goalSuggestionService — suggestInterventionsForGoal()', () => {
  it('returns interventions sorted by evidence level (A > B > C)', () => {
    const out = svc.suggestInterventionsForGoal({
      disciplineId: 'rehab.physical_therapy',
    });
    expect(out.interventions.length).toBeGreaterThan(0);
    // Scores should be monotonic non-increasing
    for (let i = 0; i < out.interventions.length - 1; i++) {
      expect(out.interventions[i].score).toBeGreaterThanOrEqual(out.interventions[i + 1].score);
    }
  });

  it('returns empty + reason for unknown discipline', () => {
    const out = svc.suggestInterventionsForGoal({ disciplineId: 'rehab.bogus' });
    expect(out.interventions).toEqual([]);
    expect(out.reason).toBe('unknown_discipline');
  });

  it('carries the requested metric back for traceability', () => {
    const out = svc.suggestInterventionsForGoal({
      disciplineId: 'rehab.speech_language',
      metric: 'PERCENTAGE',
    });
    expect(out.forMetric).toBe('PERCENTAGE');
  });
});

describe('goalSuggestionService — draftGoalBundle()', () => {
  it('returns null for unknown templateCode', () => {
    const out = svc.draftGoalBundle({ templateCode: 'NEVER-EXISTS' });
    expect(out).toBeNull();
  });

  it('bundles template + discipline + top interventions + alternatives', () => {
    // Find a real template code to use
    const any = svc._allTemplates()[0];
    const out = svc.draftGoalBundle({ templateCode: any.code, ageMonths: 48 });
    expect(out).not.toBeNull();
    expect(out.template.code).toBe(any.code);
    expect(out.discipline.id).toBe(any._disciplineId);
    expect(out.ageBand).toBe('early_3_6');
    expect(out.topInterventions.length).toBeGreaterThan(0);
    expect(out.topInterventions.length).toBeLessThanOrEqual(3);
    // Alternatives should NOT include the picked template
    expect(out.alternatives.map(a => a.code)).not.toContain(any.code);
  });
});
