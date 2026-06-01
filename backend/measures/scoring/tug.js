'use strict';

/**
 * tug.js — W708 scoring module for the Timed Up and Go (TUG) test.
 *
 * Podsiadlo & Richardson (1991). The beneficiary rises from a standard chair,
 * walks 3 metres, turns, walks back and sits down; the elapsed time in SECONDS
 * is the score. Faster = better, so direction = lower_better.
 *
 * Community thresholds (adults): < 10 s freely mobile · 10–19.9 s mostly
 * independent · 20–29.9 s variable mobility · ≥ 30 s dependent. A time
 * ≥ 13.5 s is a common fall-risk cut-off. (Paediatric norms differ — record
 * the age band in ctx and interpret against local norms where available.)
 *
 * Public domain; free for clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects a single positive number
 * (seconds, decimals allowed).
 */

const { standardDelta } = require('./contract');

const CUTOFF = 13.5; // fall-risk threshold (seconds)
const MAX = 120; // sanity upper bound for a single trial

const itemBank = {
  instrumentName_ar: 'اختبار النهوض والمشي الموقوت',
  instrumentName_en: 'Timed Up and Go (TUG)',
  instrumentVersion: 'Podsiadlo & Richardson (1991)',
  respondent: 'clinician',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يُسجَّل الزمن بالثواني للنهوض من الكرسي والمشي 3 أمتار والعودة والجلوس. أقلّ = أفضل.',
  responseScaleNote_en:
    'Record the time in seconds to rise, walk 3 m, turn, return and sit. Lower = better.',
  items: [
    {
      number: 1,
      text_ar: 'زمن إكمال المهمة (بالثواني)',
      text_en: 'Time to complete the task (seconds)',
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
    errors.push(`TUG is a single timed value — expected 1, got ${rawItems.length}`);
  }
  const t = rawItems[0];
  if (typeof t !== 'number' || !Number.isFinite(t) || t <= 0 || t > MAX) {
    errors.push(`time must be a number in (0, ${MAX}] seconds — got ${JSON.stringify(t)}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`TUG: invalid input — ${v.errors.join('; ')}`);
  const seconds = rawItems[0];
  return {
    value: Math.round(seconds * 10) / 10, // 0.1 s resolution
    notes: { method: 'timed', unit: 'seconds', fallRisk: seconds >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue <= 0) {
    throw new Error(`TUG.interpret: invalid time ${derivedValue}`);
  }
  if (derivedValue < 10) {
    return {
      band: 'freely_mobile',
      tier: 'L0',
      label_ar: 'حركة طبيعية حرّة',
      label_en: 'Freely mobile',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا خطر سقوط ملحوظ — متابعة روتينية.',
      action_en: 'No notable fall risk — routine follow-up.',
    };
  }
  if (derivedValue < 20) {
    return {
      band: 'mostly_independent',
      tier: 'L1',
      label_ar: 'مستقلّ غالبًا مع خطر سقوط محتمل',
      label_en: 'Mostly independent — possible fall risk',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تقييم التوازن وبرنامج تمارين وقائية للسقوط.',
      action_en: 'Balance assessment and a fall-prevention exercise programme.',
    };
  }
  if (derivedValue < 30) {
    return {
      band: 'variable_mobility',
      tier: 'L2',
      label_ar: 'حركة متغيّرة — خطر سقوط مرتفع',
      label_en: 'Variable mobility — high fall risk',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تدخّل علاج طبيعي مكثّف وتقييم وسائل مساعدة على المشي.',
      action_en: 'Intensive physiotherapy and assessment of walking aids.',
    };
  }
  return {
    band: 'dependent',
    tier: 'L3',
    label_ar: 'حركة معتمدة — خطر سقوط شديد',
    label_en: 'Dependent mobility — severe fall risk',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'إشراف لصيق، تعديل البيئة، وخطة وقاية سقوط فردية.',
    action_en:
      'Close supervision, environmental modification and an individual fall-prevention plan.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const crossed = prev != null && curr != null && prev >= CUTOFF !== curr >= CUTOFF;
  return { ...base, fallRiskCutoffCrossed: crossed };
}

module.exports = {
  measureCode: 'TUG',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: 0, max: MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
