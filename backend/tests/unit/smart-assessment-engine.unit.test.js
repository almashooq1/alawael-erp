/**
 * smart-assessment-engine.unit.test.js
 * Unit tests for backend/rehabilitation-services/smart-assessment-engine.js
 * (functions + ScoringAlgorithms — no HTTP/DB)
 */

'use strict';

const {
  ScoringAlgorithms,
  SmartAssessmentEngine,
  analyzeProgressTrend,
  generateSMARTGoals,
  interpretScore,
  calcZScore,
  zToPercentile,
} = require('../../rehabilitation-services/smart-assessment-engine');

// ─────────────────────────────────────────────────────────────────────────────
// ScoringAlgorithms.sumRatings
// ─────────────────────────────────────────────────────────────────────────────

describe('ScoringAlgorithms.sumRatings()', () => {
  const items = [
    { id: 'A', maxScore: 4 },
    { id: 'B', maxScore: 4 },
    { id: 'C', maxScore: 4 },
  ];

  test('sums all provided item scores correctly', () => {
    const result = ScoringAlgorithms.sumRatings({ A: 3, B: 2, C: 4 }, items);
    expect(result.total).toBe(9);
    expect(result.possible).toBe(12);
    expect(result.percent).toBe(75);
  });

  test('treats missing items as null (excluded from sum)', () => {
    const result = ScoringAlgorithms.sumRatings({ A: 2 }, items);
    expect(result.total).toBe(2);
    expect(result.possible).toBe(4); // only A counted
    expect(result.percent).toBe(50);
    expect(result.itemScores.B).toBeNull();
    expect(result.itemScores.C).toBeNull();
  });

  test('returns 0 percent when no items scored', () => {
    const result = ScoringAlgorithms.sumRatings({}, items);
    expect(result.total).toBe(0);
    expect(result.percent).toBe(0);
  });

  test('handles numeric strings in responses', () => {
    const result = ScoringAlgorithms.sumRatings({ A: '3', B: '1', C: '2' }, items);
    expect(result.total).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ScoringAlgorithms.sumByDomain
// ─────────────────────────────────────────────────────────────────────────────

describe('ScoringAlgorithms.sumByDomain()', () => {
  const domains = {
    motor: {
      name_ar: 'الحركة',
      maxScore: 8,
      items: [
        { id: 'M1', maxScore: 4 },
        { id: 'M2', maxScore: 4 },
      ],
    },
    cognitive: {
      name_ar: 'الإدراك',
      maxScore: 6,
      items: [
        { id: 'C1', maxScore: 3 },
        { id: 'C2', maxScore: 3 },
      ],
    },
  };

  test('computes domain sub-scores and grand total', () => {
    const result = ScoringAlgorithms.sumByDomain({ M1: 3, M2: 4, C1: 2, C2: 3 }, domains);
    expect(result.domainScores.motor.score).toBe(7);
    expect(result.domainScores.cognitive.score).toBe(5);
    expect(result.total).toBe(12);
    expect(result.possible).toBe(14);
  });

  test('percent is calculated on grand total', () => {
    const result = ScoringAlgorithms.sumByDomain({ M1: 2, M2: 2, C1: 1, C2: 1 }, domains);
    expect(result.percent).toBe(Math.round((6 / 14) * 100));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ScoringAlgorithms.ordinalClassification
// ─────────────────────────────────────────────────────────────────────────────

describe('ScoringAlgorithms.ordinalClassification()', () => {
  const levels = [
    { level: 1, label_ar: 'مستوى 1', color: '#green' },
    { level: 2, label_ar: 'مستوى 2', color: '#yellow' },
    { level: 3, label_ar: 'مستوى 3', color: '#red' },
  ];

  test('returns correct classification for valid level', () => {
    const result = ScoringAlgorithms.ordinalClassification(2, levels);
    expect(result.level).toBe(2);
    expect(result.isValid).toBe(true);
    expect(result.classification.label_ar).toBe('مستوى 2');
  });

  test('returns isValid=false for out-of-range level', () => {
    const result = ScoringAlgorithms.ordinalClassification(9, levels);
    expect(result.isValid).toBe(false);
    expect(result.classification).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ScoringAlgorithms.binarySum
// ─────────────────────────────────────────────────────────────────────────────

describe('ScoringAlgorithms.binarySum()', () => {
  const items = [{ id: 'Q1' }, { id: 'Q2' }, { id: 'Q3' }];

  test('counts truthy responses as 1', () => {
    const result = ScoringAlgorithms.binarySum({ Q1: 1, Q2: 1, Q3: 0 }, items);
    expect(result.total).toBe(2);
    expect(result.possible).toBe(3);
  });

  test('treats missing as falsy (0)', () => {
    const result = ScoringAlgorithms.binarySum({ Q1: 1 }, items);
    expect(result.total).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// interpretScore
// ─────────────────────────────────────────────────────────────────────────────

describe('interpretScore()', () => {
  const interpretation = [
    { range: [0, 20], label_ar: 'شديد', color: '#red', tier: 'severe' },
    { range: [21, 40], label_ar: 'متوسط', color: '#orange', tier: 'moderate' },
    { range: [41, 56], label_ar: 'خفيف', color: '#green', tier: 'mild' },
  ];

  test('returns correct tier for score in range', () => {
    expect(interpretScore(15, interpretation).tier).toBe('severe');
    expect(interpretScore(30, interpretation).tier).toBe('moderate');
    expect(interpretScore(50, interpretation).tier).toBe('mild');
  });

  test('returns boundary values correctly', () => {
    expect(interpretScore(0, interpretation).tier).toBe('severe');
    expect(interpretScore(20, interpretation).tier).toBe('severe');
    expect(interpretScore(21, interpretation).tier).toBe('moderate');
    expect(interpretScore(56, interpretation).tier).toBe('mild');
  });

  test('returns null for score outside all ranges', () => {
    expect(interpretScore(100, interpretation)).toBeNull();
  });

  test('returns null for null score', () => {
    expect(interpretScore(null, interpretation)).toBeNull();
  });

  test('returns null for empty interpretation array', () => {
    expect(interpretScore(30, [])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcZScore and zToPercentile
// ─────────────────────────────────────────────────────────────────────────────

describe('calcZScore()', () => {
  test('z = 0 when observed equals mean', () => {
    expect(calcZScore(50, 50, 10)).toBe(0);
  });

  test('positive z when observed > mean', () => {
    expect(calcZScore(60, 50, 10)).toBe(1);
  });

  test('negative z when observed < mean', () => {
    expect(calcZScore(40, 50, 10)).toBe(-1);
  });

  test('returns null when sd=0', () => {
    expect(calcZScore(50, 50, 0)).toBeNull();
  });
});

describe('zToPercentile()', () => {
  test('z=0 → ~50th percentile', () => {
    const p = zToPercentile(0);
    expect(p).toBeGreaterThanOrEqual(48);
    expect(p).toBeLessThanOrEqual(52);
  });

  test('z=1.96 → ~97-98th percentile', () => {
    const p = zToPercentile(1.96);
    expect(p).toBeGreaterThanOrEqual(95);
  });

  test('z=-1.96 → ~2-3rd percentile', () => {
    const p = zToPercentile(-1.96);
    expect(p).toBeLessThanOrEqual(5);
  });

  test('returns null for null input', () => {
    expect(zToPercentile(null)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeProgressTrend
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeProgressTrend()', () => {
  test('returns insufficient_data for fewer than 2 points', () => {
    expect(analyzeProgressTrend([], 56).trend).toBe('insufficient_data');
    expect(analyzeProgressTrend([{ date: '2024-01-01', score: 30 }], 56).trend).toBe(
      'insufficient_data'
    );
  });

  test('detects improving trend with rising scores', () => {
    const history = [
      { date: '2024-01-01', score: 20 },
      { date: '2024-02-01', score: 30 },
      { date: '2024-03-01', score: 40 },
      { date: '2024-04-01', score: 50 },
    ];
    const result = analyzeProgressTrend(history, 56);
    expect(result.trend).toBe('improving');
    expect(result.changePercent).toBeGreaterThan(0);
  });

  test('detects declining trend with falling scores', () => {
    const history = [
      { date: '2024-01-01', score: 50 },
      { date: '2024-02-01', score: 40 },
      { date: '2024-03-01', score: 30 },
      { date: '2024-04-01', score: 20 },
    ];
    const result = analyzeProgressTrend(history, 56);
    expect(result.trend).toBe('declining');
  });

  test('detects stable trend for flat scores', () => {
    const history = [
      { date: '2024-01-01', score: 35 },
      { date: '2024-02-01', score: 36 },
      { date: '2024-03-01', score: 35 },
      { date: '2024-04-01', score: 36 },
    ];
    const result = analyzeProgressTrend(history, 56);
    expect(result.trend).toBe('stable');
  });

  test('sorts history by date regardless of input order', () => {
    const history = [
      { date: '2024-04-01', score: 50 },
      { date: '2024-01-01', score: 20 },
      { date: '2024-03-01', score: 40 },
      { date: '2024-02-01', score: 30 },
    ];
    const result = analyzeProgressTrend(history, 56);
    expect(result.dataPoints[0].score).toBe(20);
    expect(result.dataPoints[3].score).toBe(50);
    expect(result.trend).toBe('improving');
  });

  test('returns assessmentCount matching input length', () => {
    const history = [
      { date: '2024-01-01', score: 10 },
      { date: '2024-06-01', score: 20 },
      { date: '2024-12-01', score: 30 },
    ];
    expect(analyzeProgressTrend(history, 56).assessmentCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateSMARTGoals
// ─────────────────────────────────────────────────────────────────────────────

describe('generateSMARTGoals()', () => {
  test('returns array for a known measure + tier', () => {
    // GMFCS templates exist in the engine
    const goals = generateSMARTGoals('GMFCS', 1);
    expect(Array.isArray(goals)).toBe(true);
  });

  test('returns empty array for unknown measure', () => {
    expect(generateSMARTGoals('TOTALLY_UNKNOWN_MEASURE', 'severe')).toEqual([]);
  });

  test('child <5 gets shortened timeframes when templates exist', () => {
    const standard = generateSMARTGoals('GMFCS', 1);
    const child = generateSMARTGoals('GMFCS', 1, { age: 3 });
    // If templates exist the child version should not contain "خلال 3 أشهر"
    if (standard.length > 0) {
      const hasStandard3months = standard.some(g => g.includes('خلال 3 أشهر'));
      const hasChild3months = child.some(g => g.includes('خلال 3 أشهر'));
      if (hasStandard3months) {
        expect(hasChild3months).toBe(false);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SmartAssessmentEngine.score — integration smoke tests (no DB/HTTP)
// ─────────────────────────────────────────────────────────────────────────────

describe('SmartAssessmentEngine.score()', () => {
  let engine;
  beforeEach(() => {
    engine = new SmartAssessmentEngine();
  });

  test('returns error object for unknown measure key', () => {
    const result = engine.score('UNKNOWN_XYZ', {});
    expect(result).toHaveProperty('error');
  });

  test('scores GMFCS ordinal classification level 2', () => {
    const result = engine.score('GMFCS', { level: 2 });
    expect(result).not.toHaveProperty('error');
    expect(result).toHaveProperty('measureKey', 'GMFCS');
  });

  test('scores FIM with full domain responses', () => {
    const responses = {
      FC_EAT: 5,
      FC_GROOM: 5,
      FC_BATH: 4,
      FC_DRESS_UP: 4,
      FC_DRESS_LO: 4,
      FC_TOILET: 5,
      FC_BLADDER: 6,
      FC_BOWEL: 6,
      FC_TR_BED: 5,
      FC_TR_TOILET: 5,
      FC_TR_TUB: 4,
      FC_WALK: 5,
      FC_STAIRS: 4,
      FC_COMP: 6,
      FC_EXPR: 6,
      FC_SOCIAL: 6,
      FC_PROBLEM: 5,
      FC_MEMORY: 5,
    };
    const result = engine.score('FIM', responses);
    expect(result).not.toHaveProperty('error');
    expect(result.rawScore).toBeGreaterThan(18);
    expect(result.rawScore).toBeLessThanOrEqual(126);
  });

  test('FIM score is within valid range [18, 126]', () => {
    // Minimum possible: all 1s
    const minResponses = {
      FC_EAT: 1,
      FC_GROOM: 1,
      FC_BATH: 1,
      FC_DRESS_UP: 1,
      FC_DRESS_LO: 1,
      FC_TOILET: 1,
      FC_BLADDER: 1,
      FC_BOWEL: 1,
      FC_TR_BED: 1,
      FC_TR_TOILET: 1,
      FC_TR_TUB: 1,
      FC_WALK: 1,
      FC_STAIRS: 1,
      FC_COMP: 1,
      FC_EXPR: 1,
      FC_SOCIAL: 1,
      FC_PROBLEM: 1,
      FC_MEMORY: 1,
    };
    const result = engine.score('FIM', minResponses);
    expect(result.rawScore).toBe(18);
  });
});
