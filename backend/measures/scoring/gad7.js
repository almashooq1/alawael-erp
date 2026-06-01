'use strict';

/**
 * gad7.js — W706 scoring module for the Generalized Anxiety Disorder-7
 * (GAD-7; Spitzer, Kroenke, Williams & Löwe 2006) — anxiety severity/screening.
 *
 * 7 items, each rated over the last two weeks on a 0–3 frequency scale:
 *   0 Not at all · 1 Several days · 2 More than half the days · 3 Nearly every day
 *
 * value = sum of all 7 items (0–21). Higher = more anxiety → lower_better.
 *
 * Severity bands (Spitzer 2006):
 *   0–4    Minimal
 *   5–9    Mild
 *   10–14  Moderate
 *   15–21  Severe
 *
 * A cutoff of ≥10 has good sensitivity/specificity for generalized anxiety
 * disorder and is the recommended threshold for further evaluation.
 *
 * GAD-7 is a SCREENING instrument and is freely available for clinical use
 * without permission (developed with an educational grant from Pfizer).
 *
 * rawShape: 'item_array' — 7-length array of integers 0–3.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 7;
const ITEM_MAX = 3;
const MAX_SCORE = 21;

const RAW_ITEMS = [
  { n: 1, ar: 'الشعور بالعصبية أو القلق أو التوتر', en: 'Feeling nervous, anxious, or on edge' },
  {
    n: 2,
    ar: 'عدم القدرة على إيقاف القلق أو التحكّم فيه',
    en: 'Not being able to stop or control worrying',
  },
  { n: 3, ar: 'القلق الزائد حيال أمور مختلفة', en: 'Worrying too much about different things' },
  { n: 4, ar: 'صعوبة الاسترخاء', en: 'Trouble relaxing' },
  {
    n: 5,
    ar: 'التململ لدرجة يصعب معها الجلوس بثبات',
    en: 'Being so restless that it is hard to sit still',
  },
  { n: 6, ar: 'الانزعاج أو الاستثارة بسهولة', en: 'Becoming easily annoyed or irritable' },
  {
    n: 7,
    ar: 'الشعور بالخوف وكأنّ شيئًا فظيعًا قد يحدث',
    en: 'Feeling afraid as if something awful might happen',
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label_ar: 'إطلاقًا', label_en: 'Not at all' },
  { value: 1, label_ar: 'عدة أيام', label_en: 'Several days' },
  { value: 2, label_ar: 'أكثر من نصف الأيام', label_en: 'More than half the days', atRisk: true },
  { value: 3, label_ar: 'تقريبًا كل يوم', label_en: 'Nearly every day', atRisk: true },
];

const itemBank = {
  instrumentName_ar: 'مقياس اضطراب القلق العام - 7',
  instrumentName_en: 'Generalized Anxiety Disorder-7 (GAD-7)',
  instrumentVersion: 'GAD-7',
  respondent: 'self',
  estimatedMinutes: 3,
  responseScaleNote_ar: 'خلال الأسبوعين الماضيين، كم مرة أزعجتك أيّ من المشكلات التالية؟',
  responseScaleNote_en:
    'Over the last two weeks, how often have you been bothered by the following problems?',
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
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
    errors.push(`GAD-7 has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > ITEM_MAX) {
      errors.push(`item ${i + 1}: must be integer 0-${ITEM_MAX} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`GAD-7: invalid raw items — ${v.errors.join('; ')}`);
  }
  const total = rawItems.reduce((acc, item) => acc + item, 0);
  return {
    value: total,
    notes: { method: 'sum_of_7_items', clinicallySignificant: total >= 10 },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('GAD-7.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > MAX_SCORE) {
    throw new Error(`GAD-7.interpret: derivedValue ${derivedValue} outside 0-${MAX_SCORE}`);
  }
  if (derivedValue <= 4) {
    return {
      band: 'minimal',
      tier: 'L0',
      label_ar: 'قلق ضئيل',
      label_en: 'Minimal anxiety',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا حاجة لتدخّل — متابعة روتينية.',
      action_en: 'No intervention indicated — routine monitoring.',
    };
  }
  if (derivedValue <= 9) {
    return {
      band: 'mild',
      tier: 'L1',
      label_ar: 'قلق خفيف',
      label_en: 'Mild anxiety',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'مراقبة وإعادة تقييم؛ تقنيات استرخاء ودعم تثقيفي.',
      action_en: 'Monitor and reassess; relaxation techniques and psychoeducation.',
    };
  }
  if (derivedValue <= 14) {
    return {
      band: 'moderate',
      tier: 'L2',
      label_ar: 'قلق متوسط',
      label_en: 'Moderate anxiety',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'تقييم إكلينيكي مؤكِّد وخطة تدخّل نفسي نشطة.',
      action_en: 'Confirmatory clinical evaluation and an active psychological intervention plan.',
    };
  }
  return {
    band: 'severe',
    tier: 'L3',
    label_ar: 'قلق شديد',
    label_en: 'Severe anxiety',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'إحالة لمختصّ نفسي؛ تدخّل نشط ومتابعة لصيقة.',
    action_en: 'Referral to a mental-health specialist; active treatment and close follow-up.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = s => interpret(s).band;
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'GAD-7',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: 10,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
