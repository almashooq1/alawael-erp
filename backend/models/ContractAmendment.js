/**
 * ContractAmendment Model — ملاحق وتعديلات العقود
 * النظام 35: إدارة العقود والاتفاقيات
 */
const mongoose = require('mongoose');

const contractAmendmentSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    amendmentNumber: { type: String, required: true, unique: true, uppercase: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['addendum', 'amendment', 'extension', 'termination', 'renewal'],
      required: true,
    },
    description: { type: String, required: true },
    effectiveDate: { type: Date, required: true },
    newEndDate: { type: Date },
    valueChange: { type: Number },
    status: {
      type: String,
      enum: ['draft', 'approved', 'signed', 'rejected'],
      default: 'draft',
    },
    signatureData: { type: mongoose.Schema.Types.Mixed },
    documentPath: { type: String },
    attachments: [{ fileName: String, fileUrl: String }],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'contract_amendments' }
);

contractAmendmentSchema.index({ contractId: 1 });
contractAmendmentSchema.index({ status: 1 });
contractAmendmentSchema.index({ effectiveDate: 1 });

module.exports =
  mongoose.models.ContractAmendment || mongoose.model('ContractAmendment', contractAmendmentSchema);
