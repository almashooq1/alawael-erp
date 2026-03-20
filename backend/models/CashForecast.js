/**
 * Cash Forecast & Treasury Transfer Models
 * إدارة الخزينة والتنبؤ النقدي
 * Cash forecasting, liquidity planning & inter-bank transfers
 */
const mongoose = require('mongoose');

/* ── Cash Flow Item (expected inflow/outflow) ── */
const cashFlowItemSchema = new mongoose.Schema({
  source: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  probability: { type: Number, default: 100, min: 0, max: 100 },
  expectedDate: { type: Date, required: true },
  category: {
    type: String,
    enum: [
      'receivables',
      'sales',
      'loans',
      'investment_income',
      'other_inflow',
      'payables',
      'salaries',
      'rent',
      'loan_repayment',
      'tax',
      'capex',
      'other_outflow',
    ],
  },
  isRecurring: { type: Boolean, default: false },
  actualAmount: { type: Number },
  actualDate: { type: Date },
});

const cashForecastSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    scenarioName: { type: String, required: true, trim: true },
    scenarioType: {
      type: String,
      enum: ['base', 'optimistic', 'pessimistic', 'custom'],
      default: 'base',
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    openingBalance: { type: Number, default: 0 },
    expectedInflows: [cashFlowItemSchema],
    expectedOutflows: [cashFlowItemSchema],
    totalExpectedInflows: { type: Number, default: 0 },
    totalExpectedOutflows: { type: Number, default: 0 },
    projectedClosing: { type: Number, default: 0 },
    minimumBalance: { type: Number, default: 0 },
    surplusDeficit: { type: Number, default: 0 },
    alertThreshold: { type: Number, default: 50000 },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

cashForecastSchema.pre('save', function (next) {
  this.totalExpectedInflows = (this.expectedInflows || []).reduce(
    (sum, i) => sum + i.amount * (i.probability / 100),
    0
  );
  this.totalExpectedOutflows = (this.expectedOutflows || []).reduce(
    (sum, o) => sum + o.amount * (o.probability / 100),
    0
  );
  this.projectedClosing =
    this.openingBalance + this.totalExpectedInflows - this.totalExpectedOutflows;
  this.surplusDeficit = this.projectedClosing - this.minimumBalance;
  next();
});

cashForecastSchema.index({ organization: 1, scenarioType: 1, periodStart: 1 });

/* ── Treasury Transfer (inter-bank) ── */
const treasuryTransferSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    transferNumber: { type: String, unique: true, sparse: true },
    fromBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    toBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    exchangeRate: { type: Number, default: 1 },
    transferDate: { type: Date, default: Date.now },
    valueDate: { type: Date },
    reference: { type: String },
    purpose: { type: String },
    fees: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'executed', 'cancelled', 'failed'],
      default: 'pending',
    },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

treasuryTransferSchema.pre('save', function (next) {
  if (!this.transferNumber && this.isNew) {
    this.transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

treasuryTransferSchema.index({ organization: 1, status: 1 });
treasuryTransferSchema.index({ transferDate: -1 });

const CashForecast = mongoose.model('CashForecast', cashForecastSchema);
const TreasuryTransfer = mongoose.model('TreasuryTransfer', treasuryTransferSchema);

module.exports = { CashForecast, TreasuryTransfer };
