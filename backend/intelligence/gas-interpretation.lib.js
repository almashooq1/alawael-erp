'use strict';

/**
 * gas-interpretation.lib.js — W456.
 *
 * Translates GAS T-scores into plain-language interpretations for the
 * 3 audience surfaces defined in the v3 lifecycle Engagement Architecture
 * (docs/blueprint/beneficiary-lifecycle-v3.md §5):
 *
 *   • family       — caregiver-facing, bilingual (Arabic primary)
 *   • clinician    — therapist-facing, technical
 *   • beneficiary  — age/ability-adapted, simple
 *
 * Pure functions. No I/O. T-score interpretation bands match the W264
 * gas.service comment block:
 *   ≥ 60   substantial gain
 *   55-60  exceeded expectations
 *   45-55  met expectations
 *   40-45  below expectations
 *   < 40   substantial shortfall
 *
 * No PII anywhere in the lib — `beneficiaryName` is passed in as opaque
 * string and used only as a string literal in the narrative.
 */

const BANDS = Object.freeze({
  EXCELLENT: { min: 60, max: Infinity, key: 'excellent' },
  EXCEEDED: { min: 55, max: 60, key: 'exceeded' },
  MET: { min: 45, max: 55, key: 'met' },
  BELOW: { min: 40, max: 45, key: 'below' },
  POOR: { min: -Infinity, max: 40, key: 'poor' },
});

function bandFor(tScore) {
  if (typeof tScore !== 'number' || !Number.isFinite(tScore)) return 'no-data';
  if (tScore >= 60) return 'excellent';
  if (tScore >= 55) return 'exceeded';
  if (tScore >= 45) return 'met';
  if (tScore >= 40) return 'below';
  return 'poor';
}

function fmtScore(tScore) {
  if (typeof tScore !== 'number' || !Number.isFinite(tScore)) return '--';
  return tScore.toFixed(1);
}

/**
 * Family-facing interpretation (Arabic primary + English mirror).
 * Designed to be read aloud or shown in parent portal cards.
 */
function interpretForFamily(tScore, opts = {}) {
  const band = bandFor(tScore);
  const score = fmtScore(tScore);
  const name = opts.beneficiaryName || (opts.lang === 'en' ? 'your child' : 'ابنكم');
  const suggestedAction =
    band === 'excellent' || band === 'exceeded'
      ? 'celebrate_continue'
      : band === 'met'
        ? 'continue_plan'
        : band === 'below'
          ? 'review_plan'
          : 'urgent_review';

  if (band === 'no-data') {
    return {
      ar: 'لا توجد بيانات كافية بعد لاحتساب التقدم',
      en: 'Not enough data yet to compute progress',
      band,
      tScore: null,
      suggestedAction: 'collect_data',
    };
  }

  const messages = {
    excellent: {
      ar: `تقدّم رائع! ${name} فاق التوقعات بشكل ملحوظ (T = ${score}). هذا يعني تحقق متعدد للأهداف بأداء عالي`,
      en: `Excellent progress! Significantly exceeded expectations (T = ${score}). Multiple goals achieved at high performance.`,
    },
    exceeded: {
      ar: `أداء جيد جداً — ${name} فاق التوقعات (T = ${score}). نواصل الخطة الحالية مع رفع تحديات قادمة`,
      en: `Very good — exceeded expectations (T = ${score}). We'll continue the current plan and introduce gradual challenge.`,
    },
    met: {
      ar: `${name} حقق ما هو متوقع (T = ${score}). الخطة تسير كما خُطط لها`,
      en: `Met expected level (T = ${score}). The plan is progressing as designed.`,
    },
    below: {
      ar: `التقدم أبطأ مما توقعنا (T = ${score}). سنراجع الخطة في الاجتماع القادم لتعديلها`,
      en: `Progress slower than expected (T = ${score}). We'll review the plan at the next meeting.`,
    },
    poor: {
      ar: `يحتاج ${name} مراجعة عاجلة للخطة (T = ${score}). سنتواصل معكم لترتيب اجتماع`,
      en: `Urgent plan review needed (T = ${score}). We'll contact you to schedule a meeting.`,
    },
  };

  return {
    ar: messages[band].ar,
    en: messages[band].en,
    band,
    tScore,
    suggestedAction,
  };
}

/**
 * Clinician-facing interpretation. Technical, with confidence band info.
 */
function interpretForClinician(tScore, opts = {}) {
  const band = bandFor(tScore);
  const score = fmtScore(tScore);
  if (band === 'no-data') {
    return { en: 'No T-score available', band, tScore: null };
  }
  const ciInfo =
    opts.ci95Lower != null && opts.ci95Upper != null
      ? ` (95% CI: ${opts.ci95Lower.toFixed(1)}, ${opts.ci95Upper.toFixed(1)})`
      : '';
  const goalsInfo = opts.goalCount != null ? `, n=${opts.goalCount} goals` : '';
  const map = {
    excellent: `T = ${score}${ciInfo} — Substantial gain band (≥60). Indicates above-expected attainment across multiple goals${goalsInfo}.`,
    exceeded: `T = ${score}${ciInfo} — Exceeded-expectations band (55-60). Plan effective${goalsInfo}.`,
    met: `T = ${score}${ciInfo} — Met-expectations band (45-55). Plan tracking on target${goalsInfo}.`,
    below: `T = ${score}${ciInfo} — Below-expectations band (40-45). Consider intensity/dosing review${goalsInfo}.`,
    poor: `T = ${score}${ciInfo} — Substantial shortfall band (<40). Recommend MDT review${goalsInfo}.`,
  };
  return { en: map[band], band, tScore };
}

/**
 * Beneficiary-facing interpretation. Age/ability-adapted. Returns
 * either a verbal narrative (for verbal/older beneficiaries) or a
 * symbolic descriptor (for AAC/younger).
 */
function interpretForBeneficiary(tScore, opts = {}) {
  const band = bandFor(tScore);
  const useSymbol = opts.modality === 'aac' || opts.ageMonths < 60;

  if (band === 'no-data') {
    return useSymbol
      ? { symbol: '?', ar: '...', en: '...', band }
      : { ar: 'لم نقم بالقياس بعد', en: "We haven't measured yet", band };
  }

  if (useSymbol) {
    const symbolMap = {
      excellent: { symbol: '🌟', ar: 'ممتاز جداً', en: 'amazing' },
      exceeded: { symbol: '😀', ar: 'ممتاز', en: 'great' },
      met: { symbol: '🙂', ar: 'جيد', en: 'good' },
      below: { symbol: '😐', ar: 'نحاول أكثر', en: 'try more' },
      poor: { symbol: '🤝', ar: 'نحتاج مساعدة', en: 'need help' },
    };
    return { ...symbolMap[band], band };
  }

  const verbalMap = {
    excellent: { ar: 'أنت رائع! أحرزت تقدماً ممتازاً', en: "You're amazing! Great progress." },
    exceeded: { ar: 'أحسنت! تقدمك ممتاز', en: 'Well done! Excellent progress.' },
    met: { ar: 'جيد! أنت تتقدم كما توقعنا', en: 'Good! You are progressing as expected.' },
    below: { ar: 'سنحاول أكثر معاً', en: "Let's try more together." },
    poor: { ar: 'سنغير الخطة لنساعدك بشكل أفضل', en: "We'll change the plan to help you better." },
  };
  return { ...verbalMap[band], band };
}

/**
 * Build the complete 3-surface interpretation bundle in one call.
 */
function interpretAll(tScore, opts = {}) {
  return {
    family: interpretForFamily(tScore, opts),
    clinician: interpretForClinician(tScore, opts),
    beneficiary: interpretForBeneficiary(tScore, opts),
    band: bandFor(tScore),
    tScore,
  };
}

module.exports = Object.freeze({
  interpretForFamily,
  interpretForClinician,
  interpretForBeneficiary,
  interpretAll,
  bandFor,
  // Constants
  BANDS,
});
