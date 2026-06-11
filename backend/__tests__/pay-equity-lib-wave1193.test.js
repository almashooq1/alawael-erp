/**
 * W1193 — pure-function unit tests for intelligence/pay-equity.lib.
 * No DB, no mongoose. Locks the statistics + the privacy/explainability rules
 * that make the numbers defensible in a compliance conversation.
 */

'use strict';

const lib = require('../intelligence/pay-equity.lib');

const row = (gender, nationality, salary, department = 'PT', jobTitle = 'Therapist') => ({
  gender,
  nationality,
  salary,
  department,
  jobTitle,
});

describe('W1193 pay-equity.lib — central tendency', () => {
  test('median (odd + even) and mean', () => {
    expect(lib.median([3, 1, 2])).toBe(2);
    expect(lib.median([1, 2, 3, 4])).toBe(2.5);
    expect(lib.mean([2, 4, 6])).toBe(4);
  });
  test('null on empty / all-invalid input (never NaN)', () => {
    expect(lib.median([])).toBeNull();
    expect(lib.mean([])).toBeNull();
    expect(lib.median([-5, 'x', null])).toBeNull();
  });
});

describe('W1193 pay-equity.lib — two-group gap', () => {
  const rows = [
    row('male', 'SA', 10000),
    row('male', 'SA', 11000),
    row('male', 'EG', 12000),
    row('female', 'SA', 8000),
    row('female', 'SA', 8500),
    row('female', 'SA', 9000),
  ];

  test('gender gap: female disadvantaged, correct median %', () => {
    const g = lib.computeGenderGap(rows);
    expect(g.reportable).toBe(true);
    expect(g.maleMedian).toBe(11000);
    expect(g.femaleMedian).toBe(8500);
    expect(g.medianGapPct).toBeCloseTo(22.73, 1); // (11000-8500)/11000
    expect(g.direction).toBe('female');
  });

  test('PRIVACY guard: a group below MIN_GROUP is not reportable', () => {
    const tiny = [row('male', 'SA', 10000), row('male', 'SA', 11000), row('female', 'SA', 8000)];
    const g = lib.computeGenderGap(tiny); // 2 male, 1 female
    expect(g.reportable).toBe(false);
    expect(g.medianGapPct).toBeNull();
    expect(g.direction).toBeNull();
  });

  test('nationality gap: Saudi vs non-Saudi classification (case-insensitive)', () => {
    const natRows = [
      row('male', 'SA', 9000),
      row('male', 'saudi', 9500),
      row('female', 'KSA', 10000),
      row('male', 'EG', 12000),
      row('female', 'PH', 12500),
      row('male', 'IN', 13000),
    ];
    const g = lib.computeNationalityGap(natRows);
    expect(g.reportable).toBe(true);
    expect(g.saudiCount).toBe(3);
    expect(g.nonSaudiCount).toBe(3);
    expect(g.direction).toBe('saudi'); // Saudis paid less here
    expect(g.medianGapPct).toBeGreaterThan(0);
  });

  test('isSaudi recognises SA/saudi/ksa, rejects others', () => {
    expect(lib.isSaudi('SA')).toBe(true);
    expect(lib.isSaudi('Saudi')).toBe(true);
    expect(lib.isSaudi('KSA')).toBe(true);
    expect(lib.isSaudi('EG')).toBe(false);
    expect(lib.isSaudi('')).toBe(false);
    expect(lib.isSaudi(undefined)).toBe(false);
  });
});

describe('W1193 pay-equity.lib — cohort outliers', () => {
  test('flags an employee >threshold below cohort median; respects MIN_COHORT', () => {
    const rows = [
      row('male', 'SA', 10000),
      row('male', 'SA', 10000),
      row('female', 'SA', 9500),
      row('female', 'SA', 5000), // outlier vs cohort median ~9750
    ];
    const flagged = lib.findCohortOutliers(rows, { thresholdPct: 20 });
    expect(flagged).toHaveLength(1);
    expect(flagged[0].salary).toBe(5000);
    expect(flagged[0].shortfallPct).toBeGreaterThan(20);
    expect(flagged[0].cohortMedian).toBeGreaterThan(0);
  });

  test('cohort below MIN_COHORT is never flagged', () => {
    const rows = [row('male', 'SA', 10000), row('female', 'SA', 3000), row('male', 'SA', 9000)];
    expect(lib.findCohortOutliers(rows, { thresholdPct: 20 })).toHaveLength(0);
  });

  test('byTitle narrows the cohort key', () => {
    const rows = [
      row('male', 'SA', 10000, 'PT', 'Senior'),
      row('male', 'SA', 10000, 'PT', 'Senior'),
      row('male', 'SA', 10000, 'PT', 'Senior'),
      row('female', 'SA', 4000, 'PT', 'Senior'),
      row('male', 'SA', 4200, 'PT', 'Junior'), // different title cohort (size 1 → ignored)
    ];
    const flagged = lib.findCohortOutliers(rows, { thresholdPct: 20, byTitle: true });
    expect(flagged.map(f => f.salary)).toEqual([4000]); // only the Senior outlier
  });
});

describe('W1193 pay-equity.lib — equity score + full analysis', () => {
  test('a clean payroll scores 100', () => {
    const clean = [
      row('male', 'SA', 10000),
      row('male', 'SA', 10000),
      row('male', 'SA', 10000),
      row('female', 'SA', 10000),
      row('female', 'SA', 10000),
      row('female', 'SA', 10000),
    ];
    const a = lib.analyzePayEquity(clean);
    expect(a.genderGap.medianGapPct).toBe(0);
    expect(a.cohortOutliers.count).toBe(0);
    expect(a.equityScore).toBe(100);
  });

  test('score drops with gap + outliers, clamped to [0,100]', () => {
    const skewed = [
      row('male', 'SA', 20000),
      row('male', 'SA', 21000),
      row('male', 'SA', 22000),
      row('female', 'SA', 8000),
      row('female', 'SA', 8500),
      row('female', 'SA', 3000), // outlier
    ];
    const a = lib.analyzePayEquity(skewed, { thresholdPct: 20 });
    expect(a.equityScore).toBeLessThan(100);
    expect(a.equityScore).toBeGreaterThanOrEqual(0);
    expect(a.headcount).toBe(6);
    expect(a.cohortOutliers.count).toBeGreaterThanOrEqual(1);
  });

  test('analyze tolerates dirty rows (drops non-finite salaries)', () => {
    const a = lib.analyzePayEquity([row('male', 'SA', 'oops'), row('female', 'SA', null)]);
    expect(a.headcount).toBe(0);
    expect(a.equityScore).toBe(100); // nothing to penalise
  });
});
