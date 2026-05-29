'use strict';

/**
 * pedsql.js — W555 scoring module for the Pediatric Quality of Life
 * Inventory 4.0 Generic Core Scales (PedsQL 4.0; Varni, Seid & Kurtin
 * 2001). Caregiver/self report of health-related quality of life.
 *
 * 23 items across 4 domains:
 *   Physical Functioning   — items 1–8   (8)
 *   Emotional Functioning  — items 9–13  (5)
 *   Social Functioning     — items 14–18 (5)
 *   School Functioning     — items 19–23 (5)
 *
 * Each item is rated 0–4 by problem frequency over the past month
 * (0 = never a problem … 4 = almost always a problem). Items are
 * reverse-scored and linearly transformed to a 0–100 scale:
 *   0→100, 1→75, 2→50, 3→25, 4→0   (higher = better quality of life).
 *
 * Scores reported (all 0–100, higher better):
 *   value (Total Scale Score)   — mean of all 23 transformed items
 *   physicalHealth              — Physical Functioning subscale (items 1–8)
 *   psychosocialHealth          — mean of Emotional+Social+School (items 9–23)
 *   emotional / social / school — per-domain subscale means
 *
 * direction: higher_better.
 *
 * Interpretive bands (based on the Varni at-risk-for-impaired-HRQOL
 * convention; programs may tune the Measure document's MCID — commonly
 * 4.4 points for the total scale):
 *   ≥ 81      Good HRQOL
 *   70–80.9   Borderline / monitor
 *   < 70      Impaired HRQOL — clinical concern
 *
 * rawShape: 'item_array' — computeDerived expects a 23-length array of
 * integers 0–4, 0-based by item.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 23;
const GOOD_MIN = 81;
const BORDERLINE_MIN = 70;

const DOMAINS = [
  { key: 'physical', name_ar: 'الأداء الجسدي', name_en: 'Physical Functioning' },
  { key: 'emotional', name_ar: 'الأداء الانفعالي', name_en: 'Emotional Functioning' },
  { key: 'social', name_ar: 'الأداء الاجتماعي', name_en: 'Social Functioning' },
  { key: 'school', name_ar: 'الأداء المدرسي', name_en: 'School Functioning' },
];

const RESPONSE_OPTIONS = [
  { value: 0, label_ar: 'أبدًا', label_en: 'Never a problem' },
  { value: 1, label_ar: 'نادرًا', label_en: 'Almost never a problem' },
  { value: 2, label_ar: 'أحيانًا', label_en: 'Sometimes a problem' },
  { value: 3, label_ar: 'غالبًا', label_en: 'Often a problem' },
  { value: 4, label_ar: 'دائمًا تقريبًا', label_en: 'Almost always a problem' },
];

// number → domain key, in item order.
const RAW_ITEMS = [
  { n: 1, d: 'physical', ar: 'صعوبة المشي لمسافة طويلة', en: 'Hard to walk more than one block' },
  { n: 2, d: 'physical', ar: 'صعوبة الجري', en: 'Hard to run' },
  {
    n: 3,
    d: 'physical',
    ar: 'صعوبة ممارسة الرياضة أو التمارين',
    en: 'Hard to do sports activity or exercise',
  },
  { n: 4, d: 'physical', ar: 'صعوبة رفع شيء ثقيل', en: 'Hard to lift something heavy' },
  {
    n: 5,
    d: 'physical',
    ar: 'صعوبة الاستحمام بمفرده',
    en: 'Hard to take a bath or shower by self',
  },
  {
    n: 6,
    d: 'physical',
    ar: 'صعوبة القيام بالأعمال المنزلية',
    en: 'Hard to do chores around the house',
  },
  { n: 7, d: 'physical', ar: 'الشعور بآلام أو أوجاع', en: 'Has hurts or aches' },
  { n: 8, d: 'physical', ar: 'انخفاض مستوى الطاقة', en: 'Low energy level' },

  { n: 9, d: 'emotional', ar: 'الشعور بالخوف أو الفزع', en: 'Feels afraid or scared' },
  { n: 10, d: 'emotional', ar: 'الشعور بالحزن أو الكآبة', en: 'Feels sad or blue' },
  { n: 11, d: 'emotional', ar: 'الشعور بالغضب', en: 'Feels angry' },
  { n: 12, d: 'emotional', ar: 'صعوبة في النوم', en: 'Trouble sleeping' },
  {
    n: 13,
    d: 'emotional',
    ar: 'القلق بشأن ما سيحدث له',
    en: 'Worries about what will happen to him or her',
  },

  {
    n: 14,
    d: 'social',
    ar: 'صعوبة التوافق مع الأطفال الآخرين',
    en: 'Trouble getting along with other children',
  },
  {
    n: 15,
    d: 'social',
    ar: 'عدم رغبة الأطفال الآخرين في مصادقته',
    en: 'Other kids do not want to be his or her friend',
  },
  {
    n: 16,
    d: 'social',
    ar: 'تعرّضه للمضايقة من الأطفال الآخرين',
    en: 'Other kids tease him or her',
  },
  {
    n: 17,
    d: 'social',
    ar: 'عدم قدرته على فعل ما يفعله أقرانه',
    en: 'Cannot do things that other children his or her age can do',
  },
  {
    n: 18,
    d: 'social',
    ar: 'صعوبة مجاراة الأطفال الآخرين أثناء اللعب',
    en: 'Hard to keep up when playing with other children',
  },

  { n: 19, d: 'school', ar: 'صعوبة الانتباه في الصف', en: 'Hard to pay attention in class' },
  { n: 20, d: 'school', ar: 'نسيان الأشياء', en: 'Forgets things' },
  {
    n: 21,
    d: 'school',
    ar: 'صعوبة مواكبة الواجبات المدرسية',
    en: 'Trouble keeping up with schoolwork',
  },
  {
    n: 22,
    d: 'school',
    ar: 'التغيّب عن المدرسة بسبب التوعّك',
    en: 'Misses school because of not feeling well',
  },
  {
    n: 23,
    d: 'school',
    ar: 'التغيّب عن المدرسة لزيارة الطبيب أو المستشفى',
    en: 'Misses school to go to the doctor or hospital',
  },
];

const itemBank = {
  instrumentName_ar: 'مقياس جودة الحياة لدى الأطفال — النسخة العامة 4.0',
  instrumentName_en: 'Pediatric Quality of Life Inventory 4.0 — Generic Core Scales',
  instrumentVersion: 'PedsQL-4.0',
  ageRange: { minMonths: 24, maxMonths: 216 },
  respondent: 'caregiver',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'خلال الشهر الماضي، إلى أي مدى كان كلٌّ ممّا يلي مشكلةً لطفلك؟ (0 = أبدًا … 4 = دائمًا تقريبًا)',
  responseScaleNote_en:
    'In the past ONE month, how much of a problem has each of the following been? (0 = never … 4 = almost always)',
  domains: DOMAINS,
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
    domain: it.d,
    reverseScored: true,
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
    errors.push(`PedsQL 4.0 has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > 4) {
      errors.push(`item ${i + 1}: must be integer 0-4 — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// 0→100, 1→75, 2→50, 3→25, 4→0
function _transform(v) {
  return 100 - v * 25;
}

function _mean(values) {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`PedsQL: invalid raw items — ${v.errors.join('; ')}`);
  }
  const transformed = rawItems.map(_transform);
  const byDomain = { physical: [], emotional: [], social: [], school: [] };
  RAW_ITEMS.forEach((it, idx) => {
    byDomain[it.d].push(transformed[idx]);
  });

  const physical = _mean(byDomain.physical);
  const emotional = _mean(byDomain.emotional);
  const social = _mean(byDomain.social);
  const school = _mean(byDomain.school);
  const psychosocial = _mean([...byDomain.emotional, ...byDomain.social, ...byDomain.school]);
  const total = _mean(transformed);

  return {
    value: total,
    subscales: {
      physical,
      emotional,
      social,
      school,
      physicalHealth: physical,
      psychosocialHealth: psychosocial,
    },
    notes: { transform: 'linear_0_4_to_100_0', method: 'mean_of_transformed_items' },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('PedsQL.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > 100) {
    throw new Error(`PedsQL.interpret: derivedValue ${derivedValue} outside 0-100`);
  }
  if (derivedValue >= GOOD_MIN) {
    return {
      band: 'good',
      tier: 'L3',
      label_ar: 'جودة حياة جيدة',
      label_en: 'Good health-related quality of life',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'الحفاظ على البرنامج الحالي والمتابعة الدورية.',
      action_en: 'Maintain current program with periodic monitoring.',
    };
  }
  if (derivedValue >= BORDERLINE_MIN) {
    return {
      band: 'borderline',
      tier: 'L2',
      label_ar: 'جودة حياة حدّية — بحاجة للمتابعة',
      label_en: 'Borderline quality of life — monitor',
      severity: 'mild',
      color: '#ef6c00',
      action_ar: 'مراجعة النطاقات الأضعف وتعديل أهداف الخطة العلاجية.',
      action_en: 'Review the weakest domains and adjust care-plan goals.',
    };
  }
  return {
    band: 'impaired',
    tier: 'L1',
    label_ar: 'جودة حياة متأثّرة — مدعاة للقلق',
    label_en: 'Impaired quality of life — clinical concern',
    severity: 'moderate',
    color: '#b71c1c',
    action_ar: 'تقييم متعدّد التخصّصات + دعم نفسي-اجتماعي مستهدف + مراجعة الأهداف.',
    action_en: 'Multidisciplinary review + targeted psychosocial support + goal revision.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = s => (s >= GOOD_MIN ? 'good' : s >= BORDERLINE_MIN ? 'borderline' : 'impaired');
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'PEDSQL',
  engineVersion: '1.0.0',
  derivedType: 'weighted_sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: 100 },
  subscaleDerivedTypes: {
    physical: 'weighted_sum',
    emotional: 'weighted_sum',
    social: 'weighted_sum',
    school: 'weighted_sum',
  },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
