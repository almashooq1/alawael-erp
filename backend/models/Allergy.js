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

// ─── W1066: unified-core linkage — allergy recorded (safety milestone) ──────
// A newly recorded active allergy is logged on the beneficiary's timeline so
// the safety verdict (esp. severe / life-threatening) is visible on the
// unified core. Non-callback hook style.
allergySchema.pre('save', function flagAllergyRecorded() {
  this.$__allergyRecordedNow = this.isNew && this.status === 'active';
});

allergySchema.post('save', function emitAllergyRecorded(doc) {
  if (!doc.$__allergyRecordedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('allergy', 'allergy.recorded', {
      allergyId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : undefined,
      substance: doc.substance,
      severity: doc.severity,
      severe: SEVERE_SEVERITIES.includes(doc.severity),
      recordedAt: doc.diagnosedAt || doc.createdAt || new Date(),
    });
  } catch (err) {
    // best-effort; never block the save on an event-bus issue
    void err;
  }
});

const Allergy = mongoose.models.Allergy || mongoose.model('Allergy', allergySchema);

module.exports = {
  Allergy,
  ALLERGY_SEVERITIES,
  ALLERGY_STATUSES,
  SEVERE_SEVERITIES,
};
