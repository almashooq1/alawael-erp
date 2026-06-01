'use strict';

/**
 * who5.js — W706 scoring module for the WHO-5 Well-Being Index
 * (World Health Organization, 1998) — a positively-framed measure of current
 * mental well-being / quality of life.
 *
 * 5 items, each rated over the last two weeks on a 0–5 frequency scale:
 *   5 All of the time … 0 At no time.
 *
 * Raw score = sum of the 5 items (0–25). The reported score multiplies the
 * raw by 4 to give a percentage from 0 (worst) to 100 (best well-being).
 * Higher = better → higher_better. derivedType 'algorithm' (linear transform).
 *
 * Interpretation (WHO-5 user guide):
 *   ≥51   Good well-being
 *   29–50 Reduced well-being — monitor / supportive follow-up
 *   ≤28   Poor well-being — screen positive; assess for depression (ICD-10)
 *   A drop of ≥10 percentage points between administrations is clinically
 *   meaningful (surfaced via delta()).
 *
 * The WHO-5 is in the public domain and may be used freely without permission
 * provided no changes are made and the WHO is credited.
 *
 * rawShape: 'item_array' — 5-length array of integers 0–5.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 5;
const ITEM_MAX = 5;
const RAW_MAX = 25;
const MAX_SCORE = 100; // percentage
const TRANSFORM = 4;
const MEANINGFUL_CHANGE = 10; // percentage points

const RAW_ITEMS = [
  { n: 1, ar: 'شعرت بالبهجة وروح معنوية مرتفعة', en: 'I have felt cheerful and in good spirits' },
  { n: 2, ar: 'شعرت بالهدوء والاسترخاء', en: 'I have felt calm and relaxed' },
  { n: 3, ar: 'شعرت بالنشاط والحيوية', en: 'I have felt active and vigorous' },
  { n: 4, ar: 'استيقظت وأنا أشعر بالانتعاش والراحة', en: 'I woke up feeling fresh and rested' },
  {
    n: 5,
    ar: 'كانت حياتي اليومية مليئة بأشياء تهمّني',
    en: 'My daily life has been filled with things that interest me',
  },
];

const RESPONSE_OPTIONS = [
  { value: 5, label_ar: 'طوال الوقت', label_en: 'All of the time' },
  { value: 4, label_ar: 'معظم الوقت', label_en: 'Most of the time' },
  { value: 3, label_ar: 'أكثر من نصف الوقت', label_en: 'More than half the time' },
  { value: 2, label_ar: 'أقل من نصف الوقت', label_en: 'Less than half the time', atRisk: true },
  { value: 1, label_ar: 'بعض الوقت', label_en: 'Some of the time', atRisk: true },
  { value: 0, label_ar: 'في أيّ وقت', label_en: 'At no time', atRisk: true },
];

const itemBank = {
  instrumentName_ar: 'مؤشر منظمة الصحة العالمية للرفاهية - 5',
  instrumentName_en: 'WHO-5 Well-Being Index',
  instrumentVersion: 'WHO-5 (1998)',
  respondent: 'self',
  estimatedMinutes: 2,
  responseScaleNote_ar:
    'يرجى الإشارة، لكل عبارة من العبارات الخمس، إلى ما يصف شعورك خلال الأسبوعين الماضيين.',
  responseScaleNote_en:
    'Please indicate, for each of the five statements, which is closest to how you have felt over the last two weeks.',
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
    errors.push(`WHO-5 has ${ITEM_COUNT} items — got ${rawItems.length}`);
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
    throw new Error(`WHO-5: invalid raw items — ${v.errors.join('; ')}`);
  }
  const rawSum = rawItems.reduce((acc, item) => acc + item, 0);
  const percentage = rawSum * TRANSFORM; // 0–100
  return {
    value: percentage,
    notes: {
      method: 'sum_x4_percentage',
      rawSum,
      rawMax: RAW_MAX,
      screenPositive: percentage <= 28,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('WHO-5.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > MAX_SCORE) {
    throw new Error(`WHO-5.interpret: derivedValue ${derivedValue} outside 0-${MAX_SCORE}`);
  }
  if (derivedValue >= 51) {
    return {
      band: 'good',
      tier: 'L0',
      label_ar: 'رفاهية جيدة',
      label_en: 'Good well-being',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'مستوى رفاهية جيد — تعزيز ومتابعة روتينية.',
      action_en: 'Good well-being — reinforce and continue routine monitoring.',
    };
  }
  if (derivedValue >= 29) {
    return {
      band: 'reduced',
      tier: 'L1',
      label_ar: 'رفاهية منخفضة',
      label_en: 'Reduced well-being',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'متابعة داعمة وإعادة تقييم؛ استكشاف عوامل الضغط.',
      action_en: 'Supportive follow-up and reassessment; explore stressors.',
    };
  }
  return {
    band: 'poor',
    tier: 'L2',
    label_ar: 'رفاهية ضعيفة (فرز إيجابي)',
    label_en: 'Poor well-being (screen positive)',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'فرز إيجابي للاكتئاب — أكمل تقييمًا إكلينيكيًا للاكتئاب وحدّد خطة تدخّل.',
    action_en: 'Positive depression screen — complete a clinical depression assessment and plan.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = s => interpret(s).band;
  const meaningful = prev != null && curr != null && Math.abs(curr - prev) >= MEANINGFUL_CHANGE;
  return {
    ...base,
    meaningfulChange: meaningful,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'WHO-5',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: 50, // ≤50 → poor well-being, assess for depression
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
