/**
 * ContractNegotiation Model — سجل التفاوض على العقود
 * النظام 35: إدارة العقود والاتفاقيات
 */
const mongoose = require('mongoose');

const contractNegotiationSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['comment', 'propose_change', 'accept', 'reject', 'counter_offer'],
      required: true,
    },
    content: { type: String, required: true },
    sectionReference: { type: String },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open',
    },
    attachments: [{ fileName: String, fileUrl: String }],
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'contract_negotiations' }
);

contractNegotiationSchema.index({ contractId: 1 });
contractNegotiationSchema.index({ userId: 1 });
contractNegotiationSchema.index({ status: 1 });

module.exports =
  mongoose.models.ContractNegotiation ||
  mongoose.model('ContractNegotiation', contractNegotiationSchema);
