'use strict';

/**
 * bayley4.js — Bayley Scales of Infant and Toddler Development — 4th Ed.
 * Simplified aggregate scorer over the five primary subscales.
 *
 * Raw domain scores are summed to give a total developmental raw score.
 * Higher = stronger development → higher_is_better.
 */

const { standardDelta } = require('./contract');

const DOMAINS = [
  { key: 'cognitive', name_ar: 'المعرفي', name_en: 'Cognitive' },
  { key: 'language', name_ar: 'اللغة', name_en: 'Language' },
  { key: 'motor', name_ar: 'الحركي', name_en: 'Motor' },
  { key: 'social_emotional', name_ar: 'الاجتماعي-الانفعالي', name_en: 'Social-Emotional' },
  { key: 'adaptive', name_ar: 'التكيفي', name_en: 'Adaptive' },
];

const DOMAIN_KEYS = new Set(DOMAINS.map(d => d.key));
const SCORE_MIN = 0;
const SCORE_MAX = 250; // illustrative raw-score ceiling

const itemBank = {
  instrumentName_ar: 'مقياس بيلي للأطفال والرضع — الإصدار الرابع',
  instrumentName_en: 'Bayley-4',
  instrumentVersion: 'Bayley-4 2019',
  ageRange: { minMonths: 16, maxMonths: 42 },
  respondent: 'clinician',
  estimatedMinutes: 60,
  responseScaleNote_ar: 'كل مجال يُدخل كدرجة خام. المجموع يعطي مؤشراً عاماً على التطور.',
  responseScaleNote_en:
    'Each domain is entered as a raw score. The sum gives a broad developmental index.',
  domains: DOMAINS,
  items: DOMAINS.map((d, i) => ({
    number: i + 1,
    text_ar: `الدرجة الخام لمجال ${d.name_ar}`,
    text_en: `${d.name_en} raw score`,
    domain: d.key,
    responseOptions: [
      { value: 0, label_ar: '0', label_en: '0' },
      { value: 1, label_ar: '1', label_en: '1' },
      { value: 2, label_ar: '2', label_en: '2' },
      { value: 3, label_ar: '3', label_en: '3' },
    ],
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (rawItems == null || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
    errors.push('rawItems must be a domain-scores object');
    return { ok: false, errors };
  }
  for (const key of Object.keys(rawItems)) {
    if (!DOMAIN_KEYS.has(key)) errors.push(`unknown domain '${key}'`);
    const v = Number(rawItems[key]);
    if (!Number.isFinite(v) || v < 0) errors.push(`domain '${key}' must be a non-negative number`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Bayley-4: invalid input — ${v.errors.join('; ')}`);

  const subscales = {};
  let total = 0;
  for (const d of DOMAINS) {
    const val = Math.max(0, Math.round(Number(rawItems[d.key] || 0)));
    subscales[d.key] = { value: val, name_ar: d.name_ar, name_en: d.name_en };
    total += val;
  }

  return {
    value: total,
    subscales,
    notes: { method: 'sum_of_domain_raw_scores', maxRaw: SCORE_MAX },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `Bayley-4.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue < 80) {
    return {
      band: 'significant_delay',
      tier: 'L1',
      label_ar: 'تأخر تطوري ملحوظ',
      label_en: 'Significant developmental delay',
      severity: 'severe',
      color: '#b71c1c',
      action_ar: 'تأهيل مبكر مكثف متعدد التخصصات ومتابعة نمو.',
      action_en: 'Intensive multidisciplinary early intervention and developmental monitoring.',
    };
  }
  if (derivedValue < 150) {
    return {
      band: 'mild_delay',
      tier: 'L2',
      label_ar: 'تأخر تطوري خفيف إلى متوسط',
      label_en: 'Mild-to-moderate developmental delay',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'تدخلات تطورية موجهة حسب المجالات الأضعف.',
      action_en: 'Targeted developmental interventions for the weakest domains.',
    };
  }
  return {
    band: 'typical',
    tier: 'L3',
    label_ar: 'تطور ضمن الحدود الطبيعية',
    label_en: 'Development within typical limits',
    severity: 'normal',
    color: '#2e7d32',
    action_ar: 'متابعة دورية وتشجيع التعلم المنزلي.',
    action_en: 'Periodic monitoring and home learning enrichment.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'BAYLEY-4',
  engineVersion: '1.0.0',
  derivedType: 'weighted_sum',
  direction: 'higher_better',
  rawShape: 'domain_scores',
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  subscaleDerivedTypes: Object.fromEntries(DOMAINS.map(d => [d.key, 'sum'])),
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
