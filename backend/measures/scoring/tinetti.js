'use strict';

/**
 * tinetti.js — W708 scoring module for the Tinetti Performance-Oriented
 * Mobility Assessment (POMA).
 *
 * Tinetti (1986). A clinician-administered measure of balance and gait. The
 * two component scores are summed:
 *   Balance  0–16
 *   Gait     0–12
 * Total range 0–28; higher = better. Fall-risk dichotomy (total):
 *   ≥ 24 low risk · 19–23 moderate risk · < 19 high risk.
 *
 * Public domain; free for clinical use.
 *
 * rawShape: 'item_array' — computeDerived expects [balance, gait] in that fixed
 * order, each an integer within its own range.
 */

const { standardDelta } = require('./contract');

const COMPONENTS = [
  { key: 'balance', name_ar: 'التوازن', name_en: 'Balance', min: 0, max: 16 },
  { key: 'gait', name_ar: 'المشية', name_en: 'Gait', min: 0, max: 12 },
];

const TOTAL_MIN = 0;
const TOTAL_MAX = COMPONENTS.reduce((s, c) => s + c.max, 0); // 28
const CUTOFF = 19; // < 19 → high fall risk

const itemBank = {
  instrumentName_ar: 'تقييم تينيتي للتوازن والمشية',
  instrumentName_en: 'Tinetti POMA (Balance & Gait)',
  instrumentVersion: 'Tinetti (1986)',
  respondent: 'clinician',
  estimatedMinutes: 10,
  responseScaleNote_ar:
    'يُسجَّل مكوّنا التوازن (0–16) والمشية (0–12) ثم يُجمعان (0–28). أعلى = أفضل.',
  responseScaleNote_en:
    'Score the balance (0–16) and gait (0–12) components, then sum (0–28). Higher = better.',
  domains: COMPONENTS.map(c => ({ key: c.key, name_ar: c.name_ar, name_en: c.name_en })),
  items: COMPONENTS.map((c, i) => ({
    number: i + 1,
    text_ar: `درجة ${c.name_ar} (0–${c.max})`,
    text_en: `${c.name_en} sub-score (0–${c.max})`,
    domain: c.key,
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== COMPONENTS.length) {
    errors.push(
      `Tinetti expects ${COMPONENTS.length} sub-scores [balance, gait] — got ${rawItems.length}`
    );
  }
  COMPONENTS.forEach((c, i) => {
    const v = rawItems[i];
    if (!Number.isInteger(v) || v < c.min || v > c.max) {
      errors.push(`${c.key} must be an integer ${c.min}-${c.max} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Tinetti: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  COMPONENTS.forEach((c, i) => {
    subscales[c.key] = rawItems[i];
  });
  const total = rawItems.reduce((s, n) => s + n, 0);
  return {
    value: total,
    subscales,
    notes: { method: 'sum', max: TOTAL_MAX, highFallRisk: total < CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue < TOTAL_MIN || derivedValue > TOTAL_MAX) {
    throw new Error(
      `Tinetti.interpret: total ${derivedValue} out of range ${TOTAL_MIN}-${TOTAL_MAX}`
    );
  }
  if (derivedValue < CUTOFF) {
    return {
      band: 'high_fall_risk',
      tier: 'L3',
      label_ar: 'خطر سقوط مرتفع',
      label_en: 'High fall risk',
      severity: 'critical',
      color: '#c62828',
      action_ar: 'خطة وقاية سقوط فردية، تعديل البيئة، وإشراف لصيق أثناء التنقّل.',
      action_en:
        'Individual fall-prevention plan, environmental modification and close supervision during mobility.',
    };
  }
  if (derivedValue <= 23) {
    return {
      band: 'moderate_fall_risk',
      tier: 'L2',
      label_ar: 'خطر سقوط متوسط',
      label_en: 'Moderate fall risk',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'برنامج تمارين توازن ومشي وتقييم وسائل المساعدة.',
      action_en: 'Balance-and-gait exercise programme and assessment of mobility aids.',
    };
  }
  return {
    band: 'low_fall_risk',
    tier: 'L1',
    label_ar: 'خطر سقوط منخفض',
    label_en: 'Low fall risk',
    severity: derivedValue === TOTAL_MAX ? 'normal' : 'mild',
    color: derivedValue === TOTAL_MAX ? '#2e7d32' : '#9e9d24',
    action_ar: 'الحفاظ على المستوى الوظيفي ضمن البرنامج التأهيلي المعتاد.',
    action_en: 'Maintain functional level within the usual rehabilitation programme.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = t => (t < CUTOFF ? 'high' : t <= 23 ? 'moderate' : 'low');
  return {
    ...base,
    riskBandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'TINETTI',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: COMPONENTS.length,
  scoreRange: { min: TOTAL_MIN, max: TOTAL_MAX },
  cutoff: CUTOFF,
  subscaleDerivedTypes: { balance: 'sum', gait: 'sum' },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
