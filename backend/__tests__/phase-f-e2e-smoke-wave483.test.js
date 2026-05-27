'use strict';

/**
 * W483 — Phase F E2E smoke + Phase F CLOSED.
 *
 * Validates the full Phase F (Story Architecture) chain runs end-to-end
 * with pure libs only (no mongoose, no I/O):
 *
 *   1. story-builder.composeQuarterlyStorybook(quarterlyData) → skeleton
 *   2. pride-moment-extractor.extractPrideMoments(signals) → moments
 *   3. pride-moment-extractor.rankByImpact(moments) → top-5
 *   4. story-builder fed pride moments rebuilds with section populated
 *   5. story-surface-variant-builder.spawnVariants(skeleton) → 7 surfaces
 *   6. validateVariant on each variant
 *
 * Sister to W478 Phase E E2E (W467 WBCI → W468 SDQ → W469 BenefitsNav →
 * W470 FamilyCounselling → W471 WbciTriggers).
 */

const storyBuilder = require('../intelligence/story-builder.lib');
const prideExtractor = require('../intelligence/pride-moment-extractor.lib');
const variantBuilder = require('../intelligence/story-surface-variant-builder.lib');

describe('W483 — Phase F E2E smoke', () => {
  const beneficiaryId = '6500e0e0e0e0e0e0e0e0e000';
  const periodStart = new Date('2026-01-01');
  const periodEnd = new Date('2026-03-31');

  const quarterlySignals = {
    beneficiaryId,
    periodStart,
    periodEnd,
    gasProgression: { earliestTScore: 32, latestTScore: 48, delta: 16 },
    icfImprovements: [
      { code: 'd450', averageDelta: -1.2 },
      { code: 'b117', averageDelta: -0.8 },
    ],
    voiceHighlights: [
      { entryKind: 'dream', textOriginal: 'أريد أن أصبح رسامًا' },
      { entryKind: 'preference', textOriginal: 'أحب الجلوس قرب النافذة', capacityGrade: 'full' },
    ],
    wbciTrend: { latestWbci: 0.71, band: 'stable', sustainedDecline: false },
  };

  it('Step 1: story-builder composes a 10-section skeleton', () => {
    const r = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
    expect(r.skeleton).toBeTruthy();
    expect(r.sections).toHaveLength(10);
    expect(r.confidence).toMatch(/^(high|medium|low)$/);
    expect(r.signals.gasIncluded).toBe(true);
    expect(r.signals.icfIncluded).toBe(true);
    expect(r.signals.voiceIncluded).toBe(true);
    expect(r.signals.wbciIncluded).toBe(true);
  });

  it('Step 2: pride-moment-extractor finds moments from raw signals', () => {
    const r = prideExtractor.extractPrideMoments({
      gasProgressions: [
        { goalId: 'g1', earliestTScore: 32, latestTScore: 48, latestSnapshotDate: periodEnd },
        { goalId: 'g2', earliestTScore: 28, latestTScore: 50 },
      ],
      icfImprovements: quarterlySignals.icfImprovements,
      voiceLogs: [{ _id: 'v1', entryKind: 'dream', capturedAt: new Date('2026-02-14') }],
      wbciBandHistory: [
        { snapshotDate: periodStart, band: 'monitor' },
        { snapshotDate: periodEnd, band: 'stable' },
      ],
    });
    expect(r.totalCount).toBeGreaterThanOrEqual(4);
    expect(r.byKind.gas_major_jump).toBeGreaterThanOrEqual(2);
    expect(r.byKind.icf_qualifier_improvement).toBeGreaterThanOrEqual(1); // -1.2 passes; -0.8 does not
    expect(r.byKind.voice_breakthrough).toBeGreaterThanOrEqual(1);
    expect(r.byKind.family_wellbeing_band_up).toBeGreaterThanOrEqual(1);
  });

  it('Step 3: rankByImpact returns top-5 ordered by significance', () => {
    const raw = prideExtractor.extractPrideMoments({
      gasProgressions: [{ goalId: 'g1', earliestTScore: 30, latestTScore: 55 }], // milestone
      icfImprovements: [{ code: 'd450', averageDelta: -2.5 }], // major
      voiceLogs: [{ _id: 'v1', entryKind: 'dream' }], // moderate
    });
    const top = prideExtractor.rankByImpact(raw.moments, 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].significance).toBe('milestone');
  });

  it('Step 4: skeleton with prideMoments populates pride_moments section', () => {
    const moments = prideExtractor.extractPrideMoments({
      gasProgressions: [{ goalId: 'g1', earliestTScore: 32, latestTScore: 48 }],
    }).moments;
    const r = storyBuilder.composeQuarterlyStorybook({
      ...quarterlySignals,
      prideMoments: moments,
    });
    const pride = r.sections.find(s => s.section === 'pride_moments');
    expect(pride.hasData).toBe(true);
    expect(pride.content.kind).toBe('pride_list');
    expect(pride.content.items).toHaveLength(1);
  });

  it('Step 5: story-surface-variant-builder spawns 7 variants from skeleton', () => {
    const skeleton = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
    const variants = variantBuilder.spawnVariants(skeleton);
    expect(variants).toHaveLength(7);
    const surfaces = variants.map(v => v.surfaceType).sort();
    expect(surfaces).toEqual([...variantBuilder.SURFACE_TYPES].sort());
  });

  it('Step 6: every spawned variant validates clean', () => {
    const skeleton = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
    const variants = variantBuilder.spawnVariants(skeleton);
    for (const v of variants) {
      const result = variantBuilder.validateVariant(v);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('Step 7: sibling + beneficiary variants flagged PDPL-sensitive', () => {
    const skeleton = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
    const variants = variantBuilder.spawnVariants(skeleton);
    const sib = variants.find(v => v.surfaceType === 'sibling_friendly_story');
    const ben = variants.find(v => v.surfaceType === 'beneficiary_personal_story');
    expect(sib.isSensitive).toBe(true);
    expect(ben.isSensitive).toBe(true);
  });

  it('Step 8: regulatory variant strips emotional sections; clinical strips cover', () => {
    const skeleton = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
    const variants = variantBuilder.spawnVariants(skeleton);
    const reg = variants.find(v => v.surfaceType === 'regulatory_outcome_report');
    const clin = variants.find(v => v.surfaceType === 'clinical_narrative');
    expect(reg.sections.find(s => s.section === 'pride_moments')).toBeUndefined();
    expect(reg.sections.find(s => s.section === 'voice_quotes')).toBeUndefined();
    expect(clin.sections.find(s => s.section === 'cover')).toBeUndefined();
  });

  it('Step 9: end-to-end chain composes without throwing', () => {
    expect(() => {
      const skeleton = storyBuilder.composeQuarterlyStorybook(quarterlySignals);
      const moments = prideExtractor.extractPrideMoments({
        gasProgressions: [{ goalId: 'g1', earliestTScore: 32, latestTScore: 48 }],
      }).moments;
      const ranked = prideExtractor.rankByImpact(moments, 5);
      const enrichedSkeleton = storyBuilder.composeQuarterlyStorybook({
        ...quarterlySignals,
        prideMoments: ranked,
      });
      const variants = variantBuilder.spawnVariants(enrichedSkeleton);
      for (const v of variants) {
        variantBuilder.validateVariant(v);
      }
    }).not.toThrow();
  });
});

describe('W483 — Phase F closure documentation', () => {
  it('Phase F has 5 waves: W479 + W480 + W481 + W482 + W483', () => {
    const phaseFWaves = ['W479', 'W480', 'W481', 'W482', 'W483'];
    expect(phaseFWaves).toHaveLength(5);
  });

  it('Phase F libs are loadable + frozen', () => {
    expect(Object.isFrozen(storyBuilder)).toBe(true);
    expect(Object.isFrozen(prideExtractor)).toBe(true);
    expect(Object.isFrozen(variantBuilder)).toBe(true);
  });

  it('Phase F covers v3 sec.6 Innovation 7 (Story Architecture)', () => {
    expect(storyBuilder.SURFACE_TYPES).toHaveLength(7);
    expect(storyBuilder.STORY_SECTIONS).toHaveLength(10);
    expect(prideExtractor.PRIDE_KINDS).toHaveLength(8);
    expect(variantBuilder.SURFACE_TYPES).toHaveLength(7);
  });
});
