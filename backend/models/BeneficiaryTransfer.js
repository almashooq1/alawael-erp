/**
 * BeneficiaryTransfer Model — نقل المستفيد بين الفروع
 * Based on: beneficiary_transfers table (prompt_02 §5.2)
 */
const mongoose = require('mongoose');

const BeneficiaryTransferSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    transferDate: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String },
    // وثائق مرفقة
    attachments: [
      {
        fileName: String,
        filePath: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BeneficiaryTransferSchema.index({ beneficiary: 1, status: 1 });
BeneficiaryTransferSchema.index({ fromBranch: 1 });
BeneficiaryTransferSchema.index({ toBranch: 1 });

module.exports = mongoose.model('BeneficiaryTransfer', BeneficiaryTransferSchema);
