'use strict';

/**
 * csi.js — W708 scoring module for the Caregiver Strain Index (CSI).
 *
 * Robinson (1983). A 13-item screening tool for strain experienced by an
 * informal caregiver. Each item is scored yes = 1 / no = 0; the total (0–13)
 * is the strain score. A total ≥ 7 indicates a high level of caregiver strain
 * and warrants follow-up. direction = lower_better.
 *
 * Public domain; free for clinical and research use. Complements the Family
 * Engagement / Phase B caregiver surfaces.
 *
 * rawShape: 'item_array' — computeDerived expects 13 binary values (0|1).
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 13;
const CUTOFF = 7;

/** Bilingual item stems (caregiver self-report). */
const ITEMS = [
  ['النوم متقطّع', 'Sleep is disturbed'],
  ['الرعاية مُرهِقة (جسديًا)', 'Caregiving is inconvenient / physically demanding'],
  ['الرعاية مجهدة بدنيًا', 'Caregiving is a physical strain'],
  ['الرعaية تقيّد حركتي وحياتي', 'Caregiving is confining / restricts free time'],
  ['اضطررتُ لتعديل خططي الشخصية', 'There have been family adjustments'],
  ['تغيّرت خططي الشخصية وروتيني', 'There have been changes in personal plans'],
  ['وجود ضغوط أخرى تنافس وقتي', 'There have been other demands on my time'],
  ['حدثت تغيّرات عاطفية مزعجة', 'There have been emotional adjustments'],
  ['بعض سلوكيات المستفيد مزعجة', 'Some behaviour of the person cared for is upsetting'],
  ['من المؤلم رؤية تغيّر حال المستفيد', 'It is upsetting to find the person has changed so much'],
  ['اضطررتُ لتعديل عملي أو التزاماتي', 'There have been work adjustments'],
  ['الرعاية تشكّل عبئًا ماليًا', 'Caregiving is a financial strain'],
  ['أشعر بأنني مُنهَك تمامًا', 'Feeling completely overwhelmed'],
];

const itemBank = {
  instrumentName_ar: 'مؤشّر إجهاد مقدّم الرعاية',
  instrumentName_en: 'Caregiver Strain Index (CSI)',
  instrumentVersion: 'Robinson (1983)',
  respondent: 'caregiver',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'لكل عبارة: نعم = 1، لا = 0. يُجمع الإجمالي (0–13)؛ إجمالي ≥ 7 يدلّ على إجهاد مرتفع.',
  responseScaleNote_en:
    'Each item: yes = 1, no = 0. Sum the total (0–13); a total ≥ 7 indicates high strain.',
  items: ITEMS.map(([ar, en], i) => ({
    number: i + 1,
    text_ar: ar,
    text_en: en,
    responseOptions: [
      { value: 0, label_ar: 'لا', label_en: 'No' },
      { value: 1, label_ar: 'نعم', label_en: 'Yes', atRisk: true },
    ],
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`CSI expects ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (v !== 0 && v !== 1) {
      errors.push(`item ${i + 1} must be 0 or 1 — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`CSI: invalid input — ${v.errors.join('; ')}`);
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    notes: { method: 'sum', max: ITEM_COUNT, highStrain: total >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < 0 || derivedValue > ITEM_COUNT) {
    throw new Error(`CSI.interpret: total ${derivedValue} out of range 0-${ITEM_COUNT}`);
  }
  if (derivedValue >= CUTOFF) {
    return {
      band: 'high_strain',
      tier: 'L2',
      label_ar: 'إجهاد مرتفع لدى مقدّم الرعاية',
      label_en: 'High caregiver strain',
      severity: 'severe',
      color: '#e53935',
      action_ar: 'تفعيل دعم الأسرة: استشارة، خدمة راحة (respite)، وتقييم احتياجات مقدّم الرعاية.',
      action_en:
        'Activate family support: counselling, respite service and a caregiver-needs assessment.',
    };
  }
  if (derivedValue >= 4) {
    return {
      band: 'moderate_strain',
      tier: 'L1',
      label_ar: 'إجهاد متوسط — يستحقّ المتابعة',
      label_en: 'Moderate strain — warrants monitoring',
      severity: 'mild',
      color: '#f9a825',
      action_ar: 'متابعة دورية وتقديم معلومات عن خدمات الدعم المتاحة.',
      action_en: 'Periodic monitoring and signposting to available support services.',
    };
  }
  return {
    band: 'low_strain',
    tier: 'L0',
    label_ar: 'إجهاد منخفض',
    label_en: 'Low strain',
    severity: 'normal',
    color: '#2e7d32',
    action_ar: 'لا حاجة لإجراء حاليًا — إعادة التقييم وفق الجدول المعتاد.',
    action_en: 'No action needed now — reassess on the usual schedule.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const crossed = prev != null && curr != null && prev >= CUTOFF !== curr >= CUTOFF;
  return { ...base, cutoffCrossed: crossed };
}

module.exports = {
  measureCode: 'CSI',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: ITEM_COUNT },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
