'use strict';

/**
 * measures-intelligence-wave719.test.js — W719.
 *
 * Verifies the unified facade fuses all five layers correctly and enforces
 * the governance hard-block before any scoring runs. Uses the real scoring
 * registry + governance registries (all pure) — no DB.
 */

jest.setTimeout(15000);

const { analyze, normalizeTrajectory } = require('../measures/intelligence/analyze');

// Berg = public-domain, higher_better, 14 items 0-4.
const bergMeasure = {
  code: 'BERG',
  name: 'Berg Balance Scale',
  name_ar: 'مقياس بيرغ للتوازن',
  purpose: 'severity',
  direction: 'higher_better',
};
const fullBergRaw = Array(14).fill(4); // perfect 56

describe('W719 — trajectory normalization', () => {
  test('maps trend lower_snake codes to synthesizer UPPER_SNAKE vocab', () => {
    expect(normalizeTrajectory('linear_improvement')).toBe('SUSTAINED_IMPROVEMENT');
    expect(normalizeTrajectory('slow_improvement')).toBe('SLOW_PROGRESS');
    expect(normalizeTrajectory('plateau')).toBe('PLATEAU');
    expect(normalizeTrajectory('regression')).toBe('REGRESSION');
    expect(normalizeTrajectory('insufficient_data')).toBe('INSUFFICIENT_DATA');
  });

  test('accepts already-normalized codes + undefined', () => {
    expect(normalizeTrajectory('REGRESSION')).toBe('REGRESSION');
    expect(normalizeTrajectory(undefined)).toBeUndefined();
  });
});

describe('W719 — analyze() happy path (Berg, public domain)', () => {
  const result = analyze({
    measure: bergMeasure,
    raw: fullBergRaw,
    previous: 40,
    trajectory: 'linear_improvement',
  });

  test('not blocked + governance permits digitization', () => {
    expect(result.blocked).toBe(false);
    expect(result.governance.digitization.allowed).toBe(true);
  });

  test('scoring layer computed derived value + band', () => {
    expect(result.scoring.value).toBe(56);
    expect(result.scoring.band.tier).toBe('low'); // low fall risk at 56
    expect(result.scoring.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('delta computed against previous administration', () => {
    expect(result.scoring.delta).toBeTruthy();
  });

  test('trajectory normalized into the fused output', () => {
    expect(result.trajectory).toBe('SUSTAINED_IMPROVEMENT');
  });

  test('narrative fuses band + trajectory bilingually', () => {
    expect(result.narrative.headline.ar.length).toBeGreaterThan(0);
    expect(result.narrative.headline.en).toContain('Berg');
    const sources = result.narrative.drivers.map(d => d.source);
    expect(sources).toContain('interpretation_band');
    expect(sources).toContain('trend_classification');
  });
});

describe('W719 — psychometrics fusion', () => {
  test('norm produces a normative driver in the narrative', () => {
    const result = analyze({
      measure: bergMeasure,
      raw: fullBergRaw,
      norm: { mean: 45, sd: 5 },
    });
    expect(result.normative).toBeTruthy();
    expect(result.normative.z).toBeGreaterThan(0);
    const sources = result.narrative.drivers.map(d => d.source);
    expect(sources).toContain('normative_position');
  });

  test('RCI fusion classifies reliable change', () => {
    const result = analyze({
      measure: bergMeasure,
      raw: fullBergRaw, // 56
      baselineValue: 40,
      psychometric: { sdBaseline: 6, reliability: 0.9, clinicalCutoff: 45 },
    });
    expect(result.change).toBeTruthy();
    expect(['improved', 'recovered']).toContain(result.change.outcome);
    expect(result.change.reliable).toBe(true);
  });
});

describe('W719 — governance hard-block (proprietary instrument)', () => {
  // CARS-2 is proprietary → must NOT be scored even if raw is supplied.
  const carsMeasure = {
    code: 'CARS-2',
    name: 'CARS-2',
    name_ar: 'مقياس تقدير التوحد',
    purpose: 'diagnostic',
    direction: 'higher_better',
  };

  test('blocks digitization + skips scoring entirely', () => {
    const result = analyze({ measure: carsMeasure, raw: [1, 2, 3] });
    expect(result.blocked).toBe(true);
    expect(result.scoring).toBeNull();
    expect(result.governance.digitization.allowed).toBe(false);
    expect(result.blockReason).toBeTruthy();
  });

  test('proprietary becomes allowed once permission is on file', () => {
    const result = analyze({
      measure: carsMeasure,
      raw: undefined,
      digitization: { permissionRef: 'LICENSE-2026-001' },
    });
    expect(result.governance.digitization.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });
});

describe('W719 — screening intent advisory', () => {
  const mchat = {
    code: 'M-CHAT-R',
    name: 'M-CHAT-R',
    name_ar: 'مؤشر التوحد للأطفال',
    purpose: 'screening',
    direction: 'lower_better',
  };

  test('screening tool used for diagnosis flags confirmatory referral', () => {
    const result = analyze({ measure: mchat, intent: 'diagnostic' });
    expect(result.governance.requiresConfirmatory).toBe(true);
    expect(result.governance.advisory).toBeTruthy();
    expect(result.narrative.flags.some(f => f.type === 'SCREENING_NOT_DIAGNOSTIC')).toBe(true);
    expect(result.narrative.recommendation.action).toBe('refer_for_diagnostic_assessment');
  });
});

describe('W719 — contract guards', () => {
  test('throws without a measure code', () => {
    expect(() => analyze({})).toThrow(/measure/i);
  });
});
