'use strict';

/**
 * abas3.js — Adaptive Behavior Assessment System — 3rd Ed.
 * Simplified aggregate scorer over 11 ABAS-3 skill areas.
 * Higher = stronger adaptive behavior → higher_is_better.
 */

const { standardDelta } = require('./contract');

const DOMAINS = [
  { key: 'communication', name_ar: 'التواصل', name_en: 'Communication' },
  { key: 'community_use', name_ar: 'استخدام المجتمع', name_en: 'Community Use' },
  { key: 'functional_academics', name_ar: 'الأكاديميات الوظيفية', name_en: 'Functional Academics' },
  { key: 'home_living', name_ar: 'معيشة المنزل', name_en: 'Home Living' },
  { key: 'health_safety', name_ar: 'الصحة والسلامة', name_en: 'Health and Safety' },
  { key: 'leisure', name_ar: 'أوقات الفراغ', name_en: 'Leisure' },
  { key: 'self_care', name_ar: 'العناية الذاتية', name_en: 'Self-Care' },
  { key: 'self_direction', name_ar: 'التوجيه الذاتي', name_en: 'Self-Direction' },
  { key: 'social', name_ar: 'المهارات الاجتماعية', name_en: 'Social' },
  { key: 'work', name_ar: 'العمل', name_en: 'Work' },
  { key: 'motor', name_ar: 'الحركي', name_en: 'Motor' },
];

const DOMAIN_KEYS = new Set(DOMAINS.map(d => d.key));
const SCORE_MIN = 0;
const SCORE_MAX = 99; // illustrative ceiling for summed scaled-score proxy

const itemBank = {
  instrumentName_ar: 'نظام تقييم السلوك التكيفي — الإصدار الثالث',
  instrumentName_en: 'ABAS-3',
  instrumentVersion: 'ABAS-3 2015',
  ageRange: { minMonths: 12, maxMonths: 216 },
  respondent: 'caregiver',
  estimatedMinutes: 20,
  responseScaleNote_ar: 'كل مهارة تُقدّر بدرجة 0 (لا يستطيع) إلى 3 (يؤدي باستقلالية).',
  responseScaleNote_en: 'Each skill is rated 0 (cannot perform) to 3 (performs independently).',
  domains: DOMAINS,
  items: DOMAINS.map((d, i) => ({
    number: i + 1,
    text_ar: `متوسط درجات ${d.name_ar}`,
    text_en: `${d.name_en} average score`,
    domain: d.key,
    responseOptions: [
      { value: 0, label_ar: 'لا يستطيع', label_en: 'Is not able' },
      { value: 1, label_ar: 'مع مساعدة كبيرة', label_en: 'With much help' },
      { value: 2, label_ar: 'مع مساعدة بسيطة', label_en: 'With little help' },
      { value: 3, label_ar: 'باستقلالية', label_en: 'Independently' },
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
  if (!v.ok) throw new Error(`ABAS-3: invalid input — ${v.errors.join('; ')}`);

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
    notes: { method: 'sum_of_skill_area_scores', maxProxy: SCORE_MAX },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `ABAS-3.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue < 30) {
    return {
      band: 'significant_deficit',
      tier: 'L1',
      label_ar: 'عجز تكيفي ملحوظ',
      label_en: 'Significant adaptive deficit',
      severity: 'severe',
      color: '#b71c1c',
      action_ar: 'خطة تدخل مكثفة للمهارات التكيفية اليومية.',
      action_en: 'Intensive daily living/adaptive skills intervention plan.',
    };
  }
  if (derivedValue < 60) {
    return {
      band: 'mild_deficit',
      tier: 'L2',
      label_ar: 'عجز تكيفي خفيف إلى متوسط',
      label_en: 'Mild-to-moderate adaptive deficit',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'تدريب مهارات عملية موجه حسب المجالات الأضعف.',
      action_en: 'Targeted practical skills training for weakest domains.',
    };
  }
  return {
    band: 'adequate',
    tier: 'L3',
    label_ar: 'سلوك تكيفي مقبول إلى قوي',
    label_en: 'Adequate to strong adaptive behavior',
    severity: 'normal',
    color: '#2e7d32',
    action_ar: 'تعزيز الاستقلالية والمهارات المجتمعية.',
    action_en: 'Promote independence and community living skills.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'ABAS-3',
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
