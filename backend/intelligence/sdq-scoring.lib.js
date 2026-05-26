'use strict';

/**
 * sdq-scoring.lib.js — W468.
 *
 * Strengths and Difficulties Questionnaire (SDQ) scoring for sibling
 * adjustment assessment. SDQ is the most widely-used validated brief
 * behavioral screening tool for children + youth (Goodman, 1997).
 *
 * Per Phase C of docs/blueprint/beneficiary-lifecycle-v3.md §2.2
 * Dimension C — Sibling Hub. Healthy siblings of disabled children
 * have measurable adjustment needs that the family wellbeing
 * composite (W467) must capture.
 *
 * SDQ structure (25 items, 5 subscales of 5 items each):
 *   1. Emotional symptoms      (0-10, higher = worse)
 *   2. Conduct problems         (0-10, higher = worse)
 *   3. Hyperactivity/inattention (0-10, higher = worse)
 *   4. Peer relationship problems (0-10, higher = worse)
 *   5. Prosocial behavior       (0-10, higher = BETTER) — reverse-scored
 *
 *   Total Difficulties Score = sum of 1+2+3+4  (0-40, higher = worse)
 *
 * Age-banded normative cut-offs (4-17 yr):
 *   close to average:    0-13
 *   slightly raised:     14-16
 *   high:                17-19
 *   very high:           20-40
 *
 * Pure functions only. No DB.
 */

const SUBSCALES = Object.freeze([
  {
    code: 'emotional',
    titleAr: 'الأعراض الانفعالية',
    titleEn: 'Emotional symptoms',
    isReversed: false,
  },
  { code: 'conduct', titleAr: 'مشكلات السلوك', titleEn: 'Conduct problems', isReversed: false },
  {
    code: 'hyperactivity',
    titleAr: 'فرط النشاط',
    titleEn: 'Hyperactivity/Inattention',
    isReversed: false,
  },
  {
    code: 'peer',
    titleAr: 'مشكلات العلاقة مع الأقران',
    titleEn: 'Peer relationship problems',
    isReversed: false,
  },
  {
    code: 'prosocial',
    titleAr: 'السلوك المؤيد للمجتمع',
    titleEn: 'Prosocial behavior',
    isReversed: true,
  },
]);

const CUTOFFS = Object.freeze({
  total: { closeToAverage: 13, slightlyRaised: 16, high: 19, veryHigh: 40 },
  emotional: { closeToAverage: 4, slightlyRaised: 5, high: 6, veryHigh: 10 },
  conduct: { closeToAverage: 3, slightlyRaised: 4, high: 5, veryHigh: 10 },
  hyperactivity: { closeToAverage: 6, slightlyRaised: 7, high: 8, veryHigh: 10 },
  peer: { closeToAverage: 3, slightlyRaised: 4, high: 5, veryHigh: 10 },
  // Prosocial uses INVERSE cutoffs (lower = worse)
  prosocial: { closeToAverage: 6, slightlyRaised: 5, high: 4, veryHigh: 0 },
});

/**
 * Validate an SDQ score sheet.
 * Each subscale must be a number 0-10.
 */
function validateScores(scores) {
  const errors = [];
  if (!scores || typeof scores !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }
  for (const sub of SUBSCALES) {
    const v = scores[sub.code];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`MISSING_SUBSCALE:${sub.code}`);
    } else if (v < 0 || v > 10) {
      errors.push(`OUT_OF_RANGE:${sub.code}:${v}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Compute Total Difficulties Score (sum of 4 problem subscales —
 * excludes prosocial which is reverse-scored).
 */
function totalDifficulties(scores) {
  if (!scores) return null;
  const cols = ['emotional', 'conduct', 'hyperactivity', 'peer'];
  const sum = cols.reduce((acc, c) => acc + (typeof scores[c] === 'number' ? scores[c] : 0), 0);
  return sum;
}

/**
 * Band a single subscale score (or the total) against age-banded cutoffs.
 */
function bandSubscale(subscaleCode, score) {
  if (typeof score !== 'number') return 'unknown';
  const cuts = CUTOFFS[subscaleCode];
  if (!cuts) return 'unknown';

  // Prosocial is INVERSE: low scores = worse
  if (subscaleCode === 'prosocial') {
    if (score >= cuts.closeToAverage) return 'close_to_average';
    if (score >= cuts.slightlyRaised) return 'slightly_raised';
    if (score >= cuts.high) return 'high';
    return 'very_high';
  }

  // Total + 4 difficulty subscales: high score = worse
  if (score <= cuts.closeToAverage) return 'close_to_average';
  if (score <= cuts.slightlyRaised) return 'slightly_raised';
  if (score <= cuts.high) return 'high';
  return 'very_high';
}

/**
 * Compute the adjustment summary for a complete SDQ sheet.
 * Returns total + per-subscale bands + wellbeing0-100 score
 * (the latter feeds family-wbci.lib via the siblingAdjustment component).
 */
function scoreSDQ(scores) {
  const { valid, errors } = validateScores(scores);
  if (!valid) {
    return { valid: false, errors };
  }
  const total = totalDifficulties(scores);
  const breakdown = {};
  for (const sub of SUBSCALES) {
    breakdown[sub.code] = {
      score: scores[sub.code],
      band: bandSubscale(sub.code, scores[sub.code]),
      isReversed: sub.isReversed,
    };
  }
  const totalBand = bandSubscale('total', total);

  // Translate to wellbeing 0-100 for WBCI consumption.
  // Total 0 → 100, Total 40 → 0. Prosocial > 5 adds bonus.
  let wellbeing = Math.round((1 - total / 40) * 100);
  if (typeof scores.prosocial === 'number' && scores.prosocial >= 7) {
    wellbeing = Math.min(100, wellbeing + 5);
  }

  return {
    valid: true,
    total,
    totalBand,
    breakdown,
    wellbeing,
    interpretation: _interpret(totalBand, breakdown.prosocial?.band),
  };
}

function _interpret(totalBand, prosocialBand) {
  const map = {
    close_to_average: {
      ar: 'تكيّف ضمن المعدل الطبيعي',
      en: 'Adjustment within typical range',
    },
    slightly_raised: {
      ar: 'علامات خفيفة تحتاج للملاحظة',
      en: 'Mild signs to monitor',
    },
    high: {
      ar: 'علامات تستدعي تقييماً متخصصاً',
      en: 'Concerns — specialized assessment recommended',
    },
    very_high: {
      ar: 'علامات شديدة — يُنصح بإحالة للمختصين',
      en: 'Severe concerns — clinical referral indicated',
    },
    unknown: { ar: 'بيانات ناقصة', en: 'Incomplete data' },
  };
  const base = map[totalBand] || map.unknown;
  const note =
    prosocialBand === 'very_high'
      ? { ar: 'لكن مع نقاط قوة في السلوك المؤيد', en: 'with notable prosocial strengths' }
      : null;
  return { ...base, prosocialNote: note };
}

module.exports = Object.freeze({
  validateScores,
  totalDifficulties,
  bandSubscale,
  scoreSDQ,
  // Constants
  SUBSCALES,
  CUTOFFS,
});
