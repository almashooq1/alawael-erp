/**
 * InsuranceTariff — negotiated unit price per (insurer × CPT) over time.
 *
 * Why a separate model:
 *   • Each insurer negotiates a different price for each CPT.
 *   • Prices change — we need an effective-from / effective-to range so the
 *     historical claim built from a 2025 session uses the 2025 rate, even
 *     if today's rate is different.
 *   • Lookup must be deterministic: the same (provider, cpt, date) must
 *     resolve to exactly one row, or we surface "no_match" / "ambiguous".
 *
 * Lookup contract (see services/insuranceTariffs.js):
 *   1. Match `providerId` exactly if given (NPHIES insurer id), else match
 *      `provider` case-insensitively.
 *   2. Among rows for that insurer + cptCode, keep those with
 *      `effectiveFrom <= date` and (effectiveTo is null OR effectiveTo >= date).
 *   3. Of those, return the one with the latest `effectiveFrom`. If two
 *      candidates tie, that's a data error and the service throws.
 */

'use strict';

const mongoose = require('mongoose');

const InsuranceTariffSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true, index: true },
    providerId: { type: String, trim: true, index: true }, // NPHIES insurer id (optional)
    cptCode: { type: String, required: true, trim: true, index: true },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', uppercase: true, trim: true },

    // Effective date window. effectiveTo === null/undefined means indefinite.
    effectiveFrom: { type: Date, required: true, default: () => new Date() },
    effectiveTo: { type: Date, default: null, index: true },

    notes: { type: String, trim: true, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound index for the hot lookup path
InsuranceTariffSchema.index({ provider: 1, cptCode: 1, effectiveFrom: -1 });
InsuranceTariffSchema.index({ providerId: 1, cptCode: 1, effectiveFrom: -1 });

// Validation: effectiveTo must be after effectiveFrom when present.
InsuranceTariffSchema.pre('validate', function (next) {
  if (this.effectiveTo && this.effectiveFrom && this.effectiveTo < this.effectiveFrom) {
    return next(new Error('InsuranceTariff: effectiveTo must be on/after effectiveFrom'));
  }
  next();
});

module.exports =
  mongoose.models.InsuranceTariff || mongoose.model('InsuranceTariff', InsuranceTariffSchema);
