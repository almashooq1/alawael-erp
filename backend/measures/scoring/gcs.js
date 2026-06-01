'use strict';

/**
 * gcs.js — W707 scoring module for the Glasgow Coma Scale (GCS).
 *
 * The GCS is the universal bedside measure of impaired consciousness /
 * conscious level after acquired brain injury. It is the SUM of three
 * independently-scored components:
 *   Eye opening (E)      1–4
 *   Verbal response (V)  1–5
 *   Motor response (M)   1–6
 * Total range 3 (deep coma) – 15 (fully alert). direction = higher_better.
 *
 * Severity dichotomy (total):  ≤8 severe · 9–12 moderate · 13–15 mild.
 *
 * Public domain (Teasdale & Jennett, 1974); free for clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects [eye, verbal, motor] in that
 * fixed order, each an integer within its own allowed range.
 */

const { standardDelta } = require('./contract');

/** Per-component definition: key, min, max, bilingual anchor labels. */
const COMPONENTS = [
  {
    key: 'eye',
    name_ar: 'فتح العينين',
    name_en: 'Eye opening (E)',
    min: 1,
    max: 4,
    options: [
      { value: 4, ar: 'تلقائي', en: 'Spontaneous' },
      { value: 3, ar: 'استجابةً للصوت', en: 'To sound' },
      { value: 2, ar: 'استجابةً للألم', en: 'To pressure' },
      { value: 1, ar: 'لا استجابة', en: 'None' },
    ],
  },
  {
    key: 'verbal',
    name_ar: 'الاستجابة اللفظية',
    name_en: 'Verbal response (V)',
    min: 1,
    max: 5,
    options: [
      { value: 5, ar: 'موجَّه/مُتّسق', en: 'Oriented' },
      { value: 4, ar: 'مُشوّش', en: 'Confused' },
      { value: 3, ar: 'كلمات غير مترابطة', en: 'Words' },
      { value: 2, ar: 'أصوات غير مفهومة', en: 'Sounds' },
      { value: 1, ar: 'لا استجابة', en: 'None' },
    ],
  },
  {
    key: 'motor',
    name_ar: 'الاستجابة الحركية',
    name_en: 'Motor response (M)',
    min: 1,
    max: 6,
    options: [
      { value: 6, ar: 'يمتثل للأوامر', en: 'Obeys commands' },
      { value: 5, ar: 'يحدّد موضع الألم', en: 'Localising' },
      { value: 4, ar: 'انسحاب طبيعي', en: 'Normal flexion' },
      { value: 3, ar: 'انثناء غير طبيعي', en: 'Abnormal flexion' },
      { value: 2, ar: 'تمدّد', en: 'Extension' },
      { value: 1, ar: 'لا استجابة', en: 'None' },
    ],
  },
];

const TOTAL_MIN = COMPONENTS.reduce((s, c) => s + c.min, 0); // 3
const TOTAL_MAX = COMPONENTS.reduce((s, c) => s + c.max, 0); // 15

const itemBank = {
  instrumentName_ar: 'مقياس غلاسكو للغيبوبة',
  instrumentName_en: 'Glasgow Coma Scale (GCS)',
  instrumentVersion: 'Teasdale & Jennett (1974)',
  respondent: 'clinician',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يُقيَّم كل مكوّن على حدة (فتح العينين 1–4، اللفظي 1–5، الحركي 1–6) ثم تُجمع الدرجات (3–15).',
  responseScaleNote_en:
    'Each component is scored separately (eye 1–4, verbal 1–5, motor 1–6); the three are summed (3–15).',
  domains: COMPONENTS.map(c => ({ key: c.key, name_ar: c.name_ar, name_en: c.name_en })),
  items: COMPONENTS.map((c, i) => ({
    number: i + 1,
    text_ar: c.name_ar,
    text_en: c.name_en,
    domain: c.key,
    responseOptions: c.options.map(o => ({
      value: o.value,
      label_ar: `${o.value} — ${o.ar}`,
      label_en: `${o.value} — ${o.en}`,
      atRisk: o.value <= 2 || undefined,
    })),
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== COMPONENTS.length) {
    errors.push(
      `GCS expects ${COMPONENTS.length} components [eye, verbal, motor] — got ${rawItems.length}`
    );
  }
  COMPONENTS.forEach((c, i) => {
    const v = rawItems[i];
    if (!Number.isInteger(v) || v < c.min || v > c.max) {
      errors.push(`${c.key} must be an integer ${c.min}-${c.max} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`GCS: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  COMPONENTS.forEach((c, i) => {
    subscales[c.key] = rawItems[i];
  });
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    subscales,
    notes: {
      method: 'sum',
      max: TOTAL_MAX,
      breakdown: `E${subscales.eye}V${subscales.verbal}M${subscales.motor}`,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(`GCS.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`);
  }
  let band, tier, severity, color, label_ar, label_en, action_ar, action_en;
  if (derivedValue <= 8) {
    band = 'severe';
    tier = 'L3';
    severity = 'critical';
    color = '#c62828';
    label_ar = 'إصابة دماغية شديدة (غيبوبة)';
    label_en = 'Severe brain injury (coma)';
    action_ar = 'حالة حرجة — إحالة طبية طارئة وتأمين مجرى الهواء ومراقبة لصيقة.';
    action_en = 'Critical — emergency medical referral, airway protection and close monitoring.';
  } else if (derivedValue <= 12) {
    band = 'moderate';
    tier = 'L2';
    severity = 'severe';
    color = '#ef6c00';
    label_ar = 'اضطراب وعي متوسط';
    label_en = 'Moderate impairment of consciousness';
    action_ar = 'تقييم طبي عاجل ومراقبة متكرّرة لمستوى الوعي.';
    action_en = 'Urgent medical assessment with frequent neuro-observations.';
  } else {
    band = 'mild';
    tier = 'L1';
    severity = derivedValue === TOTAL_MAX ? 'normal' : 'mild';
    color = derivedValue === TOTAL_MAX ? '#2e7d32' : '#9e9d24';
    label_ar = derivedValue === TOTAL_MAX ? 'وعي كامل' : 'اضطراب وعي خفيف';
    label_en = derivedValue === TOTAL_MAX ? 'Fully alert' : 'Mild impairment of consciousness';
    action_ar = 'مراقبة روتينية لمستوى الوعي ضمن البرنامج التأهيلي.';
    action_en = 'Routine consciousness monitoring within the rehabilitation programme.';
  }
  return { band, tier, label_ar, label_en, severity, color, action_ar, action_en };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = t => (t <= 8 ? 'severe' : t <= 12 ? 'moderate' : 'mild');
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'GCS',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: COMPONENTS.length,
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  cutoff: 8, // ≤ 8 → severe / coma
  subscaleDerivedTypes: { eye: 'sum', verbal: 'sum', motor: 'sum' },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
