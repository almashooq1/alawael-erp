'use strict';

/**
 * edacs.js — W567 scoring module for the Eating and Drinking Ability
 * Classification System (EDACS; Sellers et al. 2014). A 5-level ORDINAL
 * classification of how safely and efficiently a person with cerebral
 * palsy eats and drinks. Rounds out the CP functional classification set
 * (GMFCS + MACS + CFCS + EDACS).
 *
 * Modelled, like its siblings, as a 1-item ordinal pick whose response
 * value IS the level (1–5). direction: lower_better (Level I = safest +
 * most efficient). purpose='descriptor', MCID not applicable.
 *
 * rawShape: 'item_array' — computeDerived expects [level] (one integer 1–5).
 */

const { standardDelta } = require('./contract');

const LEVELS = [
  {
    value: 1,
    ar: 'المستوى I — يأكل ويشرب بأمان وكفاءة',
    en: 'Level I — Eats and drinks safely and efficiently',
    severity: 'normal',
    color: '#1b5e20',
  },
  {
    value: 2,
    ar: 'المستوى II — يأكل ويشرب بأمان مع بعض القيود على الكفاءة',
    en: 'Level II — Eats and drinks safely but with some limitations to efficiency',
    severity: 'mild',
    color: '#558b2f',
  },
  {
    value: 3,
    ar: 'المستوى III — يأكل ويشرب مع بعض القيود على الأمان؛ وقد توجد قيود على الكفاءة',
    en: 'Level III — Eats and drinks with some limitations to safety; possible limits to efficiency',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    ar: 'المستوى IV — يأكل ويشرب مع قيود كبيرة على الأمان',
    en: 'Level IV — Eats and drinks with significant limitations to safety',
    severity: 'severe',
    color: '#c62828',
  },
  {
    value: 5,
    ar: 'المستوى V — غير قادر على الأكل أو الشرب بأمان — قد يُنظر في التغذية الأنبوبية',
    en: 'Level V — Unable to eat or drink safely; tube feeding may be considered',
    severity: 'critical',
    color: '#b71c1c',
  },
];

const BY_LEVEL = new Map(LEVELS.map(l => [l.value, l]));

const itemBank = {
  instrumentName_ar: 'نظام تصنيف القدرة على الأكل والشرب',
  instrumentName_en: 'Eating and Drinking Ability Classification System',
  instrumentVersion: 'EDACS-2014',
  ageRange: { minMonths: 36, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'اختر المستوى الواحد الذي يصف أمان وكفاءة الطفل الاعتيادية في الأكل والشرب (من I إلى V).',
  responseScaleNote_en:
    "Select the single level that best describes the child's usual safety and efficiency of eating and drinking (I–V).",
  items: [
    {
      number: 1,
      text_ar: 'مستوى القدرة على الأكل والشرب الأنسب للطفل',
      text_en: 'Best-fitting eating and drinking ability level for the child',
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
    errors.push(`EDACS is a single classification — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_LEVEL.has(rawItems[0])) {
    errors.push(`level must be an integer 1-5 — got ${JSON.stringify(rawItems[0])}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`EDACS: invalid input — ${v.errors.join('; ')}`);
  return { value: rawItems[0], notes: { method: 'ordinal_classification' } };
}

function interpret(derivedValue /*, ctx */) {
  const lvl = BY_LEVEL.get(derivedValue);
  if (!lvl) throw new Error(`EDACS.interpret: derivedValue ${derivedValue} not a level 1-5`);
  return {
    band: `level_${lvl.value}`,
    tier: `L${lvl.value}`,
    label_ar: lvl.ar,
    label_en: lvl.en,
    severity: lvl.severity,
    color: lvl.color,
    action_ar:
      lvl.value <= 2
        ? 'متابعة دورية + إرشادات قوام الطعام والشراب الآمن.'
        : lvl.value === 3
          ? 'تقييم بلع + تعديل قوام الطعام (IDDSI) + إشراف أثناء التغذية.'
          : 'تقييم بلع عاجل + خطة تغذية آمنة + النظر في التغذية الأنبوبية ومتابعة التغذية.',
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
  measureCode: 'EDACS',
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
