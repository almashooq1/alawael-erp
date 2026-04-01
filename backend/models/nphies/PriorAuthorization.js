/**
 * PriorAuthorization Model — نموذج الموافقات المسبقة
 */
'use strict';

const mongoose = require('mongoose');

const priorAuthorizationSchema = new mongoose.Schema(
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
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    eligibilityCheckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EligibilityCheck',
      default: null,
    },

    requestDate: { type: Date, required: true, default: Date.now },
    preAuthRef: { type: String, default: null, index: true }, // مرجع الموافقة من NPHIES
    nphiesRequestId: { type: String, default: null },
    nphiesResponseId: { type: String, default: null },

    // CPT Codes و ICD-10
    serviceCodes: { type: [String], required: true }, // رموز CPT
    diagnosisCodes: { type: [String], required: true }, // رموز ICD-10

    requestedSessions: { type: Number, required: true },
    approvedSessions: { type: Number, default: null },
    usedSessions: { type: Number, default: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    approvedStartDate: { type: Date, default: null },
    approvedEndDate: { type: Date, default: null },

    estimatedCost: { type: Number, default: null },
    approvedAmount: { type: Number, default: null },

    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'partially_approved',
        'rejected',
        'expired',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String, default: null },
    adjudicationDetails: { type: mongoose.Schema.Types.Mixed, default: null },

    rawRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: 'prior_authorizations',
  }
);

priorAuthorizationSchema.index({ beneficiaryId: 1, status: 1 });
// REMOVED DUPLICATE: priorAuthorizationSchema.index({ preAuthRef: 1 }); — field already has index:true

// Virtual: هل الموافقة المسبقة صالحة؟
priorAuthorizationSchema.virtual('isValid').get(function () {
  return (
    this.status === 'approved' &&
    this.approvedEndDate &&
    this.approvedEndDate >= new Date() &&
    this.usedSessions < (this.approvedSessions || 0)
  );
});

// Virtual: الجلسات المتبقية
priorAuthorizationSchema.virtual('remainingSessions').get(function () {
  return Math.max(0, (this.approvedSessions || 0) - this.usedSessions);
});

const PriorAuthorization =
  mongoose.models.PriorAuthorization ||
  mongoose.model('PriorAuthorization', priorAuthorizationSchema);

module.exports = PriorAuthorization;
