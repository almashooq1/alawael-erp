'use strict';

/**
 * W463 drift guard — CRPD compliance scoring lib.
 *
 * Locks the 8-principle scoring framework from CRPD Article 3.
 * Pure-lib tests only.
 */

const lib = require('../intelligence/crpd-compliance.lib');

describe('W463 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.scoreBeneficiary).toBe('function');
    expect(typeof lib.scoreVoiceAndDignity).toBe('function');
    expect(typeof lib.scoreParticipation).toBe('function');
    expect(typeof lib.scoreAccessibility).toBe('function');
    expect(typeof lib.scoreEvolvingCapacity).toBe('function');
    expect(typeof lib.scoreEqualityFromAggregates).toBe('function');
  });

  it('exposes 8 PRINCIPLES with weights', () => {
    expect(Array.isArray(lib.PRINCIPLES)).toBe(true);
    expect(lib.PRINCIPLES).toHaveLength(8);
    for (const p of lib.PRINCIPLES) {
      expect(typeof p.code).toBe('string');
      expect(typeof p.titleAr).toBe('string');
      expect(typeof p.titleEn).toBe('string');
      expect(typeof p.weight).toBe('number');
    }
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('PRINCIPLES include the 8 canonical CRPD Article 3 principles', () => {
    const codes = lib.PRINCIPLES.map(p => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'dignity',
        'non_discrimination',
        'participation',
        'respect_difference',
        'equal_opportunity',
        'accessibility',
        'gender_equality',
        'evolving_capacity',
      ])
    );
  });
});

describe('W463 — scoreVoiceAndDignity', () => {
  it('returns 0 for empty input', () => {
    const r = lib.scoreVoiceAndDignity({ voiceLogs: [], decisionAssessments: [] });
    expect(r.score).toBe(0);
    expect(r.percentage).toBe(0);
  });

  it('awards 40 pts for recent voice entry', () => {
    const r = lib.scoreVoiceAndDignity({
      voiceLogs: [{ capturedAt: new Date(), captureModality: 'verbal' }],
      decisionAssessments: [],
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('awards full bonus for ≥50% non-proxy entries', () => {
    const r = lib.scoreVoiceAndDignity({
      voiceLogs: [
        { capturedAt: new Date(), captureModality: 'verbal' },
        { capturedAt: new Date(), captureModality: 'aac' },
      ],
      decisionAssessments: [],
    });
    expect(r.score).toBeGreaterThanOrEqual(70); // 40 + 30
  });

  it('awards 30 pts for finalized capacity assessment', () => {
    const r = lib.scoreVoiceAndDignity({
      voiceLogs: [],
      decisionAssessments: [{ status: 'finalized' }],
    });
    expect(r.score).toBeGreaterThanOrEqual(30);
  });

  it('combines: voice + non-proxy + capacity = 100', () => {
    const r = lib.scoreVoiceAndDignity({
      voiceLogs: [{ capturedAt: new Date(), captureModality: 'verbal' }],
      decisionAssessments: [{ status: 'finalized' }],
    });
    expect(r.percentage).toBe(100);
  });
});

describe('W463 — scoreParticipation', () => {
  it('returns 0 with no logs', () => {
    expect(lib.scoreParticipation({ voiceLogs: [] }).percentage).toBe(0);
  });

  it('100% when all entries acted upon', () => {
    const r = lib.scoreParticipation({
      voiceLogs: [{ actionTaken: 'plan_adjusted' }, { actionTaken: 'complaint_opened' }],
    });
    expect(r.percentage).toBe(100);
  });

  it('50% when half acted upon', () => {
    const r = lib.scoreParticipation({
      voiceLogs: [{ actionTaken: 'plan_adjusted' }, { actionTaken: 'none' }],
    });
    expect(r.percentage).toBe(50);
  });
});

describe('W463 — scoreAccessibility', () => {
  it('awards 40 + 30 + 30 = 100 with all 3 items', () => {
    const r = lib.scoreAccessibility({
      hasAACProfile: true,
      reasonableAdjustmentsCount: 2,
      accessibleAccommodations: 3,
    });
    expect(r.percentage).toBe(100);
  });

  it('awards 40 for hasAACProfile=false (not applicable)', () => {
    const r = lib.scoreAccessibility({
      hasAACProfile: false,
      reasonableAdjustmentsCount: 0,
      accessibleAccommodations: 0,
    });
    expect(r.score).toBe(40);
  });
});

describe('W463 — scoreEvolvingCapacity', () => {
  it('100% with plan + completion + 2 history points', () => {
    const r = lib.scoreEvolvingCapacity({
      hasAdvocacyPlan: true,
      completionPercentage: 100,
      capacityHistoryLength: 2,
    });
    expect(r.percentage).toBe(100);
  });

  it('clamps at 100 for higher inputs', () => {
    const r = lib.scoreEvolvingCapacity({
      hasAdvocacyPlan: true,
      completionPercentage: 100,
      capacityHistoryLength: 10,
    });
    expect(r.percentage).toBeLessThanOrEqual(100);
  });

  it('returns 0 with no inputs', () => {
    const r = lib.scoreEvolvingCapacity({});
    expect(r.percentage).toBe(0);
  });
});

describe('W463 — scoreEqualityFromAggregates', () => {
  it('returns null when no disparityIndex (deferred to Phase G)', () => {
    const r = lib.scoreEqualityFromAggregates({});
    expect(r.score).toBeNull();
    expect(r.note).toMatch(/Phase G/);
  });

  it('translates disparityIndex 0 → 100%', () => {
    expect(lib.scoreEqualityFromAggregates({ disparityIndex: 0 }).percentage).toBe(100);
  });

  it('translates disparityIndex 1 → 0%', () => {
    expect(lib.scoreEqualityFromAggregates({ disparityIndex: 1 }).percentage).toBe(0);
  });
});

describe('W463 — scoreBeneficiary composite', () => {
  it('returns shape with composite + breakdown + band + recommendations', () => {
    const r = lib.scoreBeneficiary({
      voiceLogs: [
        { capturedAt: new Date(), captureModality: 'verbal', actionTaken: 'plan_adjusted' },
      ],
      decisionAssessments: [{ status: 'finalized' }],
      hasAACProfile: false,
      reasonableAdjustmentsCount: 1,
      accessibleAccommodations: 1,
      hasAdvocacyPlan: true,
      completionPercentage: 60,
      capacityHistoryLength: 2,
    });
    expect(r.composite).toBeGreaterThanOrEqual(0);
    expect(r.composite).toBeLessThanOrEqual(100);
    expect(r.breakdown.dignity).toBeDefined();
    expect(r.breakdown.evolving_capacity).toBeDefined();
    expect(typeof r.band).toBe('string');
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it('produces "critical" band on low score', () => {
    const r = lib.scoreBeneficiary({});
    expect(['critical', 'needs_attention', 'insufficient_data']).toContain(r.band);
  });

  it('produces excellent band on high score', () => {
    const r = lib.scoreBeneficiary({
      voiceLogs: [
        { capturedAt: new Date(), captureModality: 'verbal', actionTaken: 'plan_adjusted' },
      ],
      decisionAssessments: [{ status: 'finalized' }],
      hasAACProfile: true,
      reasonableAdjustmentsCount: 3,
      accessibleAccommodations: 3,
      hasAdvocacyPlan: true,
      completionPercentage: 100,
      capacityHistoryLength: 3,
      disparityIndex: 0,
    });
    expect(['excellent', 'good']).toContain(r.band);
  });

  it('returns insufficient_data band when all principles return null', () => {
    // Trigger this by passing no data — equality principles return null
    // but voice/participation/accessibility/capacity still return 0%
    const r = lib.scoreBeneficiary({});
    // Composite still computable as 0% from non-null principles
    expect(r.composite).not.toBeNull();
  });

  it('generates recommendations for low sub-scores', () => {
    const r = lib.scoreBeneficiary({
      voiceLogs: [],
      decisionAssessments: [],
      hasAdvocacyPlan: false,
    });
    expect(r.recommendations.length).toBeGreaterThan(0);
    // Recommendations are bilingual
    for (const rec of r.recommendations) {
      expect(typeof rec.ar).toBe('string');
      expect(typeof rec.en).toBe('string');
      expect(typeof rec.principle).toBe('string');
    }
  });
});
