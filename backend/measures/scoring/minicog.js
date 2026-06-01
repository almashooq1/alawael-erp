'use strict';

/**
 * minicog.js — W710 scoring module for the Mini-Cog cognitive screen.
 *
 * Borson et al. (2000). A brief clinician-administered screen for cognitive
 * impairment, combining:
 *   Word Recall   0–3  (number of 3 unrelated words recalled)
 *   Clock Draw    0 or 2 (2 = normal clock, 0 = abnormal)
 * Total range 0–5; higher = better. A total < 3 (i.e. ≤ 2) is a POSITIVE
 * screen suggesting cognitive impairment that warrants fuller assessment.
 *
 * Public domain; free for clinical and educational use.
 *
 * rawShape: 'item_array' — computeDerived expects [wordRecall, clockDraw] in
 * that fixed order.
 */

const { standardDelta } = require('./contract');

const COMPONENTS = [
  {
    key: 'recall',
    name_ar: 'استدعاء الكلمات',
    name_en: 'Word recall',
    min: 0,
    max: 3,
    allowed: [0, 1, 2, 3],
  },
  { key: 'clock', name_ar: 'رسم الساعة', name_en: 'Clock draw', min: 0, max: 2, allowed: [0, 2] },
];

const TOTAL_MIN = 0;
const TOTAL_MAX = 5;
const CUTOFF = 3; // total < 3 → positive screen

const itemBank = {
  instrumentName_ar: 'فحص ميني-كوغ المعرفي',
  instrumentName_en: 'Mini-Cog Cognitive Screen',
  instrumentVersion: 'Borson et al. (2000)',
  respondent: 'clinician',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يُسجَّل استدعاء الكلمات (0–3) ورسم الساعة (0 أو 2) ثم يُجمعان (0–5). المجموع أقل من 3 يعني فرزًا إيجابيًا للقصور المعرفي.',
  responseScaleNote_en:
    'Score word recall (0–3) and clock draw (0 or 2), then sum (0–5). A total below 3 is a positive screen for cognitive impairment.',
  domains: COMPONENTS.map(c => ({ key: c.key, name_ar: c.name_ar, name_en: c.name_en })),
  items: [
    {
      number: 1,
      text_ar: 'عدد الكلمات الثلاث التي تذكّرها المستفيد بعد رسم الساعة (0–3)',
      text_en: 'Number of the three words recalled after the clock task (0–3)',
      domain: 'recall',
    },
    {
      number: 2,
      text_ar: 'رسم الساعة: 2 إذا كان طبيعيًا، 0 إذا كان غير طبيعي',
      text_en: 'Clock draw: 2 if normal, 0 if abnormal',
      domain: 'clock',
      responseOptions: [
        { value: 0, label_ar: 'رسم غير طبيعي', label_en: 'Abnormal clock', atRisk: true },
        { value: 2, label_ar: 'رسم طبيعي', label_en: 'Normal clock' },
      ],
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== COMPONENTS.length) {
    errors.push(
      `Mini-Cog expects ${COMPONENTS.length} sub-scores [recall, clock] — got ${rawItems.length}`
    );
  }
  COMPONENTS.forEach((c, i) => {
    const v = rawItems[i];
    if (!Number.isInteger(v) || !c.allowed.includes(v)) {
      errors.push(`${c.key} must be one of ${c.allowed.join('/')} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Mini-Cog: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  COMPONENTS.forEach((c, i) => {
    subscales[c.key] = rawItems[i];
  });
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    subscales,
    notes: { method: 'sum', max: TOTAL_MAX, positiveScreen: total < CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `Mini-Cog.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue < CUTOFF) {
    return {
      band: 'positive_screen',
      tier: 'L2',
      label_ar: 'فرز إيجابي للقصور المعرفي',
      label_en: 'Positive screen for cognitive impairment',
      severity: 'severe',
      color: '#c62828',
      action_ar: 'إحالة لتقييم معرفي شامل (مثل MoCA/تقييم عصبي) وتعديل الخطة العلاجية.',
      action_en:
        'Refer for full cognitive assessment (e.g. MoCA / neuro work-up) and adjust the care plan.',
    };
  }
  return {
    band: 'negative_screen',
    tier: 'L0',
    label_ar: 'فرز سلبي',
    label_en: 'Negative screen',
    severity: derivedValue === TOTAL_MAX ? 'normal' : 'mild',
    color: derivedValue === TOTAL_MAX ? '#2e7d32' : '#9e9d24',
    action_ar: 'لا مؤشر معرفي حالي؛ يُعاد الفرز دوريًا أو عند تغيّر الحالة.',
    action_en: 'No current cognitive flag; re-screen periodically or on status change.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const screenOf = t => (t < CUTOFF ? 'positive' : 'negative');
  return {
    ...base,
    screenChange:
      prev != null && curr != null && screenOf(prev) !== screenOf(curr)
        ? `${screenOf(prev)}_to_${screenOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'MINICOG',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: COMPONENTS.length,
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  cutoff: CUTOFF,
  subscaleDerivedTypes: { recall: 'sum', clock: 'sum' },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
