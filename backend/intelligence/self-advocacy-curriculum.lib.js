'use strict';

/**
 * self-advocacy-curriculum.lib.js — W462.
 *
 * Pure library mapping beneficiary age + ability + experience to an
 * appropriate self-advocacy training module sequence. Per Phase B of
 * docs/blueprint/beneficiary-lifecycle-v3.md §6 Innovation 8 (Rights
 * Module: "age-appropriate rights education curriculum + self-advocacy
 * training + complaint mechanism with reasonable adjustments").
 *
 * Curriculum is delivered in 4 tracks tuned to capacity + age:
 *   track_early    — pre-school / non-verbal / profound (visual cues, AAC)
 *   track_primary  — primary-school + AAC users (story books, role-play)
 *   track_teen     — teens (peer-led groups, rights vocabulary)
 *   track_adult    — adults transitioning to independent living
 *
 * Modules within each track cover the canonical "5 rights":
 *   1. Right to be heard         (CRPD Art. 7, 21)
 *   2. Right to consent           (CRPD Art. 12, 25)
 *   3. Right to refuse            (CRPD Art. 14, 15)
 *   4. Right to complain          (CRPD Art. 13)
 *   5. Right to access community  (CRPD Art. 19, 30)
 *
 * Pure functions only.
 */

const TRACKS = ['track_early', 'track_primary', 'track_teen', 'track_adult'];

const RIGHTS = Object.freeze([
  { code: 'be_heard', titleAr: 'حق التعبير', titleEn: 'Right to be heard', crpdArticles: [7, 21] },
  { code: 'consent', titleAr: 'حق الموافقة', titleEn: 'Right to consent', crpdArticles: [12, 25] },
  { code: 'refuse', titleAr: 'حق الرفض', titleEn: 'Right to refuse', crpdArticles: [14, 15] },
  { code: 'complain', titleAr: 'حق التظلم', titleEn: 'Right to complain', crpdArticles: [13] },
  {
    code: 'community',
    titleAr: 'حق المشاركة المجتمعية',
    titleEn: 'Right to access community',
    crpdArticles: [19, 30],
  },
]);

/**
 * Select the appropriate training track based on beneficiary profile.
 *
 * @param {Object} profile
 * @param {number} profile.ageMonths
 * @param {boolean} [profile.usesAAC]   — communication aid?
 * @param {string} [profile.cognitiveTier] — 'mild' | 'moderate' | 'severe' | 'profound'
 * @returns {{ track: string, reasoning: string }}
 */
function selectTrack(profile) {
  if (!profile || typeof profile.ageMonths !== 'number') {
    return { track: null, reasoning: 'profile.ageMonths required to select track' };
  }
  const age = profile.ageMonths;

  // Profound cognitive disability + non-AAC = early track regardless of age
  if (profile.cognitiveTier === 'profound' && !profile.usesAAC) {
    return {
      track: 'track_early',
      reasoning:
        'Profound cognitive disability without AAC — early track (visual cues + caregiver-assisted).',
    };
  }

  if (age < 72) return { track: 'track_early', reasoning: 'Pre-school (< 6 years).' };
  if (age < 144) return { track: 'track_primary', reasoning: 'Primary school (6-12 years).' };
  if (age < 216) return { track: 'track_teen', reasoning: 'Teen (12-18 years).' };
  return { track: 'track_adult', reasoning: 'Adult (≥ 18 years).' };
}

/**
 * Generate the per-track module list for the 5 rights.
 * Each entry: { right, track, modality, durationMinutes, materialsNeeded }
 */
function generateCurriculum(track) {
  if (!TRACKS.includes(track)) {
    return { track: null, modules: [], reasoning: 'Invalid track' };
  }

  const modules = RIGHTS.map(right => ({
    rightCode: right.code,
    titleAr: right.titleAr,
    titleEn: right.titleEn,
    crpdArticles: right.crpdArticles,
    track,
    modality: _modalityFor(track),
    durationMinutes: _durationFor(track),
    materialsNeeded: _materialsFor(track),
  }));

  return { track, modules, totalModules: modules.length };
}

function _modalityFor(track) {
  switch (track) {
    case 'track_early':
      return 'visual_aac_assisted';
    case 'track_primary':
      return 'storybook_roleplay';
    case 'track_teen':
      return 'peer_group_discussion';
    case 'track_adult':
      return 'workshop_independent_practice';
    default:
      return 'unknown';
  }
}

function _durationFor(track) {
  switch (track) {
    case 'track_early':
      return 15;
    case 'track_primary':
      return 30;
    case 'track_teen':
      return 45;
    case 'track_adult':
      return 60;
    default:
      return 30;
  }
}

function _materialsFor(track) {
  const base = {
    track_early: ['picture_cards', 'social_story_book'],
    track_primary: ['storybook', 'roleplay_props', 'parent_handout'],
    track_teen: ['peer_discussion_guide', 'rights_vocabulary_glossary'],
    track_adult: ['workshop_workbook', 'self-advocacy_journal'],
  };
  return base[track] || [];
}

/**
 * Compute completion percentage given a list of completed module codes.
 */
function completionRate(track, completedRightCodes) {
  if (!TRACKS.includes(track)) return 0;
  if (!Array.isArray(completedRightCodes)) return 0;
  const total = RIGHTS.length;
  const completed = RIGHTS.filter(r => completedRightCodes.includes(r.code)).length;
  return Math.round((completed / total) * 100);
}

module.exports = Object.freeze({
  selectTrack,
  generateCurriculum,
  completionRate,
  // Constants
  TRACKS,
  RIGHTS,
});
