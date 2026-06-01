'use strict';

/**
 * sb5.js — W713 score-entry-only module for the Stanford-Binet Intelligence
 * Scales, Fifth Edition (SB5).
 *
 * ⚠️ COPYRIGHT / LICENSING NOTE
 * SB5 is a PROPRIETARY, copyright-protected instrument (Riverside Insights).
 * This module deliberately ships NO test items and NO raw→scaled conversion
 * tables — both are the publisher's protected intellectual property and a
 * paper-administration licence does NOT grant the right to digitise them.
 *
 * Instead this is a SCORE-ENTRY-ONLY module: a licensed examiner administers
 * and scores the test on the official kit, then enters the FINAL standard
 * scores (Full Scale IQ + the publisher's factor indices). Standard-score
 * classification *ranges* (e.g. 90–109 = Average) are general psychometric
 * facts, not protected expression, and are the only interpretation logic here.
 *
 * rawShape: 'domain_scores' — examiner submits { fsiq, indices? }.
 * direction: higher_better (higher standard score = better cognitive ability).
 * Standard-score scale: 40–160 (mean 100, SD 15).
 */

const { standardDelta } = require('./contract');

const SCORE_MIN = 40;
const SCORE_MAX = 160;
const CUTOFF = 70; // < 70 → intellectual-disability range (≈ -2 SD)

/** Canonical SB5 factor-index keys (names only — no protected content). */
const INDEX_KEYS = [
  'fluidReasoning',
  'knowledge',
  'quantitative',
  'visualSpatial',
  'workingMemory',
];
/** Two SB5 domain composites. */
const DOMAIN_KEYS = ['nonverbalIQ', 'verbalIQ'];

function inRange(n) {
  return Number.isFinite(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

function validateRaw(raw) {
  const errors = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    errors.push('SB5 expects an object { fsiq, indices? }');
    return { ok: false, errors };
  }
  if (!inRange(raw.fsiq)) {
    errors.push(
      `fsiq (Full Scale IQ) must be a number ${SCORE_MIN}-${SCORE_MAX} — got ${JSON.stringify(raw.fsiq)}`
    );
  }
  if (raw.indices != null) {
    if (typeof raw.indices !== 'object' || Array.isArray(raw.indices)) {
      errors.push('indices must be an object keyed by factor name');
    } else {
      for (const [k, v] of Object.entries(raw.indices)) {
        if (![...INDEX_KEYS, ...DOMAIN_KEYS].includes(k)) {
          errors.push(
            `unknown index '${k}' (allowed: ${[...INDEX_KEYS, ...DOMAIN_KEYS].join(', ')})`
          );
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
  if (!v.ok) throw new Error(`SB5: invalid input — ${v.errors.join('; ')}`);
  const subscales = {};
  if (raw.indices) for (const [k, val] of Object.entries(raw.indices)) subscales[k] = val;
  return {
    value: raw.fsiq,
    subscales,
    notes: {
      method: 'examiner_entered_standard_score',
      scale: 'standard_score_mean100_sd15',
      unit: 'standard_score',
      belowAverageRange: raw.fsiq < CUTOFF,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!inRange(derivedValue)) {
    throw new Error(`SB5.interpret: score ${derivedValue} out of range ${SCORE_MIN}-${SCORE_MAX}`);
  }
  if (derivedValue >= 130) {
    return band('very_superior', 'L0', 'مرتفع جدًا (متفوق)', 'Very superior', 'normal', '#1b5e20');
  }
  if (derivedValue >= 120) {
    return band('superior', 'L0', 'مرتفع', 'Superior', 'normal', '#2e7d32');
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
      'حدّي',
      'Borderline',
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
  measureCode: 'SB5',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'higher_better',
  rawShape: 'domain_scores',
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  indexKeys: INDEX_KEYS,
  domainKeys: DOMAIN_KEYS,
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
