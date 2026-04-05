'use strict';

const mongoose = require('mongoose');

const beneficiaryTransferSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    fromBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
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

beneficiaryTransferSchema.index({ beneficiaryId: 1, status: 1 });
beneficiaryTransferSchema.index({ fromBranchId: 1, status: 1 });
beneficiaryTransferSchema.index({ toBranchId: 1, status: 1 });

module.exports =
  mongoose.models.BeneficiaryTransfer ||
  mongoose.model('BeneficiaryTransfer', beneficiaryTransferSchema);
