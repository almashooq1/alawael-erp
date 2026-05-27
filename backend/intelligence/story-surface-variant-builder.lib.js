'use strict';

/**
 * story-surface-variant-builder.lib.js — W482 (Phase F: Story Architecture).
 *
 * Pure library that transforms a single StoryBook skeleton (from W479
 * story-builder) into audience-specific surface variants — one per
 * SURFACE_TYPE: family / sibling / beneficiary / extended_family /
 * clinical / regulatory.
 *
 * Each surface has its own:
 *   • targetReadingGrade (sibling=4, beneficiary=6, family=8, extended=8,
 *     clinical=14, regulatory=16)
 *   • tone (warm, simple, professional, formal)
 *   • PDPL sensitivity tier (sibling + beneficiary = always sensitive)
 *   • section selection (regulatory drops pride_moments + voice_quotes;
 *     sibling drops family_role + icf_improvements; etc.)
 *
 * Per v3 §5 Engagement Architecture. Pure functions only.
 */

const SURFACE_DEFAULTS = Object.freeze({
  family_quarterly_storybook: {
    targetReadingGrade: 8,
    tone: 'warm',
    isSensitive: false,
    omitSections: [],
  },
  family_annual_chronicle: {
    targetReadingGrade: 8,
    tone: 'warm',
    isSensitive: false,
    omitSections: [],
  },
  beneficiary_personal_story: {
    targetReadingGrade: 6,
    tone: 'first_person',
    isSensitive: true,
    omitSections: ['family_role', 'icf_improvements'],
  },
  sibling_friendly_story: {
    targetReadingGrade: 4,
    tone: 'simple',
    isSensitive: true,
    omitSections: ['family_role', 'icf_improvements', 'gas_trajectory'],
  },
  extended_family_summary: {
    targetReadingGrade: 8,
    tone: 'warm',
    isSensitive: false,
    omitSections: ['voice_quotes', 'family_role'],
  },
  clinical_narrative: {
    targetReadingGrade: 14,
    tone: 'professional',
    isSensitive: false,
    omitSections: ['cover', 'pride_moments', 'voice_quotes', 'closing'],
  },
  regulatory_outcome_report: {
    targetReadingGrade: 16,
    tone: 'formal',
    isSensitive: false,
    omitSections: ['cover', 'pride_moments', 'voice_quotes', 'family_role', 'closing'],
  },
});

const SURFACE_TYPES = Object.freeze(Object.keys(SURFACE_DEFAULTS));

/**
 * Spawn one variant per surface type from a StoryBook skeleton.
 *
 * @param {Object} skeleton — output of story-builder.composeQuarterlyStorybook
 * @param {Array<string>} [surfaces] — subset to render (defaults to all 7)
 * @param {string} [lang] — 'ar' | 'en' (defaults to skeleton.skeleton.lang)
 * @returns {Array<Object>} — array of variant payloads ready for StorySurfaceVariant.create
 */
function spawnVariants(skeleton, surfaces, lang) {
  if (!skeleton || !Array.isArray(skeleton.sections)) return [];
  const targetSurfaces = Array.isArray(surfaces) && surfaces.length ? surfaces : SURFACE_TYPES;
  const targetLang = lang || skeleton.skeleton?.lang || 'ar';

  return targetSurfaces
    .filter(s => SURFACE_DEFAULTS[s])
    .map(surfaceType => _renderVariant(skeleton, surfaceType, targetLang));
}

function _renderVariant(skeleton, surfaceType, lang) {
  const defaults = SURFACE_DEFAULTS[surfaceType];
  const omit = new Set(defaults.omitSections);

  const sections = skeleton.sections
    .filter(s => !omit.has(s.section))
    .filter(s => s.hasData || s.section === 'cover' || s.section === 'closing')
    .map(s => ({
      section: s.section,
      title: s.title,
      body: _renderBody(s, defaults.tone, lang),
      visualHint: _pickVisualHint(s.section, surfaceType),
    }));

  return {
    surfaceType,
    lang,
    targetReadingGrade: defaults.targetReadingGrade,
    isSensitive: defaults.isSensitive,
    sections,
    generatedBy: 'template',
    citations: [],
  };
}

function _renderBody(section, tone, lang) {
  if (!section.content) return '';
  const c = section.content;
  switch (c.kind) {
    case 'gas_trajectory':
      return lang === 'ar'
        ? `تطور T-score من ${c.earliestTScore} إلى ${c.latestTScore} (فرق ${c.delta?.toFixed?.(1) ?? c.delta}).`
        : `T-score progressed from ${c.earliestTScore} to ${c.latestTScore} (Δ ${c.delta?.toFixed?.(1) ?? c.delta}).`;
    case 'icf_list':
      return (c.items || [])
        .map(it => (lang === 'ar' ? `• ${it.code}: تحسّن` : `• ${it.code}: improved`))
        .join('\n');
    case 'quotes':
      return (c.items || []).map(it => `"${it.textOriginal || it.text || ''}"`).join('\n\n');
    case 'pride_list':
      return (c.items || [])
        .map(it => (lang === 'ar' ? it.descriptionAr : it.descriptionEn))
        .filter(Boolean)
        .join('\n');
    case 'wbci_snapshot':
      return lang === 'ar'
        ? `مستوى رفاهية الأسرة: ${c.band} (مؤشر ${c.value})`
        : `Family wellbeing band: ${c.band} (index ${c.value})`;
    default:
      return _tonedPlaceholder(section.section, tone, lang);
  }
}

function _tonedPlaceholder(section, tone, lang) {
  if (section === 'cover') {
    return lang === 'ar' ? 'قصة الربع الحالي' : 'This Quarter Story';
  }
  if (section === 'closing') {
    return lang === 'ar' ? 'شكرًا على الرحلة معنا.' : 'Thank you for journeying with us.';
  }
  return '';
}

function _pickVisualHint(section, surfaceType) {
  const isVisualSurface = [
    'family_quarterly_storybook',
    'family_annual_chronicle',
    'beneficiary_personal_story',
    'sibling_friendly_story',
  ].includes(surfaceType);
  if (!isVisualSurface) return 'none';
  switch (section) {
    case 'cover':
      return 'photo';
    case 'gas_trajectory':
    case 'progress_timeline':
      return 'chart_line';
    case 'icf_improvements':
      return 'chart_bar';
    case 'pride_moments':
      return 'illustration';
    case 'voice_quotes':
      return 'icon';
    default:
      return 'none';
  }
}

/**
 * Validate a variant payload against surface defaults.
 */
function validateVariant(variant) {
  const errors = [];
  if (!variant || typeof variant !== 'object') return { valid: false, errors: ['NOT_OBJECT'] };
  if (!SURFACE_DEFAULTS[variant.surfaceType]) errors.push('UNKNOWN_SURFACE_TYPE');
  if (!['ar', 'en'].includes(variant.lang)) errors.push('INVALID_LANG');
  if (typeof variant.targetReadingGrade !== 'number') errors.push('MISSING_READING_GRADE');
  if (!Array.isArray(variant.sections)) errors.push('SECTIONS_NOT_ARRAY');
  return { valid: errors.length === 0, errors };
}

module.exports = Object.freeze({
  spawnVariants,
  validateVariant,
  // Constants
  SURFACE_DEFAULTS,
  SURFACE_TYPES,
});
