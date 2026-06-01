'use strict';

/**
 * lawton.js — W710 scoring module for the Lawton Instrumental Activities of
 * Daily Living (IADL) Scale.
 *
 * Lawton & Brody (1969). Eight instrumental (community-living) activities,
 * each scored dichotomously in the summary form:  1 = independent · 0 = needs
 * assistance / unable.
 *   Telephone · Shopping · Food preparation · Housekeeping · Laundry ·
 *   Transportation · Medication management · Finances
 * Total range 0–8; higher = better.
 *
 * Public domain; free for clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects 8 binary values in the fixed
 * activity order above.
 */

const { standardDelta } = require('./contract');

const ACTIVITIES = [
  { key: 'telephone', name_ar: 'استخدام الهاتف', name_en: 'Telephone use' },
  { key: 'shopping', name_ar: 'التسوق', name_en: 'Shopping' },
  { key: 'food_prep', name_ar: 'إعداد الطعام', name_en: 'Food preparation' },
  { key: 'housekeeping', name_ar: 'الأعمال المنزلية', name_en: 'Housekeeping' },
  { key: 'laundry', name_ar: 'غسيل الملابس', name_en: 'Laundry' },
  { key: 'transportation', name_ar: 'التنقل والمواصلات', name_en: 'Transportation' },
  { key: 'medication', name_ar: 'إدارة الأدوية', name_en: 'Medication management' },
  { key: 'finances', name_ar: 'إدارة الشؤون المالية', name_en: 'Handling finances' },
];

const TOTAL_MIN = 0;
const TOTAL_MAX = ACTIVITIES.length; // 8
const CUTOFF = 6; // < 6 → meaningful IADL impairment

const itemBank = {
  instrumentName_ar: 'مقياس لوتون للأنشطة اليومية الأداتية',
  instrumentName_en: 'Lawton Instrumental ADL Scale',
  instrumentVersion: 'Lawton & Brody (1969)',
  respondent: 'clinician',
  estimatedMinutes: 8,
  responseScaleNote_ar:
    'لكل نشاط أداتي: 1 = مستقل، 0 = يحتاج مساعدة أو غير قادر. المجموع 0–8؛ أعلى = أفضل.',
  responseScaleNote_en:
    'For each instrumental activity: 1 = independent, 0 = needs help / unable. Total 0–8; higher = better.',
  items: ACTIVITIES.map((a, i) => ({
    number: i + 1,
    text_ar: a.name_ar,
    text_en: a.name_en,
    responseOptions: [
      {
        value: 0,
        label_ar: 'يحتاج مساعدة / غير قادر',
        label_en: 'Needs help / unable',
        atRisk: true,
      },
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
    errors.push(`Lawton expects ${ACTIVITIES.length} binary items — got ${rawItems.length}`);
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
  if (!v.ok) throw new Error(`Lawton: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  ACTIVITIES.forEach((a, i) => {
    subscales[a.key] = rawItems[i];
  });
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    subscales,
    notes: { method: 'sum', max: TOTAL_MAX, impaired: total < CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `Lawton.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue >= TOTAL_MAX) {
    return {
      band: 'full_independence',
      tier: 'L0',
      label_ar: 'استقلالية كاملة',
      label_en: 'Full independence',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'الحفاظ على الاستقلالية المجتمعية ضمن البرنامج المعتاد.',
      action_en: 'Maintain community independence within the usual programme.',
    };
  }
  if (derivedValue >= CUTOFF) {
    return {
      band: 'mild_impairment',
      tier: 'L1',
      label_ar: 'قصور خفيف',
      label_en: 'Mild impairment',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تدريب على الأنشطة الأداتية المتأثرة ودعم مجتمعي جزئي.',
      action_en: 'Train the affected instrumental activities with partial community support.',
    };
  }
  if (derivedValue >= 3) {
    return {
      band: 'moderate_impairment',
      tier: 'L2',
      label_ar: 'قصور متوسط',
      label_en: 'Moderate impairment',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'خطة دعم منظمة لإدارة الأدوية والمواصلات والشؤون المالية.',
      action_en: 'Structured support plan for medication, transport and finances.',
    };
  }
  return {
    band: 'severe_impairment',
    tier: 'L3',
    label_ar: 'قصور شديد',
    label_en: 'Severe impairment',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'إشراف شامل على الأنشطة المجتمعية وإعادة تقييم أهداف الخطة.',
    action_en: 'Comprehensive supervision of community activities and review of care-plan goals.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = t =>
    t >= TOTAL_MAX ? 'full' : t >= CUTOFF ? 'mild' : t >= 3 ? 'moderate' : 'severe';
  return {
    ...base,
    impairmentBandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'LAWTON',
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
