'use strict';

/**
 * berg.js — Wave 212 scoring module for Berg Balance Scale.
 *
 * Berg Balance Scale (Berg et al. 1989) — 14-item performance-based
 * balance measure. Each item scored 0-4. Total 0-56. Higher = better.
 *
 * Pediatric Berg Balance Scale (Franjoine et al. 2003) keeps the same
 * scoring structure but with item content adapted for ages 5-15. We
 * treat them as the same scoring module — the Measure document
 * differentiates via ageRange.
 *
 * MCID: 4 points (Donoghue & Stokes 2009, adult population). Tracked
 * as 'established' in the Measure document so the W211b MCID-freeze
 * captures it on every administration.
 *
 * Fall-risk tiers (Donoghue 2009 + Shumway-Cook 1997):
 *   0-20  : High fall risk (wheelchair-bound or near-bound)
 *   21-40 : Moderate fall risk (walks with assistive device)
 *   41-56 : Low fall risk (independent ambulation)
 */

const { standardDelta } = require('./contract');

const MAX_SCORE = 56;
const ITEM_COUNT = 14;
const ITEM_MAX = 4;

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`Berg has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (v == null) return;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > ITEM_MAX) {
      errors.push(`item ${i + 1}: must be integer 0-${ITEM_MAX} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`Berg: invalid raw items — ${v.errors.join('; ')}`);
  }
  // Missing items count as 0 (per manual — best/conservative).
  const total = rawItems.reduce((acc, item) => acc + (item == null ? 0 : item), 0);
  return {
    value: total,
    notes: {
      itemsCompleted: rawItems.filter(x => x != null).length,
      itemsMissing: rawItems.filter(x => x == null).length,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('Berg.interpret: derivedValue must be a number');
  }
  if (derivedValue >= 41) {
    return {
      band: 'low_fall_risk',
      tier: 'low',
      label_ar: 'خطر سقوط منخفض — حركة مستقلة',
      label_en: 'Low fall risk — independent ambulation',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'الحفاظ على المكاسب — تمارين تحدّي تدريجية',
    };
  }
  if (derivedValue >= 21) {
    return {
      band: 'moderate_fall_risk',
      tier: 'moderate',
      label_ar: 'خطر سقوط متوسط — يحتاج أداة مساعدة',
      label_en: 'Moderate fall risk — assistive device recommended',
      severity: 'moderate',
      color: '#f9a825',
      action_ar: 'تدريب توازن مكثف + تقييم أدوات المساعدة',
    };
  }
  return {
    band: 'high_fall_risk',
    tier: 'high',
    label_ar: 'خطر سقوط عالٍ — يحتاج إشرافاً مستمراً',
    label_en: 'High fall risk — supervision required',
    severity: 'severe',
    color: '#c62828',
    action_ar: 'إشراف مستمر — برنامج Otago للوقاية من السقوط',
  };
}

function delta(prev, curr, measure) {
  return standardDelta(prev, curr, measure, 'higher_better');
}

module.exports = {
  measureCode: 'BERG',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  scoreRange: { min: 0, max: MAX_SCORE },
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
