'use strict';

/**
 * pss10.js — W710 scoring module for the Perceived Stress Scale-10 (PSS-10).
 *
 * Cohen, Kamarck & Mermelstein (1983). Ten items rated over the last month on
 * a 0–4 scale (0 = never … 4 = very often). Items 4, 5, 7, 8 are positively
 * worded and REVERSE-scored (4 − value). Total range 0–40; higher = more
 * perceived stress → lower = better.
 *   0–13  low stress · 14–26 moderate stress · 27–40 high stress.
 *
 * Free for non-profit academic / clinical use WITH attribution to the authors.
 *
 * rawShape: 'item_array' — computeDerived expects 10 values [item1..item10].
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 10;
const ITEM_MIN = 0;
const ITEM_MAX = 4;
const REVERSE_ITEMS = [4, 5, 7, 8]; // 1-indexed
const REVERSE_IDX = REVERSE_ITEMS.map(n => n - 1);
const TOTAL_MIN = 0;
const TOTAL_MAX = ITEM_COUNT * ITEM_MAX; // 40
const CUTOFF = 27; // ≥ 27 → high stress

const RESPONSE_OPTIONS = [
  { value: 0, label_ar: 'أبدًا', label_en: 'Never' },
  { value: 1, label_ar: 'نادرًا', label_en: 'Almost never' },
  { value: 2, label_ar: 'أحيانًا', label_en: 'Sometimes' },
  { value: 3, label_ar: 'غالبًا', label_en: 'Fairly often' },
  { value: 4, label_ar: 'كثيرًا جدًا', label_en: 'Very often' },
];

const ITEM_TEXT = [
  {
    ar: 'في الشهر الماضي، كم مرة شعرت بالانزعاج بسبب شيء حدث بشكل غير متوقع؟',
    en: 'In the last month, how often have you been upset because of something that happened unexpectedly?',
  },
  {
    ar: 'كم مرة شعرت بأنك غير قادر على التحكم في الأمور المهمة في حياتك؟',
    en: 'How often have you felt that you were unable to control the important things in your life?',
  },
  { ar: 'كم مرة شعرت بالتوتر والضغط النفسي؟', en: 'How often have you felt nervous and stressed?' },
  {
    ar: 'كم مرة شعرت بالثقة في قدرتك على التعامل مع مشكلاتك الشخصية؟ (عكسي)',
    en: 'How often have you felt confident about your ability to handle your personal problems? (reverse)',
  },
  {
    ar: 'كم مرة شعرت أن الأمور تسير على ما يرام؟ (عكسي)',
    en: 'How often have you felt that things were going your way? (reverse)',
  },
  {
    ar: 'كم مرة وجدت أنك لا تستطيع التعامل مع كل ما يجب عليك فعله؟',
    en: 'How often have you found that you could not cope with all the things you had to do?',
  },
  {
    ar: 'كم مرة استطعت التحكم في مصادر الانزعاج في حياتك؟ (عكسي)',
    en: 'How often have you been able to control irritations in your life? (reverse)',
  },
  {
    ar: 'كم مرة شعرت أنك مسيطر على الأمور؟ (عكسي)',
    en: 'How often have you felt that you were on top of things? (reverse)',
  },
  {
    ar: 'كم مرة غضبت بسبب أمور خارجة عن سيطرتك؟',
    en: 'How often have you been angered because of things that were outside of your control?',
  },
  {
    ar: 'كم مرة شعرت أن الصعوبات تتراكم لدرجة لا تستطيع التغلب عليها؟',
    en: 'How often have you felt difficulties were piling up so high that you could not overcome them?',
  },
];

const itemBank = {
  instrumentName_ar: 'مقياس الضغط النفسي المُدرَك (PSS-10)',
  instrumentName_en: 'Perceived Stress Scale-10 (PSS-10)',
  instrumentVersion: 'Cohen, Kamarck & Mermelstein (1983)',
  respondent: 'self',
  estimatedMinutes: 7,
  responseScaleNote_ar:
    'تُقيَّم كل عبارة من 0 (أبدًا) إلى 4 (كثيرًا جدًا) عن الشهر الماضي. تُعكس البنود 4 و5 و7 و8 (4 − القيمة) ثم يُجمع الكل (0–40). أعلى = ضغط أكبر.',
  responseScaleNote_en:
    'Each item is rated 0 (never) to 4 (very often) over the last month. Items 4, 5, 7, 8 are reverse-scored (4 − value), then all are summed (0–40). Higher = more stress.',
  items: ITEM_TEXT.map((t, i) => ({
    number: i + 1,
    text_ar: t.ar,
    text_en: t.en,
    responseOptions: RESPONSE_OPTIONS,
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`PSS-10 expects ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < ITEM_MIN || v > ITEM_MAX) {
      errors.push(
        `item ${i + 1} must be an integer ${ITEM_MIN}-${ITEM_MAX} — got ${JSON.stringify(v)}`
      );
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`PSS-10: invalid input — ${v.errors.join('; ')}`);
  const scored = rawItems.map((val, i) => (REVERSE_IDX.includes(i) ? ITEM_MAX - val : val));
  const total = scored.reduce((s, n) => s + n, 0);
  return {
    value: total,
    notes: {
      method: 'sum_with_reverse',
      reverseItems: REVERSE_ITEMS,
      max: TOTAL_MAX,
      highStress: total >= CUTOFF,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `PSS-10.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue <= 13) {
    return {
      band: 'low_stress',
      tier: 'L0',
      label_ar: 'ضغط نفسي منخفض',
      label_en: 'Low perceived stress',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا مؤشر حالي؛ يُعاد التقييم دوريًا أو عند تغيّر الظروف.',
      action_en: 'No current flag; re-assess periodically or on changing circumstances.',
    };
  }
  if (derivedValue <= 26) {
    return {
      band: 'moderate_stress',
      tier: 'L2',
      label_ar: 'ضغط نفسي متوسط',
      label_en: 'Moderate perceived stress',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تقديم استراتيجيات إدارة الضغط ودعم نفسي ومتابعة قصيرة المدى.',
      action_en:
        'Offer stress-management strategies, psychological support and short-term follow-up.',
    };
  }
  return {
    band: 'high_stress',
    tier: 'L3',
    label_ar: 'ضغط نفسي مرتفع',
    label_en: 'High perceived stress',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'إحالة للدعم النفسي المتخصص وتقييم عوامل الخطر وخطة تدخّل نشطة.',
    action_en:
      'Refer for specialist psychological support, assess risk factors and establish an active intervention plan.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = t => (t <= 13 ? 'low' : t <= 26 ? 'moderate' : 'high');
  return {
    ...base,
    stressBandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'PSS-10',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
