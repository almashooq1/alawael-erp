'use strict';

/**
 * mas.js — W706 scoring module for the Modified Ashworth Scale (Bohannon &
 * Smith 1987). The clinical standard for grading muscle spasticity
 * (resistance to passive movement) — central to managing cerebral palsy,
 * acquired brain injury, spinal cord injury and other upper-motor-neuron
 * conditions common in a rehabilitation population.
 *
 * The MAS has 6 ORDINAL grades with a non-numeric "1+" level:
 *   0    No increase in muscle tone
 *   1    Slight increase: catch & release, or minimal resistance at end of ROM
 *   1+   Slight increase: catch, then minimal resistance through < half of ROM
 *   2    More marked increase through most of ROM, but limb easily moved
 *   3    Considerable increase, passive movement difficult
 *   4    Limb rigid in flexion or extension
 *
 * Because "1+" breaks a plain 0–4 integer axis, we model the response as an
 * ordinal INDEX 0–5 (lookup_table) that maps to the grade label; the derived
 * value is that ordinal index. direction = lower_better (0 = normal tone).
 *
 * Scored per muscle group; pass the muscle group via ctx.muscleGroup if you
 * want it echoed in notes (the scoring math itself is muscle-agnostic).
 *
 * The Modified Ashworth Scale is in the public domain and free for clinical
 * use.
 *
 * rawShape: 'item_array' — computeDerived expects [ordinalIndex] (one
 * integer 0–5).
 */

const { standardDelta } = require('./contract');

const GRADES = [
  {
    value: 0,
    grade: '0',
    ar: 'لا زيادة في توتر العضلة',
    en: 'No increase in muscle tone',
    severity: 'normal',
    color: '#2e7d32',
  },
  {
    value: 1,
    grade: '1',
    ar: 'زيادة طفيفة: مقاومة بسيطة في نهاية المدى الحركي',
    en: 'Slight increase: catch & release or minimal resistance at end of ROM',
    severity: 'mild',
    color: '#9e9d24',
  },
  {
    value: 2,
    grade: '1+',
    ar: 'زيادة طفيفة: مقاومة بسيطة خلال أقل من نصف المدى الحركي',
    en: 'Slight increase: catch then minimal resistance through < half of ROM',
    severity: 'mild',
    color: '#c0ca33',
  },
  {
    value: 3,
    grade: '2',
    ar: 'زيادة ملحوظة خلال معظم المدى الحركي، مع سهولة تحريك الطرف',
    en: 'More marked increase through most of ROM, but limb easily moved',
    severity: 'moderate',
    color: '#ef6c00',
  },
  {
    value: 4,
    grade: '3',
    ar: 'زيادة كبيرة، الحركة المنفعلة صعبة',
    en: 'Considerable increase, passive movement difficult',
    severity: 'severe',
    color: '#c62828',
  },
  {
    value: 5,
    grade: '4',
    ar: 'الطرف متيبّس في الانثناء أو البسط',
    en: 'Limb rigid in flexion or extension',
    severity: 'critical',
    color: '#b71c1c',
  },
];

const BY_VALUE = new Map(GRADES.map(g => [g.value, g]));
const MAX_INDEX = 5;

const itemBank = {
  instrumentName_ar: 'مقياس آشورث المعدّل لتقييم التشنّج العضلي',
  instrumentName_en: 'Modified Ashworth Scale for muscle spasticity',
  instrumentVersion: 'Bohannon & Smith (1987)',
  respondent: 'clinician',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يحرّك المختصّ الطرف بشكل منفعل ويختار الدرجة الواحدة (0 إلى 4، وتشمل 1+) التي تصف المقاومة لكل مجموعة عضلية.',
  responseScaleNote_en:
    'The clinician moves the limb passively and selects the single grade (0–4, including 1+) describing the resistance for each muscle group.',
  items: [
    {
      number: 1,
      text_ar: 'درجة التشنّج للمجموعة العضلية المقيَّمة',
      text_en: 'Spasticity grade for the muscle group being assessed',
      responseOptions: GRADES.map(g => ({
        value: g.value,
        label_ar: `${g.grade} — ${g.ar}`,
        label_en: `${g.grade} — ${g.en}`,
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
    errors.push(`MAS is a single grade — expected 1 value, got ${rawItems.length}`);
  }
  if (!BY_VALUE.has(rawItems[0])) {
    errors.push(
      `grade index must be an integer 0-${MAX_INDEX} — got ${JSON.stringify(rawItems[0])}`
    );
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems, ctx) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`MAS: invalid input — ${v.errors.join('; ')}`);
  const g = BY_VALUE.get(rawItems[0]);
  return {
    value: g.value,
    notes: {
      method: 'ordinal_lookup',
      grade: g.grade,
      muscleGroup: ctx && ctx.muscleGroup ? ctx.muscleGroup : undefined,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  const g = BY_VALUE.get(derivedValue);
  if (!g)
    throw new Error(`MAS.interpret: derivedValue ${derivedValue} not a grade index 0-${MAX_INDEX}`);
  const action =
    g.value === 0
      ? {
          ar: 'توتر عضلي طبيعي — لا حاجة لتدخّل خاصّ بالتشنّج.',
          en: 'Normal tone — no spasticity-specific intervention required.',
        }
      : g.value <= 2
        ? {
            ar: 'تشنّج خفيف — تمارين إطالة ومدى حركي ومتابعة دورية.',
            en: 'Mild spasticity — stretching, ROM exercises and periodic review.',
          }
        : g.value === 3
          ? {
              ar: 'تشنّج متوسط — برنامج علاج طبيعي مكثّف وتقييم لخيارات إدارة النغمة.',
              en: 'Moderate spasticity — intensive physiotherapy and review of tone-management options.',
            }
          : {
              ar: 'تشنّج شديد — إحالة لتقييم طبي عاجل لإدارة النغمة (دوائية/إجرائية).',
              en: 'Severe spasticity — refer for urgent medical review of tone management (pharmacological/procedural).',
            };
  return {
    band: `grade_${g.grade}`,
    tier: `L${g.value}`,
    label_ar: `الدرجة ${g.grade} — ${g.ar}`,
    label_en: `Grade ${g.grade} — ${g.en}`,
    severity: g.severity,
    color: g.color,
    action_ar: action.ar,
    action_en: action.en,
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const gradeOf = s => {
    const g = BY_VALUE.get(s);
    return g ? g.grade : String(s);
  };
  return {
    ...base,
    gradeChange:
      prev != null && curr != null && prev !== curr ? `${gradeOf(prev)}_to_${gradeOf(curr)}` : null,
  };
}

module.exports = {
  measureCode: 'MAS',
  engineVersion: '1.0.0',
  derivedType: 'lookup_table',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: 0, max: MAX_INDEX },
  cutoff: 3, // ≥ grade 2 → moderate spasticity warranting escalation
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
