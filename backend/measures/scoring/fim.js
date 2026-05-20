'use strict';

/**
 * fim.js — Wave 212 scoring module for Functional Independence Measure.
 *
 * FIM (Granger et al. 1986) — 18-item ordinal ADL measure used in
 * adult rehabilitation. Each item: 1 (total assistance) to 7 (complete
 * independence). Total 18-126. Higher = better.
 *
 * Subscales:
 *   Motor (items 1-13):   range 13-91
 *     Self-care (1-6), Sphincter control (7-8), Transfers (9-11), Locomotion (12-13)
 *   Cognitive (items 14-18): range 5-35
 *     Communication (14-15), Social cognition (16-18)
 *
 * MCID: ~22 points total (Beninato et al. 2006 stroke cohort, replicated).
 * Adult tiers (Hamilton 1991 / Linacre Rasch conversion):
 *   18-35   : Total dependence — needs total assistance
 *   36-65   : Maximal/moderate assistance — needs hands-on help
 *   66-95   : Minimal assistance / supervision — modified independence
 *   96-115  : Modified independence — uses devices, no help
 *   116-126 : Complete independence — no devices, no help
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
    errors.push(`FIM has ${ITEM_COUNT} items — got ${rawItems.length}`);
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
    throw new Error(`FIM: invalid raw items — ${v.errors.join('; ')}`);
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
    throw new Error('FIM.interpret: derivedValue must be a number');
  }
  if (derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `FIM.interpret: derivedValue ${derivedValue} outside range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue >= 116) {
    return {
      band: 'complete_independence',
      tier: 'L5',
      label_ar: 'استقلالية تامة',
      label_en: 'Complete independence',
      severity: 'normal',
      color: '#1b5e20',
      action_ar: 'صيانة المهارات — لا تدخّل مكثف',
    };
  }
  if (derivedValue >= 96) {
    return {
      band: 'modified_independence',
      tier: 'L4',
      label_ar: 'استقلالية معدّلة — استخدام أدوات مساعدة',
      label_en: 'Modified independence — uses devices',
      severity: 'mild',
      color: '#558b2f',
      action_ar: 'تحسين الكفاءة + تدريب على بدائل بدون أدوات',
    };
  }
  if (derivedValue >= 66) {
    return {
      band: 'minimal_assistance',
      tier: 'L3',
      label_ar: 'مساعدة قليلة / إشراف',
      label_en: 'Minimal assistance / supervision',
      severity: 'moderate',
      color: '#f9a825',
      action_ar: 'برنامج تأهيل وظيفي مكثف — هدف الانتقال لـ L4',
    };
  }
  if (derivedValue >= 36) {
    return {
      band: 'moderate_to_maximal_assistance',
      tier: 'L2',
      label_ar: 'مساعدة متوسطة إلى عالية',
      label_en: 'Moderate to maximal assistance',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تأهيل سريري متعدد التخصصات — تقييم بيئة منزلية',
    };
  }
  return {
    band: 'total_dependence',
    tier: 'L1',
    label_ar: 'اعتماد كلي',
    label_en: 'Total dependence',
    severity: 'critical',
    color: '#b71c1c',
    action_ar: 'رعاية كاملة + دعم أسري + إعادة تقييم خلال 6 أسابيع',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'FIM',
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
