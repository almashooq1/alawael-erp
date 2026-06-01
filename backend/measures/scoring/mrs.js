'use strict';

/**
 * mrs.js — W707 scoring module for the Modified Rankin Scale (mRS).
 *
 * The mRS is the most widely used global outcome measure for degree of
 * disability / dependence after a neurological insult (stroke, acquired brain
 * injury, etc.). It is a single ORDINAL 0–6 grade:
 *   0  No symptoms at all
 *   1  No significant disability — able to carry out all usual activities
 *   2  Slight disability — unable to carry out all previous activities but
 *      independent in daily affairs
 *   3  Moderate disability — requires some help, but walks unassisted
 *   4  Moderately severe disability — unable to walk / attend to bodily needs
 *      without assistance
 *   5  Severe disability — bedridden, incontinent, constant care required
 *   6  Dead
 *
 * direction = lower_better (0 = no disability). Public domain; free for
 * clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects [grade] (one integer 0–6).
 */

const { standardDelta } = require('./contract');

const GRADES = [
  {
    value: 0,
    ar: 'لا أعراض إطلاقًا',
    en: 'No symptoms at all',
    severity: 'normal',
    color: '#2e7d32',
  },
  {
    value: 1,
    ar: 'لا إعاقة ذات دلالة — قادر على ممارسة جميع الأنشطة المعتادة',
    en: 'No significant disability — able to carry out all usual activities',
    severity: 'minimal',
    color: '#7cb342',
  },
  {
    value: 2,
    ar: 'إعاقة بسيطة — مستقلّ في شؤونه اليومية رغم تعذّر بعض الأنشطة السابقة',
    en: 'Slight disability — independent in daily affairs but unable to do all previous activities',
    severity: 'mild',
    color: '#c0ca33',
  },
  {
    value: 3,
    ar: 'إعاقة متوسطة — يحتاج بعض المساعدة لكنه يمشي دون إسناد',
    en: 'Moderate disability — requires some help but walks unassisted',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    ar: 'إعاقة متوسطة الشدة — لا يستطيع المشي أو قضاء حاجاته دون مساعدة',
    en: 'Moderately severe disability — unable to walk or attend to bodily needs without help',
    severity: 'severe',
    color: '#e53935',
  },
  {
    value: 5,
    ar: 'إعاقة شديدة — طريح الفراش، سلس، يحتاج رعاية دائمة',
    en: 'Severe disability — bedridden, incontinent, requires constant care',
    severity: 'critical',
    color: '#c62828',
  },
  {
    value: 6,
    ar: 'وفاة',
    en: 'Dead',
    severity: 'critical',
    color: '#000000',
  },
];

const BY_VALUE = new Map(GRADES.map(g => [g.value, g]));
const MAX = 6;

const itemBank = {
  instrumentName_ar: 'مقياس رانكين المعدّل لدرجة الإعاقة',
  instrumentName_en: 'Modified Rankin Scale (mRS)',
  instrumentVersion: 'van Swieten et al. (1988)',
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'يحدّد المختصّ الدرجة الواحدة (0 إلى 6) التي تصف مستوى الاستقلالية والإعاقة الإجمالية للمستفيد.',
  responseScaleNote_en:
    'The clinician selects the single grade (0–6) describing the beneficiary’s overall level of independence and disability.',
  items: [
    {
      number: 1,
      text_ar: 'درجة الإعاقة الإجمالية',
      text_en: 'Overall degree of disability',
      responseOptions: GRADES.map(g => ({
        value: g.value,
        label_ar: `${g.value} — ${g.ar}`,
        label_en: `${g.value} — ${g.en}`,
        atRisk: g.value >= 3 || undefined,
      })),
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== 1) {
    errors.push(`mRS is a single grade — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_VALUE.has(rawItems[0])) {
    errors.push(`grade must be an integer 0-${MAX} — got ${JSON.stringify(rawItems[0])}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`mRS: invalid input — ${v.errors.join('; ')}`);
  const g = BY_VALUE.get(rawItems[0]);
  return {
    value: g.value,
    notes: {
      method: 'ordinal_lookup',
      favourableOutcome: g.value <= 2, // common dichotomy: 0-2 = independent
      deceased: g.value === 6,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  const g = BY_VALUE.get(derivedValue);
  if (!g) throw new Error(`mRS.interpret: derivedValue ${derivedValue} not a grade 0-${MAX}`);
  const action =
    g.value === 0
      ? {
          ar: 'لا إعاقة — متابعة روتينية.',
          en: 'No disability — routine follow-up.',
        }
      : g.value <= 2
        ? {
            ar: 'إعاقة بسيطة مع استقلالية — برنامج تأهيلي للحفاظ على الوظائف.',
            en: 'Slight disability with independence — rehabilitation to maintain function.',
          }
        : g.value === 3
          ? {
              ar: 'إعاقة متوسطة — خطة تأهيلية مكثّفة وترتيبات دعم منزلي.',
              en: 'Moderate disability — intensive rehabilitation and home-support arrangements.',
            }
          : g.value <= 5
            ? {
                ar: 'إعاقة شديدة — رعاية شاملة ودعم مقدّم الرعاية وتقييم الأجهزة المساعدة.',
                en: 'Severe disability — comprehensive care, caregiver support and assistive-device review.',
              }
            : {
                ar: 'وفاة — إغلاق الملف مع الإجراءات الإدارية اللازمة.',
                en: 'Deceased — close the record with the required administrative steps.',
              };
  return {
    band: `mrs_${g.value}`,
    tier: `L${g.value}`,
    label_ar: `الدرجة ${g.value} — ${g.ar}`,
    label_en: `Grade ${g.value} — ${g.en}`,
    severity: g.severity,
    color: g.color,
    action_ar: action.ar,
    action_en: action.en,
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  return {
    ...base,
    gradeChange: prev != null && curr != null && prev !== curr ? `${prev}_to_${curr}` : null,
  };
}

module.exports = {
  measureCode: 'MRS',
  engineVersion: '1.0.0',
  derivedType: 'lookup_table',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: 0, max: MAX },
  cutoff: 3, // ≥ 3 → dependent (loses the favourable 0–2 dichotomy)
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
