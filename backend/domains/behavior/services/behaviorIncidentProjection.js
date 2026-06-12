'use strict';

/**
 * behaviorIncidentProjection.js — W1242
 *
 * ROOT FIX for the BehaviorRecord ↔ BehaviorIncident write/read split
 * (docs/DDD_VS_LEGACY_MODEL_SPLIT_2026-06-12.md §2a-class). The web-admin UI writes
 * behavioral observations to `BehaviorRecord` (domains/behavior); the risk/escalation
 * engine — `intelligence/risk/sources/behavioral-escalation.source.js` →
 * `escalation-predictor.lib` powering the `behavioral.aggression.frequency.spike_200`
 * rule — reads the legacy `BehaviorIncident`. Both are ABC (Antecedent-Behavior-
 * Consequence) event logs of the SAME concept, with NO sync. So a behavior logged
 * through the UI was INVISIBLE to the escalation predictor — meaning a real aggression
 * spike entered via the UI could be MISSED. This is patient-safety relevant.
 *
 * Same template + safety invariants as W1240 (therapySessionProjection):
 *   1. FAIL-SAFE — never throws; returns `{ ok:false }`. A projection failure must
 *      NEVER break the UI behavior-record write.
 *   2. FAITHFUL — `BehaviorIncident` is a plain ABC log (no hash-chain, no required
 *      fields BehaviorRecord lacks), so every field maps faithfully. The only
 *      transform is a clinical roll-up of the fine-grained `behavior.topography` into
 *      `BehaviorIncident`'s coarser `behaviorType` taxonomy — a standard clinical
 *      classification, not fabrication. Conservative: only unambiguous physical
 *      aggression (hitting/kicking/biting) rolls up to `aggression`; ambiguous
 *      topographies fall through to `other` rather than inflate the aggression count.
 */

const mongoose = require('mongoose');

// BehaviorRecord.behavior.topography (fine-grained) → BehaviorIncident.behaviorType
// (coarse taxonomy: aggression | self_injury | elopement | property_destruction |
// disruption | other). Unmapped → 'other'.
const TOPOGRAPHY_TO_TYPE = Object.freeze({
  aggression: 'aggression',
  hitting: 'aggression',
  kicking: 'aggression',
  biting: 'aggression',
  self_injury: 'self_injury',
  property_destruction: 'property_destruction',
  throwing: 'property_destruction',
  elopement: 'elopement',
  tantrums: 'disruption',
  verbal_outburst: 'disruption',
  screaming: 'disruption',
  non_compliance: 'disruption',
  // stereotypy | withdrawal | crying | other | (unset) → 'other'
});

// BehaviorRecord.behavior.severity → BehaviorIncident.severity
const SEVERITY_MAP = Object.freeze({
  mild: 'minor',
  moderate: 'moderate',
  severe: 'major',
  crisis: 'major',
});

function mapBehaviorType(topography) {
  return TOPOGRAPHY_TO_TYPE[topography] || 'other';
}

function mapSeverity(severity) {
  return SEVERITY_MAP[severity] || undefined; // severity is optional on BehaviorIncident
}

/**
 * Build the BehaviorIncident projection fields from a BehaviorRecord document.
 * Pure; never throws.
 * @param {Object} record - a BehaviorRecord doc or lean object
 * @returns {Object} fields for a BehaviorIncident upsert
 */
function mapRecordToIncident(record) {
  const behavior = record.behavior || {};
  const severity = mapSeverity(behavior.severity);
  return {
    sourceBehaviorRecordId: record._id,
    beneficiaryId: record.beneficiaryId,
    branchId: record.branchId || undefined,
    behaviorType: mapBehaviorType(behavior.topography),
    ...(severity ? { severity } : {}),
    // observedAt is required on BehaviorIncident — always provide a valid Date.
    observedAt: record.occurredAt || record.createdAt || new Date(0),
    antecedent: (record.antecedent && record.antecedent.description) || null,
    consequence: (record.consequence && record.consequence.description) || null,
  };
}

/**
 * Idempotently project a BehaviorRecord into its BehaviorIncident record (upsert
 * keyed by `sourceBehaviorRecordId`). FAIL-SAFE — returns a result object, never
 * throws.
 * @param {Object} record - the BehaviorRecord just written
 * @param {{logger?: {warn?: Function}}} [opts]
 * @returns {Promise<{ok: boolean, id?: any, error?: string}>}
 */
async function projectBehaviorRecord(record, { logger } = {}) {
  try {
    if (!record || !record._id) return { ok: false, error: 'no source doc' };
    if (!record.beneficiaryId) return { ok: false, error: 'no beneficiaryId' };
    const BehaviorIncident = mongoose.model('BehaviorIncident');
    const fields = mapRecordToIncident(record);
    const doc = await BehaviorIncident.findOneAndUpdate(
      { sourceBehaviorRecordId: record._id },
      { $set: fields },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    return { ok: true, id: doc ? doc._id : undefined };
  } catch (err) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[behaviorIncidentProjection] projection failed (non-fatal): ${err.message}`);
    }
    return { ok: false, error: err.message };
  }
}

module.exports = {
  TOPOGRAPHY_TO_TYPE,
  SEVERITY_MAP,
  mapBehaviorType,
  mapSeverity,
  mapRecordToIncident,
  projectBehaviorRecord,
};
