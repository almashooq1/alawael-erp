/**
 * Tax Filing & Tax Penalty Models
 * إدارة الإقرارات الضريبية - ZATCA Filing Tracker
 * VAT/Zakat/WHT submission lifecycle & penalty tracking
 */
const mongoose = require('mongoose');

const taxFilingSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    filingNumber: { type: String, unique: true, sparse: true },
    type: {
      type: String,
      enum: ['VAT', 'Zakat', 'WHT', 'Excise', 'CIT'],
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    periodLabel: { type: String },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'quarterly',
    },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        'upcoming',
        'draft',
        'prepared',
        'under_review',
        'submitted',
        'accepted',
        'assessed',
        'amended',
        'overdue',
      ],
      default: 'upcoming',
    },
    preparedAmount: { type: Number, default: 0 },
    submittedAmount: { type: Number, default: 0 },
    assessedAmount: { type: Number, default: 0 },
    differenceAmount: { type: Number, default: 0 },
    zatcaReference: { type: String },
    receiptDocument: { type: String },
    correctionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxFiling' },
    amendmentNotes: { type: String },

    // Tax computation breakdown
    taxableAmount: { type: Number, default: 0 },
    exemptAmount: { type: Number, default: 0 },
    zeroRatedAmount: { type: Number, default: 0 },
    inputTax: { type: Number, default: 0 },
    outputTax: { type: Number, default: 0 },
    netTaxPayable: { type: Number, default: 0 },

    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    preparedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    paidAt: { type: Date },
    paymentReference: { type: String },

    attachments: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taxFilingSchema.pre('save', function (next) {
  if (!this.filingNumber && this.isNew) {
    this.filingNumber = `TF-${this.type}-${Date.now().toString(36).toUpperCase()}`;
  }
  this.differenceAmount = (this.assessedAmount || 0) - (this.submittedAmount || 0);
  next();
});

taxFilingSchema.index({ organization: 1, type: 1, periodStart: 1 });
taxFilingSchema.index({ status: 1, dueDate: 1 });

/* ── Tax Penalty ── */
const taxPenaltySchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    filingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxFiling', required: true },
    type: {
      type: String,
      enum: [
        'late_filing',
        'late_payment',
        'underreporting',
        'non_compliance',
        'correction_penalty',
        'other',
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    interestAmount: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['assessed', 'contested', 'paid', 'waived', 'partially_paid'],
      default: 'assessed',
    },
    paidAmount: { type: Number, default: 0 },
    paidDate: { type: Date },
    paymentReference: { type: String },
    zatcaReference: { type: String },
    contestNotes: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taxPenaltySchema.pre('save', function (next) {
  this.totalDue = (this.amount || 0) + (this.interestAmount || 0);
  next();
});

taxPenaltySchema.index({ organization: 1, filingId: 1 });
taxPenaltySchema.index({ status: 1 });

const TaxFiling = mongoose.model('TaxFiling', taxFilingSchema);
const TaxPenalty = mongoose.model('TaxPenalty', taxPenaltySchema);

module.exports = { TaxFiling, TaxPenalty };
