'use strict';

/**
 * decision-rights.lib.js — W461.
 *
 * Pure library implementing the v3 Decision Rights Matrix (the CRPD
 * Article 12 "supported decision-making, NOT substituted" framework from
 * docs/blueprint/beneficiary-lifecycle-v3.md §7).
 *
 * The 4-layer hierarchy:
 *   Layer 1 — Beneficiary Autonomy        (capacity present → beneficiary decides; others advise)
 *   Layer 2 — Supported Decision-Making    (capacity limited but present → with advocate/family + clinician)
 *   Layer 3 — Substituted Decision-Making  (capacity clearly absent → guardian decides w/ advocate oversight)
 *   Layer 4 — Emergency Override           (medical / safeguarding only, documented after-the-fact)
 *
 * Capacity is assessed PER DECISION, not blanket. Four functional criteria:
 *   - understanding   (does the person understand the decision context?)
 *   - retention       (can they retain the info long enough?)
 *   - weighing        (can they weigh pros/cons?)
 *   - communication   (can they communicate their choice, by any modality?)
 *
 * Each criterion gets a 0-3 score. The composite drives layer routing:
 *   ≥ 10  → Layer 1 (autonomy)
 *   6-9   → Layer 2 (supported)
 *   < 6   → Layer 3 (substituted)
 *
 * Emergency override (Layer 4) is event-driven, not capacity-driven.
 *
 * Pure functions only. No DB, no Mongoose, no I/O.
 */

const CAPACITY_CRITERIA = ['understanding', 'retention', 'weighing', 'communication'];
const LAYER_1_THRESHOLD = 10;
const LAYER_2_THRESHOLD = 6;

/**
 * Validate a capacity assessment object.
 *
 * @param {Object} assessment — { understanding, retention, weighing, communication }
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateCapacity(assessment) {
  const errors = [];
  if (!assessment || typeof assessment !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }
  for (const c of CAPACITY_CRITERIA) {
    const v = assessment[c];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`MISSING_CRITERION:${c}`);
    } else if (v < 0 || v > 3) {
      errors.push(`OUT_OF_RANGE:${c}:${v}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Compute composite capacity score from per-criterion 0-3 values.
 * Returns 0-12 (4 criteria × max 3).
 */
function compositeScore(assessment) {
  if (!assessment) return 0;
  return CAPACITY_CRITERIA.reduce(
    (sum, c) => sum + (typeof assessment[c] === 'number' ? assessment[c] : 0),
    0
  );
}

/**
 * Route a decision to the appropriate layer given the capacity assessment.
 * Returns one of: 'autonomy' | 'supported' | 'substituted' | 'emergency'
 *
 * @param {Object} assessment  — capacity assessment object
 * @param {Object} [opts]
 * @param {boolean} [opts.emergency=false]  — true forces Layer 4
 * @returns {{ layer: string, layerNumber: number, score: number, reasoning: string }}
 */
function routeDecision(assessment, opts = {}) {
  if (opts.emergency) {
    return {
      layer: 'emergency',
      layerNumber: 4,
      score: null,
      reasoning: 'Emergency override invoked. Action taken; capacity review required within 72h.',
    };
  }

  const { valid, errors } = validateCapacity(assessment);
  if (!valid) {
    return {
      layer: null,
      layerNumber: null,
      score: null,
      reasoning: `Cannot route — capacity assessment invalid: ${errors.join(', ')}`,
    };
  }

  const score = compositeScore(assessment);

  if (score >= LAYER_1_THRESHOLD) {
    return {
      layer: 'autonomy',
      layerNumber: 1,
      score,
      reasoning: `Composite ${score}/12 ≥ ${LAYER_1_THRESHOLD} — beneficiary decides; others advise only.`,
    };
  }
  if (score >= LAYER_2_THRESHOLD) {
    return {
      layer: 'supported',
      layerNumber: 2,
      score,
      reasoning:
        `Composite ${score}/12 in [${LAYER_2_THRESHOLD}, ${LAYER_1_THRESHOLD - 1}] — ` +
        `supported decision-making (CRPD Art. 12). Beneficiary chooses WITH documented support.`,
    };
  }
  return {
    layer: 'substituted',
    layerNumber: 3,
    score,
    reasoning:
      `Composite ${score}/12 < ${LAYER_2_THRESHOLD} — substituted decision-making (last resort). ` +
      `Guardian decides with advocate oversight; time-limited; reviewed at next assessment.`,
  };
}

/**
 * Determine if a decision type REQUIRES advocate involvement regardless
 * of layer. Restraint/seclusion + substituted-decision + research +
 * complaints are advocate-required per CRPD doctrine.
 */
function requiresAdvocate(decisionType, layer) {
  const advocateRequiredTypes = ['restraint', 'seclusion', 'research_consent', 'complaint'];
  if (advocateRequiredTypes.includes(decisionType)) return true;
  if (layer === 'substituted') return true;
  if (layer === 'emergency') return true; // post-hoc review
  return false;
}

/**
 * Get age-adapted interpretation of capacity criteria for display in
 * the beneficiary-facing UX (Layer 1 + Layer 2 paths).
 */
function interpretCapacity(assessment) {
  if (!assessment) return null;
  const r = n => (n >= 2 ? 'strong' : n === 1 ? 'partial' : 'limited');
  return {
    understanding: r(assessment.understanding ?? 0),
    retention: r(assessment.retention ?? 0),
    weighing: r(assessment.weighing ?? 0),
    communication: r(assessment.communication ?? 0),
    composite: compositeScore(assessment),
    interpretation: {
      ar: _arInterpretation(assessment),
      en: _enInterpretation(assessment),
    },
  };
}

function _arInterpretation(a) {
  const score = compositeScore(a);
  if (score >= LAYER_1_THRESHOLD) return 'يستطيع اتخاذ هذا القرار باستقلالية كاملة';
  if (score >= LAYER_2_THRESHOLD) return 'يستطيع اتخاذ هذا القرار بدعم موثّق';
  return 'يحتاج إلى دعم كامل لاتخاذ هذا القرار — مع إشراف من المحامي المستقل';
}

function _enInterpretation(a) {
  const score = compositeScore(a);
  if (score >= LAYER_1_THRESHOLD) return 'Can decide independently';
  if (score >= LAYER_2_THRESHOLD) return 'Can decide with documented support';
  return 'Needs full support to decide — with Independent Advocate oversight';
}

module.exports = Object.freeze({
  validateCapacity,
  compositeScore,
  routeDecision,
  requiresAdvocate,
  interpretCapacity,
  // Constants
  CAPACITY_CRITERIA,
  LAYER_1_THRESHOLD,
  LAYER_2_THRESHOLD,
});
