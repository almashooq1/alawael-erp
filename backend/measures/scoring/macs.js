'use strict';

/**
 * macs.js — W566 scoring module for the Manual Ability Classification
 * System (MACS; Eliasson et al. 2006). A 5-level ORDINAL classification of
 * how children with cerebral palsy handle objects in daily activities
 * (both hands together). For ages 4–18; the Mini-MACS extends to 1–4.
 *
 * Like GMFCS, MACS is a CLASSIFICATION, not a summative scale — modelled
 * as a 1-item ordinal pick whose response value IS the level (1–5).
 *
 * Levels:
 *   I    Handles objects easily and successfully
 *   II   Handles most objects but with reduced quality and/or speed
 *   III  Handles objects with difficulty; needs help to prepare/modify activities
 *   IV   Handles a limited selection of easily managed objects in adapted situations
 *   V    Does not handle objects; severely limited ability even for simple actions
 *
 * direction: lower_better (Level I = best manual ability).
 * purpose='descriptor', MCID not applicable.
 *
 * rawShape: 'item_array' — computeDerived expects [level] (one integer 1–5).
 */

const { standardDelta } = require('./contract');

const LEVELS = [
  {
    value: 1,
    ar: 'المستوى I — يتعامل مع الأشياء بسهولة ونجاح',
    en: 'Level I — Handles objects easily and successfully',
    severity: 'normal',
    color: '#1b5e20',
  },
  {
    value: 2,
    ar: 'المستوى II — يتعامل مع معظم الأشياء لكن بجودة و/أو سرعة أقل',
    en: 'Level II — Handles most objects with reduced quality and/or speed',
    severity: 'mild',
    color: '#558b2f',
  },
  {
    value: 3,
    ar: 'المستوى III — يتعامل مع الأشياء بصعوبة؛ يحتاج مساعدة للتحضير و/أو تعديل الأنشطة',
    en: 'Level III — Handles objects with difficulty; needs help to prepare/modify activities',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    ar: 'المستوى IV — يتعامل مع تشكيلة محدودة من الأشياء سهلة المناولة في مواقف مكيّفة',
    en: 'Level IV — Handles a limited selection of easily managed objects in adapted situations',
    severity: 'severe',
    color: '#c62828',
  },
  {
    value: 5,
    ar: 'المستوى V — لا يتعامل مع الأشياء وقدرته محدودة جدًا حتى في الأفعال البسيطة',
    en: 'Level V — Does not handle objects; severely limited ability even for simple actions',
    severity: 'critical',
    color: '#b71c1c',
  },
];

const BY_LEVEL = new Map(LEVELS.map(l => [l.value, l]));

const itemBank = {
  instrumentName_ar: 'نظام تصنيف القدرة اليدوية',
  instrumentName_en: 'Manual Ability Classification System',
  instrumentVersion: 'MACS-2006',
  ageRange: { minMonths: 48, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'اختر المستوى الواحد الذي يصف كيفية تعامل الطفل الاعتيادي مع الأشياء في الأنشطة اليومية (باليدين معًا)، من I إلى V.',
  responseScaleNote_en:
    'Select the single level that best describes how the child usually handles objects in daily activities (both hands together), I–V.',
  items: [
    {
      number: 1,
      text_ar: 'مستوى القدرة اليدوية الأنسب للطفل',
      text_en: 'Best-fitting manual ability level for the child',
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
    errors.push(`MACS is a single classification — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_LEVEL.has(rawItems[0])) {
    errors.push(`level must be an integer 1-5 — got ${JSON.stringify(rawItems[0])}`);
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`MACS: invalid input — ${v.errors.join('; ')}`);
  return { value: rawItems[0], notes: { method: 'ordinal_classification' } };
}

function interpret(derivedValue /*, ctx */) {
  const lvl = BY_LEVEL.get(derivedValue);
  if (!lvl) throw new Error(`MACS.interpret: derivedValue ${derivedValue} not a level 1-5`);
  return {
    band: `level_${lvl.value}`,
    tier: `L${lvl.value}`,
    label_ar: lvl.ar,
    label_en: lvl.en,
    severity: lvl.severity,
    color: lvl.color,
    action_ar:
      lvl.value <= 2
        ? 'متابعة دورية + أنشطة تطوير المهارات الدقيقة الثنائية اليد.'
        : lvl.value === 3
          ? 'علاج وظيفي مستهدف + تعديل الأنشطة والأدوات.'
          : 'علاج وظيفي مكثّف + أدوات تكيّفية + تدريب مقدّم الرعاية على المناولة المدعومة.',
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
  measureCode: 'MACS',
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
