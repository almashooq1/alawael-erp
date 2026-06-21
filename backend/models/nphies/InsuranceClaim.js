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
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession', default: null },

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
// REMOVED DUPLICATE: insuranceClaimSchema.index({ claimNumber: 1 }); — field already has index:true
// REMOVED DUPLICATE: insuranceClaimSchema.index({ nphiesClaimId: 1 }); — field already has index:true
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

// W994 — surface insurance-claim outcomes on the unified-core timeline: an
// approved (or partially-approved) claim means the beneficiary's care is funded
// (positive) and a rejected claim means funding was denied (an actionable
// warning — care access at risk). Fires once on the status flip to approved /
// partially_approved / rejected. Native pre-compile hooks per the proven W970
// pattern (the modelEventBridge-is-dead workaround); guarded + fire-and-forget so
// persistence never blocks. Consumed by dddCrossModuleSubscribers → CareTimeline
// (administrative category). NOT covered by the modelEventBridge finance mappings
// (those are invoice/payment/expense/payroll), so this native hook is additive.
insuranceClaimSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
insuranceClaimSchema.post('save', function (doc) {
  try {
    if (doc.status === this.$__prevStatus) return; // no status change
    const { integrationBus } = require('../../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return;
    const base = {
      claimId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      claimNumber: doc.claimNumber || '',
      totalAmount: doc.totalAmount,
      approvedAmount: doc.approvedAmount,
    };
    if (doc.status === 'approved' || doc.status === 'partially_approved') {
      Promise.resolve(integrationBus.publish('insurance', 'claim.approved', base)).catch(() => {});
    } else if (doc.status === 'rejected') {
      Promise.resolve(integrationBus.publish('insurance', 'claim.rejected', base)).catch(() => {});
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

// Registered as `NphiesInsuranceClaim` (not `InsuranceClaim`) so it
// doesn't collide with models/insuranceClaim.model.js (the canonical
// 400-line schema). The default export still resolves to a usable
// model for any existing NPHIES consumer.
const InsuranceClaim =
  mongoose.models.NphiesInsuranceClaim ||
  mongoose.model('NphiesInsuranceClaim', insuranceClaimSchema);

module.exports = InsuranceClaim;
