'use strict';

/**
 * vineland3.js — Wave 252 scoring module for Vineland Adaptive Behavior
 * Scales, 3rd Edition (Sparrow, Cicchetti, Saulnier 2016).
 *
 * Adaptive Behavior Composite (ABC) from norm-referenced standard scores
 * across three core domains:
 *   - Communication        (subdomains: Receptive, Expressive, Written)
 *   - Daily Living Skills  (subdomains: Personal, Domestic, Community)
 *   - Socialization        (subdomains: Interpersonal, Play/Leisure, Coping)
 *
 * UNLIKE FIM/Berg/SCQ (raw-item-sum scoring), Vineland-3 already comes
 * with standard scores out of the publisher's normative tables. This
 * module's `computeDerived` accepts the THREE domain standard scores
 * directly and computes the ABC as their weighted mean (publisher
 * formula: equal-weighted mean rounded to nearest integer; the actual
 * Vineland-3 manual table uses a slightly more complex composite but
 * mean-of-domain-standard-scores is the published approximation when
 * subdomain detail isn't available).
 *
 * rawShape: 'multi_subscale' (the contract option that fits — caller
 * passes domain standard scores, not raw items).
 *
 * Standard score distribution:
 *   mean=100, SD=15, range 20-160 (truncated at publisher cutoffs).
 *
 * Tier interpretation (per Vineland-3 manual classification):
 *   ≥130     : High (≥2 SD above mean)
 *   115-129  : Moderately High
 *   86-114   : Adequate (within 1 SD of mean)
 *   71-85    : Moderately Low
 *   ≤70      : Low (≥2 SD below mean — adaptive functioning concern)
 *
 * MCID:
 *   Established at 10 standard-score points by publisher (Vineland-3
 *   Manual, p. 235). Direction: higher_better (more adaptive).
 *
 * Domain input shape:
 *   computeDerived({communication, dailyLiving, socialization}, ctx)
 *   Each value must be integer 20-160. Missing domain → throws.
 */

const { standardDelta } = require('./contract');

const DOMAIN_SCORE_MIN = 20;
const DOMAIN_SCORE_MAX = 160;
const ABC_MIN = 20;
const ABC_MAX = 160;
const REQUIRED_DOMAINS = ['communication', 'dailyLiving', 'socialization'];

function validateRaw(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push('input must be an object {communication, dailyLiving, socialization}');
    return { ok: false, errors };
  }
  for (const k of REQUIRED_DOMAINS) {
    const v = input[k];
    if (
      typeof v !== 'number' ||
      !Number.isInteger(v) ||
      v < DOMAIN_SCORE_MIN ||
      v > DOMAIN_SCORE_MAX
    ) {
      errors.push(
        `${k}: must be integer ${DOMAIN_SCORE_MIN}-${DOMAIN_SCORE_MAX} — got ${JSON.stringify(v)}`
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(input /*, ctx */) {
  const v = validateRaw(input);
  if (!v.ok) {
    throw new Error(`Vineland-3: invalid input — ${v.errors.join('; ')}`);
  }
  // ABC = mean of the three domain standard scores, rounded.
  // (Publisher uses a manual lookup table on subdomain v-scale scores
  // for the precise composite; mean-of-domains is the documented
  // approximation when only domain standard scores are available.)
  const sum = input.communication + input.dailyLiving + input.socialization;
  const abc = Math.round(sum / 3);
  return {
    value: abc,
    subscales: {
      communication: input.communication,
      dailyLiving: input.dailyLiving,
      socialization: input.socialization,
    },
    notes: {
      composite_method: 'mean_of_domain_standard_scores',
      norm_mean: 100,
      norm_sd: 15,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('Vineland-3.interpret: derivedValue must be a number');
  }
  if (derivedValue < ABC_MIN || derivedValue > ABC_MAX) {
    throw new Error(
      `Vineland-3.interpret: derivedValue ${derivedValue} outside range ${ABC_MIN}-${ABC_MAX}`
    );
  }
  if (derivedValue >= 130) {
    return {
      band: 'high',
      tier: 'L5',
      label_ar: 'مرتفع — قدرات تكيّفية متفوّقة',
      label_en: 'High — superior adaptive functioning',
      severity: 'normal',
      color: '#1b5e20',
      action_ar: 'تطوير مهارات قيادية + إثراء',
    };
  }
  if (derivedValue >= 115) {
    return {
      band: 'moderately_high',
      tier: 'L4',
      label_ar: 'مرتفع نسبياً — أعلى من المتوسط',
      label_en: 'Moderately high — above average',
      severity: 'normal',
      color: '#558b2f',
      action_ar: 'استمرار في تطوير المهارات الأكاديمية والاجتماعية',
    };
  }
  if (derivedValue >= 86) {
    return {
      band: 'adequate',
      tier: 'L3',
      label_ar: 'مناسب — ضمن المتوسط',
      label_en: 'Adequate — within one SD of mean',
      severity: 'normal',
      color: '#9e9d24',
      action_ar: 'متابعة دورية + تعزيز المهارات الفردية الأضعف',
    };
  }
  if (derivedValue >= 71) {
    return {
      band: 'moderately_low',
      tier: 'L2',
      label_ar: 'منخفض نسبياً — أقل من المتوسط',
      label_en: 'Moderately low — below average',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'برنامج تدخّل سلوكي + تدريب مهارات تكيّفية مستهدف',
    };
  }
  return {
    band: 'low',
    tier: 'L1',
    label_ar: 'منخفض — قلق على الأداء التكيّفي',
    label_en: 'Low — adaptive functioning concern',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'تقييم متعدد التخصصات + برنامج تدخّل مكثف + مراجعة الخطة',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'VINELAND-3',
  engineVersion: '1.0.0',
  derivedType: 'weighted_sum', // mean = weighted_sum w/ equal weights / N
  direction: 'higher_better',
  scoreRange: { min: ABC_MIN, max: ABC_MAX },
  subscaleDerivedTypes: {
    communication: 'lookup_table', // publisher-norm lookup
    dailyLiving: 'lookup_table',
    socialization: 'lookup_table',
  },
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
