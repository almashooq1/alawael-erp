'use strict';

/**
 * wechsler.js — W713 score-entry-only module for the Wechsler intelligence
 * scales family (WPPSI-IV / WISC-V / WAIS-IV).
 *
 * ⚠️ COPYRIGHT / LICENSING NOTE
 * The Wechsler scales are PROPRIETARY, copyright-protected instruments
 * (Pearson / NCS). This module ships NO subtest items and NO raw→scaled
 * conversion tables — both are protected intellectual property, and a
 * paper-administration licence does not grant the right to digitise them.
 *
 * This is a SCORE-ENTRY-ONLY module: a licensed examiner administers and
 * scores the test on the official kit, then enters the FINAL standard scores
 * (Full Scale IQ + the published primary index scores). The standard-score
 * classification *ranges* (e.g. 90–109 = Average) are general psychometric
 * facts, not protected expression — the only interpretation logic here.
 *
 * rawShape: 'domain_scores' — examiner submits { fsiq, edition?, indices? }.
 * direction: higher_better. Standard-score scale: 40–160 (mean 100, SD 15).
 */

const { standardDelta } = require('./contract');

const SCORE_MIN = 40;
const SCORE_MAX = 160;
const CUTOFF = 70; // < 70 → intellectual-disability range (≈ -2 SD)

/** Wechsler primary index keys (names only — no protected content). */
const INDEX_KEYS = ['vci', 'vsi', 'fri', 'wmi', 'psi'];
const EDITIONS = ['WPPSI-IV', 'WISC-V', 'WAIS-IV'];

function inRange(n) {
  return Number.isFinite(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

function validateRaw(raw) {
  const errors = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    errors.push('Wechsler expects an object { fsiq, edition?, indices? }');
    return { ok: false, errors };
  }
  if (!inRange(raw.fsiq)) {
    errors.push(
      `fsiq (Full Scale IQ) must be a number ${SCORE_MIN}-${SCORE_MAX} — got ${JSON.stringify(raw.fsiq)}`
    );
  }
  if (raw.edition != null && !EDITIONS.includes(raw.edition)) {
    errors.push(
      `edition must be one of ${EDITIONS.join(', ')} — got ${JSON.stringify(raw.edition)}`
    );
  }
  if (raw.indices != null) {
    if (typeof raw.indices !== 'object' || Array.isArray(raw.indices)) {
      errors.push('indices must be an object keyed by index name');
    } else {
      for (const [k, v] of Object.entries(raw.indices)) {
        if (!INDEX_KEYS.includes(k)) {
          errors.push(`unknown index '${k}' (allowed: ${INDEX_KEYS.join(', ')})`);
        } else if (!inRange(v)) {
          errors.push(
            `index '${k}' must be a number ${SCORE_MIN}-${SCORE_MAX} — got ${JSON.stringify(v)}`
          );
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(raw /*, ctx */) {
  const v = validateRaw(raw);
  if (!v.ok) throw new Error(`Wechsler: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  if (raw.indices) for (const [k, val] of Object.entries(raw.indices)) subscales[k] = val;
  return {
    value: raw.fsiq,
    subscales,
    notes: {
      method: 'examiner_entered_standard_score',
      edition: raw.edition || null,
      scale: 'standard_score_mean100_sd15',
      unit: 'standard_score',
      belowAverageRange: raw.fsiq < CUTOFF,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!inRange(derivedValue)) {
    throw new Error(
      `Wechsler.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`
    );
  }
  if (derivedValue >= 130) {
    return band('very_high', 'L0', 'مرتفع جدًا', 'Very high (extremely high)', 'normal', '#1b5e20');
  }
  if (derivedValue >= 120) {
    return band('high', 'L0', 'مرتفع', 'High (very high)', 'normal', '#2e7d32');
  }
  if (derivedValue >= 110) {
    return band('high_average', 'L0', 'فوق المتوسط', 'High average', 'normal', '#558b2f');
  }
  if (derivedValue >= 90) {
    return band('average', 'L0', 'متوسط', 'Average', 'normal', '#2e7d32');
  }
  if (derivedValue >= 80) {
    return band(
      'low_average',
      'L1',
      'دون المتوسط',
      'Low average',
      'mild',
      '#f9a825',
      'متابعة تربوية ودعم تعليمي وفق الحاجة.',
      'Educational monitoring and learning support as needed.'
    );
  }
  if (derivedValue >= 70) {
    return band(
      'borderline',
      'L2',
      'حدّي (منخفض جدًا)',
      'Borderline (very low)',
      'severe',
      '#ef6c00',
      'تقييم تربوي شامل وخطة دعم فردية.',
      'Comprehensive educational assessment and an individualised support plan.'
    );
  }
  return band(
    'extremely_low',
    'L4',
    'منخفض جدًا (نطاق الإعاقة الفكرية)',
    'Extremely low (intellectual-disability range)',
    'critical',
    '#c62828',
    'إحالة لتقييم متعدد التخصصات وتأكيد التشخيص مع تقييم السلوك التكيّفي.',
    'Refer for multidisciplinary evaluation and diagnostic confirmation with adaptive-behaviour assessment.'
  );
}

function band(b, tier, label_ar, label_en, severity, color, action_ar, action_en) {
  const out = { band: b, tier, label_ar, label_en, severity, color };
  if (action_ar) out.action_ar = action_ar;
  if (action_en) out.action_en = action_en;
  return out;
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const idx = v =>
    v >= 130 ? 6 : v >= 120 ? 5 : v >= 110 ? 4 : v >= 90 ? 3 : v >= 80 ? 2 : v >= 70 ? 1 : 0;
  return {
    ...base,
    bandShift: prev != null && curr != null ? idx(curr) - idx(prev) : null,
  };
}

module.exports = {
  measureCode: 'WECHSLER',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'higher_better',
  rawShape: 'domain_scores',
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  indexKeys: INDEX_KEYS,
  editions: EDITIONS,
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
