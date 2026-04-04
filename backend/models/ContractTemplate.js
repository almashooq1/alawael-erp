/**
 * ContractTemplate Model — قوالب العقود
 * النظام 35: إدارة العقود والاتفاقيات
 */
const mongoose = require('mongoose');

const contractTemplateSchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    type: {
      type: String,
      enum: [
        'employment',
        'vendor',
        'sla',
        'insurance',
        'lease',
        'maintenance',
        'partnership',
        'consultancy',
        'training',
      ],
      required: true,
    },
    bodyAr: { type: String, required: true },
    bodyEn: { type: String },
    variables: [
      {
        key: String, // e.g. {party_name}
        label: String,
        type: { type: String, enum: ['text', 'date', 'number', 'currency'] },
        required: { type: Boolean, default: false },
      },
    ],
    defaultDurationMonths: { type: Number, default: 12 },
    autoRenewal: { type: Boolean, default: false },
    renewalNoticeDays: { type: Number, default: 30 },
    requiresParties: { type: Number, default: 2 },
    approvalStages: [
      {
        step: Number,
        name: String,
        role: String,
        required: { type: Boolean, default: true },
      },
    ],
    requiresNotarization: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    version: { type: String, default: '1.0' },
    description: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'contract_templates' }
);

contractTemplateSchema.index({ type: 1 });
contractTemplateSchema.index({ code: 1 });
contractTemplateSchema.index({ isActive: 1 });

module.exports =
  mongoose.models.ContractTemplate || mongoose.model('ContractTemplate', contractTemplateSchema);
