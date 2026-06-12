/**
 * BehaviorIncident.js — Applied-behavior-analysis (ABC) event log.
 *
 * Beneficiary-360 Commit 29. Powers
 * `behavioral.aggression.frequency.spike_200`.
 *
 * One row per observed target behavior. The ABC format (antecedent,
 * behavior, consequence) is the clinical standard for functional
 * behavioral assessment in pediatric rehabilitation.
 *
 * Design decisions:
 *
 *   1. **`behaviorType` enum** — keeps the taxonomy predictable
 *      across sites. `aggression` covers verbal/physical acts
 *      against others; `self_injury` covers self-harm;
 *      `elopement` covers trying to leave unsafe areas;
 *      `property_destruction` covers tantrum damage; `disruption`
 *      covers low-severity classroom disturbance; `other` for
 *      extensions. Matches typical ABA clinic taxonomies.
 *
 *   2. **ABC fields optional.** The adapter only needs frequency
 *      (count over time), but `antecedent` and `consequence` are
 *      preserved for the clinical team's functional analysis.
 *
 *   3. **`observedAt` separate from `createdAt`.** A staff
 *      member may log at end-of-shift; the observational time
 *      is what the frequency window locks to.
 *
 *   4. **`severity` enum** — minor/moderate/major. Out of scope
 *      for the current flag (which only counts frequency of
 *      aggression) but clinically valuable and essentially free.
 *
 *   5. **Optional `durationMinutes`** — some aggression episodes
 *      are measured in time rather than discrete count. Not used
 *      by the flag yet; available for future "total duration"
 *      flags.
 */

'use strict';

const mongoose = require('mongoose');

const BEHAVIOR_TYPES = Object.freeze([
  'aggression',
  'self_injury',
  'elopement',
  'property_destruction',
  'disruption',
  'other',
]);

const BEHAVIOR_SEVERITIES = Object.freeze(['minor', 'moderate', 'major']);

const behaviorIncidentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    // W1242 — link back to the source BehaviorRecord (the UI write model in
    // domains/behavior). Populated by behaviorIncidentProjection.js so the
    // risk/escalation engine sees UI-logged behavior. sparse + unique → one
    // projection per source; manually-created incidents stay null.
    sourceBehaviorRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BehaviorRecord',
      index: true,
      sparse: true,
      unique: true,
    },
    // W1251 — link back to the rehabilitation-advanced incident (the model the
    // web-admin behavior UI ACTUALLY writes via POST /api/v1/rehabilitation-
    // advanced/behavior-incidents; registered name 'AggregatedBehaviorIncident').
    // Populated by services/rehabAdvancedBehaviorProjection.js so UI-logged
    // behavior reaches the risk/escalation engine. sparse + unique → one
    // projection per source row; manually-created incidents stay null.
    sourceRehabAdvancedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AggregatedBehaviorIncident',
      index: true,
      sparse: true,
      unique: true,
    },
    behaviorType: {
      type: String,
      enum: BEHAVIOR_TYPES,
      required: true,
    },
    severity: {
      type: String,
      enum: BEHAVIOR_SEVERITIES,
      default: 'minor',
    },
    observedAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null },
    // ABC context — free-form clinical notes
    antecedent: { type: String, default: null },
    behaviorDescription: { type: String, default: null },
    consequence: { type: String, default: null },
    observedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, collection: 'behavior_incidents' }
);

// Primary flag query: "aggression events for this beneficiary in the
// last 30 days / in the prior 30 days" — indexed for fast count.
behaviorIncidentSchema.index({
  beneficiaryId: 1,
  behaviorType: 1,
  observedAt: -1,
});

const BehaviorIncident =
  mongoose.models.BehaviorIncident || mongoose.model('BehaviorIncident', behaviorIncidentSchema);

module.exports = {
  BehaviorIncident,
  BEHAVIOR_TYPES,
  BEHAVIOR_SEVERITIES,
};
