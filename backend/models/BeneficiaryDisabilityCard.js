'use strict';

/**
 * BeneficiaryDisabilityCard — Wave 204b.
 *
 * "بطاقة الإعاقة" — local cache of beneficiary's disability card data
 * from هيئة الأشخاص ذوي الإعاقة (Saudi Authority of People with
 * Disability).
 *
 * Phase 1 (this wave): manual entry — admin types card info from the
 * physical card or government portal printout.
 * Phase 2 (deferred): live API sync via Authority's official endpoint
 * (requires OAuth + API key contract). Hook: `/sync` endpoint + the
 * `syncedFromAuthority` boolean.
 *
 * One card per beneficiary. Service entitlements determine which
 * subsidies/services the kid is eligible for from the government.
 */

const mongoose = require('mongoose');

const DISABILITY_LEVELS = ['mild', 'moderate', 'severe', 'profound'];
const STATUSES = ['active', 'expired', 'pending_renewal'];

const DisabilityCardSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    nationalId: { type: String, required: true, maxlength: 20, index: true },
    cardNumber: { type: String, default: '', maxlength: 30 },

    disabilityLevel: { type: String, enum: DISABILITY_LEVELS, required: true },
    disabilityTypes: { type: [String], default: () => [] }, // e.g. 'cognitive', 'motor', 'visual'

    issuedDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    issuingAuthorityArea: { type: String, default: '', maxlength: 100 }, // e.g. الرياض / جدة

    entitledServices: { type: [String], default: () => [] },
    monthlySubsidySAR: { type: Number, default: null, min: 0 },

    // Sync metadata
    syncedFromAuthority: { type: Boolean, default: false }, // true = API sync, false = manual
    lastSyncedAt: { type: Date, default: null },
    syncError: { type: String, default: '', maxlength: 300 },

    status: { type: String, enum: STATUSES, default: 'active', index: true },
    notes: { type: String, default: '', maxlength: 500 },
    enteredByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'beneficiary_disability_cards' }
);

DisabilityCardSchema.index({ expiryDate: 1, status: 1 });

DisabilityCardSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});
DisabilityCardSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  return Math.floor((this.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

DisabilityCardSchema.set('toJSON', { virtuals: true });
DisabilityCardSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.BeneficiaryDisabilityCard ||
  mongoose.model('BeneficiaryDisabilityCard', DisabilityCardSchema);

module.exports.DISABILITY_LEVELS = DISABILITY_LEVELS;
module.exports.STATUSES = STATUSES;
