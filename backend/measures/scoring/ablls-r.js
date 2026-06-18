'use strict';

/**
 * ablls-r.js — Assessment of Basic Language and Learning Skills — Revised
 * Simplified aggregate scorer over 25 ABLLS-R skill domains.
 *
 * Each domain is scored as the count/level of mastered skills (0-20+).
 * The derived score is the sum across domains. Higher = stronger basic
 * learner skills → higher_is_better.
 */

const { standardDelta } = require('./contract');

const DOMAINS = [
  { key: 'a', name_ar: 'استجابة بصرية', name_en: 'Visual Perceptual' },
  { key: 'b', name_ar: 'المهارات الإجتماعية', name_en: 'Social' },
  { key: 'c', name_ar: 'اللعب التخيلي', name_en: 'Imitation' },
  { key: 'd', name_ar: 'المهارات الحركية', name_en: 'Motor' },
  { key: 'e', name_ar: 'طلبات', name_en: 'Mand' },
  { key: 'f', name_ar: 'تسميات', name_en: 'Tact' },
  { key: 'g', name_ar: 'استجابة المستمع', name_en: 'Listener Responding' },
  { key: 'h', name_ar: 'قراءة', name_en: 'Reading' },
  { key: 'i', name_ar: 'كتابة', name_en: 'Writing' },
  { key: 'j', name_ar: 'حساب', name_en: 'Math' },
  { key: 'k', name_ar: 'المجازفة العرضية', name_en: 'Intraverbal' },
  { key: 'l', name_ar: 'الصدى', name_en: 'Echoic' },
  {
    key: 'm',
    name_ar: 'المهارات الجماعية والأنظمة الاجتماعية',
    name_en: 'Group & Classroom Skills',
  },
  { key: 'n', name_ar: 'المهارات اللغوية', name_en: 'Linguistic Structure' },
  { key: 'o', name_ar: 'المساعدة الذاتية', name_en: 'Self-Help' },
  { key: 'p', name_ar: 'مهارات التدرج', name_en: 'Grooming' },
  { key: 'q', name_ar: 'استخدام الحمام', name_en: 'Toileting' },
  { key: 'r', name_ar: 'تناول الطعام', name_en: 'Feeding' },
  { key: 's', name_ar: 'النوم', name_en: 'Sleeping' },
  { key: 't', name_ar: 'المهارات التنفيذية', name_en: 'Executive Function' },
  { key: 'u', name_ar: 'المهارات الانتباهية', name_en: 'Attention' },
  { key: 'v', name_ar: 'التعاون والانصياع', name_en: 'Cooperation & Reinforcer Effectiveness' },
  { key: 'w', name_ar: 'التفاعل والاستجابة', name_en: 'Interaction & Response' },
  { key: 'x', name_ar: 'المهارات المدرسية', name_en: 'Classroom Routines' },
  { key: 'y', name_ar: 'المهارات العامة', name_en: 'Generalized Responding' },
];

const DOMAIN_KEYS = new Set(DOMAINS.map(d => d.key));
const SCORE_MIN = 0;
const SCORE_MAX = 500; // illustrative ceiling

const itemBank = {
  instrumentName_ar: 'مقياس المهارات اللغوية والتعليمية الأساسية — المنقح',
  instrumentName_en: 'ABLLS-R',
  instrumentVersion: 'ABLLS-R 2006',
  ageRange: { minMonths: 24, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 90,
  responseScaleNote_ar:
    'كل مجال يُقدّر بعدد المهارات المتقنة/المستوى (0–20). المجموع يعطي صورة عامة للمهارات الأساسية.',
  responseScaleNote_en:
    'Each domain is rated by mastered-skill count/level (0-20). The sum gives a broad basic-skills picture.',
  domains: DOMAINS,
  items: DOMAINS.map((d, i) => ({
    number: i + 1,
    text_ar: `مهارات مجال ${d.name_ar}`,
    text_en: `${d.name_en} skill level`,
    domain: d.key,
    responseOptions: [
      { value: 0, label_ar: 'لم يتقن', label_en: 'Not acquired' },
      { value: 1, label_ar: 'مع مساعدة كاملة', label_en: 'Full physical prompt' },
      { value: 2, label_ar: 'مع مساعدة جزئية', label_en: 'Partial prompt' },
      { value: 3, label_ar: 'تقليد/محاولة', label_en: 'Imitation/attempt' },
      { value: 4, label_ar: 'متقن', label_en: 'Mastered' },
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
  if (!v.ok) throw new Error(`ABLLS-R: invalid input — ${v.errors.join('; ')}`);

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
    notes: { method: 'sum_of_domain_levels', maxSkills: SCORE_MAX },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `ABLLS-R.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue < 120) {
    return {
      band: 'early_learner',
      tier: 'L1',
      label_ar: 'متعلم مبكر — مهارات أساسية محدودة',
      label_en: 'Early learner — limited basic skills',
      severity: 'severe',
      color: '#b71c1c',
      action_ar: 'تعليم سلوكي مكثف مع تقييم مهارات الحياة اليومية.',
      action_en: 'Intensive ABA teaching with daily-living skills assessment.',
    };
  }
  if (derivedValue < 300) {
    return {
      band: 'intermediate_learner',
      tier: 'L2',
      label_ar: 'متعلم متوسط — مهارات أساسية نامية',
      label_en: 'Intermediate learner — developing basic skills',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'توسيع اللغة الاستقبالية والتعبيرية والمهارات الاجتماعية.',
      action_en: 'Expand receptive/expressive language and social skills.',
    };
  }
  return {
    band: 'advanced_learner',
    tier: 'L3',
    label_ar: 'متعلم متقدم — مهارات أساسية قوية',
    label_en: 'Advanced learner — strong basic skills',
    severity: 'mild',
    color: '#2e7d32',
    action_ar: 'تركيز على المهارات الأكاديمية والاجتماعية المعقدة.',
    action_en: 'Focus on academic and complex social skills.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'ABLLS-R',
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
