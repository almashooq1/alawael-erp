'use strict';

/**
 * weefim.js — Wave 252 scoring module for WeeFIM (Pediatric FIM).
 *
 * Functional Independence Measure for Children (Msall et al. 1994).
 * Pediatric counterpart to the adult FIM — same 18 items × 1-7 ordinal
 * scoring, range 18-126. Designed for ages 6 months to 7 years
 * (typically reported in 6-month intervals).
 *
 * Subscales mirror adult FIM:
 *   Motor      (items 1-13):  range 13-91
 *     Self-care (1-6), Sphincter control (7-8),
 *     Transfers (9-11), Locomotion (12-13)
 *   Cognitive  (items 14-18): range 5-35
 *     Communication (14-15), Social cognition (16-18)
 *
 * MCID + age-adjusted norms:
 *   Total ≈ 5 points (Ottenbacher et al. 2000) — smaller than adult
 *   FIM's ~22-point MCID because the pediatric scale captures
 *   developmental progression where each rating-level shift is
 *   clinically meaningful at younger ages.
 *
 * Tier interpretation (pediatric — different cut points than adult FIM):
 *   18-30   : Severe dependency — needs full assistance
 *   31-60   : Moderate dependency — needs hands-on help
 *   61-90   : Mild dependency — supervision/setup
 *   91-110  : Modified independence — devices, no help
 *   111-126 : Age-appropriate independence
 *
 * Standalone test fixtures use round-numbered boundary cases for
 * each tier; raw-item-array validation matches adult FIM contract.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 18;
const ITEM_MIN = 1;
const ITEM_MAX = 7;
const TOTAL_MIN = 18;
const TOTAL_MAX = 126;

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`WeeFIM has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < ITEM_MIN || v > ITEM_MAX) {
      errors.push(
        `item ${i + 1}: must be integer ${ITEM_MIN}-${ITEM_MAX} — got ${JSON.stringify(v)}`
      );
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`WeeFIM: invalid raw items — ${v.errors.join('; ')}`);
  }
  const motor = rawItems.slice(0, 13).reduce((a, b) => a + b, 0);
  const cognitive = rawItems.slice(13, 18).reduce((a, b) => a + b, 0);
  const total = motor + cognitive;
  return {
    value: total,
    subscales: {
      motor,
      motorSelfCare: rawItems.slice(0, 6).reduce((a, b) => a + b, 0),
      motorSphincter: rawItems.slice(6, 8).reduce((a, b) => a + b, 0),
      motorTransfers: rawItems.slice(8, 11).reduce((a, b) => a + b, 0),
      motorLocomotion: rawItems.slice(11, 13).reduce((a, b) => a + b, 0),
      cognitive,
      cognitiveCommunication: rawItems.slice(13, 15).reduce((a, b) => a + b, 0),
      cognitiveSocial: rawItems.slice(15, 18).reduce((a, b) => a + b, 0),
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('WeeFIM.interpret: derivedValue must be a number');
  }
  if (derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `WeeFIM.interpret: derivedValue ${derivedValue} outside range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue >= 111) {
    return {
      band: 'age_appropriate_independence',
      tier: 'L5',
      label_ar: 'استقلالية مناسبة للعمر',
      label_en: 'Age-appropriate independence',
      severity: 'normal',
      color: '#1b5e20',
      action_ar: 'صيانة المهارات + برنامج تطوير قدرات متقدمة',
    };
  }
  if (derivedValue >= 91) {
    return {
      band: 'modified_independence',
      tier: 'L4',
      label_ar: 'استقلالية معدّلة — استخدام أدوات مساعدة',
      label_en: 'Modified independence — uses devices',
      severity: 'mild',
      color: '#558b2f',
      action_ar: 'تدريب على بدائل وظيفية بدون أدوات',
    };
  }
  if (derivedValue >= 61) {
    return {
      band: 'mild_dependency',
      tier: 'L3',
      label_ar: 'اعتماد بسيط — يحتاج إشرافاً أو تجهيزاً',
      label_en: 'Mild dependency — supervision/setup',
      severity: 'moderate',
      color: '#f9a825',
      action_ar: 'تدريب وظيفي مكثف — هدف الانتقال لـ L4',
    };
  }
  if (derivedValue >= 31) {
    return {
      band: 'moderate_dependency',
      tier: 'L2',
      label_ar: 'اعتماد متوسط — يحتاج مساعدة عملية',
      label_en: 'Moderate dependency — hands-on help',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'برنامج تأهيل متعدد التخصصات + تدريب الأسرة',
    };
  }
  return {
    band: 'severe_dependency',
    tier: 'L1',
    label_ar: 'اعتماد كلي',
    label_en: 'Severe dependency',
    severity: 'critical',
    color: '#b71c1c',
    action_ar: 'رعاية كاملة + دعم أسري مكثف + إعادة تقييم خلال 6 أسابيع',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'WEEFIM',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  subscaleDerivedTypes: { motor: 'sum', cognitive: 'sum' },
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
