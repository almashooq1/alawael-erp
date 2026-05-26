'use strict';

/**
 * gender-routing.lib.js — W476.
 *
 * Pure routing library for therapist gender matching per Phase E
 * Cultural Intelligence Layer (v3 §9.3). Translates a beneficiary's
 * CulturalProfile.genderPreferences (W475) into a scheduling decision:
 *   ALLOW   — match acceptable; proceed
 *   WARN    — soft mismatch; surface to scheduler + family
 *   BLOCK   — hard mismatch; reject the proposed assignment
 *
 * Activity-type matters: physically intimate therapies (PT exam, OT
 * dressing tasks, SLP oral motor, gynecological exam) carry higher
 * strictness than passive ones (group games / classroom learning).
 *
 * Pure functions only.
 */

const ALLOWED_GENDERS = ['male', 'female', 'no_preference'];
const STRICTNESS_LEVELS = ['strict', 'preferred', 'flexible'];

// Activities classified as physically-intimate — bump strictness by one level
const INTIMATE_ACTIVITIES = Object.freeze([
  'pt_physical_exam',
  'pt_manual_therapy',
  'ot_dressing_task',
  'ot_bathing_task',
  'slp_oral_motor',
  'gynecology',
  'urology',
  'massage',
  'aquatic_therapy_alone',
]);

const PASSIVE_ACTIVITIES = Object.freeze([
  'group_game',
  'classroom',
  'remote_consultation',
  'parent_meeting',
  'documentation_only',
  'observation_only',
]);

/**
 * Effective strictness adjusts the family preference up/down based on
 * activity type:
 *   strict   + intimate    → strict (clamped)
 *   preferred + intimate    → strict (escalated)
 *   flexible + intimate    → preferred (escalated)
 *   any       + passive    → flexible (relaxed)
 */
function effectiveStrictness(baseStrictness, activityCode) {
  const intimate = INTIMATE_ACTIVITIES.includes(activityCode);
  const passive = PASSIVE_ACTIVITIES.includes(activityCode);

  if (intimate) {
    if (baseStrictness === 'flexible') return 'preferred';
    return 'strict';
  }
  if (passive) {
    if (baseStrictness === 'strict') return 'preferred';
    return 'flexible';
  }
  return baseStrictness || 'preferred';
}

/**
 * Route a proposed (beneficiary × therapist × activity) assignment.
 *
 * @param {Object} input
 * @param {Object} input.beneficiaryPrefs — { therapistGenderPreference, strictness,
 *                                            femaleOnlySessions, mahramRequired }
 * @param {string} input.therapistGender — 'male' | 'female'
 * @param {string} input.activityCode
 * @param {boolean} [input.mahramPresent=false]
 * @returns {{ decision: 'ALLOW'|'WARN'|'BLOCK',
 *             reasonCode: string, reasonAr: string, reasonEn: string,
 *             effectiveStrictness: string }}
 */
function routeAssignment(input = {}) {
  const { beneficiaryPrefs = {}, therapistGender, activityCode, mahramPresent = false } = input;

  if (!ALLOWED_GENDERS.slice(0, 2).includes(therapistGender)) {
    return _result(
      'BLOCK',
      'INVALID_THERAPIST_GENDER',
      'جنس الأخصائي غير صحيح',
      'Invalid therapist gender',
      'unknown'
    );
  }

  const baseStrictness = beneficiaryPrefs.strictness || 'preferred';
  const eff = effectiveStrictness(baseStrictness, activityCode);
  const pref = beneficiaryPrefs.therapistGenderPreference || 'no_preference';

  // No preference + not female-only requested → allow
  if (pref === 'no_preference' && !beneficiaryPrefs.femaleOnlySessions) {
    return _result('ALLOW', 'NO_PREFERENCE', 'لا تفضيل', 'No preference set', eff);
  }

  // Female-only sessions requested + therapist is male → check mahram + escalate
  if (beneficiaryPrefs.femaleOnlySessions && therapistGender === 'male') {
    if (mahramPresent) {
      return _result(
        'WARN',
        'MALE_THERAPIST_WITH_MAHRAM',
        'أخصائي ذكر مع وجود محرم — يستوجب تأكيد قبل البدء',
        'Male therapist with mahram present — confirm before start',
        eff
      );
    }
    return _result(
      'BLOCK',
      'FEMALE_ONLY_REQUESTED',
      'الأسرة طلبت جلسات نسائية فقط',
      'Female-only sessions requested',
      eff
    );
  }

  // Preferences match → allow
  if (pref === therapistGender) {
    return _result('ALLOW', 'GENDER_MATCH', 'مطابقة الجنس المفضل', 'Gender preference match', eff);
  }

  // Mismatch — decision depends on effective strictness
  if (eff === 'strict') {
    // Mahram override: male therapist + female beneficiary with mahram → WARN not BLOCK
    if (beneficiaryPrefs.mahramRequired && mahramPresent) {
      return _result(
        'WARN',
        'STRICT_MISMATCH_WITH_MAHRAM',
        'جنس الأخصائي مختلف عن المفضل لكن مع وجود محرم',
        'Gender mismatch with mahram present',
        eff
      );
    }
    return _result(
      'BLOCK',
      'STRICT_GENDER_MISMATCH',
      'الأسرة تطلب نوع أخصائي محدد بصرامة',
      'Strict gender preference mismatch',
      eff
    );
  }

  if (eff === 'preferred') {
    return _result(
      'WARN',
      'SOFT_GENDER_MISMATCH',
      'جنس الأخصائي مختلف عن المفضل (مرونة)',
      'Soft gender preference mismatch (preferred)',
      eff
    );
  }

  // Flexible
  return _result(
    'ALLOW',
    'FLEXIBLE_MISMATCH',
    'مرونة في الاختيار',
    'Flexible — mismatch allowed',
    eff
  );
}

function _result(decision, reasonCode, ar, en, effectiveStrictnessVal) {
  return {
    decision,
    reasonCode,
    reasonAr: ar,
    reasonEn: en,
    effectiveStrictness: effectiveStrictnessVal,
  };
}

/**
 * Batch-check a list of candidate therapists, return all ALLOW + WARN
 * sorted by preference match.
 */
function rankCandidates(beneficiaryPrefs, candidates, activityCode) {
  if (!Array.isArray(candidates)) return [];
  const ranked = [];
  for (const c of candidates) {
    const r = routeAssignment({
      beneficiaryPrefs,
      therapistGender: c.gender,
      activityCode,
      mahramPresent: c.mahramPresent === true,
    });
    if (r.decision !== 'BLOCK') {
      ranked.push({ candidate: c, ...r });
    }
  }
  // ALLOW > WARN within same decision; then by gender-match
  const order = { ALLOW: 0, WARN: 1 };
  ranked.sort((a, b) => order[a.decision] - order[b.decision]);
  return ranked;
}

module.exports = Object.freeze({
  routeAssignment,
  effectiveStrictness,
  rankCandidates,
  // Constants
  ALLOWED_GENDERS,
  STRICTNESS_LEVELS,
  INTIMATE_ACTIVITIES,
  PASSIVE_ACTIVITIES,
});
