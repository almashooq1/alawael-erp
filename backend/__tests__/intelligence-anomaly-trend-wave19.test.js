/**
 * intelligence-anomaly-trend-wave19.test.js — Wave 19.
 *
 * Tests the two new generators that extend the Wave 18 foundation:
 *
 *   1. anomaly.generator — Z-score breach detection
 *      • happy path: clean baseline + spike → fires medium/high
 *      • flat baseline (sigma=0) → silent (false-positive guard)
 *      • below threshold → silent
 *      • severity scales with |z|
 *      • payload survives the canonical Insight schema's G-validators
 *
 *   2. trend-deviation.generator — slope-shift detection
 *      • reversal: improving → worsening fires
 *      • acceleration: same direction but faster fires
 *      • betterIsHigher=false (lower-is-better) inverts the labels
 *      • flat trend (zero slope) → silent
 *      • payload survives canonical Insight schema
 */

'use strict';

// Opt out of global mongoose mock (jest.setup.js:19) — required so
// new Model(...) returns a real constructor. See insight-foundation-wave18.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');
const insightModelExports = require('../intelligence/insight.model');
const { InsightSchema } = insightModelExports;

const anomalyGen = require('../intelligence/generators/anomaly.generator');
const trendGen = require('../intelligence/generators/trend-deviation.generator');

// Reuse canonical Insight model (Wave-11 lesson applied).
const Insight = mongoose.models.Insight || mongoose.model('Insight', InsightSchema);

function pointsFlat(n, value = 100) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ at: new Date(Date.UTC(2026, 4, i + 1, 0, 0, 0)), value });
  }
  return out;
}

function pointsLinearWithNoise(n, start = 100, step = 0, jitter = 1, dayOffset = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = start + i * step;
    // Deterministic "noise" so tests are stable.
    const noise = jitter ? Math.sin(i) * jitter : 0;
    out.push({
      at: new Date(Date.UTC(2026, 4, i + 1 + dayOffset, 0, 0, 0)),
      value: base + noise,
    });
  }
  return out;
}

// ─── anomaly.generator ─────────────────────────────────────────

describe('anomaly.generator — happy path & edge cases', () => {
  test('returns [] when series shorter than min window', async () => {
    const out = await anomalyGen.evaluate({
      series: [
        {
          metricId: 'foo.bar',
          metricLabelAr: 'مؤشر',
          metricLabelEn: 'Metric',
          points: pointsLinearWithNoise(5, 100, 0, 0.5),
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('returns [] when latest value is within threshold', async () => {
    const base = pointsLinearWithNoise(20, 100, 0, 1);
    // Latest point ≈ 100±1 (well below the default 2.5σ threshold)
    base.push({ at: new Date('2026-05-21'), value: 100.5 });
    const out = await anomalyGen.evaluate({
      series: [
        {
          metricId: 'attendance.daily',
          metricLabelAr: 'الحضور',
          metricLabelEn: 'Attendance',
          points: base,
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('fires when latest point is > 2.5σ above mean', async () => {
    const base = pointsLinearWithNoise(20, 100, 0, 1);
    // Spike: 100 + 5σ above
    base.push({ at: new Date('2026-05-21'), value: 110 });
    const out = await anomalyGen.evaluate({
      series: [
        {
          metricId: 'admissions.daily',
          metricLabelAr: 'القبول اليومي',
          metricLabelEn: 'Daily admissions',
          branchId: new mongoose.Types.ObjectId(),
          branchLabel: 'الرياض',
          unit: 'count',
          category: 'operational',
          points: base,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('anomaly');
    expect(['high', 'critical']).toContain(out[0].severity);
    expect(out[0].reasoning.supportingFacts.length).toBeGreaterThanOrEqual(2);
  });

  test('flat baseline (sigma=0) is silent — no false positives', async () => {
    const base = pointsFlat(20, 50);
    base.push({ at: new Date('2026-05-21'), value: 55 });
    const out = await anomalyGen.evaluate({
      series: [
        {
          metricId: 'flat.x',
          metricLabelAr: 'ثابت',
          metricLabelEn: 'Flat',
          points: base,
        },
      ],
    });
    // sigma=0 → zScore returns 0 → no breach
    expect(out).toEqual([]);
  });

  test('severity scales with Z magnitude', () => {
    const sev1 = anomalyGen._internal.severityFromZ(2.6);
    const sev2 = anomalyGen._internal.severityFromZ(3.5);
    const sev3 = anomalyGen._internal.severityFromZ(4.5);
    const sev4 = anomalyGen._internal.severityFromZ(5.5);
    expect(sev1).toBe('low');
    expect(sev2).toBe('medium');
    expect(sev3).toBe('high');
    expect(sev4).toBe('critical');
  });

  test('payload survives the Insight schema G-validators', async () => {
    const base = pointsLinearWithNoise(20, 100, 0, 1);
    base.push({ at: new Date('2026-05-21'), value: 115 });
    const out = await anomalyGen.evaluate({
      series: [
        {
          metricId: 'cash.daily',
          metricLabelAr: 'النقد اليومي',
          metricLabelEn: 'Daily cash',
          unit: 'SAR',
          points: base,
        },
      ],
    });
    expect(out).toHaveLength(1);
    const doc = new Insight(out[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('handles broken series rows without throwing', async () => {
    const out = await anomalyGen.evaluate({
      series: [
        // missing metricId
        { points: pointsLinearWithNoise(15, 100, 0, 1) },
        // points is not an array
        { metricId: 'x', metricLabelAr: 'a', metricLabelEn: 'b', points: 'not-array' },
        // null point values
        {
          metricId: 'y',
          metricLabelAr: 'a',
          metricLabelEn: 'b',
          points: [
            { at: new Date(), value: null },
            { at: new Date(), value: undefined },
          ],
        },
      ],
    });
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('anomaly.generator — internals', () => {
  test('mean/stdev/zScore basic math', () => {
    const m = anomalyGen._internal.mean([10, 20, 30]);
    expect(m).toBe(20);
    const s = anomalyGen._internal.stdev([10, 20, 30], 20);
    expect(s).toBeCloseTo(10, 2);
    const z = anomalyGen._internal.zScore(40, 20, 10);
    expect(z).toBe(2);
  });

  test('direction labels follow sign', () => {
    const up = anomalyGen._internal.directionLabel(2.5);
    const down = anomalyGen._internal.directionLabel(-2.5);
    expect(up.ar).toMatch(/ارتفاع/);
    expect(down.ar).toMatch(/انخفاض/);
  });

  test('confidence drops on near-zero stdev', () => {
    const { score: lowConf } = anomalyGen._internal.confidenceFromWindow(20, 0, 100);
    const { score: midConf } = anomalyGen._internal.confidenceFromWindow(20, 5, 100);
    expect(lowConf).toBeLessThan(midConf);
  });
});

// ─── trend-deviation.generator ────────────────────────────────

describe('trend-deviation.generator — detection paths', () => {
  test('returns [] when series too short', async () => {
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'x',
          metricLabelAr: 'م',
          metricLabelEn: 'M',
          points: pointsLinearWithNoise(5, 100, 1, 0),
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('fires on reversal: improving → worsening', async () => {
    // First half climbs from 70 → 90 (slope ≈ +2)
    // Second half falls from 88 → 60 (slope ≈ -3.5)
    const first = pointsLinearWithNoise(8, 70, 2.5, 0, 0);
    const second = pointsLinearWithNoise(8, 88, -3.5, 0, 8);
    const all = first.concat(second);
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'attendance.weekly',
          metricLabelAr: 'الحضور الأسبوعي',
          metricLabelEn: 'Weekly attendance',
          betterIsHigher: true,
          points: all,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('trend-deviation');
    expect(out[0].titleAr).toMatch(/انعكاس/);
  });

  test('fires on acceleration when slope magnitude shifts ≥ 50%', async () => {
    // First half: slope ≈ +0.5; second half: slope ≈ +2 (4× faster)
    const first = pointsLinearWithNoise(8, 100, 0.5, 0, 0);
    const second = pointsLinearWithNoise(8, 104, 2, 0, 8);
    const all = first.concat(second);
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'spend.weekly',
          metricLabelAr: 'الإنفاق الأسبوعي',
          metricLabelEn: 'Weekly spend',
          betterIsHigher: false, // higher spend = bad
          points: all,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].titleAr).toMatch(/تسارع/);
  });

  test('flat trend (zero slope both halves) is silent', async () => {
    const all = pointsFlat(20, 100);
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'flat.x',
          metricLabelAr: 'ثابت',
          metricLabelEn: 'Flat',
          points: all,
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('betterIsHigher=false inverts reversal labels', async () => {
    // For "complaints" (lower=better):
    //   first half: descending (good) → improving
    //   second half: ascending (bad) → worsening
    const first = pointsLinearWithNoise(8, 50, -2, 0, 0);
    const second = pointsLinearWithNoise(8, 36, 3, 0, 8);
    const all = first.concat(second);
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'complaints.weekly',
          metricLabelAr: 'الشكاوى',
          metricLabelEn: 'Complaints',
          betterIsHigher: false,
          points: all,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].titleAr).toMatch(/الأسوأ/);
  });

  test('payload survives the Insight schema G-validators', async () => {
    const first = pointsLinearWithNoise(8, 70, 2.5, 0, 0);
    const second = pointsLinearWithNoise(8, 88, -3.5, 0, 8);
    const all = first.concat(second);
    const out = await trendGen.evaluate({
      series: [
        {
          metricId: 'foo.weekly',
          metricLabelAr: 'م',
          metricLabelEn: 'M',
          branchId: new mongoose.Types.ObjectId(),
          branchLabel: 'الرياض',
          points: all,
        },
      ],
    });
    expect(out).toHaveLength(1);
    const doc = new Insight(out[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('handles broken series rows without throwing', async () => {
    const out = await trendGen.evaluate({
      series: [
        { metricId: 'a' }, // no points
        { metricId: 'b', points: 'oops' }, // bad shape
      ],
    });
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('trend-deviation.generator — internals', () => {
  test('linearSlope returns 0 for empty/single-point series', () => {
    expect(trendGen._internal.linearSlope([])).toBe(0);
    expect(trendGen._internal.linearSlope([{ at: new Date(), value: 5 }])).toBe(0);
  });

  test('linearSlope detects a clean +slope', () => {
    const pts = pointsLinearWithNoise(10, 0, 2, 0); // straight ramp
    expect(trendGen._internal.linearSlope(pts)).toBeCloseTo(2, 1);
  });

  test('severityFromMagnitude scales correctly', () => {
    expect(trendGen._internal.severityFromMagnitude(0.05)).toBe('low');
    expect(trendGen._internal.severityFromMagnitude(0.2)).toBe('medium');
    expect(trendGen._internal.severityFromMagnitude(0.4)).toBe('high');
    expect(trendGen._internal.severityFromMagnitude(0.8)).toBe('critical');
  });

  test('reversalLabel handles all 4 sign combos correctly', () => {
    // betterIsHigher=true
    expect(trendGen._internal.reversalLabel(1, -1, true).kind).toBe('worsening');
    expect(trendGen._internal.reversalLabel(-1, 1, true).kind).toBe('improving');
    expect(trendGen._internal.reversalLabel(1, 1, true)).toBeNull();
    // betterIsHigher=false (inverted)
    expect(trendGen._internal.reversalLabel(-1, 1, false).kind).toBe('worsening');
  });

  test('confidenceFromSplit rewards longer + symmetric series', () => {
    const { score: longSym } = trendGen._internal.confidenceFromSplit(12, 12);
    const { score: shortSym } = trendGen._internal.confidenceFromSplit(4, 4);
    const { score: asym } = trendGen._internal.confidenceFromSplit(12, 4);
    expect(longSym).toBeGreaterThan(shortSym);
    expect(longSym).toBeGreaterThan(asym);
  });
});
