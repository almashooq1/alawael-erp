'use strict';

/**
 * copm.js — Canadian Occupational Performance Measure.
 * Client-centred: performance and satisfaction each rated 1-10 per problem.
 * Derived score = mean performance + mean satisfaction (range 2-20).
 * Higher = better occupational performance → higher_is_better.
 */

const { standardDelta } = require('./contract');

const SCORE_MIN = 2;
const SCORE_MAX = 20;

const itemBank = {
  instrumentName_ar: 'المقياس الكندي للأداء الوظيفي',
  instrumentName_en: 'Canadian Occupational Performance Measure',
  instrumentVersion: 'COPM 5th Ed',
  ageRange: { minMonths: 72, maxMonths: 216 },
  respondent: 'self',
  estimatedMinutes: 30,
  responseScaleNote_ar: 'كل مشكلة تُقيم أداءً ورضاً من 1 إلى 10.',
  responseScaleNote_en: 'Each problem is rated for performance and satisfaction from 1 to 10.',
  domains: [
    { key: 'self_care', name_ar: 'العناية الذاتية', name_en: 'Self-care' },
    { key: 'productivity', name_ar: 'الإنتاجية', name_en: 'Productivity' },
    { key: 'leisure', name_ar: 'أوقات الفراغ', name_en: 'Leisure' },
  ],
  items: [
    {
      number: 1,
      text_ar: 'متوسط الأداء والرضا للمشكلات المحددة',
      text_en: 'Average performance and satisfaction across identified problems',
      responseOptions: [
        { value: 1, label_ar: '1 — ضعيف جداً', label_en: '1 — Very poor' },
        { value: 5, label_ar: '5 — متوسط', label_en: '5 — Average' },
        { value: 10, label_ar: '10 — ممتاز', label_en: '10 — Excellent' },
      ],
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (rawItems == null || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
    errors.push('rawItems must be an object with problems array');
    return { ok: false, errors };
  }
  if (!Array.isArray(rawItems.problems)) {
    errors.push('rawItems.problems must be an array of {performance, satisfaction}');
    return { ok: false, errors };
  }
  rawItems.problems.forEach((p, i) => {
    if (!Number.isFinite(p.performance) || p.performance < 1 || p.performance > 10) {
      errors.push(`problem ${i + 1}: performance must be 1-10`);
    }
    if (!Number.isFinite(p.satisfaction) || p.satisfaction < 1 || p.satisfaction > 10) {
      errors.push(`problem ${i + 1}: satisfaction must be 1-10`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`COPM: invalid input — ${v.errors.join('; ')}`);

  const problems = rawItems.problems;
  if (problems.length === 0) {
    return { value: 0, notes: { method: 'mean_performance_plus_satisfaction', problems: 0 } };
  }

  const perfSum = problems.reduce((s, p) => s + p.performance, 0);
  const satSum = problems.reduce((s, p) => s + p.satisfaction, 0);
  const perfMean = perfSum / problems.length;
  const satMean = satSum / problems.length;
  const value = Math.round((perfMean + satMean) * 10) / 10;

  return {
    value,
    notes: {
      method: 'mean_performance_plus_satisfaction',
      problems: problems.length,
      performanceMean: Math.round(perfMean * 10) / 10,
      satisfactionMean: Math.round(satMean * 10) / 10,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number' || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(`COPM.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`);
  }
  if (derivedValue >= 14) {
    return {
      band: 'good',
      tier: 'L3',
      label_ar: 'أداء ورضا وظيفي جيد',
      label_en: 'Good occupational performance and satisfaction',
      severity: 'mild',
      color: '#2e7d32',
      action_ar: 'حافظ على المهارات وتابع الأهداف الطويلة المدى.',
      action_en: 'Maintain skills and continue long-term goals.',
    };
  }
  if (derivedValue >= 8) {
    return {
      band: 'moderate',
      tier: 'L2',
      label_ar: 'أداء ورضا وظيفي متوسط',
      label_en: 'Moderate occupational performance and satisfaction',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'ركز على المشكلات ذات الأولوية العالية وقوّم التدخلات.',
      action_en: 'Focus on high-priority problems and adjust interventions.',
    };
  }
  return {
    band: 'poor',
    tier: 'L1',
    label_ar: 'أداء ورضا وظيفي ضعيف',
    label_en: 'Poor occupational performance and satisfaction',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'تدخل علاج وظيفي مكثف مع إعادة تحديد الأولويات العملية.',
    action_en: 'Intensive occupational therapy intervention with practical priority reset.',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'COPM',
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
