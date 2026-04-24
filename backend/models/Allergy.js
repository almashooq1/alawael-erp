/**
 * Allergy.js — Beneficiary allergy records.
 *
 * Beneficiary-360 Commit 23. Powers
 * `clinical.allergy.severe.medication_conflict` together with the
 * Medication model via incidentObservations.
 *
 * Design decisions:
 *
 *   1. **Substance is a free-form string** (e.g., "penicillin",
 *      "peanut", "latex"). The clinical team records what they
 *      know. Optional `rxNormClass` can link to a pharmacology
 *      class for broader matching (e.g., "penicillins" covers
 *      amoxicillin + ampicillin + ...). The observation adapter
 *      uses both in its match logic.
 *
 *   2. **Severity enum mirrors clinical vocabulary** —
 *      mild/moderate/severe/life_threatening. Only `severe` and
 *      `life_threatening` trip the conflict flag (the flag is
 *      titled "severe allergy"); lesser allergies still live in
 *      this table but don't set off the alarm.
 *
 *   3. **Status field** — active allergies are checked; resolved
 *      or erroneous records carry `inactive` and stay out of the
 *      conflict computation without being deleted.
 *
 *   4. **Optional reaction description** — free-form clinical note
 *      about the historical reaction. Not used by the adapter;
 *      present for clinician context in the UI.
 */

'use strict';

const mongoose = require('mongoose');

const ALLERGY_SEVERITIES = Object.freeze(['mild', 'moderate', 'severe', 'life_threatening']);

const ALLERGY_STATUSES = Object.freeze(['active', 'inactive']);

const SEVERE_SEVERITIES = Object.freeze(['severe', 'life_threatening']);

const allergySchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    substance: { type: String, required: true, trim: true },
    rxNormClass: { type: String, default: null, trim: true },
    severity: { type: String, enum: ALLERGY_SEVERITIES, required: true },
    status: {
      type: String,
      enum: ALLERGY_STATUSES,
      default: 'active',
      index: true,
    },
    reaction: { type: String, default: null },
    diagnosedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'allergies' }
);

allergySchema.index({ beneficiaryId: 1, status: 1, severity: 1 });

const Allergy = mongoose.models.Allergy || mongoose.model('Allergy', allergySchema);

module.exports = {
  Allergy,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
  SEVERE_SEVERITIES,
};
