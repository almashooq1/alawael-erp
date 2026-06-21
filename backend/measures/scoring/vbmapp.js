'use strict';

/**
 * vbmapp.js — VB-MAPP (Verbal Behavior Milestones Assessment and Placement Program)
 * Milestones Assessment scorer.
 *
 * Simplified aggregate: 16 milestone domains are each scored as a raw count of
 * mastered milestones (0-10+). The derived score is the sum across domains.
 * Higher = more advanced verbal behavior → higher_is_better.
 */

const { standardDelta } = require('./contract');

const DOMAINS = [
  { key: 'mand', name_ar: 'الطلب', name_en: 'Mand' },
  { key: 'tact', name_ar: 'التسمية', name_en: 'Tact' },
  { key: 'listener_responding', name_ar: 'استجابة المستمع', name_en: 'Listener Responding' },
  { key: 'visual_perceptual', name_ar: 'المهارات البصرية', name_en: 'Visual Perceptual / MTM' },
  { key: 'matching', name_ar: 'المطابقة بالنموذج', name_en: 'Matching to Sample' },
  { key: 'play', name_ar: 'اللعب', name_en: 'Play' },
  { key: 'social', name_ar: 'المهارات الاجتماعية', name_en: 'Social' },
  { key: 'imitation', name_ar: 'التقليد', name_en: 'Imitation' },
  { key: 'echoic', name_ar: 'الصدى اللفظي', name_en: 'Echoic' },
  { key: 'vocal_output', name_ar: 'الإخراج الصوتي', name_en: 'Vocal Output' },
  { key: 'lrff', name_ar: 'استجابة المستمع حسب الوظيفة والخاصية', name_en: 'LRFFC' },
  { key: 'intraverbal', name_ar: 'الكلام الداخلي', name_en: 'Intraverbal' },
  { key: 'group', name_ar: 'المهارات الجماعية', name_en: 'Group' },
  { key: 'linguistics', name_ar: 'المهارات اللغوية', name_en: 'Linguistics' },
  { key: 'reading', name_ar: 'القراءة', name_en: 'Reading' },
  { key: 'writing', name_ar: 'الكتابة', name_en: 'Writing' },
  { key: 'math', name_ar: 'الرياضيات', name_en: 'Math' },
];

const DOMAIN_KEYS = new Set(DOMAINS.map(d => d.key));
const SCORE_MIN = 0;
const SCORE_MAX = 170; // illustrative ceiling for the milestones aggregate

const itemBank = {
  instrumentName_ar: 'برنامج تقييم ومكانة السلوك اللفظي — الإنجازات',
  instrumentName_en: 'VB-MAPP Milestones Assessment',
  instrumentVersion: 'VB-MAPP 2nd Ed',
  ageRange: { minMonths: 18, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 60,
  responseScaleNote_ar:
    'كل مجال يُحتسب بعدد الإنجازات المتقنة (0–10). المجموع يعطي مستوى السلوك اللفظي الإجمالي.',
  responseScaleNote_en:
    'Each domain is a count of mastered milestones (0-10). The sum indicates overall verbal behavior level.',
  domains: DOMAINS,
  items: DOMAINS.map((d, i) => ({
    number: i + 1,
    text_ar: `إنجازات مجال ${d.name_ar}`,
    text_en: `${d.name_en} milestone count`,
    domain: d.key,
    responseOptions: [
      { value: 0, label_ar: 'غير متقن', label_en: 'Not mastered' },
      { value: 1, label_ar: 'متقن جزئياً', label_en: 'Partially mastered' },
      { value: 2, label_ar: 'متقن', label_en: 'Mastered' },
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
  if (!v.ok) throw new Error(`VB-MAPP: invalid input — ${v.errors.join('; ')}`);

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
    notes: { method: 'sum_of_domain_counts', maxMilestones: SCORE_MAX },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `VB-MAPP.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue < 40) {
    return {
      band: 'early_learner',
      tier: 'L1',
      label_ar: 'متعلم مبكر — مستوى لفظي محدود',
      label_en: 'Early learner — limited verbal behavior',
      severity: 'severe',
      color: '#b71c1c',
      action_ar: 'برنامج تعليم سلوكي مكثف يركز على الطلب والتقليد والتسمية.',
      action_en: 'Intensive behavioral intervention focusing on mand, imitation and tact.',
    };
  }
  if (derivedValue < 90) {
    return {
      band: 'intermediate_learner',
      tier: 'L2',
      label_ar: 'متعلم متوسط — توسيع المهارات اللفظية',
      label_en: 'Intermediate learner — expanding verbal skills',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'توسيع المهارات الاستقبالية والتعبيرية والاجتماعية.',
      action_en: 'Expand receptive, expressive and social language skills.',
    };
  }
  return {
    band: 'advanced_learner',
    tier: 'L3',
    label_ar: 'متعلم متقدم — مهارات لفظية ناضجة',
    label_en: 'Advanced learner — mature verbal skills',
    severity: 'mild',
    color: '#2e7d32',
    action_ar: 'تطوير المهارات الأكاديمية والاجتماعية المعقدة والحوار.',
    action_en: 'Develop academic, complex social and conversational skills.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'VB-MAPP',
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
