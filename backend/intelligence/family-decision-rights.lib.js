'use strict';

/**
 * family-decision-rights.lib.js — W477.
 *
 * Multi-generational family-decision-rights router. In Saudi context the
 * father is typically legally responsible for minor decisions, but
 * consultation with grandfather + uncles + tribal elder is culturally
 * expected for major decisions. This library encodes that consultation
 * ladder so the platform doesn't bypass culturally important voices.
 *
 * Distinct from W461 DecisionRightsAssessment (which handles CRPD
 * Article 12 BENEFICIARY's own capacity) — this library is about the
 * FAMILY's decision structure when the beneficiary lacks capacity OR
 * is a minor.
 *
 * Per v3 §9.2 (Family Structure — Saudi Context).
 */

// Decision categories ordered by escalating cultural-consultation expectation
const DECISION_CATEGORIES = Object.freeze([
  'routine', // scheduling, session timing — primary caregiver decides
  'minor', // home program changes, equipment requests
  'standard', // care plan changes, intensity changes
  'major', // discharge / transition / school enrollment
  'critical', // surgery, sedation, restraint, court-involved
  'irreversible', // end-of-life, gender-affirming care, marriage
]);

// Default consultation requirements per category (Saudi cultural baseline)
const DEFAULT_CONSULTATIONS = Object.freeze({
  routine: ['primary_caregiver'],
  minor: ['primary_caregiver'],
  standard: ['primary_caregiver', 'father'],
  major: ['primary_caregiver', 'father', 'mother'],
  critical: ['primary_caregiver', 'father', 'mother', 'grandfather_paternal'],
  irreversible: [
    'primary_caregiver',
    'father',
    'mother',
    'grandfather_paternal',
    'tribal_elder',
    'guardian_court_appointed',
  ],
});

const ROLE_RANK = Object.freeze({
  primary_caregiver: 1,
  mother: 2,
  father: 1, // typically primary legal responsible
  grandfather_paternal: 3,
  grandfather_maternal: 4,
  grandmother_paternal: 5,
  grandmother_maternal: 6,
  uncle_paternal: 7,
  uncle_maternal: 8,
  aunt: 9,
  older_brother: 10,
  older_sister: 11,
  spouse: 1, // for adult beneficiaries
  tribal_elder: 12,
  guardian_court_appointed: 1, // overrides all when present
  other: 99,
});

/**
 * Resolve the required consultations for a given decision category +
 * family structure type.
 *
 * @param {string} category
 * @param {Object} [opts]
 * @param {string} [opts.familyType] — 'nuclear' | 'extended' | 'single_parent' | 'guardian_only' | 'tribal'
 * @param {Array<{relationship, consultRequired}>} [opts.decisionMakers] — from W475 CulturalProfile
 * @returns {{ required: Array<string>, recommended: Array<string>, reasonAr: string, reasonEn: string }}
 */
function requiredConsultations(category, opts = {}) {
  if (!DECISION_CATEGORIES.includes(category)) {
    return {
      required: [],
      recommended: [],
      reasonAr: 'فئة قرار غير معروفة',
      reasonEn: 'Unknown decision category',
    };
  }

  const baseline = (DEFAULT_CONSULTATIONS[category] || []).slice();
  const { familyType = 'extended', decisionMakers = [] } = opts;

  // Family type adjustments
  let required = baseline.slice();
  if (familyType === 'nuclear') {
    // Drop grandfather/tribal consultations for nuclear families
    required = required.filter(
      r => !['grandfather_paternal', 'grandfather_maternal', 'tribal_elder'].includes(r)
    );
  } else if (familyType === 'single_parent') {
    required = required.filter(
      r => r !== 'father' || decisionMakers.some(dm => dm.relationship === 'father')
    );
  } else if (familyType === 'guardian_only') {
    required = ['primary_caregiver', 'guardian_court_appointed'];
  } else if (familyType === 'tribal') {
    // Tribal families involve tribal_elder for standard+
    if (
      ['standard', 'major', 'critical', 'irreversible'].includes(category) &&
      !required.includes('tribal_elder')
    ) {
      required.push('tribal_elder');
    }
  }

  // Apply per-family consultRequired overrides — adds roles flagged in CulturalProfile
  const forcedRoles = decisionMakers
    .filter(dm => dm.consultRequired === true)
    .map(dm => dm.relationship);
  for (const fr of forcedRoles) {
    if (!required.includes(fr)) required.push(fr);
  }

  // Recommended = anyone in decisionMakers not in required
  const decisionMakerRoles = decisionMakers.map(dm => dm.relationship);
  const recommended = decisionMakerRoles.filter(r => !required.includes(r));

  return {
    required,
    recommended,
    reasonAr: _arReason(category, familyType),
    reasonEn: _enReason(category, familyType),
  };
}

function _arReason(category, familyType) {
  const labels = {
    routine: 'قرار روتيني',
    minor: 'قرار بسيط',
    standard: 'قرار اعتيادي',
    major: 'قرار مهم',
    critical: 'قرار حرج',
    irreversible: 'قرار لا رجعة فيه',
  };
  return `${labels[category] || category} — نمط الأسرة: ${familyType}`;
}

function _enReason(category, familyType) {
  return `${category} decision — family type: ${familyType}`;
}

/**
 * Verify whether a set of obtained consultations satisfies the
 * requirements for the given decision.
 */
function isConsultationComplete(category, opts = {}, obtainedRoles = []) {
  if (!Array.isArray(obtainedRoles)) return { complete: false, missing: ['INVALID_INPUT'] };
  const { required } = requiredConsultations(category, opts);
  const missing = required.filter(r => !obtainedRoles.includes(r));
  return {
    complete: missing.length === 0,
    missing,
    requiredCount: required.length,
    obtainedCount: obtainedRoles.length,
  };
}

/**
 * Resolve the PRIMARY decision-maker for a family — the person whose
 * sign-off is required first. Returns role string + reasoning.
 */
function primaryDecisionMaker(opts = {}) {
  const { decisionMakers = [], familyType = 'extended' } = opts;

  // Court-appointed guardian always wins
  if (decisionMakers.some(dm => dm.relationship === 'guardian_court_appointed')) {
    return {
      role: 'guardian_court_appointed',
      reasonAr: 'وصي معيّن من المحكمة — يحل محل جميع القرارات',
      reasonEn: 'Court-appointed guardian — overrides all',
    };
  }

  if (familyType === 'guardian_only') {
    return {
      role: 'primary_caregiver',
      reasonAr: 'مقدم الرعاية الأساسي (لا توجد عائلة)',
      reasonEn: 'Primary caregiver (no family present)',
    };
  }

  // Look for father first (Saudi cultural baseline)
  if (decisionMakers.some(dm => dm.relationship === 'father')) {
    return {
      role: 'father',
      reasonAr: 'الأب — المسؤول القانوني الأساسي عن القاصر',
      reasonEn: 'Father — primary legal guardian for minor',
    };
  }

  // Single parent
  if (familyType === 'single_parent' && decisionMakers.some(dm => dm.relationship === 'mother')) {
    return {
      role: 'mother',
      reasonAr: 'الأم — المسؤول القانوني الأساسي (أسرة أحادية)',
      reasonEn: 'Mother — primary legal guardian (single-parent family)',
    };
  }

  // Spouse for adult beneficiaries
  if (decisionMakers.some(dm => dm.relationship === 'spouse')) {
    return {
      role: 'spouse',
      reasonAr: 'الزوج/الزوجة — للمستفيدين البالغين',
      reasonEn: 'Spouse — for adult beneficiaries',
    };
  }

  return {
    role: 'primary_caregiver',
    reasonAr: 'مقدم الرعاية الأساسي (افتراضي)',
    reasonEn: 'Primary caregiver (default)',
  };
}

module.exports = Object.freeze({
  requiredConsultations,
  isConsultationComplete,
  primaryDecisionMaker,
  // Constants
  DECISION_CATEGORIES,
  DEFAULT_CONSULTATIONS,
  ROLE_RANK,
});
