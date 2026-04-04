/**
 * ContractApproval Model — خطوات موافقة العقد
 * النظام 35: إدارة العقود والاتفاقيات
 */
const mongoose = require('mongoose');

const contractApprovalSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    stepOrder: { type: Number, required: true },
    stepName: { type: String, required: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverRole: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending',
    },
    comments: { type: String },
    attachments: [{ fileName: String, fileUrl: String }],
    reviewedAt: { type: Date },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'return_for_revision', 'pending', null],
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'contract_approvals' }
);

contractApprovalSchema.index({ contractId: 1 });
contractApprovalSchema.index({ status: 1 });
contractApprovalSchema.index({ approverId: 1 });

module.exports =
  mongoose.models.ContractApproval || mongoose.model('ContractApproval', contractApprovalSchema);
