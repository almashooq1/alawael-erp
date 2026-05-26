/**
 * goal-forecaster-wave429.test.js — Wave 429 (Phase B1 — Outcome Forecasting).
 *
 * Pure-math drift guard for intelligence/goal-forecaster.lib.js plus the
 * companion FORECAST_OFF_TRACK adapter wired into the W337/W339
 * TYPE_CONVERTERS registry.
 *
 * Two layers covered:
 *
 *   1. goal-forecaster.lib.js — pure regression math + projection +
 *      95% CI + slope-acceleration + evaluateAgainstTarget grading
 *   2. aiRecommendation-plateau-adapter.service.js — added converter
 *      forecastAlertToDraftArgs + TYPE_CONVERTERS registration so the
 *      W338 cron auto-picks-up the new alertType
 *
 * No DB, no mongoose; jest.setup.js mocks mongoose globally for sprint.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const {
  forecast,
  evaluateAgainstTarget,
  _slopeFor,
} = require('../intelligence/goal-forecaster.lib');
const plateauAdapter = require('../services/aiRecommendation-plateau-adapter.service');

// ──────────────────────────────────────────────────────────────────
//  1. Linear-regression math
// ──────────────────────────────────────────────────────────────────

describe('W429 — goal-forecaster.lib.forecast (pure math)', () => {
  test('insufficient data: n < 3 → INSUFFICIENT_DATA', () => {
    expect(forecast([]).ok).toBe(false);
    expect(forecast([{ at: '2026-01-01', score: 1 }]).ok).toBe(false);
    expect(
      forecast([
        { at: '2026-01-01', score: 1 },
        { at: '2026-02-01', score: 2 },
      ]).ok
    ).toBe(false);
    expect(forecast([]).reason).toBe('INSUFFICIENT_DATA');
  });

  test('zero variance in time (all same date) → ZERO_VARIANCE_IN_TIME', () => {
    const r = forecast([
      { at: '2026-01-01', score: 1 },
      { at: '2026-01-01', score: 2 },
      { at: '2026-01-01', score: 3 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ZERO_VARIANCE_IN_TIME');
  });

  test('perfectly linear ascending series (evenly spaced) → r²=1, positive slope', () => {
    // 30, 35, 40, 45 over 4 observations 30 days apart (avoid Feb=28-day skew)
    const series = [
      { at: '2026-01-01', score: 30 },
      { at: '2026-01-31', score: 35 },
      { at: '2026-03-02', score: 40 },
      { at: '2026-04-01', score: 45 },
    ];
    const r = forecast(series);
    expect(r.ok).toBe(true);
    expect(r.n).toBe(4);
    expect(r.r2).toBeCloseTo(1, 5);
    expect(r.slopePerDay).toBeGreaterThan(0);
    // Project at 30 days past last point (default horizon)
    expect(r.projected).toBeGreaterThan(45);
    // CI half should be very small for r²=1
    expect(r.ci95.half).toBeLessThan(1);
  });

  test('descending series → negative slope, projected below last', () => {
    const series = [
      { at: '2026-01-01', score: 80 },
      { at: '2026-02-01', score: 70 },
      { at: '2026-03-01', score: 60 },
      { at: '2026-04-01', score: 50 },
    ];
    const r = forecast(series);
    expect(r.ok).toBe(true);
    expect(r.slopePerDay).toBeLessThan(0);
    expect(r.projected).toBeLessThan(50);
  });

  test('series sorted ascending internally — input order is irrelevant', () => {
    const ordered = [
      { at: '2026-01-01', score: 10 },
      { at: '2026-02-01', score: 20 },
      { at: '2026-03-01', score: 30 },
    ];
    const shuffled = [ordered[2], ordered[0], ordered[1]];
    const a = forecast(ordered);
    const b = forecast(shuffled);
    expect(a.slopePerDay).toBeCloseTo(b.slopePerDay, 10);
    expect(a.projected).toBeCloseTo(b.projected, 10);
  });

  test('custom horizonAt — projection at the requested future date', () => {
    const series = [
      { at: '2026-01-01', score: 0 },
      { at: '2026-02-01', score: 10 },
      { at: '2026-03-01', score: 20 },
    ];
    // 60 days past 2026-03-01 = 2026-04-30. slope ≈ 0.333/day → ~ +20
    const r = forecast(series, { horizonAt: '2026-04-30' });
    expect(r.ok).toBe(true);
    expect(r.projectedAt).toBe(new Date('2026-04-30').toISOString());
    // Projected score should be roughly 0 + slope * total_days
    expect(r.projected).toBeGreaterThan(35);
    expect(r.projected).toBeLessThan(45);
  });

  test('slopeAcceleration: positive when 2nd half accelerates, null when n<6', () => {
    // n=8, first half flat (~0/month), second half steeply rising
    const series = [
      { at: '2026-01-01', score: 10 },
      { at: '2026-01-15', score: 10 },
      { at: '2026-02-01', score: 10 },
      { at: '2026-02-15', score: 10 },
      { at: '2026-03-01', score: 15 },
      { at: '2026-03-15', score: 20 },
      { at: '2026-04-01', score: 25 },
      { at: '2026-04-15', score: 30 },
    ];
    const r = forecast(series);
    expect(r.slopeAcceleration).not.toBeNull();
    expect(r.slopeAcceleration).toBeGreaterThan(0);

    // n=4 → null (need ≥6)
    const small = forecast(series.slice(0, 4));
    expect(small.slopeAcceleration).toBeNull();
  });

  test('non-finite scores filtered out — surfaces INSUFFICIENT_DATA when too few remain', () => {
    const r = forecast([
      { at: '2026-01-01', score: NaN },
      { at: '2026-02-01', score: 10 },
      { at: '2026-03-01', score: 'not a number' },
      { at: '2026-04-01', score: 20 },
    ]);
    expect(r.ok).toBe(false); // only 2 finite after filtering
    expect(r.reason).toBe('INSUFFICIENT_DATA');
  });

  test('_slopeFor helper: < 2 points → null', () => {
    expect(_slopeFor([], [])).toBeNull();
    expect(_slopeFor([1], [10])).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. evaluateAgainstTarget — goal scoring
// ──────────────────────────────────────────────────────────────────

describe('W429 — evaluateAgainstTarget', () => {
  function _forecastReachingScore(projected, ci95Half = 1) {
    return {
      ok: true,
      projected,
      ci95: { lower: projected - ci95Half, upper: projected + ci95Half, half: ci95Half },
    };
  }

  test('on-track when projected meets/exceeds target (higher-is-better)', () => {
    const r = evaluateAgainstTarget(_forecastReachingScore(50), {
      targetValue: 50,
      direction: 'higher',
    });
    expect(r.onTrack).toBe(true);
    expect(r.gap).toBe(0);
    expect(r.severity).toBe('low');
  });

  test('off-track but within 2× tolerance → severity=medium', () => {
    const r = evaluateAgainstTarget(_forecastReachingScore(48, 5), {
      targetValue: 50,
      toleranceBand: 1,
      direction: 'higher',
    });
    expect(r.onTrack).toBe(false);
    expect(r.gap).toBe(2);
    expect(r.severity).toBe('medium');
  });

  test('off-track > 2× tolerance but CI bound covers target → severity=high', () => {
    const r = evaluateAgainstTarget(_forecastReachingScore(40, 100), {
      targetValue: 50,
      toleranceBand: 1,
      direction: 'higher',
    });
    expect(r.onTrack).toBe(false);
    expect(r.severity).toBe('high');
    expect(r.ciMisses).toBe(false);
  });

  test('CI upper still misses target → severity=critical (high-confidence off-track)', () => {
    const r = evaluateAgainstTarget(_forecastReachingScore(40, 5), {
      targetValue: 50,
      toleranceBand: 1,
      direction: 'higher',
    });
    expect(r.onTrack).toBe(false);
    expect(r.severity).toBe('critical');
    expect(r.ciMisses).toBe(true);
  });

  test('lower-is-better: projected lower than target = on-track', () => {
    // e.g. spasticity scale — lower score = better outcome
    const r = evaluateAgainstTarget(_forecastReachingScore(3), {
      targetValue: 5,
      direction: 'lower',
    });
    expect(r.onTrack).toBe(true);
    expect(r.gap).toBeLessThanOrEqual(0);
  });

  test('failed forecast → onTrack=null, severity=low (no signal)', () => {
    const r = evaluateAgainstTarget(
      { ok: false, reason: 'INSUFFICIENT_DATA' },
      {
        targetValue: 50,
      }
    );
    expect(r.onTrack).toBeNull();
    expect(r.reason).toBe('NO_FORECAST');
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. FORECAST_OFF_TRACK adapter — converter + TYPE_CONVERTERS registration
// ──────────────────────────────────────────────────────────────────

describe('W429 — FORECAST_OFF_TRACK adapter (W337/W339 sibling)', () => {
  test('TYPE_CONVERTERS registry includes FORECAST_OFF_TRACK', () => {
    expect(plateauAdapter.TYPE_CONVERTERS).toHaveProperty('FORECAST_OFF_TRACK');
    expect(typeof plateauAdapter.TYPE_CONVERTERS.FORECAST_OFF_TRACK).toBe('function');
    // W338 cron iterates Object.keys(TYPE_CONVERTERS) → auto pickup
    const expected = ['PLATEAU_DETECTED', 'REGRESSION_DETECTED', 'FORECAST_OFF_TRACK'].sort();
    expect(Object.keys(plateauAdapter.TYPE_CONVERTERS).sort()).toEqual(expected);
  });

  test('converter returns null for non-forecast alerts (filter guard)', () => {
    expect(plateauAdapter.forecastAlertToDraftArgs(null)).toBeNull();
    expect(plateauAdapter.forecastAlertToDraftArgs({ alertType: 'PLATEAU_DETECTED' })).toBeNull();
    expect(
      plateauAdapter.forecastAlertToDraftArgs({
        alertType: 'FORECAST_OFF_TRACK',
        // missing beneficiaryId
      })
    ).toBeNull();
  });

  test('confidence scoring: strong-evidence forecast → confidence ≥ 0.6', () => {
    const conf = plateauAdapter.scoreForecastEvidence({
      n: 8,
      spanDays: 90,
      r2: 0.8,
      severity: 'high',
      slopeAcceleration: -0.5,
    });
    expect(conf).toBeGreaterThanOrEqual(0.6);
    expect(conf).toBeLessThanOrEqual(1);
  });

  test('confidence scoring: critical severity adds extra 0.15', () => {
    const high = plateauAdapter.scoreForecastEvidence({
      n: 8,
      spanDays: 90,
      r2: 0.8,
      severity: 'high',
    });
    const critical = plateauAdapter.scoreForecastEvidence({
      n: 8,
      spanDays: 90,
      r2: 0.8,
      severity: 'critical',
    });
    expect(critical).toBeGreaterThan(high);
    expect(critical - high).toBeCloseTo(0.15, 5);
  });

  test('critical-severity converter routes to ESCALATE_TO_QUALITY', () => {
    const args = plateauAdapter.forecastAlertToDraftArgs({
      alertType: 'FORECAST_OFF_TRACK',
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      measureRef: { code: 'GAS' },
      evidence: {
        n: 8,
        spanDays: 120,
        r2: 0.9,
        severity: 'critical',
        projected: 35,
        target: 50,
        projectedAt: '2026-08-01T00:00:00.000Z',
      },
    });
    expect(args).not.toBeNull();
    expect(args.type).toBe('ESCALATE_TO_QUALITY');
    expect(args.beneficiaryId).toBe('b-1');
    expect(args.draftAction.basis).toBe('forecast-alert');
    expect(args.draftAction.forecast.projected).toBe(35);
    expect(args.draftAction.forecast.target).toBe(50);
  });

  test('non-critical severity converter routes to INCREASE_DOSAGE_AND_REASSESS', () => {
    const args = plateauAdapter.forecastAlertToDraftArgs({
      alertType: 'FORECAST_OFF_TRACK',
      beneficiaryId: 'b-2',
      evidence: {
        n: 5,
        spanDays: 60,
        r2: 0.5,
        severity: 'medium',
        projected: 45,
        target: 50,
      },
    });
    expect(args).not.toBeNull();
    expect(args.type).toBe('INCREASE_DOSAGE_AND_REASSESS');
  });

  test('signals[] structure: each has name+weight+evidence', () => {
    const signals = plateauAdapter.buildForecastSignals({
      n: 8,
      spanDays: 90,
      r2: 0.8,
      severity: 'critical',
      slopeAcceleration: -0.5,
    });
    expect(signals.length).toBeGreaterThanOrEqual(5);
    for (const s of signals) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('weight');
      expect(s).toHaveProperty('evidence');
      expect(typeof s.weight).toBe('number');
    }
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. MeasureAlert enum + module shape (drift guard)
// ──────────────────────────────────────────────────────────────────

describe('W429 — MeasureAlert FORECAST_OFF_TRACK enum + module shape', () => {
  test('MeasureAlert source declares FORECAST_OFF_TRACK in ALERT_TYPES', () => {
    const file = path.resolve(__dirname, '..', 'domains', 'goals', 'models', 'MeasureAlert.js');
    const src = fs.readFileSync(file, 'utf8');
    // Must appear in the ALERT_TYPES array — not just in a comment
    expect(src).toMatch(/['"]FORECAST_OFF_TRACK['"]/);
    expect(src).toMatch(/ALERT_TYPES\s*=\s*\[[\s\S]*FORECAST_OFF_TRACK/);
  });

  test('plateau adapter module exports forecast converter + scoring helpers', () => {
    expect(typeof plateauAdapter.forecastAlertToDraftArgs).toBe('function');
    expect(typeof plateauAdapter.scoreForecastEvidence).toBe('function');
    expect(typeof plateauAdapter.buildForecastSignals).toBe('function');
  });
});
