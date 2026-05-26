'use strict';

/**
 * ramadan-protocol.lib.js — W474.
 *
 * Adjusts session intensity + scheduling + activity recommendations
 * for beneficiaries observing Ramadan. Per Phase E Cultural Intelligence
 * Layer (docs/blueprint/beneficiary-lifecycle-v3.md §9.1).
 *
 * Adjustments applied during the Ramadan window:
 *   • Session intensity scaled down (default 0.7×) for older beneficiaries
 *   • High-energy / physical sessions deprioritized
 *   • Preferred scheduling window: post-Iftar (evening) or pre-Suhoor
 *   • Daytime sessions limited to cognitive / passive interventions
 *   • Medical exemptions explicitly tracked (chronic conditions, age <12,
 *     pregnancy, etc. — sessions remain at full intensity for these)
 *
 * The library is OBSERVATION-AWARE — caller passes in `observesRamadan`
 * flag for the beneficiary (default: derived from age + family
 * preference, fallback opt-out). Never assumes observance.
 *
 * Pure functions only. No DB.
 */

// Min age for assumed Ramadan observance per common Saudi family practice
const ASSUMED_OBSERVANCE_AGE_YEARS = 12;

// Default session intensity multiplier during Ramadan
const DEFAULT_RAMADAN_INTENSITY = 0.7;

// Activity categories that should be deprioritized during fasting hours
const PHYSICAL_ACTIVITIES = Object.freeze([
  'PT_aerobic',
  'PT_strength',
  'aquatic_therapy',
  'adaptive_sports',
  'high_intensity_OT',
  'gait_training',
  'cardio_rehab',
]);

// Activity categories that remain appropriate during fasting hours
const FASTING_FRIENDLY_ACTIVITIES = Object.freeze([
  'SLP_articulation',
  'cognitive_training',
  'behavioral_therapy',
  'play_therapy',
  'social_skills',
  'family_counselling',
  'art_therapy',
  'storytelling',
]);

/**
 * Determine whether a beneficiary should have Ramadan adjustments applied.
 *
 * @param {Object} input
 * @param {number} [input.ageMonths]
 * @param {boolean} [input.observesRamadan] — explicit family preference (overrides)
 * @param {boolean} [input.hasMedicalExemption] — explicit medical exemption
 * @param {Date} input.currentDate
 * @returns {{ applies: boolean, reason: string, isCurrentlyRamadan: boolean }}
 */
function shouldApplyRamadanAdjustments(input = {}) {
  const { observesRamadan, hasMedicalExemption, ageMonths, currentDate = new Date() } = input;
  const prayerLib = require('./prayer-time.lib');
  const isCurrentlyRamadan = prayerLib.isApproximatelyRamadan(currentDate);

  if (!isCurrentlyRamadan) {
    return { applies: false, reason: 'NOT_RAMADAN', isCurrentlyRamadan: false };
  }

  if (hasMedicalExemption === true) {
    return { applies: false, reason: 'MEDICAL_EXEMPTION', isCurrentlyRamadan: true };
  }

  // Explicit opt-out
  if (observesRamadan === false) {
    return { applies: false, reason: 'FAMILY_OPT_OUT', isCurrentlyRamadan: true };
  }

  // Explicit opt-in
  if (observesRamadan === true) {
    return { applies: true, reason: 'FAMILY_OPT_IN', isCurrentlyRamadan: true };
  }

  // Inferred from age (under 12 = no observance assumed)
  if (typeof ageMonths === 'number' && ageMonths < ASSUMED_OBSERVANCE_AGE_YEARS * 12) {
    return { applies: false, reason: 'BELOW_OBSERVANCE_AGE', isCurrentlyRamadan: true };
  }

  // Default: apply (Saudi cultural baseline)
  return { applies: true, reason: 'DEFAULT_OBSERVANCE', isCurrentlyRamadan: true };
}

/**
 * Adjust session intensity for the Ramadan window.
 *
 * @param {number} baseIntensity — original session intensity (0-1)
 * @param {Object} input — same as shouldApplyRamadanAdjustments
 * @returns {{ adjusted: number, originalIntensity: number, multiplier: number, applied: boolean }}
 */
function adjustIntensity(baseIntensity, input = {}) {
  const decision = shouldApplyRamadanAdjustments(input);
  if (!decision.applies) {
    return {
      adjusted: baseIntensity,
      originalIntensity: baseIntensity,
      multiplier: 1,
      applied: false,
      reason: decision.reason,
    };
  }
  const multiplier = input.intensityMultiplier ?? DEFAULT_RAMADAN_INTENSITY;
  return {
    adjusted: Math.max(0.1, Math.min(1, baseIntensity * multiplier)),
    originalIntensity: baseIntensity,
    multiplier,
    applied: true,
    reason: decision.reason,
  };
}

/**
 * Classify an activity as Ramadan-friendly during fasting hours.
 */
function classifyActivity(activityCode) {
  if (PHYSICAL_ACTIVITIES.includes(activityCode)) return 'avoid_during_fasting';
  if (FASTING_FRIENDLY_ACTIVITIES.includes(activityCode)) return 'friendly_during_fasting';
  return 'neutral';
}

/**
 * Recommend session timing during Ramadan: preferred is post-Iftar or
 * pre-Suhoor; default daytime sessions get a downgraded recommendation.
 *
 * @param {string} activityCode
 * @param {Object} timingHints — { iftarTime, suhoorTime, sessionStart }
 * @returns {{ recommended: string, reasonAr: string, reasonEn: string }}
 */
function recommendTiming(activityCode, timingHints = {}) {
  const classification = classifyActivity(activityCode);
  if (classification === 'avoid_during_fasting') {
    return {
      recommended: 'post_iftar',
      reasonAr: 'يُفضّل تنفيذ هذا النشاط بعد الإفطار في رمضان (مرتفع الجهد)',
      reasonEn: 'Recommended post-Iftar during Ramadan (high-energy activity)',
    };
  }
  if (classification === 'friendly_during_fasting') {
    return {
      recommended: 'daytime_acceptable',
      reasonAr: 'يمكن تنفيذ هذا النشاط في النهار خلال رمضان',
      reasonEn: 'Can be scheduled during fasting hours',
    };
  }
  return {
    recommended: 'evaluate_case_by_case',
    reasonAr: 'يحتاج إلى تقييم حالة بحالة',
    reasonEn: 'Evaluate case-by-case',
  };
}

module.exports = Object.freeze({
  shouldApplyRamadanAdjustments,
  adjustIntensity,
  classifyActivity,
  recommendTiming,
  // Constants
  ASSUMED_OBSERVANCE_AGE_YEARS,
  DEFAULT_RAMADAN_INTENSITY,
  PHYSICAL_ACTIVITIES,
  FASTING_FRIENDLY_ACTIVITIES,
});
