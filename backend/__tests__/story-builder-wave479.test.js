'use strict';

/**
 * W479 drift guard — story-builder.lib (Phase F).
 */

const lib = require('../intelligence/story-builder.lib');

describe('W479 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.composeQuarterlyStorybook).toBe('function');
    expect(typeof lib.buildLlmPromptPlan).toBe('function');
    expect(typeof lib.composeSection).toBe('function');
    expect(typeof lib.validateInput).toBe('function');
  });

  it('exposes SURFACE_TYPES + STORY_SECTIONS', () => {
    expect(Array.isArray(lib.SURFACE_TYPES)).toBe(true);
    expect(Array.isArray(lib.STORY_SECTIONS)).toBe(true);
    expect(lib.SURFACE_TYPES.length).toBeGreaterThanOrEqual(7);
    expect(lib.STORY_SECTIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('SURFACE_TYPES includes 7-audience variants', () => {
    expect(lib.SURFACE_TYPES).toContain('family_quarterly_storybook');
    expect(lib.SURFACE_TYPES).toContain('family_annual_chronicle');
    expect(lib.SURFACE_TYPES).toContain('beneficiary_personal_story');
    expect(lib.SURFACE_TYPES).toContain('sibling_friendly_story');
    expect(lib.SURFACE_TYPES).toContain('extended_family_summary');
    expect(lib.SURFACE_TYPES).toContain('clinical_narrative');
    expect(lib.SURFACE_TYPES).toContain('regulatory_outcome_report');
  });

  it('STORY_SECTIONS includes canonical 10 sections', () => {
    expect(lib.STORY_SECTIONS).toEqual([
      'cover',
      'highlights',
      'progress_timeline',
      'gas_trajectory',
      'icf_improvements',
      'pride_moments',
      'voice_quotes',
      'family_role',
      'next_quarter_goals',
      'closing',
    ]);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W479 — validateInput', () => {
  it('accepts valid input', () => {
    const r = lib.validateInput({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    });
    expect(r.valid).toBe(true);
  });

  it('rejects missing beneficiaryId', () => {
    const r = lib.validateInput({
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('MISSING_BENEFICIARY_ID');
  });

  it('rejects missing period', () => {
    const r = lib.validateInput({ beneficiaryId: 'b1' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('MISSING_PERIOD');
  });

  it('rejects inverted period', () => {
    const r = lib.validateInput({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-06-01'),
      periodEnd: new Date('2026-01-01'),
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('PERIOD_START_AFTER_END');
  });

  it('rejects non-object', () => {
    expect(lib.validateInput(null).valid).toBe(false);
  });
});

describe('W479 — composeQuarterlyStorybook (full data)', () => {
  let result;
  beforeAll(() => {
    result = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      gasProgression: {
        earliestTScore: 45,
        latestTScore: 56,
        delta: 11,
      },
      icfImprovements: [
        { code: 'd450', averageDelta: -1 },
        { code: 'b117', averageDelta: -0.5 },
      ],
      voiceHighlights: [{ capturedAt: new Date(), content: { text: 'أريد المشي وحدي' } }],
      prideMoments: [{ description: 'First independent steps', date: new Date('2026-02-15') }],
      wbciTrend: { latestWbci: 72, band: 'stable', sustainedDecline: false },
      lang: 'ar',
    });
  });

  it('returns skeleton with full data', () => {
    expect(result.skeleton).not.toBeNull();
    expect(result.skeleton.beneficiaryId).toBe('b1');
    expect(result.skeleton.surfaceType).toBe('family_quarterly_storybook');
    expect(result.skeleton.lang).toBe('ar');
  });

  it('returns 10 sections', () => {
    expect(result.sections).toHaveLength(10);
  });

  it('every section has title + content + hasData', () => {
    for (const s of result.sections) {
      expect(s.section).toBeDefined();
      expect(typeof s.title).toBe('string');
      expect(typeof s.hasData).toBe('boolean');
    }
  });

  it('gas_trajectory section has correct shape', () => {
    const gas = result.sections.find(s => s.section === 'gas_trajectory');
    expect(gas.content.kind).toBe('gas_trajectory');
    expect(gas.content.latestTScore).toBe(56);
    expect(gas.content.delta).toBe(11);
    expect(gas.hasData).toBe(true);
  });

  it('icf_improvements section has list shape', () => {
    const icf = result.sections.find(s => s.section === 'icf_improvements');
    expect(icf.content.kind).toBe('icf_list');
    expect(icf.content.items.length).toBeLessThanOrEqual(5);
  });

  it('voice_quotes section limits to 3 items', () => {
    const voice = result.sections.find(s => s.section === 'voice_quotes');
    expect(voice.content.kind).toBe('quotes');
    expect(voice.content.items.length).toBeLessThanOrEqual(3);
  });

  it('Arabic section titles when lang=ar', () => {
    const cover = result.sections.find(s => s.section === 'cover');
    expect(cover.title).toMatch(/الغلاف/);
  });

  it('signals capture all 5 data flags', () => {
    expect(result.signals.gasIncluded).toBe(true);
    expect(result.signals.icfIncluded).toBe(true);
    expect(result.signals.voiceIncluded).toBe(true);
    expect(result.signals.prideIncluded).toBe(true);
    expect(result.signals.wbciIncluded).toBe(true);
  });

  it('confidence is high for full data', () => {
    expect(result.confidence).toBe('high');
    expect(result.fallbackToTemplates).toBe(false);
  });
});

describe('W479 — composeQuarterlyStorybook (partial data)', () => {
  it('confidence is low with no data sources', () => {
    const r = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    });
    expect(r.confidence).toBe('low');
    expect(r.fallbackToTemplates).toBe(true);
  });

  it('confidence is medium with some data', () => {
    const r = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      gasProgression: { earliestTScore: 45, latestTScore: 52, delta: 7 },
      voiceHighlights: [{ capturedAt: new Date(), content: { text: 'something' } }],
    });
    expect(r.confidence).toBe('medium');
  });

  it('English section titles when lang=en', () => {
    const r = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      lang: 'en',
    });
    const cover = r.sections.find(s => s.section === 'cover');
    expect(cover.title).toBe('Cover');
  });

  it('honors custom surfaceType', () => {
    const r = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      surfaceType: 'sibling_friendly_story',
    });
    expect(r.skeleton.surfaceType).toBe('sibling_friendly_story');
  });
});

describe('W479 — buildLlmPromptPlan', () => {
  it('returns prompt plan from skeleton', () => {
    const skeleton = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      gasProgression: { earliestTScore: 45, latestTScore: 56, delta: 11 },
    });
    const plan = lib.buildLlmPromptPlan(skeleton);
    expect(plan).not.toBeNull();
    expect(plan.audience).toBeDefined();
    expect(plan.lang).toBeDefined();
    expect(plan.sectionsToGenerate.length).toBeGreaterThanOrEqual(1);
  });

  it('only includes sections with data', () => {
    const skeleton = lib.composeQuarterlyStorybook({
      beneficiaryId: 'b1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
      gasProgression: { earliestTScore: 45, latestTScore: 56, delta: 11 },
    });
    const plan = lib.buildLlmPromptPlan(skeleton);
    const sectionCodes = plan.sectionsToGenerate.map(s => s.section);
    expect(sectionCodes).toContain('gas_trajectory');
    expect(sectionCodes).not.toContain('voice_quotes'); // no voice data passed
  });

  it('returns null for invalid input', () => {
    expect(lib.buildLlmPromptPlan(null)).toBeNull();
  });
});

describe('W479 — composeSection', () => {
  it('builds single-section snippet', () => {
    const r = lib.composeSection(
      {
        gasProgression: { earliestTScore: 45, latestTScore: 56, delta: 11 },
      },
      'gas_trajectory',
      'ar'
    );
    expect(r.section).toBe('gas_trajectory');
    expect(r.title).toMatch(/تطور/);
    expect(r.content.delta).toBe(11);
  });

  it('returns null for unknown section', () => {
    expect(lib.composeSection({}, 'unknown_section')).toBeNull();
  });
});
