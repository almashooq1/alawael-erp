/**
 * InsurancePolicy Model — نموذج بوليصات التأمين
 */
'use strict';

const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    insuranceCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceCompany',
      required: true,
    },

    policyNumber: { type: String, required: true },
    memberId: { type: String, required: true }, // رقم العضوية التأمينية
    className: { type: String, default: null }, // فئة التأمين: VIP, A, B, C
    networkName: { type: String, default: null },
    relationship: {
      type: String,
      enum: ['self', 'spouse', 'child', 'other'],
      default: 'self',
    },
    subscriberId: { type: String, default: null }, // رقم المشترك الرئيسي

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    maxAnnualLimit: { type: Number, default: null },
    remainingLimit: { type: Number, default: null },
    copayPercentage: { type: Number, default: 0 },
    copayMax: { type: Number, default: null }, // الحد الأقصى للتحمل
    deductible: { type: Number, default: 0 },

    coverageDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    excludedServices: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended'],
      default: 'active',
      index: true,
    },

    lastEligibilityCheck: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'insurance_policies',
  }
);

insurancePolicySchema.index({ beneficiaryId: 1, status: 1 });
insurancePolicySchema.index({ memberId: 1 });
insurancePolicySchema.index({ policyNumber: 1 });
insurancePolicySchema.index({ endDate: 1 });

// Virtual: هل البوليصة منتهية؟
insurancePolicySchema.virtual('isExpired').get(function () {
  return this.endDate < new Date();
});

const InsurancePolicy = mongoose.model('InsurancePolicy', insurancePolicySchema);

module.exports = InsurancePolicy;
