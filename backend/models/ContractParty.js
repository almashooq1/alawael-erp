/**
 * ContractParty Model — أطراف العقد
 * النظام 35: إدارة العقود والاتفاقيات
 */
const mongoose = require('mongoose');

const contractPartySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    role: {
      type: String,
      enum: [
        'employer',
        'employee',
        'vendor',
        'client',
        'insurer',
        'lessor',
        'lessee',
        'partner',
        'other',
      ],
      required: true,
    },
    partyType: {
      type: String,
      enum: ['individual', 'company', 'government'],
      required: true,
    },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    nationalId: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String },
    representativeName: { type: String },
    representativeTitle: { type: String },
    signatureStatus: {
      type: String,
      enum: ['pending', 'signed', 'rejected'],
      default: 'pending',
    },
    signatureMethod: {
      type: String,
      enum: ['digital', 'physical', 'nafaz', 'absher', 'docusign', 'internal', null],
      default: null,
    },
    signatureDetails: { type: mongoose.Schema.Types.Mixed },
    signedAt: { type: Date },
    ipAddress: { type: String },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'contract_parties' }
);

contractPartySchema.index({ contractId: 1 });
contractPartySchema.index({ role: 1 });
contractPartySchema.index({ signatureStatus: 1 });

module.exports =
  mongoose.models.ContractParty || mongoose.model('ContractParty', contractPartySchema);
