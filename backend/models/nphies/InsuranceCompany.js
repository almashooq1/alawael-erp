/**
 * InsuranceCompany Model — نموذج شركات التأمين
 */
'use strict';

const mongoose = require('mongoose');

const insuranceCompanySchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    nphiesId: { type: String, unique: true, required: true }, // NPHIES Organization ID
    licenseNumber: { type: String, default: null },
    tpaName: { type: String, default: null }, // Third Party Administrator
    tpaNphiesId: { type: String, default: null },
    contactPhone: { type: String, default: null },
    contactEmail: { type: String, default: null },
    claimsEmail: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    supportedServices: { type: [String], default: [] }, // CPT codes covered
    copayPercentage: { type: Number, default: 0 },
    requiresPreAuth: { type: Boolean, default: true },
    preAuthServices: { type: [String], default: [] }, // Services requiring pre-auth
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'insurance_companies',
  }
);

insuranceCompanySchema.index({ status: 1 });
insuranceCompanySchema.index({ nphiesId: 1 });

const InsuranceCompany = mongoose.model('InsuranceCompany', insuranceCompanySchema);

module.exports = InsuranceCompany;
