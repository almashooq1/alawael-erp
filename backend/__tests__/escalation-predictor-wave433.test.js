/**
 * escalation-predictor-wave433.test.js — Wave 433 (Phase D2 — Behavioral Intelligence).
 *
 * Pure-math drift guard for intelligence/escalation-predictor.lib.js.
 *
 * The predictor converts a BehaviorIncident series (W29 ABC log) into an
 * escalation-risk score in [0, 100] aligned with the W286 risk orchestrator
 * scale. Tier mapping: ≥75=critical, 50-74=high, 25-49=moderate, <25=low.
 *
 * No DB, no mongoose; pure functions only.
 */

'use strict';

const {
  predict,
  tierFromScore,
  TIER_THRESHOLDS,
  FACTOR_MAX,
  HIGH_ACUITY_TYPES,
  RECENCY_SATURATION_HOURS,
  _recencyFactor,
  _frequencyFactor,
  _trendFactor,
  _severitySkewFactor,
  _abcRepetitionFactor,
  _highAcuityFactor,
  _splitByWindow,
} = require('../intelligence/escalation-predictor.lib');

const NOW = new Date('2026-05-27T12:00:00Z');

function _inc(hoursAgo, overrides = {}) {
  return {
    observedAt: new Date(NOW.getTime() - hoursAgo * 3600_000),
    behaviorType: 'aggression',
    severity: 'minor',
    antecedent: null,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────
//  1. Registry shape sanity
// ──────────────────────────────────────────────────────────────────

describe('W433 — registry shape', () => {
  test('TIER_THRESHOLDS aligned with W286 risk orchestrator (75/50/25/0)', () => {
    expect(TIER_THRESHOLDS).toEqual({ critical: 75, high: 50, moderate: 25, low: 0 });
    expect(Object.isFrozen(TIER_THRESHOLDS)).toBe(true);
  });

  test('FACTOR_MAX sums to 100 (matches W286 source scale)', () => {
    const sum = Object.values(FACTOR_MAX).reduce((s, v) => s + v, 0);
    expect(sum).toBe(100);
    expect(Object.isFrozen(FACTOR_MAX)).toBe(true);
  });

  test('HIGH_ACUITY_TYPES contains self_injury + aggression', () => {
    expect(HIGH_ACUITY_TYPES.has('self_injury')).toBe(true);
    expect(HIGH_ACUITY_TYPES.has('aggression')).toBe(true);
    expect(HIGH_ACUITY_TYPES.has('disruption')).toBe(false);
  });

  test('tierFromScore — boundary cases', () => {
    expect(tierFromScore(0)).toBe('low');
    expect(tierFromScore(24)).toBe('low');
    expect(tierFromScore(25)).toBe('moderate');
    expect(tierFromScore(49)).toBe('moderate');
    expect(tierFromScore(50)).toBe('high');
    expect(tierFromScore(74)).toBe('high');
    expect(tierFromScore(75)).toBe('critical');
    expect(tierFromScore(100)).toBe('critical');
    expect(tierFromScore('not a number')).toBeNull();
    expect(tierFromScore(NaN)).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. Internal factor helpers
// ──────────────────────────────────────────────────────────────────

describe('W433 — _recencyFactor', () => {
  test('0 hours since last → 1.0', () => {
    expect(_recencyFactor(0)).toBe(1);
  });

  test('24h+ → 0.0 (saturation)', () => {
    expect(_recencyFactor(RECENCY_SATURATION_HOURS)).toBe(0);
    expect(_recencyFactor(72)).toBe(0);
  });

  test('logarithmic decay: 1h>>0, 12h ≈ midway', () => {
    const at1 = _recencyFactor(1);
    const at12 = _recencyFactor(12);
    expect(at1).toBeGreaterThan(0.5);
    expect(at12).toBeGreaterThan(0);
    expect(at12).toBeLessThan(at1);
  });

  test('negative / non-finite → 0', () => {
    expect(_recencyFactor(-5)).toBe(0);
    expect(_recencyFactor(NaN)).toBe(0);
  });
});

describe('W433 — _frequencyFactor', () => {
  test('0 → 0', () => expect(_frequencyFactor(0)).toBe(0));
  test('5 → 1.0', () => expect(_frequencyFactor(5)).toBe(1));
  test('≥5 saturates at 1.0', () => expect(_frequencyFactor(20)).toBe(1));
  test('linear below 5: 2 → 0.4, 3 → 0.6', () => {
    expect(_frequencyFactor(2)).toBeCloseTo(0.4, 5);
    expect(_frequencyFactor(3)).toBeCloseTo(0.6, 5);
  });
});

describe('W433 — _trendFactor', () => {
  test('zero recent → 0', () => expect(_trendFactor(0, 5)).toBe(0));
  test('emergence from quiet baseline → 1.0', () => expect(_trendFactor(3, 0)).toBe(1));
  test('flat trend → 0', () => expect(_trendFactor(4, 4)).toBe(0));
  test('decreasing trend → 0', () => expect(_trendFactor(2, 4)).toBe(0));
  test('2× prior → 0.5', () => expect(_trendFactor(4, 2)).toBe(0.5));
  test('3×+ prior saturates at 1.0', () => expect(_trendFactor(12, 2)).toBe(1));
});

describe('W433 — _severitySkewFactor', () => {
  test('empty → 0', () => expect(_severitySkewFactor([])).toBe(0));
  test('all minor → 0', () => {
    expect(_severitySkewFactor([{ severity: 'minor' }, { severity: 'minor' }])).toBe(0);
  });
  test('half major → 0.5', () => {
    expect(_severitySkewFactor([{ severity: 'major' }, { severity: 'minor' }])).toBe(0.5);
  });
  test('all major → 1.0', () => {
    expect(_severitySkewFactor([{ severity: 'major' }, { severity: 'major' }])).toBe(1);
  });
});

describe('W433 — _abcRepetitionFactor', () => {
  test('< 3 incidents → 0', () => {
    expect(_abcRepetitionFactor([{ antecedent: 'denied iPad' }])).toBe(0);
    expect(
      _abcRepetitionFactor([{ antecedent: 'denied iPad' }, { antecedent: 'denied iPad' }])
    ).toBe(0);
  });

  test('same antecedent ≥3× → 1.0 (predictable trigger)', () => {
    expect(
      _abcRepetitionFactor([
        { antecedent: 'denied iPad' },
        { antecedent: 'denied iPad' },
        { antecedent: 'denied iPad' },
      ])
    ).toBe(1);
  });

  test('same antecedent 2× among 3+ → 0.5', () => {
    expect(
      _abcRepetitionFactor([
        { antecedent: 'denied iPad' },
        { antecedent: 'denied iPad' },
        { antecedent: 'other' },
      ])
    ).toBe(0.5);
  });

  test('case + whitespace normalized', () => {
    expect(
      _abcRepetitionFactor([
        { antecedent: 'Denied iPad' },
        { antecedent: '  denied IPAD  ' },
        { antecedent: 'DENIED IPAD' },
      ])
    ).toBe(1);
  });

  test('empty/null antecedents skipped', () => {
    expect(
      _abcRepetitionFactor([{ antecedent: '' }, { antecedent: null }, { antecedent: undefined }])
    ).toBe(0);
  });
});

describe('W433 — _highAcuityFactor', () => {
  test('disruption only → 0', () => {
    expect(_highAcuityFactor([{ behaviorType: 'disruption' }])).toBe(0);
  });
  test('any aggression in series → 1', () => {
    expect(
      _highAcuityFactor([{ behaviorType: 'disruption' }, { behaviorType: 'aggression' }])
    ).toBe(1);
  });
  test('any self_injury in series → 1', () => {
    expect(_highAcuityFactor([{ behaviorType: 'self_injury' }])).toBe(1);
  });
});

describe('W433 — _splitByWindow', () => {
  test('partitions into recent + prior, respects boundary', () => {
    const incidents = [
      _inc(2), // recent (last 24h)
      _inc(24 * 5), // recent (5d ago)
      _inc(24 * 10), // prior (10d ago, within 8..21)
      _inc(24 * 25), // outside both windows
    ];
    const { recent, prior } = _splitByWindow(incidents, NOW, 7, 14);
    expect(recent).toHaveLength(2);
    expect(prior).toHaveLength(1);
  });

  test('drops malformed observedAt', () => {
    const { recent } = _splitByWindow([{ observedAt: 'garbage' }, _inc(1)], NOW, 7, 14);
    expect(recent).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. predict — full scoring
// ──────────────────────────────────────────────────────────────────

describe('W433 — predict', () => {
  test('empty series → score=0, tier=low, ok=true (absence is meaningful)', () => {
    const r = predict([], { now: NOW });
    expect(r.ok).toBe(true);
    expect(r.score).toBe(0);
    expect(r.tier).toBe('low');
    expect(r.signals).toEqual([]);
  });

  test('non-array input → INVALID_INPUT', () => {
    const r = predict(null, { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_INPUT');
  });

  test('single recent aggression — low/moderate score', () => {
    const r = predict([_inc(2, { behaviorType: 'aggression' })], { now: NOW });
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(['low', 'moderate']).toContain(r.tier);
    expect(r.signals.some(s => s.name === 'highAcuityType')).toBe(true);
  });

  test('major self-injury escalating with repeated trigger → critical tier', () => {
    const incidents = [
      _inc(1, { behaviorType: 'self_injury', severity: 'major', antecedent: 'transition' }),
      _inc(4, { behaviorType: 'self_injury', severity: 'major', antecedent: 'transition' }),
      _inc(8, { behaviorType: 'aggression', severity: 'major', antecedent: 'transition' }),
      _inc(20, { behaviorType: 'aggression', severity: 'major' }),
      _inc(24 * 3, { behaviorType: 'aggression', severity: 'major' }),
      _inc(24 * 5, { behaviorType: 'aggression', severity: 'moderate' }),
      // Prior week: only 1 incident — strong escalation trend
      _inc(24 * 10, { behaviorType: 'aggression', severity: 'minor' }),
    ];
    const r = predict(incidents, { now: NOW });
    expect(r.tier).toBe('critical');
    expect(r.breakdown.freq).toBeGreaterThan(0); // ≥5 recent → 1.0
    expect(r.breakdown.trend).toBeGreaterThan(0);
    expect(r.breakdown.severitySkew).toBeGreaterThan(0);
    expect(r.breakdown.abcRep).toBe(1); // 3× transition antecedent
    expect(r.breakdown.highAcuity).toBe(1);
  });

  test('decreasing pattern (prior > recent) → no trend boost', () => {
    const incidents = [
      _inc(2, { behaviorType: 'aggression', severity: 'minor' }),
      _inc(24 * 10, { behaviorType: 'aggression', severity: 'minor' }),
      _inc(24 * 12, { behaviorType: 'aggression', severity: 'minor' }),
      _inc(24 * 14, { behaviorType: 'aggression', severity: 'minor' }),
    ];
    const r = predict(incidents, { now: NOW });
    expect(r.breakdown.trend).toBe(0);
  });

  test('recentCount + priorCount returned for caller use', () => {
    const r = predict(
      [
        _inc(2),
        _inc(24 * 3),
        _inc(24 * 10), // prior
      ],
      { now: NOW }
    );
    expect(r.recentCount).toBe(2);
    expect(r.priorCount).toBe(1);
  });

  test('signals are explainable (every fired factor has name+weight+evidence)', () => {
    const r = predict(
      [
        _inc(1, { behaviorType: 'aggression', severity: 'major', antecedent: 'transition' }),
        _inc(3, { behaviorType: 'aggression', severity: 'major', antecedent: 'transition' }),
        _inc(5, { behaviorType: 'aggression', severity: 'major', antecedent: 'transition' }),
      ],
      { now: NOW }
    );
    expect(r.signals.length).toBeGreaterThanOrEqual(5);
    for (const s of r.signals) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('weight');
      expect(s).toHaveProperty('evidence');
    }
  });

  test('score never exceeds 100 — max-out scenario', () => {
    const incidents = Array.from({ length: 10 }, (_, i) =>
      _inc(i, {
        behaviorType: 'self_injury',
        severity: 'major',
        antecedent: 'transition',
      })
    );
    const r = predict(incidents, { now: NOW });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.tier).toBe('critical');
  });

  test('configurable windows: shorter recentDays → smaller recent set', () => {
    const incidents = [_inc(24 * 2), _inc(24 * 5), _inc(24 * 8)];
    const r3day = predict(incidents, { now: NOW, recentDays: 3, priorDays: 7 });
    const r10day = predict(incidents, { now: NOW, recentDays: 10, priorDays: 14 });
    expect(r3day.recentCount).toBeLessThan(r10day.recentCount);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. End-to-end realistic scenario
// ──────────────────────────────────────────────────────────────────

describe('W433 — realistic scenario: morning-transition trigger pattern', () => {
  test('escalating week + repeated trigger → critical with abcRep signal', () => {
    const incidents = [
      // Recent week (escalating)
      _inc(1, { behaviorType: 'aggression', severity: 'major', antecedent: 'morning transition' }),
      _inc(24, { behaviorType: 'aggression', severity: 'major', antecedent: 'morning transition' }),
      _inc(24 * 2, {
        behaviorType: 'aggression',
        severity: 'moderate',
        antecedent: 'morning transition',
      }),
      _inc(24 * 4, { behaviorType: 'aggression', severity: 'major' }),
      _inc(24 * 6, { behaviorType: 'aggression', severity: 'minor' }),
      // Prior 2 weeks: 1 minor — strong trend acceleration
      _inc(24 * 9, { behaviorType: 'disruption', severity: 'minor' }),
    ];
    const r = predict(incidents, { now: NOW });
    expect(r.score).toBeGreaterThanOrEqual(75); // critical
    expect(r.tier).toBe('critical');

    // Pattern recognized — clinical action signal
    const abcSignal = r.signals.find(s => s.name === 'abcRepetition');
    expect(abcSignal).toBeTruthy();
    expect(abcSignal.evidence).toContain('antecedent identified');
  });
});
