'use strict';

/**
 * assessment-insight-wave563.test.js — W563 pure-core unit tests.
 *
 * Locks the deterministic narrative + SMART-goal generation logic. The
 * core is pure (no DB), so all clinical-logic edge cases are tested here;
 * the DB orchestrator is exercised behaviorally in W564.
 *
 * Covers:
 *   • nextBetterBandTarget — direction-aware, band-crossing, best-band→null
 *   • buildNarrative — score/band line, comparison/trend, MCID, at-risk count
 *   • suggestGoals — short-term improvement vs maintenance, domain mapping,
 *     measure-link draft, no-rules → []
 */

const {
  buildNarrative,
  suggestGoals,
  nextBetterBandTarget,
  DOMAIN_BY_CATEGORY,
} = require('../services/assessmentInsight.service');

// PedsQL-shaped (higher_better) bands.
const PEDSQL_RULES = [
  { rangeLabel: 'Good', rangeLabel_ar: 'جيدة', minScore: 81, maxScore: 100, severity: 'normal' },
  {
    rangeLabel: 'Borderline',
    rangeLabel_ar: 'حدّية',
    minScore: 70,
    maxScore: 80.9,
    severity: 'mild',
  },
  {
    rangeLabel: 'Impaired',
    rangeLabel_ar: 'متأثّرة',
    minScore: 0,
    maxScore: 69.9,
    severity: 'moderate',
  },
];
// M-CHAT-shaped (lower_better) bands.
const MCHAT_RULES = [
  {
    rangeLabel: 'Low risk',
    rangeLabel_ar: 'خطر منخفض',
    minScore: 0,
    maxScore: 2,
    severity: 'normal',
  },
  {
    rangeLabel: 'Medium risk',
    rangeLabel_ar: 'خطر متوسط',
    minScore: 3,
    maxScore: 7,
    severity: 'moderate',
  },
  {
    rangeLabel: 'High risk',
    rangeLabel_ar: 'خطر مرتفع',
    minScore: 8,
    maxScore: 20,
    severity: 'severe',
  },
];

describe('W563 — nextBetterBandTarget', () => {
  test('higher_better: an impaired score targets the next band up', () => {
    const t = nextBetterBandTarget(50, 'higher_better', PEDSQL_RULES);
    expect(t.value).toBe(70);
    expect(t.band.rangeLabel).toBe('Borderline');
  });

  test('higher_better: already in the best band → null (maintenance)', () => {
    expect(nextBetterBandTarget(90, 'higher_better', PEDSQL_RULES)).toBeNull();
  });

  test('lower_better: a high-risk score targets the next band down', () => {
    const t = nextBetterBandTarget(15, 'lower_better', MCHAT_RULES);
    expect(t.value).toBe(7);
    expect(t.band.rangeLabel).toBe('Medium risk');
  });

  test('lower_better: already in the best band → null', () => {
    expect(nextBetterBandTarget(1, 'lower_better', MCHAT_RULES)).toBeNull();
  });
});

describe('W563 — buildNarrative', () => {
  const measure = {
    name: 'PedsQL',
    name_ar: 'جودة الحياة',
    abbreviation: 'PedsQL',
    scoringDirection: 'higher_better',
  };

  test('states score + band in both languages', () => {
    const n = buildNarrative({
      measure,
      result: { value: 50, label_ar: 'متأثّرة', label_en: 'Impaired' },
    });
    expect(n.narrative_ar).toContain('50');
    expect(n.narrative_ar).toContain('متأثّرة');
    expect(n.narrative_en).toContain('Impaired');
  });

  test('describes the comparison + MCID significance when present', () => {
    const n = buildNarrative({
      measure,
      result: { value: 60, label_ar: 'متأثّرة', label_en: 'Impaired' },
      comparison: {
        baselineScore: 50,
        changeFromBaseline: 10,
        trend: 'improving',
        isClinicallySignificant: true,
      },
      mcid: { value: 4.4, status: 'provisional' },
    });
    expect(n.narrative_ar).toMatch(/تحسّن/);
    expect(n.narrative_ar).toMatch(/MCID|الدلالة السريرية/);
    expect(n.narrative_en).toMatch(/improving/);
  });

  test('notes at-risk item count + first-administration case', () => {
    const n = buildNarrative({
      measure,
      result: { value: 12, label_ar: 'خطر', label_en: 'High' },
      comparison: { trend: 'insufficient_data' },
      flaggedCount: 9,
    });
    expect(n.narrative_ar).toContain('9');
    expect(n.narrative_ar).toMatch(/أول تطبيق/);
  });
});

describe('W563 — suggestGoals', () => {
  const measureId = '64b0c0000000000000000001';

  test('impaired PedsQL → high-priority short-term improvement goal with band-crossing target', () => {
    const measure = {
      code: 'PEDSQL',
      name: 'PedsQL',
      name_ar: 'جودة الحياة',
      category: 'quality_of_life',
      scoringDirection: 'higher_better',
      scoringRules: PEDSQL_RULES,
      reassessment: { standardIntervalDays: 90 },
      interpretation: { mcid: { value: 4.4, status: 'provisional' } },
    };
    const goals = suggestGoals({ measure, result: { value: 50 }, measureId });
    expect(goals).toHaveLength(1);
    const g = goals[0];
    expect(g.type).toBe('short_term');
    expect(g.domain).toBe(DOMAIN_BY_CATEGORY.quality_of_life);
    expect(g.priority).toBe('high');
    expect(g.target.value).toBe(70);
    expect(g.baseline.value).toBe(50);
    expect(g.measureLinks[0].measureCode).toBe('PEDSQL');
    expect(g.measureLinks[0].targetDirection).toBe('reach_at_least');
    expect(g.timeBound).toMatch(/13 week/); // 90/7 ≈ 13
    expect(g._autoSuggested).toBe(true);
  });

  test('best-band result → maintenance goal (no regression target)', () => {
    const measure = {
      code: 'PEDSQL',
      name: 'PedsQL',
      category: 'quality_of_life',
      scoringDirection: 'higher_better',
      scoringRules: PEDSQL_RULES,
      reassessment: { standardIntervalDays: 90 },
    };
    const goals = suggestGoals({ measure, result: { value: 95 }, measureId });
    expect(goals[0].type).toBe('maintenance');
    expect(goals[0].target.value).toBe(95);
  });

  test('lower_better high-risk → reach_at_most target direction', () => {
    const measure = {
      code: 'M-CHAT-R',
      name: 'M-CHAT-R',
      category: 'screening',
      scoringDirection: 'lower_better',
      scoringRules: MCHAT_RULES,
      reassessment: { standardIntervalDays: 90 },
    };
    const goals = suggestGoals({ measure, result: { value: 15 }, measureId });
    expect(goals[0].target.value).toBe(7);
    expect(goals[0].measureLinks[0].targetDirection).toBe('reach_at_most');
  });

  test('measure with no scoring rules → no suggestions', () => {
    expect(
      suggestGoals({ measure: { code: 'X', scoringRules: [] }, result: { value: 1 } })
    ).toEqual([]);
  });
});
