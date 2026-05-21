'use strict';

/**
 * measure-admin-anomaly-detector-wave248c.test.js — W248c.
 *
 * Tests the §11 carve-out from docs/blueprint/36-future-intelligence-layer.md:
 * rule-based anomaly detection for MeasureApplication records.
 *
 * Pure-function tests only — the detector has no I/O. Wiring it into
 * the pre-save hook is a separate future decision.
 *
 * Coverage:
 *   - All 5 rules fire correctly when conditions met
 *   - All 5 rules stay silent when conditions absent
 *   - Multiple flags can coexist on a single admin
 *   - Missing/null fields never crash, return [] gracefully
 *   - AR + EN evidence strings present on every flag
 *   - Severity matches documented level
 *   - Threshold constants exported and stable
 */

const {
  detectAnomalies,
  SEVERITY,
  THRESHOLDS,
} = require('../services/measureAdminAnomalyDetector.service');

// ─── Test fixtures ────────────────────────────────────────────────────

function makeMeasure(overrides = {}) {
  return {
    administrationTime: 45,
    minScore: 0,
    maxScore: 100,
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return {
    duration: 40,
    totalRawScore: 50,
    comparison: { changeFromBaseline: 0 },
    sdcAtAdministration: { value: 3 },
    domainScores: [],
    ...overrides,
  };
}

// ─── IMPOSSIBLY_FAST_ADMIN ────────────────────────────────────────────

describe('detectAnomalies — IMPOSSIBLY_FAST_ADMIN', () => {
  test('fires when duration<5 and expected≥30', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 3 }),
      measure: makeMeasure({ administrationTime: 45 }),
    });
    const fast = flags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN');
    expect(fast).toBeDefined();
    expect(fast.severity).toBe(SEVERITY.MEDIUM);
    expect(fast.evidence_ar).toContain('3 دقيقة');
    expect(fast.evidence_en).toContain('duration=3min');
    expect(fast.fields).toEqual({ actualMinutes: 3, expectedMinutes: 45 });
  });

  test('does NOT fire when duration≥5 (boundary)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 5 }),
      measure: makeMeasure({ administrationTime: 45 }),
    });
    expect(flags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN')).toBeUndefined();
  });

  test('does NOT fire when measure is quick (expected<30)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 2 }),
      measure: makeMeasure({ administrationTime: 10 }),
    });
    expect(flags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN')).toBeUndefined();
  });
});

// ─── DURATION_IMPLAUSIBLY_LONG ────────────────────────────────────────

describe('detectAnomalies — DURATION_IMPLAUSIBLY_LONG', () => {
  test('fires when duration > 3× expected', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 200 }),
      measure: makeMeasure({ administrationTime: 60 }),
    });
    const long = flags.find(f => f.type === 'DURATION_IMPLAUSIBLY_LONG');
    expect(long).toBeDefined();
    expect(long.severity).toBe(SEVERITY.LOW);
    expect(long.fields.ratio).toBeCloseTo(200 / 60, 2);
  });

  test('does NOT fire when duration = 3× expected (boundary)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 180 }),
      measure: makeMeasure({ administrationTime: 60 }),
    });
    expect(flags.find(f => f.type === 'DURATION_IMPLAUSIBLY_LONG')).toBeUndefined();
  });

  test('handles expected=0 without dividing-by-zero', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 100 }),
      measure: makeMeasure({ administrationTime: 0 }),
    });
    expect(flags.find(f => f.type === 'DURATION_IMPLAUSIBLY_LONG')).toBeUndefined();
  });
});

// ─── OUT_OF_RANGE_SCORE ───────────────────────────────────────────────

describe('detectAnomalies — OUT_OF_RANGE_SCORE', () => {
  test('fires when score above maxScore', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ totalRawScore: 150 }),
      measure: makeMeasure({ minScore: 0, maxScore: 100 }),
    });
    const oor = flags.find(f => f.type === 'OUT_OF_RANGE_SCORE');
    expect(oor).toBeDefined();
    expect(oor.severity).toBe(SEVERITY.HIGH);
    expect(oor.fields).toEqual({ score: 150, min: 0, max: 100 });
  });

  test('fires when score below minScore', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ totalRawScore: -5 }),
      measure: makeMeasure({ minScore: 0, maxScore: 100 }),
    });
    expect(flags.find(f => f.type === 'OUT_OF_RANGE_SCORE')).toBeDefined();
  });

  test('does NOT fire at exact boundaries', () => {
    const atMin = detectAnomalies({
      admin: makeAdmin({ totalRawScore: 0 }),
      measure: makeMeasure({ minScore: 0, maxScore: 100 }),
    });
    const atMax = detectAnomalies({
      admin: makeAdmin({ totalRawScore: 100 }),
      measure: makeMeasure({ minScore: 0, maxScore: 100 }),
    });
    expect(atMin.find(f => f.type === 'OUT_OF_RANGE_SCORE')).toBeUndefined();
    expect(atMax.find(f => f.type === 'OUT_OF_RANGE_SCORE')).toBeUndefined();
  });

  test('does NOT fire when min/max missing on measure', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ totalRawScore: 999 }),
      measure: { administrationTime: 30 }, // no min/max
    });
    expect(flags.find(f => f.type === 'OUT_OF_RANGE_SCORE')).toBeUndefined();
  });
});

// ─── IMPLAUSIBLE_DELTA ────────────────────────────────────────────────

describe('detectAnomalies — IMPLAUSIBLE_DELTA', () => {
  test('fires when |delta| > 10× SDC', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        comparison: { changeFromBaseline: 40 },
        sdcAtAdministration: { value: 3 },
      }),
      measure: makeMeasure(),
    });
    const d = flags.find(f => f.type === 'IMPLAUSIBLE_DELTA');
    expect(d).toBeDefined();
    expect(d.severity).toBe(SEVERITY.HIGH);
    expect(d.fields).toEqual({ changeFromBaseline: 40, sdc: 3, threshold: 30 });
  });

  test('fires symmetrically on large negative delta', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        comparison: { changeFromBaseline: -50 },
        sdcAtAdministration: { value: 4 },
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'IMPLAUSIBLE_DELTA')).toBeDefined();
  });

  test('does NOT fire when |delta| = 10× SDC (boundary)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        comparison: { changeFromBaseline: 30 },
        sdcAtAdministration: { value: 3 },
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'IMPLAUSIBLE_DELTA')).toBeUndefined();
  });

  test('does NOT fire when sdc=0 (avoids divide-by-zero degenerate)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        comparison: { changeFromBaseline: 100 },
        sdcAtAdministration: { value: 0 },
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'IMPLAUSIBLE_DELTA')).toBeUndefined();
  });

  test('does NOT fire when SDC missing (baseline-only admin)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        comparison: { changeFromBaseline: 50 },
        sdcAtAdministration: undefined,
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'IMPLAUSIBLE_DELTA')).toBeUndefined();
  });
});

// ─── PATTERN_FILLING_HOMOGENEOUS ──────────────────────────────────────

describe('detectAnomalies — PATTERN_FILLING_HOMOGENEOUS', () => {
  test('fires when all 5+ items share the same score', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        domainScores: [
          {
            itemScores: [
              { rawScore: 2 },
              { rawScore: 2 },
              { rawScore: 2 },
              { rawScore: 2 },
              { rawScore: 2 },
            ],
          },
        ],
      }),
      measure: makeMeasure(),
    });
    const h = flags.find(f => f.type === 'PATTERN_FILLING_HOMOGENEOUS');
    expect(h).toBeDefined();
    expect(h.severity).toBe(SEVERITY.MEDIUM);
    expect(h.fields).toEqual({ itemCount: 5, sharedValue: 2 });
  });

  test('aggregates items across multiple domainScores entries', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        domainScores: [
          { itemScores: [{ rawScore: 1 }, { rawScore: 1 }] },
          { itemScores: [{ rawScore: 1 }, { rawScore: 1 }, { rawScore: 1 }] },
        ],
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'PATTERN_FILLING_HOMOGENEOUS')).toBeDefined();
  });

  test('does NOT fire when items vary', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        domainScores: [
          {
            itemScores: [
              { rawScore: 2 },
              { rawScore: 2 },
              { rawScore: 3 },
              { rawScore: 2 },
              { rawScore: 2 },
            ],
          },
        ],
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'PATTERN_FILLING_HOMOGENEOUS')).toBeUndefined();
  });

  test('does NOT fire with fewer than 5 items (threshold)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        domainScores: [
          { itemScores: [{ rawScore: 1 }, { rawScore: 1 }, { rawScore: 1 }, { rawScore: 1 }] },
        ],
      }),
      measure: makeMeasure(),
    });
    expect(flags.find(f => f.type === 'PATTERN_FILLING_HOMOGENEOUS')).toBeUndefined();
  });

  test('handles homogeneous score of 0 correctly (no false-positive on null-coercion)', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({
        domainScores: [
          {
            itemScores: [
              { rawScore: 0 },
              { rawScore: 0 },
              { rawScore: 0 },
              { rawScore: 0 },
              { rawScore: 0 },
            ],
          },
        ],
      }),
      measure: makeMeasure(),
    });
    const h = flags.find(f => f.type === 'PATTERN_FILLING_HOMOGENEOUS');
    expect(h).toBeDefined();
    expect(h.fields.sharedValue).toBe(0);
  });
});

// ─── Robustness ───────────────────────────────────────────────────────

describe('detectAnomalies — robustness', () => {
  test('null admin returns empty array', () => {
    expect(detectAnomalies({ admin: null, measure: makeMeasure() })).toEqual([]);
  });

  test('null measure returns empty array', () => {
    expect(detectAnomalies({ admin: makeAdmin(), measure: null })).toEqual([]);
  });

  test('completely empty admin returns empty array (no fields to evaluate)', () => {
    expect(detectAnomalies({ admin: {}, measure: makeMeasure() })).toEqual([]);
  });

  test('admin with non-numeric fields does not crash', () => {
    const flags = detectAnomalies({
      admin: {
        duration: 'not-a-number',
        totalRawScore: 'NaN',
        comparison: { changeFromBaseline: 'X' },
        sdcAtAdministration: { value: 'Y' },
      },
      measure: makeMeasure(),
    });
    expect(Array.isArray(flags)).toBe(true);
    expect(flags).toEqual([]);
  });

  test('multiple anomalies can coexist on a single admin', () => {
    const flags = detectAnomalies({
      admin: {
        duration: 2, // FAST
        totalRawScore: 200, // OUT_OF_RANGE
        comparison: { changeFromBaseline: 40 }, // IMPLAUSIBLE_DELTA
        sdcAtAdministration: { value: 3 },
        domainScores: [
          {
            itemScores: Array(5).fill({ rawScore: 5 }), // HOMOGENEOUS
          },
        ],
      },
      measure: makeMeasure({ administrationTime: 60, minScore: 0, maxScore: 100 }),
    });
    const types = flags.map(f => f.type).sort();
    expect(types).toEqual(
      [
        'IMPLAUSIBLE_DELTA',
        'IMPOSSIBLY_FAST_ADMIN',
        'OUT_OF_RANGE_SCORE',
        'PATTERN_FILLING_HOMOGENEOUS',
      ].sort()
    );
  });
});

// ─── Contract ─────────────────────────────────────────────────────────

describe('detectAnomalies — contract', () => {
  test('SEVERITY enum exported and complete', () => {
    expect(SEVERITY).toEqual({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high' });
    expect(Object.isFrozen(SEVERITY)).toBe(true);
  });

  test('THRESHOLDS exported and stable', () => {
    expect(THRESHOLDS).toMatchObject({
      FAST_ADMIN_FLOOR_MINUTES: 5,
      FAST_ADMIN_EXPECTED_FLOOR: 30,
      LONG_ADMIN_RATIO: 3,
      IMPLAUSIBLE_DELTA_SDC_MULTIPLE: 10,
      HOMOGENEOUS_MIN_ITEMS: 5,
    });
    expect(Object.isFrozen(THRESHOLDS)).toBe(true);
  });

  test('every fired flag carries the contract fields', () => {
    const flags = detectAnomalies({
      admin: makeAdmin({ duration: 2 }),
      measure: makeMeasure({ administrationTime: 60 }),
    });
    expect(flags.length).toBeGreaterThan(0);
    for (const f of flags) {
      expect(typeof f.type).toBe('string');
      expect(['low', 'medium', 'high']).toContain(f.severity);
      expect(typeof f.evidence_ar).toBe('string');
      expect(typeof f.evidence_en).toBe('string');
      expect(f.evidence_ar.length).toBeGreaterThan(0);
      expect(f.evidence_en.length).toBeGreaterThan(0);
      expect(typeof f.fields).toBe('object');
    }
  });
});
