'use strict';

/**
 * rehabAdvancedBehaviorProjection.js — W1251.
 *
 * ROOT FIX for the REAL behavior write/read split identified in
 * docs/DDD_VS_LEGACY_MODEL_SPLIT_2026-06-12.md §2c: the web-admin behavior UI
 * writes `AggregatedBehaviorIncident` (snake_case schema in
 * models/rehabilitation-advanced.model.js, via POST /api/v1/rehabilitation-
 * advanced/behavior-incidents → Model.create), while the risk/escalation
 * engine (`behavioral.aggression.frequency.spike_200` via escalation-predictor)
 * reads the camelCase `BehaviorIncident` (collection behavior_incidents).
 * No sync existed → UI-logged aggression NEVER reached the escalation
 * predictor. W1242 fixed a parallel path (BehaviorRecord → BehaviorIncident)
 * that the UI does not use; THIS file projects from the verified actual
 * UI write model.
 *
 * Pre-build verification (mandated by §2c after two prior mis-analyses):
 *   ✓ source registered name: 'AggregatedBehaviorIncident'
 *     (models/rehabilitation-advanced.model.js:1686, exported as
 *     `BehaviorIncident` from that module — naming trap documented here)
 *   ✓ target registered name: 'BehaviorIncident' (models/BehaviorIncident.js,
 *     collection 'behavior_incidents') — no model-name collision: the third
 *     file models/rehab-advanced/BehaviorIncident.model.js registers
 *     'RehabAdvancedBehaviorIncident' (a distinct, route-unused name)
 *   ✓ UI write path uses Model.create → mongoose post('save') hooks fire
 *
 * Same template + safety invariants as W1240/W1242:
 *   1. FAIL-SAFE — never throws; a projection failure must never break the
 *      UI incident write.
 *   2. FAITHFUL-OR-NULL — every projected field maps 1:1 from the source;
 *      the only transforms are the standard clinical taxonomy roll-up
 *      (category → behaviorType, mirroring W1242's choices for the shared
 *      values) and the intensity → severity scale map. Ambiguous categories
 *      map to 'other'/'disruption' conservatively — never inflating the
 *      aggression count the spike rule fires on, except verbal_aggression
 *      which IS aggression per the BehaviorIncident taxonomy ("aggression
 *      covers verbal/physical acts against others").
 *   3. IDEMPOTENT — upsert keyed by sparse+unique sourceRehabAdvancedIncidentId.
 */

// behavior_type.category (snake source enum) → BehaviorIncident.behaviorType.
// Mirrors W1242's TOPOGRAPHY_TO_TYPE for the overlapping values
// (non_compliance → disruption, tantrum → disruption).
const CATEGORY_TO_TYPE = Object.freeze({
  aggression: 'aggression',
  verbal_aggression: 'aggression',
  self_injury: 'self_injury',
  elopement: 'elopement',
  property_destruction: 'property_destruction',
  disruption: 'disruption',
  non_compliance: 'disruption',
  tantrum: 'disruption',
  // stereotypy | other | (unset) → 'other'
});

// incident_info.intensity → BehaviorIncident.severity (same map as W1242).
const SEVERITY_MAP = Object.freeze({
  mild: 'minor',
  moderate: 'moderate',
  severe: 'major',
  crisis: 'major',
});

function mapBehaviorType(category) {
  return CATEGORY_TO_TYPE[category] || 'other';
}

function mapSeverity(intensity) {
  return SEVERITY_MAP[intensity] || undefined; // severity has a schema default
}

/**
 * Build BehaviorIncident fields from an AggregatedBehaviorIncident doc.
 * Pure; never throws.
 * @param {Object} src - the snake-case incident doc (full or lean)
 * @returns {Object} fields for the BehaviorIncident upsert
 */
function mapRehabIncident(src) {
  const info = src.incident_info || {};
  const bt = src.behavior_type || {};
  const severity = mapSeverity(info.intensity);
  return {
    sourceRehabAdvancedIncidentId: src._id,
    beneficiaryId: src.beneficiary_id,
    behaviorType: mapBehaviorType(bt.category),
    ...(severity ? { severity } : {}),
    // observedAt is required on BehaviorIncident — always provide a valid Date.
    observedAt: info.date || src.createdAt || new Date(0),
    durationMinutes: info.duration != null ? info.duration : null,
    antecedent: bt.antecedent || null,
    behaviorDescription: bt.description || null,
    consequence: bt.consequence || null,
  };
}

/**
 * Idempotently project a rehabilitation-advanced incident into the
 * risk-engine-readable BehaviorIncident (upsert keyed by
 * `sourceRehabAdvancedIncidentId`). FAIL-SAFE — returns a result object,
 * never throws.
 * @param {Object} src - the AggregatedBehaviorIncident just written
 * @param {{logger?: {warn?: Function}}} [opts]
 * @returns {Promise<{ok: boolean, id?: any, error?: string}>}
 */
async function projectRehabAdvancedIncident(src, { logger } = {}) {
  try {
    if (!src || !src._id) return { ok: false, error: 'no source doc' };
    if (!src.beneficiary_id) return { ok: false, error: 'no beneficiary_id' };
    const { BehaviorIncident } = require('../models/BehaviorIncident');
    const fields = mapRehabIncident(src);
    const doc = await BehaviorIncident.findOneAndUpdate(
      { sourceRehabAdvancedIncidentId: src._id },
      { $set: fields },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    return { ok: true, id: doc ? doc._id : undefined };
  } catch (err) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(
        `[rehabAdvancedBehaviorProjection] projection failed (non-fatal): ${err.message}`
      );
    }
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CATEGORY_TO_TYPE,
  SEVERITY_MAP,
  mapBehaviorType,
  mapSeverity,
  mapRehabIncident,
  projectRehabAdvancedIncident,
};
