'use strict';

/**
 * clinical-report-narrative-engine-wave257.test.js — Wave 257.
 *
 * Pure-function tests for the slot-driven narrative engine that backs
 * the future ClinicalOutcomeReport renderers. The engine itself is
 * scaffolding (not yet wired to W240/W242/W245); these tests are the
 * contract those future integrations will depend on.
 *
 * Coverage:
 *   - magnitudeWord across all 4 tiers × both audiences
 *   - confidenceHedge across all 3 levels × both audiences
 *   - directionVerb: improvement vs decline × higher/lower_better × audiences
 *   - familyMeasureLabel: known codes + prefix-match + unknown
 *   - periodFamilyLabel: all 4 windows + edge cases
 *   - renderNarrative: all 5 situations × 2 audiences render cleanly
 *   - slot substitution: present / missing / null / empty-string handling
 *   - scrubFamilyJargon: catches forbidden tokens, allows safe text
 *   - renderFamilyNarrative: composes render + scrub correctly
 *   - constants frozen + complete (every SITUATION has both audiences)
 */

const {
  renderNarrative,
  renderFamilyNarrative,
  scrubFamilyJargon,
  magnitudeWord,
  confidenceHedge,
  directionVerb,
  familyMeasureLabel,
  periodFamilyLabel,
  FamilyJargonLeak,
  AUDIENCE,
  SITUATION,
  TEMPLATES,
  MAGNITUDE_TIERS_CLINICAL,
  MAGNITUDE_TIERS_FAMILY,
  CONFIDENCE_HEDGE,
  DIRECTION_VERBS,
  FAMILY_MEASURE_LABELS,
  FAMILY_JARGON_BLACKLIST,
} = require('../services/clinicalReportNarrativeEngine.service');

// ─── magnitudeWord ────────────────────────────────────────────────────

describe('magnitudeWord', () => {
  describe('clinical audience', () => {
    test('factor ≥ 5 returns كبير جداً', () => {
      expect(magnitudeWord(20, 4, 'clinical')).toBe('كبير جداً');
      expect(magnitudeWord(100, 10, 'clinical')).toBe('كبير جداً');
    });
    test('factor in [2, 5) returns كبير', () => {
      expect(magnitudeWord(8, 4, 'clinical')).toBe('كبير');
      expect(magnitudeWord(2, 1, 'clinical')).toBe('كبير');
    });
    test('factor in [1, 2) returns ملحوظ', () => {
      expect(magnitudeWord(4, 4, 'clinical')).toBe('ملحوظ');
      expect(magnitudeWord(5, 4, 'clinical')).toBe('ملحوظ');
    });
    test('factor < 1 returns هامشي', () => {
      expect(magnitudeWord(2, 4, 'clinical')).toBe('هامشي');
      expect(magnitudeWord(0, 4, 'clinical')).toBe('هامشي');
    });
  });

  describe('family audience', () => {
    test('uses family tier labels not clinical ones', () => {
      expect(magnitudeWord(20, 4, 'family')).toBe('واضح جداً');
      expect(magnitudeWord(8, 4, 'family')).toBe('واضح');
      expect(magnitudeWord(4, 4, 'family')).toBe('ملحوظ');
      expect(magnitudeWord(2, 4, 'family')).toBe('بسيط');
    });
  });

  describe('edge cases', () => {
    test('mcid=0 falls back to lowest tier', () => {
      expect(magnitudeWord(10, 0, 'clinical')).toBe('هامشي');
      expect(magnitudeWord(10, 0, 'family')).toBe('بسيط');
    });
    test('non-finite inputs fall back to lowest tier', () => {
      expect(magnitudeWord(NaN, 4, 'clinical')).toBe('هامشي');
      expect(magnitudeWord(10, undefined, 'family')).toBe('بسيط');
    });
    test('absolute value applied to negative delta', () => {
      expect(magnitudeWord(-20, 4, 'clinical')).toBe('كبير جداً');
    });
  });
});

// ─── confidenceHedge ──────────────────────────────────────────────────

describe('confidenceHedge', () => {
  test('clinical hedges', () => {
    expect(confidenceHedge('high', 'clinical')).toBe('');
    expect(confidenceHedge('moderate', 'clinical')).toContain('للبيانات المتاحة');
    expect(confidenceHedge('low', 'clinical')).toContain('قلة عدد القياسات');
  });
  test('family hedges differ from clinical ones', () => {
    expect(confidenceHedge('high', 'family')).toBe('');
    expect(confidenceHedge('moderate', 'family')).toContain('القياسات الأخيرة');
    expect(confidenceHedge('low', 'family')).toContain('مبكراً للجزم');
  });
  test('unknown level returns empty string (safe default)', () => {
    expect(confidenceHedge('garbage', 'clinical')).toBe('');
    expect(confidenceHedge(undefined, 'family')).toBe('');
  });
});

// ─── directionVerb ────────────────────────────────────────────────────

describe('directionVerb', () => {
  test('improvement × higher_better × clinical = ارتفعت', () => {
    expect(directionVerb('improvement', 'higher_better', 'clinical')).toBe('ارتفعت');
  });
  test('improvement × lower_better × clinical = انخفضت', () => {
    expect(directionVerb('improvement', 'lower_better', 'clinical')).toBe('انخفضت');
  });
  test('improvement family is تحسّنت regardless of scoringDirection', () => {
    expect(directionVerb('improvement', 'higher_better', 'family')).toBe('تحسّنت');
    expect(directionVerb('improvement', 'lower_better', 'family')).toBe('تحسّنت');
  });
  test('decline family is تراجعت regardless of scoringDirection', () => {
    expect(directionVerb('decline', 'higher_better', 'family')).toBe('تراجعت');
    expect(directionVerb('decline', 'lower_better', 'family')).toBe('تراجعت');
  });
  test('decline × higher_better × clinical = انخفضت', () => {
    expect(directionVerb('decline', 'higher_better', 'clinical')).toBe('انخفضت');
  });
  test('decline × lower_better × clinical = ارتفعت', () => {
    expect(directionVerb('decline', 'lower_better', 'clinical')).toBe('ارتفعت');
  });
  test('unknown scoringDirection defaults to higher_better', () => {
    expect(directionVerb('improvement', 'unknown', 'clinical')).toBe('ارتفعت');
  });
  test('unknown situation falls back to تغيّرت', () => {
    expect(directionVerb('unknown', 'higher_better', 'clinical')).toBe('تغيّرت');
  });
});

// ─── familyMeasureLabel ──────────────────────────────────────────────

describe('familyMeasureLabel', () => {
  test('returns family label for known codes', () => {
    expect(familyMeasureLabel('BERG')).toBe('اتزان الوقوف والجلوس');
    expect(familyMeasureLabel('GMFM-66')).toBe('الحركة الكبرى');
    expect(familyMeasureLabel('WeeFIM')).toBe('الأنشطة اليومية');
  });
  test('prefix-matches longer codes', () => {
    expect(familyMeasureLabel('GMFM-88-detailed-variant')).toBe('الحركة الكبرى');
  });
  test('returns null for unknown code', () => {
    expect(familyMeasureLabel('UNKNOWN_SCALE')).toBeNull();
  });
  test('returns null for non-string input', () => {
    expect(familyMeasureLabel(null)).toBeNull();
    expect(familyMeasureLabel(42)).toBeNull();
    expect(familyMeasureLabel(undefined)).toBeNull();
  });
});

// ─── periodFamilyLabel ────────────────────────────────────────────────

describe('periodFamilyLabel', () => {
  test('< 8 weeks → الشهر الماضي', () => {
    expect(periodFamilyLabel({ weeks: 4 })).toBe('الشهر الماضي');
    expect(periodFamilyLabel({ weeks: 7 })).toBe('الشهر الماضي');
  });
  test('[8, 16) → الفصل الماضي', () => {
    expect(periodFamilyLabel({ weeks: 8 })).toBe('الفصل الماضي');
    expect(periodFamilyLabel({ weeks: 15 })).toBe('الفصل الماضي');
  });
  test('[16, 28) → الأشهر الستة الماضية', () => {
    expect(periodFamilyLabel({ weeks: 20 })).toBe('الأشهر الستة الماضية');
  });
  test('≥ 28 → منذ بداية الخطة الحالية', () => {
    expect(periodFamilyLabel({ weeks: 40 })).toBe('منذ بداية الخطة الحالية');
  });
  test('missing / non-finite / zero weeks → safe default', () => {
    expect(periodFamilyLabel({})).toBe('الفترة الأخيرة');
    expect(periodFamilyLabel({ weeks: -1 })).toBe('الفترة الأخيرة');
    expect(periodFamilyLabel(undefined)).toBe('الفترة الأخيرة');
  });
});

// ─── renderNarrative ──────────────────────────────────────────────────

describe('renderNarrative', () => {
  describe('all 5 situations × 2 audiences', () => {
    for (const sit of Object.values(SITUATION)) {
      for (const aud of Object.values(AUDIENCE)) {
        test(`${sit} × ${aud} renders without leftover slot tokens`, () => {
          const slots = {
            measureCode_ar: 'BERG',
            verb_improvement: 'تحسّنت',
            verb_decline: 'تراجعت',
            magnitudeWord: 'كبير',
            deltaAbs: 12,
            delta: 12,
            mcidFactor: 3,
            mcidStatus_ar: 'مُؤسَّس',
            periodWeeks: 12,
            n: 5,
            hedge_confidence: '',
            slope: 0.5,
            ciLow: 0.2,
            ciHigh: 0.8,
            r2: 0.85,
            currentScore: 41,
            plateauWeeks: 8,
            sdc: 3,
            slopeLow: -0.1,
            slopeHigh: 0.2,
            baselineScore: 28,
            urgencyHours: 48,
            improvingMeasures: 'BERG',
            plateauMeasures: 'GMFM',
            nextDate: '2026-08-15',
            domainFamilyLabel: 'اتزان الوقوف',
            periodFamilyLabel: 'الفصل الماضي',
          };
          const out = renderNarrative(sit, slots, aud);
          expect(typeof out).toBe('string');
          expect(out.length).toBeGreaterThan(10);
          expect(out).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
        });
      }
    }
  });

  test('missing slot substitutes — fallback', () => {
    const out = renderNarrative(SITUATION.SUSTAINED_IMPROVEMENT, {}, AUDIENCE.CLINICAL);
    expect(out).toContain('—');
    expect(out).not.toMatch(/\{\{/);
  });

  test('null slot value substitutes — fallback', () => {
    const out = renderNarrative(
      SITUATION.PLATEAU,
      { currentScore: null, plateauWeeks: undefined, n: '' },
      AUDIENCE.CLINICAL
    );
    expect(out).toContain('—');
  });

  test('numeric slots stringified safely', () => {
    const out = renderNarrative(
      SITUATION.SUSTAINED_IMPROVEMENT,
      { deltaAbs: 12, n: 5 },
      AUDIENCE.CLINICAL
    );
    expect(out).toContain('12');
    expect(out).toContain('5');
  });

  test('unknown situation returns audience-appropriate fallback', () => {
    expect(renderNarrative('NOT_A_SITUATION', {}, 'clinical')).toContain('تعذّر');
    expect(renderNarrative('NOT_A_SITUATION', {}, 'family')).toContain('نتابع');
  });

  test('clinical templates include statistical terminology (intentional)', () => {
    const out = renderNarrative(
      SITUATION.SUSTAINED_IMPROVEMENT,
      { n: 5, slope: 0.5, r2: 0.85, ciLow: 0.2, ciHigh: 0.8 },
      AUDIENCE.CLINICAL
    );
    // Clinical readers expect these terms — verify they're not stripped
    expect(out).toMatch(/CI95|slope|MCID|R²/);
  });

  test('family templates omit statistical terminology', () => {
    const out = renderNarrative(
      SITUATION.SUSTAINED_IMPROVEMENT,
      {
        domainFamilyLabel: 'اتزان الوقوف',
        verb_improvement: 'تحسّنت',
        magnitudeWord: 'واضح',
        periodFamilyLabel: 'الفصل الماضي',
        hedge_confidence: '',
      },
      AUDIENCE.FAMILY
    );
    expect(out).not.toMatch(/MCID|SDC|CI ?95|slope|R²|n=/);
  });
});

// ─── scrubFamilyJargon ────────────────────────────────────────────────

describe('scrubFamilyJargon', () => {
  test('passes clean text through unchanged', () => {
    const ok = 'طفلكم تحسّن بشكل واضح في اتزان الوقوف منذ الشهر الماضي.';
    expect(scrubFamilyJargon(ok)).toBe(ok);
  });

  test.each([
    ['MCID was achieved'],
    ['SDC threshold exceeded'],
    ['CI95 contained zero'],
    ['BERG score dropped'],
    ['GMFM-66 showed progress'],
    ['WeeFIM ADL plateau'],
    ['CELF receptive language'],
    ['CARS-2 score'],
    ['PROMIS rating'],
    ['regression detected'],
    ['plateau observed'],
    ['standard score of 85'],
    ['percentile rank'],
    ['z-score = 1.5'],
    ['trajectory upward'],
    ['classification: PLATEAU'],
    ['confidence interval'],
    ['baseline value 28'],
    ['delta of 7 points'],
    ['n=5 admins'],
    ['R² = 0.85'],
  ])('catches forbidden token in "%s"', sample => {
    expect(() => scrubFamilyJargon(sample)).toThrow(FamilyJargonLeak);
  });

  test('error carries matched token + sample for debugging', () => {
    try {
      scrubFamilyJargon('MCID was achieved');
      throw new Error('should not reach');
    } catch (err) {
      expect(err).toBeInstanceOf(FamilyJargonLeak);
      expect(err.name).toBe('FamilyJargonLeak');
      expect(err.matchedToken).toMatch(/MCID/i);
      expect(err.sample).toContain('MCID');
    }
  });

  test('empty / non-string inputs pass through', () => {
    expect(scrubFamilyJargon('')).toBe('');
    expect(scrubFamilyJargon(null)).toBeNull();
    expect(scrubFamilyJargon(undefined)).toBeUndefined();
    expect(scrubFamilyJargon(42)).toBe(42);
  });
});

// ─── renderFamilyNarrative ────────────────────────────────────────────

describe('renderFamilyNarrative', () => {
  test('composes render + scrub correctly for clean output', () => {
    const out = renderFamilyNarrative(SITUATION.SUSTAINED_IMPROVEMENT, {
      domainFamilyLabel: 'اتزان الوقوف',
      verb_improvement: 'تحسّنت',
      magnitudeWord: 'واضح',
      periodFamilyLabel: 'الفصل الماضي',
      hedge_confidence: '',
    });
    expect(out).toContain('اتزان الوقوف');
    expect(out).toContain('تحسّنت');
    expect(out).toContain('واضح');
  });

  test('every shipped family template renders jargon-clean', () => {
    // Defensive: walk every SITUATION and ensure family rendering
    // never violates the scrub. Catches future template authoring
    // that accidentally introduces forbidden tokens.
    const safeSlots = {
      domainFamilyLabel: 'اتزان الوقوف',
      verb_improvement: 'تحسّنت',
      verb_decline: 'تراجعت',
      magnitudeWord: 'واضح',
      periodFamilyLabel: 'الفصل الماضي',
      hedge_confidence: '',
      nextDate: '٢٠٢٦/٠٨/١٥',
    };
    for (const sit of Object.values(SITUATION)) {
      expect(() => renderFamilyNarrative(sit, safeSlots)).not.toThrow();
    }
  });
});

// ─── Contract ─────────────────────────────────────────────────────────

describe('engine contract', () => {
  test('AUDIENCE + SITUATION enums frozen', () => {
    expect(Object.isFrozen(AUDIENCE)).toBe(true);
    expect(Object.isFrozen(SITUATION)).toBe(true);
    expect(AUDIENCE).toEqual({ CLINICAL: 'clinical', FAMILY: 'family' });
  });

  test('every SITUATION has both clinical + family templates', () => {
    for (const sit of Object.values(SITUATION)) {
      expect(TEMPLATES[sit]).toBeDefined();
      expect(typeof TEMPLATES[sit].clinical).toBe('string');
      expect(typeof TEMPLATES[sit].family).toBe('string');
      expect(TEMPLATES[sit].clinical.length).toBeGreaterThan(20);
      expect(TEMPLATES[sit].family.length).toBeGreaterThan(20);
    }
  });

  test('magnitude tiers have descending min thresholds', () => {
    for (const tiers of [MAGNITUDE_TIERS_CLINICAL, MAGNITUDE_TIERS_FAMILY]) {
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].min).toBeLessThanOrEqual(tiers[i - 1].min);
      }
    }
  });

  test('CONFIDENCE_HEDGE has all 3 levels for both audiences', () => {
    for (const aud of ['clinical', 'family']) {
      expect(CONFIDENCE_HEDGE[aud].high).toBeDefined();
      expect(CONFIDENCE_HEDGE[aud].moderate).toBeDefined();
      expect(CONFIDENCE_HEDGE[aud].low).toBeDefined();
    }
  });

  test('DIRECTION_VERBS has both situations × scoringDirections × audiences', () => {
    for (const sit of ['improvement', 'decline']) {
      for (const dir of ['higher_better', 'lower_better']) {
        for (const aud of ['clinical', 'family']) {
          expect(DIRECTION_VERBS[sit][dir][aud]).toBeDefined();
          expect(typeof DIRECTION_VERBS[sit][dir][aud]).toBe('string');
        }
      }
    }
  });

  test('FAMILY_MEASURE_LABELS frozen + non-empty values', () => {
    expect(Object.isFrozen(FAMILY_MEASURE_LABELS)).toBe(true);
    for (const v of Object.values(FAMILY_MEASURE_LABELS)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test('FAMILY_JARGON_BLACKLIST frozen + only RegExp entries', () => {
    expect(Object.isFrozen(FAMILY_JARGON_BLACKLIST)).toBe(true);
    for (const entry of FAMILY_JARGON_BLACKLIST) {
      expect(entry).toBeInstanceOf(RegExp);
    }
  });
});
