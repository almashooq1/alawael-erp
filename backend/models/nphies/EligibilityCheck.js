/**
 * EligibilityCheck Model — نموذج فحوصات الأهلية
 */
'use strict';

const mongoose = require('mongoose');

const eligibilityCheckSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    insurancePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePolicy',
      required: true,
    },

    checkDate: { type: Date, required: true, default: Date.now },
    nphiesRequestId: { type: String, default: null },
    nphiesResponseId: { type: String, default: null },
    messageHeaderId: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending', 'success', 'error', 'timeout'],
      default: 'pending',
      index: true,
    },
    coverageStatus: {
      type: String,
      enum: ['active', 'inactive', 'unknown', null],
      default: null,
    },

    benefits: { type: mongoose.Schema.Types.Mixed, default: null },
    exclusions: { type: [String], default: [] },
    remainingLimit: { type: Number, default: null },

    // FHIR Bundle data
    rawRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessages: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'eligibility_checks',
  }
);

eligibilityCheckSchema.index({ beneficiaryId: 1, checkDate: -1 });
eligibilityCheckSchema.index({ status: 1, coverageStatus: 1 });

const EligibilityCheck =
  mongoose.models.EligibilityCheck || mongoose.model('EligibilityCheck', eligibilityCheckSchema);

module.exports = EligibilityCheck;
