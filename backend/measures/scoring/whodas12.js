'use strict';

/**
 * whodas12.js — W712 scoring module for WHODAS 2.0 (12-item, self-administered).
 *
 * The WHO Disability Assessment Schedule 2.0 is the ICF-based gold-standard
 * generic measure of functioning & disability across 6 domains: cognition,
 * mobility, self-care, getting along, life activities, and participation.
 *
 * 12 items, each scored 0–4:
 *   0 = none · 1 = mild · 2 = moderate · 3 = severe · 4 = extreme/cannot do.
 * Simple sum 0–48. Higher = MORE disability → lower_better.
 * A percent metric (sum / 48 × 100) is also surfaced in notes for reporting.
 *
 * Licensing: © WHO — granted free for non-commercial clinical/research use
 * with attribution (mirrors WHO-5). rawShape: 'item_array' (12 values).
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 12;
const ITEM_MIN = 0;
const ITEM_MAX = 4;
const SCORE_MIN = 0;
const SCORE_MAX = ITEM_COUNT * ITEM_MAX; // 48
const CUTOFF = 13; // ≥ 13 (moderate+) → actionable functional limitation

const itemBank = {
  instrumentName_ar: 'جدول تقييم الإعاقة (WHODAS 2.0 — 12 بندًا)',
  instrumentName_en: 'WHO Disability Assessment Schedule 2.0 (12-item)',
  instrumentVersion: 'WHODAS 2.0 — 12-item self-administered',
  respondent: 'self_or_proxy',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'لكل بند: 0 لا صعوبة · 1 خفيفة · 2 متوسطة · 3 شديدة · 4 قصوى/غير قادر. أعلى = إعاقة أكبر.',
  responseScaleNote_en:
    'Each item: 0 none · 1 mild · 2 moderate · 3 severe · 4 extreme/cannot do. Higher = more disability.',
  items: [
    {
      number: 1,
      domain: 'cognition',
      text_ar: 'التركيز على عمل ما لمدة عشر دقائق',
      text_en: 'Concentrating on doing something for ten minutes',
    },
    {
      number: 2,
      domain: 'mobility',
      text_ar: 'المشي لمسافة طويلة مثل كيلومتر واحد',
      text_en: 'Walking a long distance such as a kilometre',
    },
    {
      number: 3,
      domain: 'self_care',
      text_ar: 'الاغتسال (الاستحمام) بالكامل',
      text_en: 'Washing your whole body',
    },
    { number: 4, domain: 'self_care', text_ar: 'ارتداء الملابس', text_en: 'Getting dressed' },
    {
      number: 5,
      domain: 'getting_along',
      text_ar: 'التعامل مع أشخاص لا تعرفهم',
      text_en: 'Dealing with people you do not know',
    },
    {
      number: 6,
      domain: 'getting_along',
      text_ar: 'الحفاظ على صداقة',
      text_en: 'Maintaining a friendship',
    },
    {
      number: 7,
      domain: 'life_activities',
      text_ar: 'القيام بمسؤولياتك المنزلية اليومية',
      text_en: 'Taking care of your household responsibilities',
    },
    {
      number: 8,
      domain: 'life_activities',
      text_ar: 'إنجاز المهام المهمة في عملك/دراستك',
      text_en: 'Getting your work/school tasks done',
    },
    {
      number: 9,
      domain: 'participation',
      text_ar: 'المشاركة في الأنشطة المجتمعية',
      text_en: 'Joining in community activities',
    },
    {
      number: 10,
      domain: 'participation',
      text_ar: 'التأثر العاطفي بمشكلاتك الصحية',
      text_en: 'Being emotionally affected by your health problems',
    },
    {
      number: 11,
      domain: 'cognition',
      text_ar: 'تذكّر القيام بالأمور المهمة',
      text_en: 'Remembering to do important things',
    },
    {
      number: 12,
      domain: 'mobility',
      text_ar: 'الحركة والتنقل داخل المنزل',
      text_en: 'Moving around inside your home',
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`WHODAS-12 expects exactly ${ITEM_COUNT} values — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < ITEM_MIN || v > ITEM_MAX) {
      errors.push(
        `item ${i + 1} must be an integer ${ITEM_MIN}-${ITEM_MAX} — got ${JSON.stringify(v)}`
      );
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`WHODAS-12: invalid input — ${v.errors.join('; ')}`);
  const value = rawItems.reduce((a, b) => a + b, 0);
  const percent = Math.round((value / SCORE_MAX) * 1000) / 10;
  return {
    value,
    notes: { method: 'simple_sum', unit: 'points', percent, actionableLimitation: value >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(
      `WHODAS-12.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue <= 4) {
    return {
      band: 'no_disability',
      tier: 'L0',
      label_ar: 'لا إعاقة وظيفية تُذكر',
      label_en: 'No appreciable disability',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'حافظ على الأنشطة الحالية؛ إعادة تقييم دوريّة.',
      action_en: 'Maintain current activities; periodic reassessment.',
    };
  }
  if (derivedValue <= 12) {
    return {
      band: 'mild_disability',
      tier: 'L1',
      label_ar: 'إعاقة وظيفية خفيفة',
      label_en: 'Mild disability',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'تدخّلات داعمة موجّهة للمجالات المتأثرة ومراقبة الاتجاه.',
      action_en: 'Targeted supportive interventions for affected domains and trend monitoring.',
    };
  }
  if (derivedValue <= 24) {
    return {
      band: 'moderate_disability',
      tier: 'L2',
      label_ar: 'إعاقة وظيفية متوسطة',
      label_en: 'Moderate disability',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'مراجعة خطة العناية وتكثيف التأهيل حسب المجالات الأكثر تأثرًا.',
      action_en: 'Review the care plan and intensify rehabilitation for the most affected domains.',
    };
  }
  if (derivedValue <= 36) {
    return {
      band: 'severe_disability',
      tier: 'L3',
      label_ar: 'إعاقة وظيفية شديدة',
      label_en: 'Severe disability',
      severity: 'critical',
      color: '#c62828',
      action_ar: 'تدخّل متعدد التخصصات عاجل ودعم بيئي ومساعد، وتوثيق الاحتياجات.',
      action_en:
        'Urgent multidisciplinary intervention, environmental/assistive support and needs documentation.',
    };
  }
  return {
    band: 'extreme_disability',
    tier: 'L4',
    label_ar: 'إعاقة وظيفية قصوى',
    label_en: 'Extreme / complete disability',
    severity: 'critical',
    color: '#b71c1c',
    action_ar: 'اعتماد كامل على الدعم؛ خطة رعاية مكثّفة ومراجعة فريق متخصص فورية.',
    action_en:
      'Full dependence on support; intensive care plan and immediate specialist team review.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const band = v => (v <= 4 ? 0 : v <= 12 ? 1 : v <= 24 ? 2 : v <= 36 ? 3 : 4);
  return {
    ...base,
    bandShift: prev != null && curr != null ? band(curr) - band(prev) : null,
  };
}

module.exports = {
  measureCode: 'WHODAS-12',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
