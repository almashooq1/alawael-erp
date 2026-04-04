/**
 * InsuranceEligibilityCheck Model — System 40: Smart Insurance
 * فحوصات أهلية التأمين عبر NPHIES
 */
const mongoose = require('mongoose');

const insuranceEligibilityCheckSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true, required: true },

    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // NPHIES
    nphiesCheckId: { type: String },
    checkType: {
      type: String,
      enum: ['general', 'service_specific', 'preauth'],
      default: 'general',
    },

    // النتيجة
    isEligible: { type: Boolean, default: false },
    remainingCoverage: { type: Number, default: null },
    coverageStart: { type: Date },
    coverageEnd: { type: Date },

    // تفاصيل التغطية
    coverageDetails: { type: mongoose.Schema.Types.Mixed },

    // استجابة NPHIES
    nphiesResponse: { type: mongoose.Schema.Types.Mixed },

    // وقت الاستجابة (ms)
    responseTimeMs: { type: Number },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'insurance_eligibility_checks',
  }
);

insuranceEligibilityCheckSchema.index({ policyId: 1, createdAt: -1 });
insuranceEligibilityCheckSchema.index({ beneficiaryId: 1, isEligible: 1 });
insuranceEligibilityCheckSchema.index({ nphiesCheckId: 1 });
insuranceEligibilityCheckSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('InsuranceEligibilityCheck', insuranceEligibilityCheckSchema);
