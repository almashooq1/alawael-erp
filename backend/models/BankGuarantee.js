/**
 * Bank Guarantee & Letter of Credit Models
 * خطابات الضمان والاعتمادات المستندية
 * Essential for Saudi construction, government contracts & import/export
 */
const mongoose = require('mongoose');

/* ── Bank Guarantee (LG) ── */
const bankGuaranteeSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    guaranteeNumber: { type: String, unique: true, sparse: true },
    type: {
      type: String,
      enum: [
        'tender',
        'performance',
        'advance_payment',
        'retention',
        'payment',
        'customs',
        'other',
      ],
      required: true,
    },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    bankName: { type: String, required: true },
    beneficiaryName: { type: String, required: true },
    beneficiaryNameEn: { type: String },
    contractRef: { type: String },
    projectName: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    marginPercent: { type: Number, default: 0 },
    marginAmount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    issuedDate: { type: Date },
    expiryDate: { type: Date, required: true },
    renewalDate: { type: Date },
    status: {
      type: String,
      enum: [
        'requested',
        'issued',
        'active',
        'renewed',
        'released',
        'claimed',
        'expired',
        'cancelled',
      ],
      default: 'requested',
    },
    relatedJournalEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }],
    documents: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bankGuaranteeSchema.index({ organization: 1, status: 1 });
bankGuaranteeSchema.index({ expiryDate: 1 });
bankGuaranteeSchema.index({ type: 1 });

/* ── Letter of Credit (LC) ── */
const lcStageSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['opened', 'amended', 'shipped', 'docs_presented', 'docs_accepted', 'paid', 'closed'],
    required: true,
  },
  date: { type: Date, default: Date.now },
  amount: { type: Number },
  notes: { type: String },
  documents: [{ name: { type: String }, url: { type: String } }],
});

const letterOfCreditSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    lcNumber: { type: String, unique: true, sparse: true },
    type: { type: String, enum: ['import', 'export', 'standby', 'revolving'], default: 'import' },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    bankName: { type: String, required: true },
    applicantName: { type: String },
    beneficiaryName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    marginPercent: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    issuedDate: { type: Date },
    expiryDate: { type: Date, required: true },
    shipmentDeadline: { type: Date },
    stages: [lcStageSchema],
    currentStage: { type: String, default: 'opened' },
    goodsDescription: { type: String },
    portOfLoading: { type: String },
    portOfDischarge: { type: String },
    incoterms: { type: String },
    status: {
      type: String,
      enum: ['draft', 'opened', 'active', 'docs_pending', 'paid', 'closed', 'cancelled', 'expired'],
      default: 'draft',
    },
    relatedJournalEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

letterOfCreditSchema.index({ organization: 1, status: 1 });
letterOfCreditSchema.index({ expiryDate: 1 });

const BankGuarantee = mongoose.models.BankGuarantee || mongoose.model('BankGuarantee', bankGuaranteeSchema);
const LetterOfCredit = mongoose.models.LetterOfCredit || mongoose.model('LetterOfCredit', letterOfCreditSchema);

module.exports = { BankGuarantee, LetterOfCredit };
