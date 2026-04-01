/**
 * InsuranceClaim Model — نموذج المطالبات التأمينية
 */
'use strict';

const mongoose = require('mongoose');

// ─── بنود المطالبة (Claim Items) ─────────────────────────────────────────────
const claimItemSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true },
    serviceDate: { type: Date, required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },

    cptCode: { type: String, required: true },
    cptDescription: { type: String, default: null },
    icd10Code: { type: String, default: null },
    icd10Description: { type: String, default: null },
    toothNumber: { type: String, default: null }, // للأسنان فقط

    description: { type: String, default: null },
    quantity: { type: Number, default: 1 },
    unitCode: { type: String, default: 'PCE' },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },

    approvedAmount: { type: Number, default: null },
    patientShare: { type: Number, default: null },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'partial'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    adjudicationCode: { type: String, default: null },
  },
  { _id: true }
);

// ─── المطالبة الرئيسية ────────────────────────────────────────────────────────
const insuranceClaimSchema = new mongoose.Schema(
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
    priorAuthorizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriorAuthorization',
      default: null,
    },
    eligibilityCheckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EligibilityCheck',
      default: null,
    },

    claimNumber: { type: String, required: true, unique: true },
    nphiesClaimId: { type: String, default: null, index: true },
    nphiesBundleId: { type: String, default: null },

    claimDate: { type: Date, required: true, default: Date.now },
    serviceStartDate: { type: Date, required: true },
    serviceEndDate: { type: Date, required: true },

    claimType: {
      type: String,
      enum: ['institutional', 'professional', 'oral', 'vision', 'pharmacy'],
      default: 'professional',
    },
    claimSubtype: {
      type: String,
      enum: ['ip', 'op', 'emr'],
      default: 'op',
    },

    // بنود المطالبة
    items: { type: [claimItemSchema], default: [] },

    // الإجماليات
    totalAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: null },
    patientShare: { type: Number, default: null },
    paidAmount: { type: Number, default: null },

    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'submitted',
        'in_review',
        'approved',
        'partially_approved',
        'rejected',
        'paid',
        'appealed',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },

    submissionDate: { type: Date, default: null },
    responseDate: { type: Date, default: null },
    paymentDate: { type: Date, default: null },

    rejectionReasons: { type: [String], default: [] },
    adjudicationDetails: { type: mongoose.Schema.Types.Mixed, default: null },

    rawRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'insurance_claims',
  }
);

insuranceClaimSchema.index({ beneficiaryId: 1, status: 1 });
insuranceClaimSchema.index({ claimNumber: 1 });
insuranceClaimSchema.index({ nphiesClaimId: 1 });
insuranceClaimSchema.index({ claimDate: -1 });

// Virtual: هل المطالبة مكتملة؟
insuranceClaimSchema.virtual('isPaid').get(function () {
  return this.status === 'paid';
});

// Virtual: معدل الموافقة
insuranceClaimSchema.virtual('approvalRate').get(function () {
  if (!this.totalAmount || !this.approvedAmount) return null;
  return ((this.approvedAmount / this.totalAmount) * 100).toFixed(1);
});

const InsuranceClaim = mongoose.model('InsuranceClaim', insuranceClaimSchema);

module.exports = InsuranceClaim;
