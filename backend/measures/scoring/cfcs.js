'use strict';

/**
 * cfcs.js — W567 scoring module for the Communication Function
 * Classification System (CFCS; Hidecker et al. 2011). A 5-level ORDINAL
 * classification of everyday communication performance (as sender AND
 * receiver, with familiar and unfamiliar partners) for people with
 * cerebral palsy. Completes the CP classification triad with GMFCS
 * (gross motor) + MACS (manual ability).
 *
 * Modelled, like GMFCS/MACS, as a 1-item ordinal pick whose response
 * value IS the level (1–5). direction: lower_better (Level I = most
 * effective communication). purpose='descriptor', MCID not applicable.
 *
 * rawShape: 'item_array' — computeDerived expects [level] (one integer 1–5).
 */

const { standardDelta } = require('./contract');

const LEVELS = [
  {
    value: 1,
    ar: 'المستوى I — مُرسِل ومُستقبِل فعّال مع الشركاء المألوفين وغير المألوفين',
    en: 'Level I — Effective sender and receiver with unfamiliar and familiar partners',
    severity: 'normal',
    color: '#1b5e20',
  },
  {
    value: 2,
    ar: 'المستوى II — فعّال لكن بوتيرة أبطأ كمُرسِل و/أو مُستقبِل مع الشركاء',
    en: 'Level II — Effective but slower-paced sender and/or receiver with partners',
    severity: 'mild',
    color: '#558b2f',
  },
  {
    value: 3,
    ar: 'المستوى III — مُرسِل ومُستقبِل فعّال مع الشركاء المألوفين فقط',
    en: 'Level III — Effective sender and receiver with familiar partners',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    ar: 'المستوى IV — غير متّسق كمُرسِل و/أو مُستقبِل مع الشركاء المألوفين',
    en: 'Level IV — Inconsistent sender and/or receiver with familiar partners',
    severity: 'severe',
    color: '#c62828',
  },
  {
    value: 5,
    ar: 'المستوى V — نادرًا ما يكون فعّالًا كمُرسِل ومُستقبِل حتى مع المألوفين',
    en: 'Level V — Seldom effective sender and receiver even with familiar partners',
    severity: 'critical',
    color: '#b71c1c',
  },
];

const BY_LEVEL = new Map(LEVELS.map(l => [l.value, l]));

const itemBank = {
  instrumentName_ar: 'نظام تصنيف وظيفة التواصل',
  instrumentName_en: 'Communication Function Classification System',
  instrumentVersion: 'CFCS-2011',
  ageRange: { minMonths: 24, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'اختر المستوى الواحد الذي يصف فعالية تواصل الطفل اليومية كمُرسِل ومُستقبِل مع الشركاء المألوفين وغير المألوفين (من I إلى V).',
  responseScaleNote_en:
    "Select the single level that best describes the child's everyday communication effectiveness as a sender and receiver with familiar and unfamiliar partners (I–V).",
  items: [
    {
      number: 1,
      text_ar: 'مستوى وظيفة التواصل الأنسب للطفل',
      text_en: 'Best-fitting communication function level for the child',
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
    errors.push(`CFCS is a single classification — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_LEVEL.has(rawItems[0])) {
    errors.push(`level must be an integer 1-5 — got ${JSON.stringify(rawItems[0])}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`CFCS: invalid input — ${v.errors.join('; ')}`);
  return { value: rawItems[0], notes: { method: 'ordinal_classification' } };
}

function interpret(derivedValue /*, ctx */) {
  const lvl = BY_LEVEL.get(derivedValue);
  if (!lvl) throw new Error(`CFCS.interpret: derivedValue ${derivedValue} not a level 1-5`);
  return {
    band: `level_${lvl.value}`,
    tier: `L${lvl.value}`,
    label_ar: lvl.ar,
    label_en: lvl.en,
    severity: lvl.severity,
    color: lvl.color,
    action_ar:
      lvl.value <= 2
        ? 'متابعة دورية لتطوير المهارات اللغوية والتواصلية.'
        : lvl.value === 3
          ? 'علاج نطق ولغة مستهدف + تدريب الشركاء المألوفين على استراتيجيات التواصل.'
          : 'تقييم التواصل المعزّز/البديل (AAC) + علاج نطق مكثّف + تدريب البيئة المحيطة.',
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
  measureCode: 'CFCS',
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
