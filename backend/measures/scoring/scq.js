'use strict';

/**
 * scq.js — Wave 212 scoring module for Social Communication Questionnaire.
 *
 * SCQ (Rutter, Bailey & Lord 2003) — 40-item caregiver-completed
 * autism screening questionnaire. Each item: 1 = behaviour present, 0
 * = absent. Item 1 ("Is she/he now able to talk using short phrases or
 * sentences?") is a gate item — if 0, items 2-7 (focused on speech)
 * are skipped (scored 0). The remaining 39 items contribute to a sum
 * with cutoff = 15 indicating likely ASD requiring diagnostic referral.
 *
 * This is the W206b regression-class fix made structural: SCQ
 * shipped without an explicit scoringType in the legacy static
 * catalog, which forced the Smart Engine into a band-index fallback
 * with wrong tier assignments. Here derivedType='sum' +
 * interpretationStyle='cutoff' are declared explicitly, and the
 * Measure governance layer (W210 invariants) prevents any future SCQ
 * variant from regressing.
 *
 * MCID: not applicable — SCQ is a screening instrument, not an
 * outcome measure. The Measure document carries status='not_applicable'
 * for mcid.
 */

const { standardDelta } = require('./contract');

const CUTOFF = 15;
const MAX_SCORE = 39;

/** Strict raw-item validation. */
function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== 40) {
    errors.push(`SCQ has 40 items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (v !== 0 && v !== 1 && v != null) {
      errors.push(`item ${i + 1}: must be 0, 1, or null — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

/**
 * Compute derived score per Rutter 2003 scoring rules.
 *
 * Item indexes in rawItems are 0-based; SCQ item numbers are 1-based.
 * Items 1-7 are language-focused; if item 1 is 0 (no phrase speech),
 * items 2-7 are scored 0 regardless of caregiver response (per manual).
 */
function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`SCQ: invalid raw items — ${v.errors.join('; ')}`);
  }

  // Coerce nulls to 0 (skipped items count as absent in screening).
  const cleaned = rawItems.map(x => (x === 1 ? 1 : 0));

  const item1Present = cleaned[0] === 1;
  if (!item1Present) {
    // Zero out items 2-7 (indexes 1..6) per the manual.
    for (let i = 1; i <= 6; i++) cleaned[i] = 0;
  }

  // SCQ excludes item 1 from the total (it's a gate, not scored).
  const totalSum = cleaned.slice(1).reduce((a, b) => a + b, 0);

  return {
    value: totalSum,
    subscales: {
      socialInteraction: cleaned.slice(7, 22).reduce((a, b) => a + b, 0), // items 8-22
      communication: cleaned.slice(1, 7).reduce((a, b) => a + b, 0), // items 2-7
      restrictedBehaviors: cleaned.slice(33, 40).reduce((a, b) => a + b, 0), // items 34-40
    },
    notes: {
      phraseSpeechGate: item1Present ? 'present' : 'absent_items_2_7_zeroed',
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('SCQ.interpret: derivedValue must be a number');
  }
  if (derivedValue < CUTOFF) {
    return {
      band: 'below_cutoff',
      label_ar: 'أقل من حد الفحص',
      label_en: 'Below screening cutoff',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'متابعة نمائية روتينية',
    };
  }
  return {
    band: 'at_or_above_cutoff',
    label_ar: 'يستوجب تقييماً تشخيصياً شاملاً',
    label_en: 'Refer for diagnostic evaluation (ADOS-2 / ADI-R)',
    severity: 'moderate',
    color: '#b71c1c',
    action_ar: 'تحويل لتقييم ADOS-2 أو ADI-R خلال أسبوعين',
  };
}

function delta(prev, curr, measure) {
  // Screening — track movement across the cutoff explicitly even though
  // MCID is not applicable.
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  return {
    ...base,
    crossedCutoff:
      prev != null && curr != null
        ? prev < CUTOFF !== curr < CUTOFF
          ? curr >= CUTOFF
            ? 'now_at_or_above_cutoff'
            : 'now_below_cutoff'
          : null
        : null,
  };
}

module.exports = {
  measureCode: 'SCQ',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
};
