'use strict';

/**
 * BeneficiaryMealEvent — Wave 179.
 *
 * "سجل وجبات المستفيد" — per-meal consumption record. Distinct from
 * the parent-facing meal % in DailyCommunicationLog (which is the
 * summary). This is the detailed per-meal log (what was served,
 * how much consumed, what was refused, allergy/dietary issues).
 *
 * Multi-event per day: breakfast + snack + lunch (+ optional snack2).
 */

const mongoose = require('mongoose');

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2'];

const BeneficiaryMealEventSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    servedAt: { type: Date, default: Date.now },

    menuItems: { type: [String], default: () => [] },
    consumedPercent: { type: Number, default: null, min: 0, max: 100 },
    refusedItems: { type: [String], default: () => [] },
    allergyIncident: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 400 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recordedByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'beneficiary_meal_events' }
);

// One row per (beneficiaryId, date, mealType) — re-submitting same meal updates it.
BeneficiaryMealEventSchema.index({ beneficiaryId: 1, date: 1, mealType: 1 }, { unique: true });
BeneficiaryMealEventSchema.index({ branchId: 1, date: -1 });
BeneficiaryMealEventSchema.index({ allergyIncident: 1, date: -1 });

// W1093 — unified-core linkage: emit only when an allergy incident is
// recorded during a meal (routine meals stay off the clinical timeline).
BeneficiaryMealEventSchema.pre('save', function flagMealAllergyIncident() {
  this.$__mealAllergyIncident = this.isNew && this.allergyIncident === true;
});

BeneficiaryMealEventSchema.post('save', function emitMealAllergyIncident(doc) {
  if (!doc.$__mealAllergyIncident) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('meal-event', 'meal_event.allergy_incident', {
      mealEventId: String(doc._id),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      date: doc.date,
      mealType: doc.mealType,
      refusedItems: doc.refusedItems || [],
    });
  } catch (_e) {
    /* bus optional — never block the write */
  }
});

module.exports =
  mongoose.models.BeneficiaryMealEvent ||
  mongoose.model('BeneficiaryMealEvent', BeneficiaryMealEventSchema);

module.exports.MEAL_TYPES = MEAL_TYPES;
