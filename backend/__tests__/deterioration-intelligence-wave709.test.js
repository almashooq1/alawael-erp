'use strict';

/**
 * deterioration-intelligence-wave709.test.js — W709
 *
 * Coverage for the PURE cross-measure deterioration detector
 * (measures/intelligence/deterioration.js). No DB — pure data in, signal out.
 */

const {
  SEVERITY,
  evaluateMeasure,
  detectDeterioration,
} = require('../measures/intelligence/deterioration');

const BASE = Date.parse('2026-01-01T00:00:00Z');
const DAY = 86400000;

/** Build monthly-spaced administrations from a value series. */
function series(values, stepDays = 30) {
  return values.map((value, i) => ({ date: new Date(BASE + i * stepDays * DAY), value }));
}

describe('W709 evaluateMeasure — guards', () => {
  test('insufficient when fewer than two administrations', () => {
    const s = evaluateMeasure({
      measureCode: 'X',
      direction: 'lower_better',
      administrations: series([5]),
    });
    expect(s.severity).toBe(SEVERITY.INSUFFICIENT);
    expect(s.declining).toBe(false);
    expect(s.reasons).toContain('need_at_least_two_administrations');
  });

  test('neutral direction is not evaluated', () => {
    const s = evaluateMeasure({
      measureCode: 'X',
      direction: 'neutral',
      administrations: series([1, 2, 3]),
    });
    expect(s.severity).toBe(SEVERITY.INSUFFICIENT);
    expect(s.reasons).toContain('neutral_direction_not_evaluated');
  });

  test('ignores malformed administrations and orders by date', () => {
    const s = evaluateMeasure({
      measureCode: 'X',
      direction: 'higher_better',
      administrations: [
        { date: new Date(BASE + 2 * DAY), value: 30 },
        { date: null, value: 99 },
        { date: new Date(BASE), value: 50 },
        { date: new Date(BASE + DAY), value: 40 },
      ],
    });
    expect(s.administrations).toBe(3);
    expect(s.latestValue).toBe(30); // latest chronological
    expect(s.previousValue).toBe(40);
  });
});

describe('W709 evaluateMeasure — lower_better declining', () => {
  test('reliable upward (worsening) trend + critical band → critical', () => {
    const s = evaluateMeasure({
      measureCode: 'PHQ-9',
      direction: 'lower_better',
      cutoff: 10,
      sdc: 5,
      latestBandSeverity: 'severe',
      administrations: series([4, 9, 15, 20]),
    });
    expect(s.classification).toBe('regression');
    expect(s.severity).toBe(SEVERITY.CRITICAL);
    expect(s.declining).toBe(true);
    expect(s.reasons).toContain('reliable_downward_trend');
    expect(s.priority).toBeGreaterThan(40);
  });

  test('cutoff crossing without reliable trend → concern', () => {
    const s = evaluateMeasure({
      measureCode: 'CSI',
      direction: 'lower_better',
      cutoff: 7,
      administrations: [
        { date: new Date(BASE), value: 5 },
        { date: new Date(BASE + 30 * DAY), value: 9 },
      ],
    });
    expect(s.cutoffCrossed).toBe(true);
    expect(s.severity).toBe(SEVERITY.CONCERN);
    expect(s.reasons).toContain('crossed_at_risk_cutoff');
  });
});

describe('W709 evaluateMeasure — higher_better', () => {
  test('steady improvement is stable, not declining', () => {
    const s = evaluateMeasure({
      measureCode: 'BERG',
      direction: 'higher_better',
      cutoff: 45,
      administrations: series([30, 38, 46, 52]),
    });
    expect(s.declining).toBe(false);
    expect(s.severity).toBe(SEVERITY.STABLE);
  });

  test('single-step drop beyond noise → watch', () => {
    const s = evaluateMeasure({
      measureCode: 'BERG',
      direction: 'higher_better',
      administrations: series([50, 52, 47]),
    });
    expect(s.reasons).toContain('latest_administration_worse');
    expect([SEVERITY.WATCH, SEVERITY.CONCERN, SEVERITY.CRITICAL]).toContain(s.severity);
  });

  test('drop dropping below cutoff with reliable decline → critical', () => {
    const s = evaluateMeasure({
      measureCode: 'TINETTI',
      direction: 'higher_better',
      cutoff: 19,
      latestBandSeverity: 'critical',
      administrations: series([27, 24, 20, 15]),
    });
    expect(s.classification).toBe('regression');
    expect(s.cutoffCrossed).toBe(true);
    expect(s.severity).toBe(SEVERITY.CRITICAL);
  });
});

describe('W709 detectDeterioration — roll-up', () => {
  const input = {
    measures: [
      {
        measureCode: 'PHQ-9',
        name_ar: 'الاكتئاب',
        direction: 'lower_better',
        cutoff: 10,
        sdc: 5,
        latestBandSeverity: 'severe',
        administrations: series([4, 9, 15, 20]),
      },
      {
        measureCode: 'BERG',
        direction: 'higher_better',
        cutoff: 45,
        administrations: series([50, 52, 51]),
      },
      { measureCode: 'GAD-7', direction: 'lower_better', administrations: series([3]) },
    ],
  };

  test('beneficiary status is worst-of and counts are correct', () => {
    const r = detectDeterioration(input);
    expect(r.summary.status).toBe(SEVERITY.CRITICAL);
    expect(r.summary.critical).toBe(1);
    expect(r.summary.declining).toBeGreaterThanOrEqual(1);
    expect(r.summary.insufficient).toBe(1);
    expect(r.summary.label_ar).toBeTruthy();
    expect(r.meta).toEqual({ measureCount: 3, totalAdministrations: 8 });
  });

  test('signals are sorted worst-first by priority', () => {
    const r = detectDeterioration(input);
    expect(r.signals[0].measureCode).toBe('PHQ-9');
    for (let i = 1; i < r.signals.length; i += 1) {
      expect(r.signals[i - 1].priority).toBeGreaterThanOrEqual(r.signals[i].priority);
    }
  });

  test('empty input yields insufficient status', () => {
    const r = detectDeterioration({ measures: [] });
    expect(r.summary.status).toBe(SEVERITY.INSUFFICIENT);
    expect(r.summary.evaluated).toBe(0);
    expect(r.signals).toHaveLength(0);
  });

  test('all-stable cohort yields stable status', () => {
    const r = detectDeterioration({
      measures: [
        { measureCode: 'A', direction: 'higher_better', administrations: series([10, 20, 30]) },
        { measureCode: 'B', direction: 'lower_better', administrations: series([20, 12, 5]) },
      ],
    });
    expect(r.summary.status).toBe(SEVERITY.STABLE);
    expect(r.summary.declining).toBe(0);
  });
});
