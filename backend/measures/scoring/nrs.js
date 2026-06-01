'use strict';

/**
 * nrs.js — W710 scoring module for the Numeric Pain Rating Scale (NRS-11).
 *
 * An 11-point (0–10) self-report of current pain intensity:
 *   0 = no pain · 10 = worst imaginable pain.
 * Lower = better. A score ≥ 4 is generally treated as clinically significant
 * pain warranting intervention.
 *
 * Public domain; free for clinical use. Complements FLACC (behavioural,
 * non-verbal observation) by capturing verbal self-report.
 *
 * rawShape: 'item_array' — computeDerived expects a single value [score].
 */

const { standardDelta } = require('./contract');

const SCORE_MIN = 0;
const SCORE_MAX = 10;
const CUTOFF = 4; // ≥ 4 → clinically significant pain

const itemBank = {
  instrumentName_ar: 'مقياس الألم الرقمي (NRS-11)',
  instrumentName_en: 'Numeric Pain Rating Scale (NRS-11)',
  instrumentVersion: 'NRS-11 (0–10)',
  respondent: 'self',
  estimatedMinutes: 1,
  responseScaleNote_ar: 'يختار المستفيد رقمًا من 0 (لا ألم) إلى 10 (أسوأ ألم متخيَّل). أقل = أفضل.',
  responseScaleNote_en:
    'The person selects 0 (no pain) to 10 (worst imaginable pain). Lower = better.',
  items: [
    {
      number: 1,
      text_ar: 'ما شدة ألمك الآن على مقياس من 0 إلى 10؟',
      text_en: 'How intense is your pain right now on a scale of 0 to 10?',
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== 1) {
    errors.push(`NRS expects exactly 1 value — got ${rawItems.length}`);
  }
  const v = rawItems[0];
  if (!Number.isInteger(v) || v < SCORE_MIN || v > SCORE_MAX) {
    errors.push(
      `pain score must be an integer ${SCORE_MIN}-${SCORE_MAX} — got ${JSON.stringify(v)}`
    );
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`NRS: invalid input — ${v.errors.join('; ')}`);
  const score = rawItems[0];
  return {
    value: score,
    notes: { method: 'direct', unit: 'points', significantPain: score >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(`NRS.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`);
  }
  if (derivedValue === 0) {
    return {
      band: 'no_pain',
      tier: 'L0',
      label_ar: 'لا ألم',
      label_en: 'No pain',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا حاجة لتدخّل دوائي؛ يُعاد التقييم عند تغيّر الحالة.',
      action_en: 'No analgesic intervention needed; reassess on status change.',
    };
  }
  if (derivedValue <= 3) {
    return {
      band: 'mild_pain',
      tier: 'L1',
      label_ar: 'ألم خفيف',
      label_en: 'Mild pain',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تدابير غير دوائية ومراقبة؛ تدخّل دوائي بسيط عند الحاجة.',
      action_en: 'Non-pharmacological measures and monitoring; simple analgesia if needed.',
    };
  }
  if (derivedValue <= 6) {
    return {
      band: 'moderate_pain',
      tier: 'L2',
      label_ar: 'ألم متوسط',
      label_en: 'Moderate pain',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تقييم سبب الألم وخطة تسكين فعّالة وإعادة تقييم خلال الجلسة.',
      action_en:
        'Assess the pain source, establish effective analgesia and reassess within the session.',
    };
  }
  return {
    band: 'severe_pain',
    tier: 'L3',
    label_ar: 'ألم شديد',
    label_en: 'Severe pain',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'تدخّل عاجل لإدارة الألم وإبلاغ الفريق الطبي وتوثيق الاستجابة.',
    action_en:
      'Urgent pain-management intervention, notify the medical team and document the response.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const sig = t => t >= CUTOFF;
  return {
    ...base,
    significantPainCrossed:
      prev != null && curr != null && !sig(prev) && sig(curr)
        ? true
        : prev != null && curr != null && sig(prev) && !sig(curr)
          ? false
          : null,
  };
}

module.exports = {
  measureCode: 'NRS',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
