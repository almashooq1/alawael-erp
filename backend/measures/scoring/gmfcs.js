'use strict';

/**
 * gmfcs.js — W566 scoring module for the Gross Motor Function
 * Classification System — Expanded & Revised (GMFCS-E&R; Palisano et al.
 * 1997, revised 2007). A 5-level ORDINAL classification of self-initiated
 * gross-motor function (sitting, transfers, mobility) for children with
 * cerebral palsy.
 *
 * GMFCS is a CLASSIFICATION, not a summative scale — the clinician selects
 * the single level (I–V) whose age-banded descriptor best matches the
 * child. We model it inside the item-bank framework as a 1-item ordinal
 * pick whose response value IS the level (1–5); the derived value equals
 * the level.
 *
 * Levels (general, age-independent summary — the manual carries the full
 * age-banded descriptors the rater consults):
 *   I    Walks without limitations
 *   II   Walks with limitations
 *   III  Walks using a hand-held mobility device
 *   IV   Self-mobility with limitations; may use powered mobility
 *   V    Transported in a manual wheelchair
 *
 * direction: lower_better (Level I = least limitation). It is highly
 * stable over time — purpose='descriptor', MCID not applicable.
 *
 * rawShape: 'item_array' — computeDerived expects [level] (one integer 1–5).
 */

const { standardDelta } = require('./contract');

const LEVELS = [
  {
    value: 1,
    ar: 'المستوى I — يمشي دون قيود',
    en: 'Level I — Walks without limitations',
    severity: 'normal',
    color: '#1b5e20',
  },
  {
    value: 2,
    ar: 'المستوى II — يمشي مع قيود',
    en: 'Level II — Walks with limitations',
    severity: 'mild',
    color: '#558b2f',
  },
  {
    value: 3,
    ar: 'المستوى III — يمشي باستخدام وسيلة تنقّل محمولة باليد',
    en: 'Level III — Walks using a hand-held mobility device',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    ar: 'المستوى IV — تنقّل ذاتي محدود؛ قد يستخدم تنقّلًا آليًا',
    en: 'Level IV — Self-mobility with limitations; may use powered mobility',
    severity: 'severe',
    color: '#c62828',
  },
  {
    value: 5,
    ar: 'المستوى V — يُنقَل في كرسي متحرّك يدوي',
    en: 'Level V — Transported in a manual wheelchair',
    severity: 'critical',
    color: '#b71c1c',
  },
];

const BY_LEVEL = new Map(LEVELS.map(l => [l.value, l]));

const itemBank = {
  instrumentName_ar: 'نظام تصنيف الوظيفة الحركية الكبرى — الموسّع والمنقّح',
  instrumentName_en: 'Gross Motor Function Classification System — Expanded & Revised',
  instrumentVersion: 'E&R-2007',
  ageRange: { minMonths: 24, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'اختر المستوى الواحد الذي يصف وظيفة الطفل الحركية الكبرى الاعتيادية ضمن فئته العمرية (من I إلى V).',
  responseScaleNote_en:
    "Select the single level that best describes the child's usual gross-motor function within their age band (I–V).",
  items: [
    {
      number: 1,
      text_ar: 'المستوى الوظيفي الحركي الكبير الأنسب للطفل',
      text_en: 'Best-fitting gross-motor function level for the child',
      responseOptions: LEVELS.map(l => ({ value: l.value, label_ar: l.ar, label_en: l.en })),
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
    errors.push(`GMFCS is a single classification — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_LEVEL.has(rawItems[0])) {
    errors.push(`level must be an integer 1-5 — got ${JSON.stringify(rawItems[0])}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`GMFCS: invalid input — ${v.errors.join('; ')}`);
  return { value: rawItems[0], notes: { method: 'ordinal_classification' } };
}

function interpret(derivedValue /*, ctx */) {
  const lvl = BY_LEVEL.get(derivedValue);
  if (!lvl) throw new Error(`GMFCS.interpret: derivedValue ${derivedValue} not a level 1-5`);
  return {
    band: `level_${lvl.value}`,
    tier: `L${lvl.value}`,
    label_ar: lvl.ar,
    label_en: lvl.en,
    severity: lvl.severity,
    color: lvl.color,
    action_ar:
      lvl.value <= 2
        ? 'متابعة دورية لوظيفة المشي + برنامج تقوية ومرونة.'
        : lvl.value === 3
          ? 'برنامج علاج طبيعي مكثّف + تقييم الوسائل المساعدة على الحركة.'
          : 'خطة تنقّل وأوضاع جلوس متخصّصة + تقييم الكرسي المتحرّك والوقاية من التشوّهات.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  return {
    ...base,
    levelChange: prev != null && curr != null && prev !== curr ? `${prev}_to_${curr}` : null,
  };
}

module.exports = {
  measureCode: 'GMFCS',
  engineVersion: '1.0.0',
  derivedType: 'lookup_table',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: 1, max: 5 },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
