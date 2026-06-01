'use strict';

/**
 * katz.js — W710 scoring module for the Katz Index of Independence in
 * Activities of Daily Living (Katz ADL).
 *
 * Katz et al. (1963). Six basic self-care activities, each scored
 * dichotomously:  1 = independent · 0 = dependent.
 *   Bathing · Dressing · Toileting · Transferring · Continence · Feeding
 * Total range 0–6; higher = better.
 *   6 = full function · 4 = moderate impairment · ≤ 2 = severe impairment.
 *
 * Public domain; free for clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects 6 binary values in the
 * fixed activity order above.
 */

const { standardDelta } = require('./contract');

const ACTIVITIES = [
  { key: 'bathing', name_ar: 'الاستحمام', name_en: 'Bathing' },
  { key: 'dressing', name_ar: 'ارتداء الملابس', name_en: 'Dressing' },
  { key: 'toileting', name_ar: 'استخدام المرحاض', name_en: 'Toileting' },
  { key: 'transferring', name_ar: 'الانتقال', name_en: 'Transferring' },
  { key: 'continence', name_ar: 'التحكم بالإخراج', name_en: 'Continence' },
  { key: 'feeding', name_ar: 'تناول الطعام', name_en: 'Feeding' },
];

const TOTAL_MIN = 0;
const TOTAL_MAX = ACTIVITIES.length; // 6
const CUTOFF = 4; // < 4 → meaningful dependence

const itemBank = {
  instrumentName_ar: 'مؤشر كاتز للاستقلالية في الأنشطة اليومية',
  instrumentName_en: 'Katz Index of Independence in ADL',
  instrumentVersion: 'Katz et al. (1963)',
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar: 'لكل نشاط: 1 = مستقل، 0 = معتمد على الغير. المجموع 0–6؛ أعلى = أفضل.',
  responseScaleNote_en:
    'For each activity: 1 = independent, 0 = dependent. Total 0–6; higher = better.',
  items: ACTIVITIES.map((a, i) => ({
    number: i + 1,
    text_ar: a.name_ar,
    text_en: a.name_en,
    responseOptions: [
      { value: 0, label_ar: 'معتمد على الغير', label_en: 'Dependent', atRisk: true },
      { value: 1, label_ar: 'مستقل', label_en: 'Independent' },
    ],
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ACTIVITIES.length) {
    errors.push(`Katz expects ${ACTIVITIES.length} binary items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (v !== 0 && v !== 1) {
      errors.push(`${ACTIVITIES[i]?.key ?? `item ${i}`} must be 0 or 1 — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Katz: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  ACTIVITIES.forEach((a, i) => {
    subscales[a.key] = rawItems[i];
  });
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    subscales,
    notes: { method: 'sum', max: TOTAL_MAX, dependent: total < CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(`Katz.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`);
  }
  if (derivedValue >= TOTAL_MAX) {
    return {
      band: 'full_independence',
      tier: 'L0',
      label_ar: 'استقلالية كاملة',
      label_en: 'Full independence',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'الحفاظ على الاستقلالية ضمن البرنامج التأهيلي المعتاد.',
      action_en: 'Maintain independence within the usual rehabilitation programme.',
    };
  }
  if (derivedValue >= CUTOFF) {
    return {
      band: 'mild_dependence',
      tier: 'L1',
      label_ar: 'اعتماد خفيف',
      label_en: 'Mild dependence',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تدريب على الأنشطة المتأثرة وتوفير دعم جزئي عند الحاجة.',
      action_en: 'Train the affected activities and provide partial support as needed.',
    };
  }
  if (derivedValue >= 2) {
    return {
      band: 'moderate_dependence',
      tier: 'L2',
      label_ar: 'اعتماد متوسط',
      label_en: 'Moderate dependence',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'خطة عناية يومية منظمة ودعم مقدّم الرعاية في الأنشطة الأساسية.',
      action_en: 'Structured daily-care plan and caregiver support for basic activities.',
    };
  }
  return {
    band: 'severe_dependence',
    tier: 'L3',
    label_ar: 'اعتماد شديد',
    label_en: 'Severe dependence',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'رعاية شاملة مع إشراف مستمر وإعادة تقييم لأهداف الخطة العلاجية.',
    action_en: 'Comprehensive care with continuous supervision and review of care-plan goals.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = t =>
    t >= TOTAL_MAX ? 'full' : t >= CUTOFF ? 'mild' : t >= 2 ? 'moderate' : 'severe';
  return {
    ...base,
    dependenceBandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'KATZ',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: ACTIVITIES.length,
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
