'use strict';

/**
 * gas.js — Goal Attainment Scaling (GAS)
 * Per-goal scores from -2 (much less than expected) to +2 (much more than expected).
 * The derived score is the mean T-score (50 + 10 * z) across goals, or the raw mean.
 * Higher = better goal attainment → higher_is_better.
 */

const { standardDelta } = require('./contract');

const VALID_SCORES = new Set([-2, -1, 0, 1, 2]);
const SCORE_MIN = -2;
const SCORE_MAX = 2;

const RESPONSE_OPTIONS = [
  { value: -2, label_ar: 'أقل بكثير من المتوقع', label_en: 'Much less than expected' },
  { value: -1, label_ar: 'أقل من المتوقع', label_en: 'Less than expected' },
  { value: 0, label_ar: 'كالمتوقع', label_en: 'As expected' },
  { value: 1, label_ar: 'أكثر من المتوقع', label_en: 'More than expected' },
  { value: 2, label_ar: 'أكثر بكثير من المتوقع', label_en: 'Much more than expected' },
];

const itemBank = {
  instrumentName_ar: 'مقياس تحقيق الأهداف',
  instrumentName_en: 'Goal Attainment Scaling',
  instrumentVersion: 'GAS classic',
  ageRange: { minMonths: 12, maxMonths: 216 },
  respondent: 'clinician',
  estimatedMinutes: 10,
  responseScaleNote_ar: 'قيم كل هدف من -2 (أقل بكثير) إلى +2 (أكثر بكثير).',
  responseScaleNote_en: 'Rate each goal from -2 (much less) to +2 (much more than expected).',
  items: [
    {
      number: 1,
      text_ar: 'تحقيق الأهداف المحددة',
      text_en: 'Goal attainment ratings',
      responseOptions: RESPONSE_OPTIONS,
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (rawItems == null || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
    errors.push('rawItems must be a goals object keyed by goalId');
    return { ok: false, errors };
  }
  for (const [key, val] of Object.entries(rawItems)) {
    if (!VALID_SCORES.has(Number(val))) {
      errors.push(`goal '${key}' score must be one of {-2,-1,0,1,2} — got ${val}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`GAS: invalid input — ${v.errors.join('; ')}`);

  const values = Object.values(rawItems).map(Number);
  if (values.length === 0) {
    return { value: 0, notes: { method: 'mean_goal_attainment', goals: 0, tScore: 50 } };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  // Classic GAS T-score: 50 + 10*z; here z = mean / SD if known; use simplified mapping.
  const tScore = Math.round((50 + mean * 10) * 10) / 10;

  return {
    value: Math.round(mean * 100) / 100,
    notes: { method: 'mean_goal_attainment', goals: values.length, tScore },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(`GAS.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`);
  }
  if (derivedValue >= 1) {
    return {
      band: 'above_expected',
      tier: 'L3',
      label_ar: 'تحقيق فوق المتوقع',
      label_en: 'Above expected outcome',
      severity: 'mild',
      color: '#2e7d32',
      action_ar: 'استمر في التدخلات وحدد أهدافاً جديدة طموحة.',
      action_en: 'Continue interventions and set new ambitious goals.',
    };
  }
  if (derivedValue >= -0.5) {
    return {
      band: 'as_expected',
      tier: 'L2',
      label_ar: 'تحقيق كالمتوقع',
      label_en: 'As expected outcome',
      severity: 'normal',
      color: '#558b2f',
      action_ar: 'استمر في الخطة الحالية مع مراجعة الأهداف.',
      action_en: 'Continue current plan and review goals.',
    };
  }
  return {
    band: 'below_expected',
    tier: 'L1',
    label_ar: 'تحقيق أقل من المتوقع',
    label_en: 'Below expected outcome',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'راجع الخطة العلاجية والأهداف وتكثف التدخلات.',
    action_en: 'Review care plan, goals and intensify interventions.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'GAS',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'higher_better',
  rawShape: 'domain_scores',
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
