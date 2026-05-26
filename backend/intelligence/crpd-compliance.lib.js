'use strict';

/**
 * crpd-compliance.lib.js — W463.
 *
 * Pure library for scoring CRPD (Convention on the Rights of Persons
 * with Disabilities) compliance at the beneficiary, branch, and
 * organization levels. Saudi Arabia ratified CRPD in 2008 — it is
 * legally binding. This library implements the 8 General Principles
 * (Article 3) as measurable checks.
 *
 * Per Phase B Innovation 8 of docs/blueprint/beneficiary-lifecycle-v3.md.
 *
 * The 8 CRPD General Principles (Article 3):
 *   1. Respect for inherent dignity
 *   2. Non-discrimination
 *   3. Full and effective participation and inclusion
 *   4. Respect for difference
 *   5. Equality of opportunity
 *   6. Accessibility
 *   7. Equality between men and women
 *   8. Respect for evolving capacities of children
 *
 * Scoring is observation-based (operates on already-fetched data).
 * Each principle gets a 0-100 sub-score; composite is weighted mean.
 *
 * No DB, no Mongoose. Pure functions only.
 */

const PRINCIPLES = Object.freeze([
  {
    code: 'dignity',
    titleAr: 'احترام الكرامة المتأصلة',
    titleEn: 'Respect for inherent dignity',
    weight: 1.5,
  },
  {
    code: 'non_discrimination',
    titleAr: 'عدم التمييز',
    titleEn: 'Non-discrimination',
    weight: 1.5,
  },
  {
    code: 'participation',
    titleAr: 'المشاركة الكاملة',
    titleEn: 'Full participation & inclusion',
    weight: 1.2,
  },
  {
    code: 'respect_difference',
    titleAr: 'احترام الاختلاف',
    titleEn: 'Respect for difference',
    weight: 1.0,
  },
  {
    code: 'equal_opportunity',
    titleAr: 'تكافؤ الفرص',
    titleEn: 'Equality of opportunity',
    weight: 1.2,
  },
  { code: 'accessibility', titleAr: 'إمكانية الوصول', titleEn: 'Accessibility', weight: 1.3 },
  {
    code: 'gender_equality',
    titleAr: 'المساواة بين الجنسين',
    titleEn: 'Gender equality',
    weight: 1.0,
  },
  {
    code: 'evolving_capacity',
    titleAr: 'احترام تطور قدرات الأطفال',
    titleEn: 'Evolving capacities of children',
    weight: 1.3,
  },
]);

/**
 * Evaluate the Voice principle (Principle 1 + 3): does this beneficiary
 * have a documented voice channel? Sub-checks:
 *   • Has ≥1 BeneficiaryVoiceLog entry in last 90 days
 *   • Has ≥1 entry with capacityGrade='full' or 'supported' (not all proxy)
 *   • Has documented DecisionRightsAssessment for major decisions
 */
function scoreVoiceAndDignity(input) {
  const { voiceLogs = [], decisionAssessments = [] } = input || {};
  let score = 0;
  const max = 100;

  // 40 pts: any voice entry in last 90 days
  const cutoff90d = Date.now() - 90 * 86400000;
  const recentVoice = voiceLogs.filter(v => new Date(v.capturedAt).getTime() >= cutoff90d);
  if (recentVoice.length > 0) score += 40;

  // 30 pts: not all-proxy
  const nonProxyEntries = recentVoice.filter(v => v.captureModality !== 'proxy');
  if (recentVoice.length > 0 && nonProxyEntries.length / recentVoice.length >= 0.5) score += 30;
  else if (nonProxyEntries.length > 0) score += 15;

  // 30 pts: capacity assessment present for any major decision
  if (decisionAssessments.some(d => d.status === 'finalized')) score += 30;

  return { score, max, percentage: Math.round((score / max) * 100) };
}

/**
 * Evaluate Participation principle: voice acted upon (action != 'none').
 */
function scoreParticipation(input) {
  const { voiceLogs = [] } = input || {};
  if (voiceLogs.length === 0) return { score: 0, max: 100, percentage: 0 };

  const actedUpon = voiceLogs.filter(v => v.actionTaken && v.actionTaken !== 'none');
  const percentage = Math.round((actedUpon.length / voiceLogs.length) * 100);
  return { score: percentage, max: 100, percentage };
}

/**
 * Evaluate Accessibility principle: reasonable adjustments in place,
 * AAC users have AAC profile, etc.
 */
function scoreAccessibility(input) {
  const {
    hasAACProfile,
    reasonableAdjustmentsCount = 0,
    accessibleAccommodations = 0,
  } = input || {};
  let score = 0;

  if (hasAACProfile === true) score += 40;
  else if (hasAACProfile === false) {
    // Not applicable (verbal beneficiary). Award full credit for non-applicable items
    score += 40;
  }

  if (reasonableAdjustmentsCount >= 1) score += 30;
  if (accessibleAccommodations >= 1) score += 30;

  return { score, max: 100, percentage: Math.round((score / 100) * 100) };
}

/**
 * Evaluate evolving-capacity principle (CRPD Art. 7 for children):
 * does the beneficiary have an age-appropriate self-advocacy training
 * plan + capacity assessments tracking growth over time?
 */
function scoreEvolvingCapacity(input) {
  const {
    hasAdvocacyPlan = false,
    completionPercentage = 0,
    capacityHistoryLength = 0,
  } = input || {};
  let score = 0;
  if (hasAdvocacyPlan) score += 40;
  score += Math.min(30, Math.round(completionPercentage * 0.3));
  if (capacityHistoryLength >= 2) score += 30;
  else if (capacityHistoryLength === 1) score += 15;
  return { score: Math.min(100, score), max: 100, percentage: Math.min(100, score) };
}

/**
 * Evaluate non-discrimination/equality principles (placeholder — full
 * implementation comes with Phase G Equity Engine).
 */
function scoreEqualityFromAggregates(input) {
  // input.disparityIndex: 0-1, 0 = no disparity, 1 = max disparity
  const di = typeof input?.disparityIndex === 'number' ? input.disparityIndex : null;
  if (di == null) return { score: null, max: 100, percentage: null, note: 'Awaiting Phase G data' };
  const percentage = Math.round((1 - di) * 100);
  return { score: percentage, max: 100, percentage };
}

/**
 * Compute the 8-principle composite CRPD compliance score for a beneficiary.
 *
 * @param {Object} input  — { voiceLogs, decisionAssessments, hasAACProfile,
 *                            reasonableAdjustmentsCount, accessibleAccommodations,
 *                            hasAdvocacyPlan, completionPercentage,
 *                            capacityHistoryLength, disparityIndex }
 * @returns {{ composite, breakdown, band, recommendations }}
 */
function scoreBeneficiary(input = {}) {
  const breakdown = {
    dignity: scoreVoiceAndDignity(input),
    non_discrimination: scoreEqualityFromAggregates(input),
    participation: scoreParticipation(input),
    respect_difference: scoreAccessibility(input), // proxy for now
    equal_opportunity: scoreEqualityFromAggregates(input),
    accessibility: scoreAccessibility(input),
    gender_equality: scoreEqualityFromAggregates(input),
    evolving_capacity: scoreEvolvingCapacity(input),
  };

  // Weighted composite — only count principles with a numeric score
  let weightedSum = 0;
  let totalWeight = 0;
  for (const p of PRINCIPLES) {
    const sub = breakdown[p.code];
    if (sub && typeof sub.percentage === 'number') {
      weightedSum += sub.percentage * p.weight;
      totalWeight += p.weight;
    }
  }
  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  return {
    composite,
    breakdown,
    band: _bandFor(composite),
    recommendations: _recommendationsFor(breakdown),
  };
}

function _bandFor(composite) {
  if (composite == null) return 'insufficient_data';
  if (composite >= 85) return 'excellent';
  if (composite >= 70) return 'good';
  if (composite >= 55) return 'adequate';
  if (composite >= 40) return 'needs_attention';
  return 'critical';
}

function _recommendationsFor(breakdown) {
  const recs = [];
  if (breakdown.dignity?.percentage < 50) {
    recs.push({
      principle: 'dignity',
      ar: 'لم يُسجَّل صوت المستفيد في آخر 90 يوماً — افتح محادثة Voice Log',
      en: 'No voice log entry in the last 90 days — open Voice Log conversation',
    });
  }
  if (breakdown.participation?.percentage < 30) {
    recs.push({
      principle: 'participation',
      ar: 'أصوات المستفيد مُسجَّلة لكن غير مُتَّبَعة بإجراء — راجع actionTaken',
      en: 'Voice captured but not acted upon — review actionTaken',
    });
  }
  if (breakdown.accessibility?.percentage < 50) {
    recs.push({
      principle: 'accessibility',
      ar: 'لا تعديلات معقولة موثَّقة — استشر الـ Independent Advocate',
      en: 'No reasonable adjustments documented — consult Independent Advocate',
    });
  }
  if (breakdown.evolving_capacity?.percentage < 40) {
    recs.push({
      principle: 'evolving_capacity',
      ar: 'لا توجد خطة تدريب على المناصرة الذاتية — أنشئ خطة عبر W462',
      en: 'No self-advocacy training plan — create one via W462',
    });
  }
  return recs;
}

module.exports = Object.freeze({
  scoreBeneficiary,
  scoreVoiceAndDignity,
  scoreParticipation,
  scoreAccessibility,
  scoreEvolvingCapacity,
  scoreEqualityFromAggregates,
  // Constants
  PRINCIPLES,
});
