'use strict';

/**
 * story-builder.lib.js — W479 (Phase F: Story Architecture).
 *
 * Pure library that composes Quarterly Story Books + Annual Life
 * Chronicles from beneficiary's quarterly data: GAS T-score progression
 * (W264 + W455 snapshots) + ICF qualifier improvements (W457 aggregate)
 * + voice-log highlights (W460) + WBCI trends (W467) + pride moments
 * (W481, sister wave).
 *
 * Builds on existing infrastructure:
 *   • W257 clinical-report-narrative-engine.service.js (deterministic templates)
 *   • W283 rag.service.js (LLM with grounding)
 *   • W284 voice-analysis (speech samples)
 *   • W456 GAS family interpretation (band narratives)
 *
 * Per v3 §6 Innovation 7 (Story Architecture). Pure functions only.
 */

const SURFACE_TYPES = Object.freeze([
  'family_quarterly_storybook', // 8-12 page visual document for caregivers
  'family_annual_chronicle', // year-end summary
  'beneficiary_personal_story', // first-person, age-adapted
  'sibling_friendly_story', // no stigma, sibling-facing
  'extended_family_summary', // grandparent/uncle-facing brief
  'clinical_narrative', // therapist progress note
  'regulatory_outcome_report', // MOH/Disability Authority submission
]);

const STORY_SECTIONS = Object.freeze([
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

/**
 * Validate input quarterly data bundle.
 */
function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }
  if (!input.beneficiaryId) errors.push('MISSING_BENEFICIARY_ID');
  if (!input.periodStart || !input.periodEnd) errors.push('MISSING_PERIOD');
  if (
    input.periodStart &&
    input.periodEnd &&
    new Date(input.periodStart) >= new Date(input.periodEnd)
  ) {
    errors.push('PERIOD_START_AFTER_END');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Compose a quarterly story-book skeleton from data bundle.
 *
 * @param {Object} input
 * @param {string} input.beneficiaryId
 * @param {Date}   input.periodStart
 * @param {Date}   input.periodEnd
 * @param {Object} [input.gasProgression]      — { earliestTScore, latestTScore, delta }
 * @param {Array}  [input.icfImprovements]     — from W457 aggregateImprovements
 * @param {Array}  [input.voiceHighlights]     — top voice log entries
 * @param {Array}  [input.prideMoments]        — from W481
 * @param {Object} [input.wbciTrend]           — { latestWbci, band, sustainedDecline }
 * @param {string} [input.surfaceType]
 * @param {string} [input.lang]                — 'ar' | 'en'
 * @returns {{ skeleton, sections, confidence, fallbackToTemplates, signals }}
 */
function composeQuarterlyStorybook(input = {}) {
  const v = validateInput(input);
  if (!v.valid) {
    return { skeleton: null, errors: v.errors };
  }

  const surfaceType = input.surfaceType || 'family_quarterly_storybook';
  const lang = input.lang || 'ar';

  const sections = STORY_SECTIONS.map(s => ({
    section: s,
    title: _sectionTitle(s, lang),
    content: _sectionContent(s, input, lang),
    hasData: _sectionHasData(s, input),
  }));

  // Signals — what informed the story
  const signals = {
    gasIncluded: !!input.gasProgression,
    icfIncluded: Array.isArray(input.icfImprovements) && input.icfImprovements.length > 0,
    voiceIncluded: Array.isArray(input.voiceHighlights) && input.voiceHighlights.length > 0,
    prideIncluded: Array.isArray(input.prideMoments) && input.prideMoments.length > 0,
    wbciIncluded: !!input.wbciTrend,
  };

  const dataCoverage = Object.values(signals).filter(Boolean).length / 5;
  const confidence = dataCoverage > 0.6 ? 'high' : dataCoverage > 0.3 ? 'medium' : 'low';
  const fallbackToTemplates = confidence === 'low';

  return {
    skeleton: {
      beneficiaryId: input.beneficiaryId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      surfaceType,
      lang,
    },
    sections,
    confidence,
    fallbackToTemplates,
    signals,
  };
}

function _sectionTitle(section, lang) {
  const titles = {
    ar: {
      cover: 'الغلاف',
      highlights: 'أبرز اللحظات',
      progress_timeline: 'خط زمني للتقدم',
      gas_trajectory: 'تطور أهداف المستفيد',
      icf_improvements: 'تحسينات الأداء الوظيفي (ICF)',
      pride_moments: 'لحظات الفخر',
      voice_quotes: 'أصوات المستفيد',
      family_role: 'دور الأسرة',
      next_quarter_goals: 'أهداف الربع القادم',
      closing: 'كلمة ختامية',
    },
    en: {
      cover: 'Cover',
      highlights: 'Highlights',
      progress_timeline: 'Progress Timeline',
      gas_trajectory: 'Goal-Attainment Trajectory',
      icf_improvements: 'Functional Improvements (ICF)',
      pride_moments: 'Pride Moments',
      voice_quotes: 'Beneficiary Voice',
      family_role: "Family's Role",
      next_quarter_goals: 'Next Quarter Goals',
      closing: 'Closing',
    },
  };
  return titles[lang]?.[section] || titles.en[section] || section;
}

function _sectionContent(section, input, lang) {
  switch (section) {
    case 'gas_trajectory':
      if (!input.gasProgression) return null;
      return {
        kind: 'gas_trajectory',
        earliestTScore: input.gasProgression.earliestTScore,
        latestTScore: input.gasProgression.latestTScore,
        delta: input.gasProgression.delta,
      };
    case 'icf_improvements':
      if (!input.icfImprovements) return null;
      return { kind: 'icf_list', items: input.icfImprovements.slice(0, 5) };
    case 'voice_quotes':
      if (!input.voiceHighlights) return null;
      return { kind: 'quotes', items: input.voiceHighlights.slice(0, 3) };
    case 'pride_moments':
      if (!input.prideMoments) return null;
      return { kind: 'pride_list', items: input.prideMoments };
    case 'family_role':
      if (!input.wbciTrend) return null;
      return {
        kind: 'wbci_snapshot',
        band: input.wbciTrend.band,
        value: input.wbciTrend.latestWbci,
      };
    default:
      return { kind: 'placeholder', langHint: lang };
  }
}

function _sectionHasData(section, input) {
  const c = _sectionContent(section, input);
  return !!c && c.kind !== 'placeholder';
}

/**
 * Translate the skeleton into LLM prompt structure for downstream RAG
 * (W283) refinement. Caller passes to the LLM with grounding sources.
 */
function buildLlmPromptPlan(skeleton) {
  if (!skeleton || !skeleton.skeleton) return null;
  return {
    audience: skeleton.skeleton.surfaceType,
    lang: skeleton.skeleton.lang,
    period: { from: skeleton.skeleton.periodStart, to: skeleton.skeleton.periodEnd },
    sectionsToGenerate: skeleton.sections
      .filter(s => s.hasData)
      .map(s => ({ section: s.section, title: s.title, content: s.content })),
    fallbackToTemplates: skeleton.fallbackToTemplates,
    confidence: skeleton.confidence,
  };
}

/**
 * Build a section-only snippet (used by the W482 multi-surface variant
 * library when a single-section quote is needed).
 */
function composeSection(input, sectionCode, lang = 'ar') {
  if (!STORY_SECTIONS.includes(sectionCode)) return null;
  return {
    section: sectionCode,
    title: _sectionTitle(sectionCode, lang),
    content: _sectionContent(sectionCode, input, lang),
  };
}

module.exports = Object.freeze({
  composeQuarterlyStorybook,
  buildLlmPromptPlan,
  composeSection,
  validateInput,
  // Constants
  SURFACE_TYPES,
  STORY_SECTIONS,
});
