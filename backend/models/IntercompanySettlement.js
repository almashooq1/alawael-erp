/**
 * Intercompany Settlement Models
 * التسويات بين الشركات - Intercompany Netting, Invoicing & Settlement
 * Bilateral/multilateral netting, transfer pricing, settlement runs
 */
const mongoose = require('mongoose');

const intercompanyInvoiceSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    invoiceNumber: { type: String, unique: true },
    fromEntity: { type: String, required: true },
    fromEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    toEntity: { type: String, required: true },
    toEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    transactionType: {
      type: String,
      enum: [
        'service_charge',
        'management_fee',
        'license_royalty',
        'cost_allocation',
        'goods_transfer',
        'loan_interest',
        'dividend',
        'reimbursement',
        'other',
      ],
      default: 'service_charge',
    },
    transferPricingMethod: {
      type: String,
      enum: ['cup', 'resale_minus', 'cost_plus', 'tnmm', 'profit_split', 'not_applicable'],
      default: 'not_applicable',
    },
    armLengthCompliant: { type: Boolean, default: true },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    matchingInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntercompanyInvoice' },
    matched: { type: Boolean, default: false },
    settlementRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'SettlementRun' },
    settled: { type: Boolean, default: false },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'received', 'confirmed', 'disputed', 'settled', 'cancelled'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

intercompanyInvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.invoiceNumber = `ICI-${String(count + 1).padStart(5, '0')}`;
  }
  this.totalAmount = (this.amount || 0) + (this.vatAmount || 0);
  next();
});

const IntercompanyInvoice = mongoose.models.IntercompanyInvoice || mongoose.model('IntercompanyInvoice', intercompanyInvoiceSchema);

// Settlement Run - دورة التسوية
const settlementRunSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    runNumber: { type: String, unique: true },
    name: { type: String, required: true },
    period: { type: String, required: true },
    nettingType: { type: String, enum: ['bilateral', 'multilateral'], default: 'bilateral' },
    settlementDate: { type: Date },
    entities: [
      {
        entityName: { type: String },
        entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
        totalReceivable: { type: Number, default: 0 },
        totalPayable: { type: Number, default: 0 },
        netPosition: { type: Number, default: 0 },
        settlementAmount: { type: Number, default: 0 },
        direction: { type: String, enum: ['pay', 'receive', 'zero'], default: 'zero' },
      },
    ],
    invoicesIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IntercompanyInvoice' }],
    totalGrossAmount: { type: Number, default: 0 },
    totalNetAmount: { type: Number, default: 0 },
    nettingSavings: { type: Number, default: 0 },
    nettingEfficiency: { type: Number, default: 0 }, // percentage
    status: {
      type: String,
      enum: ['draft', 'proposed', 'confirmed', 'executed', 'cancelled'],
      default: 'draft',
    },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

settlementRunSchema.pre('save', async function (next) {
  if (!this.runNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.runNumber = `STL-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const SettlementRun = mongoose.models.SettlementRun || mongoose.model('SettlementRun', settlementRunSchema);

module.exports = { IntercompanyInvoice, SettlementRun };
