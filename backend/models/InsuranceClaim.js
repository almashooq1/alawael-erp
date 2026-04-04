/**
 * InsuranceClaim Model — System 40: Smart Insurance
 * المطالبات التأمينية
 */
const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    serviceCode: { type: String },
    serviceDescription: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    coveredAmount: { type: Number, default: 0 },
    patientAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const insuranceClaimSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    claimNumber: { type: String, unique: true, required: true },
    claimUuid: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    serviceSessionId: { type: mongoose.Schema.Types.ObjectId }, // جلسة الخدمة

    // NPHIES
    nphiesClaimId: { type: String },
    claimType: {
      type: String,
      enum: ['institutional', 'professional', 'pharmacy', 'vision', 'dental'],
      default: 'institutional',
    },

    // المبالغ
    billedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    insuranceShare: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },

    // الحالة
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'pending',
        'approved',
        'partially_approved',
        'rejected',
        'paid',
        'cancelled',
      ],
      default: 'draft',
    },

    // الرفض
    rejectionReason: { type: String },
    rejectionCode: { type: String },

    // التواريخ
    submittedAt: { type: Date },
    adjudicatedAt: { type: Date },
    paidAt: { type: Date },

    // الأكواد الطبية
    diagnosisCodes: [{ type: String }], // ICD-10
    procedureCodes: [{ type: String }], // CPT
    lineItems: [lineItemSchema],

    // استجابة NPHIES
    nphiesResponse: { type: mongoose.Schema.Types.Mixed },

    // الموافقة المسبقة المرتبطة
    priorAuthId: { type: mongoose.Schema.Types.ObjectId, ref: 'PriorAuthorization' },

    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'insurance_claims',
  }
);

insuranceClaimSchema.index({ branchId: 1, status: 1 });
insuranceClaimSchema.index({ policyId: 1, status: 1 });
insuranceClaimSchema.index({ beneficiaryId: 1, createdAt: -1 });
insuranceClaimSchema.index({ nphiesClaimId: 1 });
insuranceClaimSchema.index({ status: 1, submittedAt: -1 });
insuranceClaimSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
