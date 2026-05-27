'use strict';

/**
 * W482 drift guard — story-surface-variant-builder.lib.js (Phase F).
 *
 * Pure-function tests + source-shape assertions. No mongoose required.
 */

const path = require('path');
const fs = require('fs');

const LIB_PATH = path.join(__dirname, '..', 'intelligence', 'story-surface-variant-builder.lib.js');
const SRC = fs.readFileSync(LIB_PATH, 'utf8');
const lib = require(LIB_PATH);

describe('W482 — story-surface-variant-builder structural', () => {
  it('exports 2 public functions + 2 constants', () => {
    expect(typeof lib.spawnVariants).toBe('function');
    expect(typeof lib.validateVariant).toBe('function');
    expect(typeof lib.SURFACE_DEFAULTS).toBe('object');
    expect(Array.isArray(lib.SURFACE_TYPES)).toBe(true);
  });

  it('declares exactly 7 SURFACE_TYPES', () => {
    expect(lib.SURFACE_TYPES).toHaveLength(7);
    expect(lib.SURFACE_TYPES).toEqual(
      expect.arrayContaining([
        'family_quarterly_storybook',
        'family_annual_chronicle',
        'beneficiary_personal_story',
        'sibling_friendly_story',
        'extended_family_summary',
        'clinical_narrative',
        'regulatory_outcome_report',
      ])
    );
  });

  it('module + SURFACE_DEFAULTS + SURFACE_TYPES are frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
    expect(Object.isFrozen(lib.SURFACE_DEFAULTS)).toBe(true);
    expect(Object.isFrozen(lib.SURFACE_TYPES)).toBe(true);
  });

  it('sibling + beneficiary surfaces are flagged sensitive by default', () => {
    expect(lib.SURFACE_DEFAULTS.sibling_friendly_story.isSensitive).toBe(true);
    expect(lib.SURFACE_DEFAULTS.beneficiary_personal_story.isSensitive).toBe(true);
  });

  it('family + extended + clinical + regulatory are not sensitive by default', () => {
    expect(lib.SURFACE_DEFAULTS.family_quarterly_storybook.isSensitive).toBe(false);
    expect(lib.SURFACE_DEFAULTS.extended_family_summary.isSensitive).toBe(false);
    expect(lib.SURFACE_DEFAULTS.clinical_narrative.isSensitive).toBe(false);
    expect(lib.SURFACE_DEFAULTS.regulatory_outcome_report.isSensitive).toBe(false);
  });

  it('targetReadingGrade ramps from sibling=4 to regulatory=16', () => {
    expect(lib.SURFACE_DEFAULTS.sibling_friendly_story.targetReadingGrade).toBe(4);
    expect(lib.SURFACE_DEFAULTS.beneficiary_personal_story.targetReadingGrade).toBe(6);
    expect(lib.SURFACE_DEFAULTS.family_quarterly_storybook.targetReadingGrade).toBe(8);
    expect(lib.SURFACE_DEFAULTS.clinical_narrative.targetReadingGrade).toBe(14);
    expect(lib.SURFACE_DEFAULTS.regulatory_outcome_report.targetReadingGrade).toBe(16);
  });

  it('source references Engagement Architecture + PDPL', () => {
    expect(SRC).toMatch(/Engagement Architecture/);
    expect(SRC).toMatch(/PDPL|sensitive/);
  });
});

describe('W482 — spawnVariants', () => {
  const sampleSkeleton = {
    skeleton: { lang: 'ar', surfaceType: 'family_quarterly_storybook' },
    sections: [
      { section: 'cover', title: 'الغلاف', content: { kind: 'placeholder' }, hasData: false },
      {
        section: 'gas_trajectory',
        title: 'تطور T-score',
        content: { kind: 'gas_trajectory', earliestTScore: 30, latestTScore: 45, delta: 15 },
        hasData: true,
      },
      {
        section: 'icf_improvements',
        title: 'ICF',
        content: { kind: 'icf_list', items: [{ code: 'd450', averageDelta: -1 }] },
        hasData: true,
      },
      {
        section: 'family_role',
        title: 'دور الأسرة',
        content: { kind: 'wbci_snapshot', band: 'stable', value: 68 },
        hasData: true,
      },
      {
        section: 'pride_moments',
        title: 'لحظات الفخر',
        content: {
          kind: 'pride_list',
          items: [
            { kind: 'gas_major_jump', descriptionAr: 'قفزة 15 نقطة', descriptionEn: '15pt jump' },
          ],
        },
        hasData: true,
      },
      {
        section: 'voice_quotes',
        title: 'الأصوات',
        content: { kind: 'quotes', items: [{ textOriginal: 'أحب الرسم' }] },
        hasData: true,
      },
      { section: 'closing', title: 'ختام', content: { kind: 'placeholder' }, hasData: false },
    ],
  };

  it('returns [] on null skeleton', () => {
    expect(lib.spawnVariants(null)).toEqual([]);
  });

  it('returns 7 variants by default (one per surface)', () => {
    const variants = lib.spawnVariants(sampleSkeleton);
    expect(variants).toHaveLength(7);
    const surfaces = variants.map(v => v.surfaceType).sort();
    expect(surfaces).toEqual([...lib.SURFACE_TYPES].sort());
  });

  it('respects surface subset', () => {
    const variants = lib.spawnVariants(sampleSkeleton, [
      'family_quarterly_storybook',
      'sibling_friendly_story',
    ]);
    expect(variants).toHaveLength(2);
  });

  it('ignores unknown surface types', () => {
    const variants = lib.spawnVariants(sampleSkeleton, ['family_quarterly_storybook', 'bogus']);
    expect(variants).toHaveLength(1);
  });

  it('sibling variant omits family_role + icf_improvements + gas_trajectory', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['sibling_friendly_story'])[0];
    const sections = v.sections.map(s => s.section);
    expect(sections).not.toContain('family_role');
    expect(sections).not.toContain('icf_improvements');
    expect(sections).not.toContain('gas_trajectory');
  });

  it('clinical variant omits cover + pride_moments + voice_quotes + closing', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['clinical_narrative'])[0];
    const sections = v.sections.map(s => s.section);
    expect(sections).not.toContain('cover');
    expect(sections).not.toContain('pride_moments');
    expect(sections).not.toContain('voice_quotes');
    expect(sections).not.toContain('closing');
  });

  it('regulatory variant has highest reading grade + formal tone artifacts', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['regulatory_outcome_report'])[0];
    expect(v.targetReadingGrade).toBe(16);
    expect(v.isSensitive).toBe(false);
  });

  it('sibling + beneficiary variants flagged isSensitive=true', () => {
    const sib = lib.spawnVariants(sampleSkeleton, ['sibling_friendly_story'])[0];
    const ben = lib.spawnVariants(sampleSkeleton, ['beneficiary_personal_story'])[0];
    expect(sib.isSensitive).toBe(true);
    expect(ben.isSensitive).toBe(true);
  });

  it('generatedBy defaults to template', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['family_quarterly_storybook'])[0];
    expect(v.generatedBy).toBe('template');
    expect(v.citations).toEqual([]);
  });

  it('renders Arabic gas_trajectory body', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['family_quarterly_storybook'], 'ar')[0];
    const gas = v.sections.find(s => s.section === 'gas_trajectory');
    expect(gas.body).toMatch(/تطور T-score/);
    expect(gas.body).toMatch(/30/);
    expect(gas.body).toMatch(/45/);
  });

  it('renders English gas_trajectory body when lang=en', () => {
    const v = lib.spawnVariants(sampleSkeleton, ['family_quarterly_storybook'], 'en')[0];
    const gas = v.sections.find(s => s.section === 'gas_trajectory');
    expect(gas.body).toMatch(/T-score progressed/);
  });

  it('visual surfaces get chart visual hints; clinical+regulatory get none', () => {
    const fam = lib.spawnVariants(sampleSkeleton, ['family_quarterly_storybook'])[0];
    const reg = lib.spawnVariants(sampleSkeleton, ['regulatory_outcome_report'])[0];
    const famGas = fam.sections.find(s => s.section === 'gas_trajectory');
    const regIcf = reg.sections.find(s => s.section === 'icf_improvements');
    expect(famGas.visualHint).toBe('chart_line');
    expect(regIcf.visualHint).toBe('none');
  });
});

describe('W482 — validateVariant', () => {
  it('rejects non-object', () => {
    expect(lib.validateVariant(null).valid).toBe(false);
    expect(lib.validateVariant(null).errors).toContain('NOT_OBJECT');
  });

  it('rejects unknown surface type', () => {
    const r = lib.validateVariant({
      surfaceType: 'unknown',
      lang: 'ar',
      targetReadingGrade: 8,
      sections: [],
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('UNKNOWN_SURFACE_TYPE');
  });

  it('rejects invalid lang', () => {
    const r = lib.validateVariant({
      surfaceType: 'family_quarterly_storybook',
      lang: 'fr',
      targetReadingGrade: 8,
      sections: [],
    });
    expect(r.errors).toContain('INVALID_LANG');
  });

  it('rejects non-array sections', () => {
    const r = lib.validateVariant({
      surfaceType: 'family_quarterly_storybook',
      lang: 'ar',
      targetReadingGrade: 8,
      sections: 'not-array',
    });
    expect(r.errors).toContain('SECTIONS_NOT_ARRAY');
  });

  it('accepts a well-formed variant', () => {
    const r = lib.validateVariant({
      surfaceType: 'family_quarterly_storybook',
      lang: 'ar',
      targetReadingGrade: 8,
      sections: [],
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });
});
