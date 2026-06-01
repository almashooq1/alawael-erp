'use strict';

/**
 * measures-explain-wave718.test.js — W718.
 *
 * The explainable synthesizer composes already-computed signals into ONE
 * bilingual narrative where every conclusion names its driver. Verifies:
 *   • headline fuses band + trajectory in both languages
 *   • drivers[] cite their source for auditability
 *   • recommendation action follows the safety-first priority
 *   • screening + regression raise the right flags
 */

jest.setTimeout(15000);

const { synthesize, pickAction, ACTIONS } = require('../measures/explain/synthesize');

const baseMeasure = {
  code: 'PEDSQL',
  name: 'PedsQL',
  name_ar: 'جودة الحياة',
  purpose: 'quality_of_life',
};

describe('W718 — pickAction priority', () => {
  test('positive screening always refers for diagnostic assessment', () => {
    expect(
      pickAction({
        trajectory: 'SUSTAINED_IMPROVEMENT',
        rciOutcome: 'improved',
        isScreeningPositive: true,
      })
    ).toBe(ACTIONS.REFER_DIAGNOSTIC);
  });

  test('regression escalates', () => {
    expect(pickAction({ trajectory: 'REGRESSION' })).toBe(ACTIONS.ESCALATE);
    expect(pickAction({ rciOutcome: 'deteriorated' })).toBe(ACTIONS.ESCALATE);
  });

  test('plateau / stagnant adjusts plan', () => {
    expect(pickAction({ trajectory: 'PLATEAU' })).toBe(ACTIONS.ADJUST_PLAN);
    expect(pickAction({ trajectory: 'STAGNANT' })).toBe(ACTIONS.ADJUST_PLAN);
  });

  test('insufficient data gathers more', () => {
    expect(pickAction({ trajectory: 'INSUFFICIENT_DATA' })).toBe(ACTIONS.GATHER_MORE);
  });

  test('ceiling / recovered celebrates taper', () => {
    expect(pickAction({ trajectory: 'CEILING_ACHIEVED' })).toBe(ACTIONS.CELEBRATE_TAPER);
    expect(pickAction({ rciOutcome: 'recovered' })).toBe(ACTIONS.CELEBRATE_TAPER);
  });

  test('sustained improvement continues plan', () => {
    expect(pickAction({ trajectory: 'SUSTAINED_IMPROVEMENT' })).toBe(ACTIONS.CONTINUE);
  });
});

describe('W718 — synthesize narrative', () => {
  test('headline fuses band + trajectory bilingually', () => {
    const out = synthesize({
      measure: baseMeasure,
      bandLabel: 'Good HRQOL',
      bandLabel_ar: 'جودة حياة جيدة',
      trajectory: 'SUSTAINED_IMPROVEMENT',
    });
    expect(out.headline.ar).toContain('جودة حياة جيدة');
    expect(out.headline.ar).toContain('تحسّن');
    expect(out.headline.en).toContain('Good HRQOL');
    expect(out.headline.en).toContain('improvement');
  });

  test('drivers cite each evidence source', () => {
    const out = synthesize({
      measure: baseMeasure,
      bandLabel: 'Average',
      bandLabel_ar: 'متوسط',
      trajectory: 'SLOW_PROGRESS',
      norm: { t: 55, percentile: 69, band: 'average' },
      change: { outcome: 'improved', rci: 2.3, reliable: true },
    });
    const sources = out.drivers.map(d => d.source);
    expect(sources).toContain('interpretation_band');
    expect(sources).toContain('trend_classification');
    expect(sources).toContain('normative_position');
    expect(sources).toContain('reliable_change_index');
    // every driver bilingual
    for (const d of out.drivers) {
      expect(d.ar.length).toBeGreaterThan(0);
      expect(d.en.length).toBeGreaterThan(0);
    }
  });

  test('normative driver surfaces percentile + T-score', () => {
    const out = synthesize({
      measure: baseMeasure,
      norm: { t: 55, percentile: 69 },
    });
    const nd = out.drivers.find(d => d.source === 'normative_position');
    expect(nd.en).toContain('69th percentile');
    expect(nd.en).toContain('T-score 55');
  });

  test('screening advisory raises SCREENING_NOT_DIAGNOSTIC flag + referral action', () => {
    const out = synthesize({
      measure: { code: 'M-CHAT-R', name: 'M-CHAT-R', purpose: 'screening' },
      bandLabel: 'High risk',
      advisory: { ar: 'أداة فرز وليست تشخيصًا', en: 'screening not diagnosis', action: 'REFER' },
    });
    expect(out.flags.some(f => f.type === 'SCREENING_NOT_DIAGNOSTIC')).toBe(true);
    expect(out.recommendation.action).toBe(ACTIONS.REFER_DIAGNOSTIC);
  });

  test('regression raises RELIABLE_DECLINE flag + escalate action', () => {
    const out = synthesize({
      measure: baseMeasure,
      bandLabel: 'Below average',
      trajectory: 'REGRESSION',
      change: { outcome: 'deteriorated', rci: -2.4, reliable: true },
    });
    expect(out.flags.some(f => f.type === 'RELIABLE_DECLINE')).toBe(true);
    expect(out.recommendation.action).toBe(ACTIONS.ESCALATE);
  });

  test('recommendation always bilingual + carries machine action', () => {
    const out = synthesize({ measure: baseMeasure, trajectory: 'STABLE' });
    expect(out.recommendation.action).toBeTruthy();
    expect(out.recommendation.ar.length).toBeGreaterThan(0);
    expect(out.recommendation.en.length).toBeGreaterThan(0);
  });

  test('degrades gracefully with empty signals', () => {
    const out = synthesize({});
    expect(out.headline).toBeTruthy();
    expect(Array.isArray(out.drivers)).toBe(true);
    expect(Array.isArray(out.flags)).toBe(true);
    expect(out.recommendation.action).toBe(ACTIONS.CONTINUE);
  });
});
