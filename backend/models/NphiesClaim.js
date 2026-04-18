/**
 * NphiesClaim — insurance claim tracking for a beneficiary session/encounter.
 *
 * Independent of local Invoice model — an invoice can have a linked
 * nphiesClaim, but claims have their own lifecycle dictated by NPHIES.
 */

'use strict';

const mongoose = require('mongoose');

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

module.exports = mongoose.models.NphiesClaim || mongoose.model('NphiesClaim', NphiesClaimSchema);
