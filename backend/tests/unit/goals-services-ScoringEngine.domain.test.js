/**
 * Unit tests for domains/goals/services/ScoringEngine.js
 * Tests pure computation methods — no DB required.
 */
'use strict';

jest.mock('mongoose', () => ({ model: jest.fn() }));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { ScoringEngine, scoringEngine } = require('../../domains/goals/services/ScoringEngine');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const simpleMeasure = {
  domains: [
    { key: 'motor', name: 'Motor', weight: 2 },
    { key: 'cognitive', name: 'Cognitive', weight: 1 },
  ],
  scoringRules: [
    {
      minScore: 0,
      maxScore: 40,
      interpretation: 'Severe',
      interpretation_ar: 'شديد',
      severity: 'severe',
      rangeLabel: '0-40',
      color: 'red',
    },
    {
      minScore: 41,
      maxScore: 80,
      interpretation: 'Moderate',
      interpretation_ar: 'متوسط',
      severity: 'moderate',
      rangeLabel: '41-80',
      color: 'yellow',
    },
    {
      minScore: 81,
      maxScore: 120,
      interpretation: 'Mild',
      interpretation_ar: 'خفيف',
      severity: 'mild',
      rangeLabel: '81-120',
      color: 'green',
    },
  ],
  scoringDirection: 'higher_better',
  psychometrics: { mcid: 10, sem: 3 },
};

const noRuleMeasure = { domains: [], scoringRules: [] };

// ─── Module exports ───────────────────────────────────────────────────────────

describe('ScoringEngine module exports', () => {
  test('exports ScoringEngine class', () => {
    expect(typeof ScoringEngine).toBe('function');
  });
  test('exports scoringEngine singleton', () => {
    expect(scoringEngine).toBeInstanceOf(ScoringEngine);
  });
});

// ─── scoreApplication ─────────────────────────────────────────────────────────

describe('ScoringEngine.scoreApplication()', () => {
  test('returns totalRawScore as sum of all domain rawScores', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, [
      { domainKey: 'motor', rawScore: 30 },
      { domainKey: 'cognitive', rawScore: 20 },
    ]);
    expect(result.totalRawScore).toBe(50);
    expect(result.isAutoScored).toBe(true);
  });

  test('computes composite score weighted by domain weight', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, [
      { domainKey: 'motor', rawScore: 60 }, // weight 2
      { domainKey: 'cognitive', rawScore: 30 }, // weight 1
    ]);
    // weighted = (60*2 + 30*1) / (2+1) = 150/3 = 50
    expect(result.compositeScore).toBeCloseTo(50, 1);
  });

  test('sums itemScores when provided', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, [
      { domainKey: 'motor', rawScore: 0, itemScores: [{ rawScore: 10 }, { rawScore: 15 }] },
    ]);
    expect(result.domainScores[0].rawScore).toBe(25);
  });

  test('returns correct interpretation for score in range', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, [
      { domainKey: 'motor', rawScore: 50 },
    ]);
    expect(result.overallInterpretation).toBe('Moderate');
    expect(result.overallSeverity).toBe('moderate');
  });

  test('returns null interpretation when no scoringRules', () => {
    const result = scoringEngine.scoreApplication(noRuleMeasure, [
      { domainKey: 'x', rawScore: 10 },
    ]);
    expect(result.overallInterpretation).toBeNull();
  });

  test('handles unknown domainKey gracefully', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, [
      { domainKey: 'unknown', rawScore: 5 },
    ]);
    expect(result.domainScores[0].domainName).toBe('unknown');
  });

  test('handles empty domainScores array', () => {
    const result = scoringEngine.scoreApplication(simpleMeasure, []);
    expect(result.totalRawScore).toBe(0);
    expect(result.compositeScore).toBe(0);
  });
});

// ─── computeComparison ───────────────────────────────────────────────────────

describe('ScoringEngine.computeComparison()', () => {
  const makeApp = (score, date, purpose = 'progress', status = 'completed') => ({
    totalRawScore: score,
    applicationDate: new Date(date),
    purpose,
    status,
  });

  test('sets baselineScore from first completed application', () => {
    const current = makeApp(70, '2024-06-01');
    const history = [makeApp(40, '2024-01-01', 'baseline'), makeApp(55, '2024-03-01')];
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, null);
    expect(result.baselineScore).toBe(40);
    expect(result.changeFromBaseline).toBe(30);
  });

  test('sets previousScore from last completed before current', () => {
    const current = makeApp(70, '2024-06-01');
    const history = [makeApp(40, '2024-01-01'), makeApp(55, '2024-03-01')];
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, null);
    expect(result.previousScore).toBe(55);
    expect(result.changeFromPrevious).toBe(15);
  });

  test('computes progressToTarget when targetScore provided', () => {
    const current = makeApp(70, '2024-06-01');
    const history = [makeApp(40, '2024-01-01', 'baseline')];
    // baseline=40, target=100, current=70 → progress = (70-40)/(100-40)*100 = 50%
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, 100);
    expect(result.progressToTarget).toBe(50);
  });

  test('isClinicallySignificant when change >= mcid', () => {
    const current = makeApp(60, '2024-06-01');
    const history = [makeApp(40, '2024-01-01', 'baseline')];
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, null);
    // change=20, mcid=10, direction=higher_better → significant
    expect(result.isClinicallySignificant).toBe(true);
  });

  test('not significant when change < mcid', () => {
    const current = makeApp(45, '2024-06-01');
    const history = [makeApp(40, '2024-01-01', 'baseline')];
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, null);
    // change=5, mcid=10 → not significant
    expect(result.isClinicallySignificant).toBe(false);
  });

  test('returns insufficient_data trend when history empty', () => {
    const current = makeApp(60, '2024-06-01');
    const result = scoringEngine.computeComparison(current, [], simpleMeasure, null);
    expect(result.trend).toBe('insufficient_data');
  });

  test('returns null change values when no history', () => {
    const current = makeApp(60, '2024-06-01');
    const result = scoringEngine.computeComparison(current, [], simpleMeasure, null);
    expect(result.baselineScore).toBeNull();
    expect(result.previousScore).toBeNull();
    expect(result.changeFromBaseline).toBeNull();
  });

  test('computes changeFromBaselinePercent', () => {
    const current = makeApp(80, '2024-06-01');
    const history = [makeApp(40, '2024-01-01', 'baseline')];
    const result = scoringEngine.computeComparison(current, history, simpleMeasure, null);
    expect(result.changeFromBaselinePercent).toBe(100); // (80-40)/40 * 100
  });
});

// ─── calculateNextApplicationDate ────────────────────────────────────────────

describe('ScoringEngine.calculateNextApplicationDate()', () => {
  const baseDate = new Date('2024-01-01');

  test.each([
    ['baseline', 90],
    ['progress', 90],
    ['screening', 180],
    ['research', 30],
  ])('purpose "%s" → interval %d days', (purpose, expectedDays) => {
    const { intervalDays, nextDate } = scoringEngine.calculateNextApplicationDate(
      simpleMeasure,
      purpose,
      baseDate
    );
    expect(intervalDays).toBe(expectedDays);
    const diff = Math.round((nextDate - baseDate) / 86400000);
    expect(diff).toBe(expectedDays);
  });

  test('discharge purpose returns null nextDate', () => {
    const { nextDate, intervalDays } = scoringEngine.calculateNextApplicationDate(
      simpleMeasure,
      'discharge',
      baseDate
    );
    expect(nextDate).toBeNull();
    expect(intervalDays).toBeNull();
  });

  test('unknown purpose defaults to 90 days', () => {
    const { intervalDays } = scoringEngine.calculateNextApplicationDate(
      simpleMeasure,
      'unknown_purpose',
      baseDate
    );
    expect(intervalDays).toBe(90);
  });
});

// ─── _calculateTrend (via computeComparison) ─────────────────────────────────

describe('ScoringEngine._calculateTrend()', () => {
  const makeCmpl = score => ({ totalRawScore: score, status: 'completed' });

  test('returns "improving" for ascending scores (higher_better)', () => {
    const history = [makeCmpl(40), makeCmpl(50), makeCmpl(60), makeCmpl(70)];
    const trend = scoringEngine._calculateTrend(history, simpleMeasure);
    expect(trend).toBe('improving');
  });

  test('returns "declining" for descending scores (higher_better)', () => {
    const history = [makeCmpl(80), makeCmpl(70), makeCmpl(60), makeCmpl(50)];
    const trend = scoringEngine._calculateTrend(history, simpleMeasure);
    expect(trend).toBe('declining');
  });

  test('returns "stable" for flat scores', () => {
    const history = [makeCmpl(50), makeCmpl(50), makeCmpl(50), makeCmpl(50)];
    const trend = scoringEngine._calculateTrend(history, simpleMeasure);
    expect(trend).toBe('stable');
  });

  test('returns "insufficient_data" for single point', () => {
    const trend = scoringEngine._calculateTrend([makeCmpl(50)], simpleMeasure);
    expect(trend).toBe('insufficient_data');
  });

  test('inverts for lower_better measures', () => {
    const lowerBetterMeasure = {
      ...simpleMeasure,
      scoringDirection: 'lower_better',
      psychometrics: { sem: 1 },
    };
    // Descending scores = improving for lower_better
    const history = [makeCmpl(80), makeCmpl(70), makeCmpl(60), makeCmpl(50)];
    const trend = scoringEngine._calculateTrend(history, lowerBetterMeasure);
    expect(trend).toBe('improving');
  });
});

// ─── _interpretTotalScore ────────────────────────────────────────────────────

describe('ScoringEngine._interpretTotalScore()', () => {
  test('returns matched rule interpretation', () => {
    const result = scoringEngine._interpretTotalScore(simpleMeasure, 25);
    expect(result.overallInterpretation).toBe('Severe');
    expect(result.overallSeverity).toBe('severe');
    expect(result.matchedRule.color).toBe('red');
  });

  test('returns null fields when no rules match', () => {
    const result = scoringEngine._interpretTotalScore(simpleMeasure, 999);
    expect(result.overallInterpretation).toBeNull();
  });

  test('returns null fields when scoringRules is empty', () => {
    const result = scoringEngine._interpretTotalScore(noRuleMeasure, 50);
    expect(result.overallInterpretation).toBeNull();
  });
});
