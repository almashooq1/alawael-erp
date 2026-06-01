'use strict';

/**
 * morse.js — W712 scoring module for the Morse Fall Scale (MFS).
 *
 * A rapid, widely-used nursing fall-risk screen across 6 weighted items.
 * Each item is recorded as its Morse POINT value (already mapped from the
 * categorical response); the module sums them. Higher = greater fall risk →
 * lower_better. Total range 0–125.
 *
 * Item → allowed point values:
 *   1. History of falling          0 | 25
 *   2. Secondary diagnosis         0 | 15
 *   3. Ambulatory aid              0 | 15 | 30
 *   4. IV / heparin lock           0 | 20
 *   5. Gait / transferring         0 | 10 | 20
 *   6. Mental status               0 | 15
 *
 * Risk bands (common institutional cut-points):
 *   0–24   → low risk
 *   25–44  → moderate risk
 *   ≥ 45   → high risk
 *
 * Public domain; free clinical use. rawShape: 'item_array' (6 point values).
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 6;
const SCORE_MIN = 0;
const SCORE_MAX = 125;
const CUTOFF = 45; // ≥ 45 → high fall risk

/** Allowed Morse point values per item index (0-based). */
const ALLOWED = [
  [0, 25], // history of falling
  [0, 15], // secondary diagnosis
  [0, 15, 30], // ambulatory aid
  [0, 20], // IV / heparin lock
  [0, 10, 20], // gait
  [0, 15], // mental status
];

const itemBank = {
  instrumentName_ar: 'مقياس مورس لخطر السقوط (MFS)',
  instrumentName_en: 'Morse Fall Scale (MFS)',
  instrumentVersion: 'Morse Fall Scale (6 weighted items)',
  respondent: 'clinician_observed',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يُسجَّل لكل بند قيمته النقطية وفق فئة استجابة المستفيد؛ يُجمَع الإجمالي 0–125. أعلى = خطر سقوط أكبر.',
  responseScaleNote_en:
    'Each item is recorded as its Morse point value for the response category; total 0–125. Higher = greater fall risk.',
  items: [
    {
      number: 1,
      text_ar: 'تاريخ السقوط (خلال 3 أشهر)',
      text_en: 'History of falling (within 3 months)',
      allowed: ALLOWED[0],
    },
    {
      number: 2,
      text_ar: 'تشخيص ثانوي (أكثر من تشخيص طبي)',
      text_en: 'Secondary diagnosis (>1 medical diagnosis)',
      allowed: ALLOWED[1],
    },
    {
      number: 3,
      text_ar: 'وسيلة مساعدة على الحركة',
      text_en: 'Ambulatory aid',
      allowed: ALLOWED[2],
    },
    {
      number: 4,
      text_ar: 'وريد وريدي / قفل هيبارين',
      text_en: 'IV therapy / heparin lock',
      allowed: ALLOWED[3],
    },
    { number: 5, text_ar: 'المشية والانتقال', text_en: 'Gait / transferring', allowed: ALLOWED[4] },
    {
      number: 6,
      text_ar: 'الحالة الذهنية (إدراك القدرة)',
      text_en: 'Mental status (awareness of ability)',
      allowed: ALLOWED[5],
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`Morse expects exactly ${ITEM_COUNT} values — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    const allowed = ALLOWED[i];
    if (!allowed || !allowed.includes(v)) {
      errors.push(
        `item ${i + 1} must be one of [${(allowed || []).join(', ')}] — got ${JSON.stringify(v)}`
      );
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Morse: invalid input — ${v.errors.join('; ')}`);
  const value = rawItems.reduce((a, b) => a + b, 0);
  return {
    value,
    notes: { method: 'weighted_sum', unit: 'points', highRisk: value >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `Morse.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue <= 24) {
    return {
      band: 'low_risk',
      tier: 'L0',
      label_ar: 'خطر سقوط منخفض',
      label_en: 'Low fall risk',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'تطبيق احتياطات السلامة الأساسية وإعادة التقييم وفق السياسة.',
      action_en: 'Apply standard safety precautions and reassess per policy.',
    };
  }
  if (derivedValue <= 44) {
    return {
      band: 'moderate_risk',
      tier: 'L1',
      label_ar: 'خطر سقوط متوسط',
      label_en: 'Moderate fall risk',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تنفيذ تدخّلات الوقاية القياسية من السقوط وتثقيف المستفيد والأسرة.',
      action_en:
        'Implement standard fall-prevention interventions and educate the person and family.',
    };
  }
  return {
    band: 'high_risk',
    tier: 'L2',
    label_ar: 'خطر سقوط مرتفع',
    label_en: 'High fall risk',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'تفعيل بروتوكول الوقاية العالية من السقوط ومراقبة مكثّفة وتوثيق فوري.',
    action_en:
      'Activate the high fall-risk prevention protocol, intensive monitoring and immediate documentation.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const band = v => (v <= 24 ? 0 : v <= 44 ? 1 : 2);
  return {
    ...base,
    riskBandShift: prev != null && curr != null ? band(curr) - band(prev) : null,
  };
}

module.exports = {
  measureCode: 'MORSE',
  engineVersion: '1.0.0',
  derivedType: 'weighted_sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
