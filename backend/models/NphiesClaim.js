/**
 * NphiesClaim — insurance claim tracking for a beneficiary session/encounter.
 *
 * Independent of local Invoice model — an invoice can have a linked
 * nphiesClaim, but claims have their own lifecycle dictated by NPHIES.
 */

'use strict';

const mongoose = require('mongoose');
const { isFeatureEnabled } = require('../config/featureFlags');

const NphiesClaimSchema = new mongoose.Schema(
  {
    // Local identifiers
    claimNumber: { type: String, required: true, unique: true, index: true },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession' },

    // Coverage
    memberId: { type: String, required: true },
    insurerName: String,
    insurerId: String,
    planName: String,

    // Clinical
    serviceDate: { type: Date, required: true },
    diagnosis: [
      {
        code: String, // ICD-10
        description: String,
      },
    ],
    services: [
      {
        code: String, // CPT / local code
        description: String,
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        total: Number,
      },
    ],

    // Financial
    totalAmount: { type: Number, required: true },
    approvedAmount: Number,
    patientShare: Number,
    copay: Number,
    deductible: Number,

    // NPHIES envelope
    nphies: {
      eligibility: {
        status: {
          type: String,
          enum: ['eligible', 'not_covered', 'requires_preauth', 'unknown'],
        },
        checkedAt: Date,
        message: String,
        mode: String,
      },
      submission: {
        status: {
          type: String,
          enum: ['NOT_SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING_REVIEW', 'ERROR'],
          default: 'NOT_SUBMITTED',
          index: true,
        },
        submittedAt: Date,
        // W1437 — track last submission mutation so the reconciliation sweeper
        // can skip claims that were just updated (instead of scanning all
        // PENDING_REVIEW claims).
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
        claimReference: String,
        reason: String,
        message: String,
        mode: String,
      },
    },

    status: {
      type: String,
      enum: ['DRAFT', 'READY', 'SUBMITTED', 'PAID', 'DENIED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

NphiesClaimSchema.index({ beneficiary: 1, status: 1 });
NphiesClaimSchema.index({ 'nphies.submission.status': 1, serviceDate: -1 });
// W1426/W1437 — cover nphies-reconciliation sweeper query that was timing out in production.
// Status equality + updatedAt range are the filters; submittedAt is the sort key.
NphiesClaimSchema.index({
  'nphies.submission.status': 1,
  'nphies.submission.updatedAt': 1,
  'nphies.submission.submittedAt': 1,
});

// W1437 — auto-stamp submission.updatedAt whenever the submission subdoc changes.
// If FEATURE_W1437=false the field is still defaulted but not auto-updated,
// matching pre-W1437 behavior.
NphiesClaimSchema.pre('save', async function () {
  if (isFeatureEnabled('w1437') && this.isModified('nphies.submission')) {
    this.nphies.submission.updatedAt = new Date();
  }
});

module.exports = mongoose.models.NphiesClaim || mongoose.model('NphiesClaim', NphiesClaimSchema);
