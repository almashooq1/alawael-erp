'use strict';

const mongoose = require('mongoose');

const beneficiaryTransferSchema = new mongoose.Schema(
  {
    // FK field names are BARE (beneficiary/fromBranch/toBranch) to match the
    // service writer + both list routes, which were always bare. Direction A of
    // docs/architecture/findings/beneficiary-transfer-field-drift-2026-06-06.md
    // (schema→bare, non-breaking): the prior *Id schema names were silently
    // stripped on write under strict:true → transfers persisted no FK at all.
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, required: true },
    transferDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    transferNotes: { type: mongoose.Schema.Types.Mixed, default: null },
    transferRecords: { type: Boolean, default: true }, // نقل السجلات
    continuePlan: { type: Boolean, default: true }, // استمرار الخطة العلاجية
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

beneficiaryTransferSchema.index({ beneficiary: 1, status: 1 });
beneficiaryTransferSchema.index({ fromBranch: 1, status: 1 });
beneficiaryTransferSchema.index({ toBranch: 1, status: 1 });

module.exports =
  mongoose.models.BeneficiaryTransfer ||
  mongoose.model('BeneficiaryTransfer', beneficiaryTransferSchema);
