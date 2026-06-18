'use strict';

/**
 * whodas36.js — WHODAS 2.0 36-item full version.
 * 36 items across 6 domains, each scored 0-4 (higher = more disability).
 * Total 0-144. Lower is better.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 36;
const ITEM_MIN = 0;
const ITEM_MAX = 4;
const SCORE_MIN = 0;
const SCORE_MAX = ITEM_COUNT * ITEM_MAX; // 144
const CUTOFF = 36; // ≥36 → moderate+ functional limitation

const DOMAINS = [
  { key: 'cognition', name_ar: 'الإدراك', name_en: 'Cognition' },
  { key: 'mobility', name_ar: 'التنقل', name_en: 'Mobility' },
  { key: 'self_care', name_ar: 'العناية الذاتية', name_en: 'Self-care' },
  { key: 'getting_along', name_ar: 'التعامل مع الآخرين', name_en: 'Getting along' },
  { key: 'life_activities', name_ar: 'أنشطة الحياة', name_en: 'Life activities' },
  { key: 'participation', name_ar: 'المشاركة', name_en: 'Participation' },
];

const DOMAIN_MAP = [
  'cognition',
  'cognition',
  'cognition',
  'cognition',
  'cognition',
  'cognition',
  'mobility',
  'mobility',
  'mobility',
  'mobility',
  'mobility',
  'mobility',
  'self_care',
  'self_care',
  'self_care',
  'self_care',
  'self_care',
  'self_care',
  'getting_along',
  'getting_along',
  'getting_along',
  'getting_along',
  'getting_along',
  'getting_along',
  'life_activities',
  'life_activities',
  'life_activities',
  'life_activities',
  'life_activities',
  'life_activities',
  'participation',
  'participation',
  'participation',
  'participation',
  'participation',
  'participation',
];

const ITEM_TEXTS = [
  {
    ar: 'التركيز على عمل ما لمدة عشر دقائق',
    en: 'Concentrating on doing something for ten minutes',
  },
  { ar: 'تذكّر القيام بالأمور المهمة', en: 'Remembering to do important things' },
  {
    ar: 'تحليل المشكلات والتوصل لحلول في الحياة اليومية',
    en: 'Analysing and finding solutions to problems in day-to-day life',
  },
  {
    ar: 'التعلم مهمة جديدة، مثل كيفية الذهاب إلى مكان جديد',
    en: 'Learning a new task, such as how to get to a new place',
  },
  { ar: 'المعرفة بشكل عام بما يحدث من حولك', en: 'Generally understanding what people say' },
  { ar: 'بدء المحادثات والحفاظ عليها', en: 'Starting and maintaining a conversation' },
  { ar: 'الوقوف طويلاً مثل 30 دقيقة', en: 'Standing for long periods, such as 30 minutes' },
  { ar: 'الوقوف من الجلوس', en: 'Standing up from sitting down' },
  { ar: 'التحرك داخل المنزل', en: 'Moving around inside your home' },
  { ar: 'الخروج من المنزل', en: 'Getting out of the home' },
  { ar: 'المشي لمسافة طويلة مثل كيلومتر', en: 'Walking a long distance, such as a kilometre' },
  { ar: 'صعود 12 درجة', en: 'Climbing 12 steps' },
  { ar: 'الاغتسال بالكامل', en: 'Washing your whole body' },
  { ar: 'ارتداء الملابس', en: 'Getting dressed' },
  { ar: 'تناول الطعام', en: 'Eating' },
  { ar: 'البقاء بمفردك لمدة أيام', en: 'Staying by yourself for a few days' },
  { ar: 'الحفاظ على الصحة والنظافة الشخصية', en: 'Maintaining personal health and hygiene' },
  { ar: 'الاعتناء بالمنزل', en: 'Taking care of the household' },
  { ar: 'التعامل مع أشخاص لا تعرفهم', en: 'Dealing with people you do not know' },
  { ar: 'الحفاظ على صداقة', en: 'Maintaining a friendship' },
  { ar: 'التفاعل مع أفراد الأسرة', en: 'Getting along with people who are close to you' },
  { ar: 'تكوين صداقات جديدة', en: 'Making new friends' },
  { ar: 'المشاركة في الأنشطة المجتمعية', en: 'Joining in community activities' },
  { ar: 'التعامل مع الصراعات', en: 'Dealing with conflicts and tensions' },
  { ar: 'إنجاز المهام المهمة في العمل/الدراسة', en: 'Getting your work/school tasks done' },
  { ar: 'أداء المهام اليومية بشكل جيد', en: 'Doing daily work/school tasks well' },
  { ar: 'الوصول في الوقت المحدد للعمل/الدراسة', en: 'Getting to work/school on time' },
  { ar: 'أداء المهام المنزلية اليومية', en: 'Taking care of your household responsibilities' },
  { ar: 'إنجاز المهام المنزلية بشكل جيد', en: 'Doing household tasks well' },
  { ar: 'إنجاز ما يلزم لإعالة الأسرة', en: 'Getting household tasks done as quickly as needed' },
  {
    ar: 'التأثر العاطفي بمشكلاتك الصحية',
    en: 'Being emotionally affected by your health problems',
  },
  {
    ar: 'التأثر العاطفي بمشكلات عائلتك',
    en: 'Being emotionally affected by health problems of family members',
  },
  { ar: 'التأثر المالي لمشكلاتك الصحية', en: 'The financial impact of your health problems' },
  {
    ar: 'التأثر المالي لمشكلات عائلتك الصحية',
    en: 'The financial impact of health problems of family members',
  },
  { ar: 'ممارسة الأنشطة الترفيهية', en: 'Taking part in leisure activities' },
  { ar: 'الحفاظ على دورك في الأسرة', en: 'Maintaining your role in the family' },
];

const RESPONSE_OPTIONS = [
  { value: 0, label_ar: 'لا صعوبة', label_en: 'None' },
  { value: 1, label_ar: 'خفيفة', label_en: 'Mild' },
  { value: 2, label_ar: 'متوسطة', label_en: 'Moderate' },
  { value: 3, label_ar: 'شديدة', label_en: 'Severe' },
  { value: 4, label_ar: 'قصوى/غير قادر', label_en: 'Extreme / cannot do' },
];

const itemBank = {
  instrumentName_ar: 'جدول تقييم الإعاقة (WHODAS 2.0 — 36 بنداً)',
  instrumentName_en: 'WHO Disability Assessment Schedule 2.0 (36-item)',
  instrumentVersion: 'WHODAS 2.0 — 36-item interviewer-administered',
  respondent: 'clinician',
  estimatedMinutes: 20,
  responseScaleNote_ar: 'لكل بند: 0 لا صعوبة · 1 خفيفة · 2 متوسطة · 3 شديدة · 4 قصوى/غير قادر.',
  responseScaleNote_en: 'Each item: 0 none · 1 mild · 2 moderate · 3 severe · 4 extreme/cannot do.',
  domains: DOMAINS,
  items: ITEM_TEXTS.map((t, i) => ({
    number: i + 1,
    domain: DOMAIN_MAP[i],
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
    errors.push(`WHODAS-36 expects exactly ${ITEM_COUNT} values — got ${rawItems.length}`);
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
  if (!v.ok) throw new Error(`WHODAS-36: invalid input — ${v.errors.join('; ')}`);

  const subscales = {};
  for (const d of DOMAINS) subscales[d.key] = { value: 0, name_ar: d.name_ar, name_en: d.name_en };

  rawItems.forEach((score, i) => {
    subscales[DOMAIN_MAP[i]].value += score;
  });

  const value = rawItems.reduce((a, b) => a + b, 0);
  const percent = Math.round((value / SCORE_MAX) * 1000) / 10;

  return {
    value,
    subscales,
    notes: { method: 'simple_sum', unit: 'points', percent, actionableLimitation: value >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `WHODAS-36.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue <= 12) {
    return {
      band: 'no_disability',
      tier: 'L0',
      label_ar: 'لا إعاقة وظيفية تُذكر',
      label_en: 'No appreciable disability',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'حافظ على الأنشطة الحالية؛ إعادة تقييم دورية.',
      action_en: 'Maintain current activities; periodic reassessment.',
    };
  }
  if (derivedValue <= 36) {
    return {
      band: 'mild_disability',
      tier: 'L1',
      label_ar: 'إعاقة وظيفية خفيفة',
      label_en: 'Mild disability',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تدخلات داعمة موجهة للمجالات المتأثرة ومراقبة الاتجاه.',
      action_en: 'Targeted supportive interventions for affected domains and trend monitoring.',
    };
  }
  if (derivedValue <= 72) {
    return {
      band: 'moderate_disability',
      tier: 'L2',
      label_ar: 'إعاقة وظيفية متوسطة',
      label_en: 'Moderate disability',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'مراجعة خطة العناية وتكثيف التأهيل حسب المجالات الأكثر تأثرًا.',
      action_en: 'Review the care plan and intensify rehabilitation for the most affected domains.',
    };
  }
  if (derivedValue <= 108) {
    return {
      band: 'severe_disability',
      tier: 'L3',
      label_ar: 'إعاقة وظيفية شديدة',
      label_en: 'Severe disability',
      severity: 'critical',
      color: '#c62828',
      action_ar: 'تدخّل متعدد التخصصات عاجل ودعم بيئي ومساعد، وتوثيق الاحتياجات.',
      action_en:
        'Urgent multidisciplinary intervention, environmental/assistive support and needs documentation.',
    };
  }
  return {
    band: 'extreme_disability',
    tier: 'L4',
    label_ar: 'إعاقة وظيفية قصوى',
    label_en: 'Extreme / complete disability',
    severity: 'critical',
    color: '#b71c1c',
    action_ar: 'اعتماد كامل على الدعم؛ خطة رعاية مكثّفة ومراجعة فريق متخصص فورية.',
    action_en:
      'Full dependence on support; intensive care plan and immediate specialist team review.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const band = v => (v <= 12 ? 0 : v <= 36 ? 1 : v <= 72 ? 2 : v <= 108 ? 3 : 4);
  return { ...base, bandShift: prev != null && curr != null ? band(curr) - band(prev) : null };
}

module.exports = {
  measureCode: 'WHODAS-36',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
