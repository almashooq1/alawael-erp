'use strict';

/**
 * cars2.js — W555 scoring module for the Childhood Autism Rating Scale,
 * 2nd Edition — Standard Version (CARS2-ST; Schopler, Van Bourgondien,
 * Wellman & Love 2010). Clinician-rated direct-observation instrument for
 * estimating autism symptom severity in children.
 *
 * 15 items, each rated on a 7-point scale from 1.0 (within normal limits
 * for the child's age) to 4.0 (severely abnormal), in 0.5 increments.
 * The total raw score is the sum of the 15 item ratings (range 15.0–60.0).
 *
 * Severity bands (CARS2-ST cut-offs):
 *   15.0 – 29.5  Minimal-to-no symptoms of ASD
 *   30.0 – 36.5  Mild-to-moderate symptoms of ASD
 *   37.0 – 60.0  Severe symptoms of ASD
 *
 * direction: lower_better (a lower total = less symptom severity). CARS-2
 * IS used as an outcome/severity tracker, so a positive change (drop in
 * total) can be clinically meaningful; the Measure document supplies the
 * MCID where the program adopts one.
 *
 * Item NAMES are the standard CARS2-ST domains (factual). The 7-point
 * rating uses the standard severity anchors; the publisher's detailed
 * per-item behavioural anchor descriptions remain in the WPS manual and
 * are referenced there by the rating clinician.
 *
 * rawShape: 'item_array' — computeDerived expects a 15-length array of
 * ratings, each one of {1,1.5,2,2.5,3,3.5,4}, 0-based by item.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 15;
const RATING_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const RATING_SET = new Set(RATING_VALUES);
const MIN_TOTAL = 15;
const MAX_TOTAL = 60;
const MINIMAL_MAX = 29.5; // 15.0–29.5
const MILD_MAX = 36.5; // 30.0–36.5 (≥37 severe)

const ITEM_NAMES = [
  { n: 1, ar: 'العلاقة مع الناس', en: 'Relating to People' },
  { n: 2, ar: 'التقليد', en: 'Imitation' },
  { n: 3, ar: 'الاستجابة الانفعالية', en: 'Emotional Response' },
  { n: 4, ar: 'استخدام الجسم', en: 'Body Use' },
  { n: 5, ar: 'استخدام الأشياء', en: 'Object Use' },
  { n: 6, ar: 'التكيّف مع التغيير', en: 'Adaptation to Change' },
  { n: 7, ar: 'الاستجابة البصرية', en: 'Visual Response' },
  { n: 8, ar: 'الاستجابة السمعية', en: 'Listening Response' },
  {
    n: 9,
    ar: 'استجابة التذوّق والشمّ واللمس واستخدامها',
    en: 'Taste, Smell, and Touch Response and Use',
  },
  { n: 10, ar: 'الخوف أو التوتّر', en: 'Fear or Nervousness' },
  { n: 11, ar: 'التواصل اللفظي', en: 'Verbal Communication' },
  { n: 12, ar: 'التواصل غير اللفظي', en: 'Nonverbal Communication' },
  { n: 13, ar: 'مستوى النشاط', en: 'Activity Level' },
  {
    n: 14,
    ar: 'مستوى الاستجابة الذهنية واتّساقها',
    en: 'Level and Consistency of Intellectual Response',
  },
  { n: 15, ar: 'الانطباعات العامة', en: 'General Impressions' },
];

const RATING_OPTIONS = [
  { value: 1, label_ar: 'ضمن الحدود الطبيعية', label_en: 'Within normal limits' },
  { value: 1.5, label_ar: 'بين الطبيعي والخفيف', label_en: 'Normal to mildly abnormal' },
  { value: 2, label_ar: 'شذوذ خفيف', label_en: 'Mildly abnormal' },
  { value: 2.5, label_ar: 'بين الخفيف والمتوسط', label_en: 'Mildly to moderately abnormal' },
  { value: 3, label_ar: 'شذوذ متوسط', label_en: 'Moderately abnormal' },
  { value: 3.5, label_ar: 'بين المتوسط والشديد', label_en: 'Moderately to severely abnormal' },
  { value: 4, label_ar: 'شذوذ شديد', label_en: 'Severely abnormal' },
];

const itemBank = {
  instrumentName_ar: 'مقياس تقدير التوحّد الطفولي — الإصدار الثاني (النسخة القياسية)',
  instrumentName_en: 'Childhood Autism Rating Scale, 2nd Edition — Standard Version',
  instrumentVersion: 'CARS2-ST-2010',
  ageRange: { minMonths: 24, maxMonths: 72 },
  respondent: 'clinician',
  estimatedMinutes: 30,
  responseScaleNote_ar:
    'يُقدّر كل بند بناءً على الملاحظة المباشرة وتاريخ الحالة، من 1 (ضمن الطبيعي) إلى 4 (شذوذ شديد) بزيادات 0.5.',
  responseScaleNote_en:
    'Rate each item from direct observation and history, 1 (within normal limits) to 4 (severely abnormal) in 0.5 increments.',
  items: ITEM_NAMES.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
    responseOptions: RATING_OPTIONS,
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`CARS-2 (ST) has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!RATING_SET.has(v)) {
      errors.push(`item ${i + 1}: must be one of {1,1.5,2,2.5,3,3.5,4} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`CARS-2: invalid raw items — ${v.errors.join('; ')}`);
  }
  const total = rawItems.reduce((a, b) => a + b, 0);
  return {
    value: Math.round(total * 10) / 10,
    notes: {
      itemsRatedHigh: rawItems
        .map((r, i) => ({ item: i + 1, rating: r }))
        .filter(x => x.rating >= 3),
      method: 'sum_of_item_ratings',
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('CARS-2.interpret: derivedValue must be a number');
  }
  if (derivedValue < MIN_TOTAL || derivedValue > MAX_TOTAL) {
    throw new Error(
      `CARS-2.interpret: derivedValue ${derivedValue} outside ${MIN_TOTAL}-${MAX_TOTAL}`
    );
  }
  if (derivedValue <= MINIMAL_MAX) {
    return {
      band: 'minimal_to_none',
      tier: 'L1',
      label_ar: 'أعراض قليلة إلى منعدمة لاضطراب طيف التوحّد',
      label_en: 'Minimal-to-no symptoms of ASD',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا تتّسق الأعراض مع تشخيص طيف التوحّد؛ متابعة نمائية روتينية.',
      action_en: 'Symptoms not consistent with an ASD diagnosis; routine developmental follow-up.',
    };
  }
  if (derivedValue <= MILD_MAX) {
    return {
      band: 'mild_to_moderate',
      tier: 'L2',
      label_ar: 'أعراض خفيفة إلى متوسطة لاضطراب طيف التوحّد',
      label_en: 'Mild-to-moderate symptoms of ASD',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'برنامج تدخّل منظّم + إعادة التقييم الدوري لرصد الاستجابة.',
      action_en: 'Structured intervention program + periodic re-assessment to track response.',
    };
  }
  return {
    band: 'severe',
    tier: 'L3',
    label_ar: 'أعراض شديدة لاضطراب طيف التوحّد',
    label_en: 'Severe symptoms of ASD',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'برنامج تدخّل مكثّف متعدّد التخصّصات + خطة دعم سلوكي فردية.',
    action_en: 'Intensive multidisciplinary intervention + individualised behaviour support plan.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = s => (s <= MINIMAL_MAX ? 'minimal' : s <= MILD_MAX ? 'mild_moderate' : 'severe');
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'CARS-2',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: MIN_TOTAL, max: MAX_TOTAL },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
