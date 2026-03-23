/**
 * Company Loan & Loan Drawdown Models
 * إدارة القروض والتمويل - Company Borrowing & Islamic Finance
 * Term loans, Murabaha, Tawarruq, revolving facilities & covenant tracking
 */
const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  principalAmount: { type: Number, required: true },
  profitAmount: { type: Number, required: true },
  totalDue: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  status: {
    type: String,
    enum: ['upcoming', 'due', 'paid', 'overdue', 'partially_paid'],
    default: 'upcoming',
  },
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
});

const covenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String },
  description: { type: String },
  metric: {
    type: String,
    enum: [
      'debt_equity_ratio',
      'current_ratio',
      'interest_coverage',
      'dscr',
      'leverage_ratio',
      'custom',
    ],
    default: 'custom',
  },
  threshold: { type: Number, required: true },
  operator: { type: String, enum: ['min', 'max', 'eq'], default: 'max' },
  currentValue: { type: Number },
  compliant: { type: Boolean, default: true },
  lastCheckedAt: { type: Date },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'annual'], default: 'quarterly' },
});

const companyLoanSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    loanNumber: { type: String, unique: true, sparse: true },
    lenderName: { type: String, required: true, trim: true },
    lenderNameEn: { type: String, trim: true },
    lenderBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    facilityType: {
      type: String,
      enum: [
        'term_loan',
        'revolving',
        'murabaha',
        'tawarruq',
        'overdraft',
        'bridging',
        'syndicated',
        'government_subsidized',
        'other',
      ],
      required: true,
    },
    purpose: { type: String },
    principalAmount: { type: Number, required: true },
    drawnAmount: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    profitRate: { type: Number, default: 0 },
    profitRateType: { type: String, enum: ['fixed', 'variable', 'sibor_plus'], default: 'fixed' },
    siborSpread: { type: Number, default: 0 },
    repaymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'bullet'],
      default: 'monthly',
    },
    totalInstallments: { type: Number },
    paidInstallments: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    gracePeriodMonths: { type: Number, default: 0 },
    amortizationSchedule: [installmentSchema],
    covenants: [covenantSchema],
    collateral: { type: String },
    collateralValue: { type: Number },
    linkedBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    chartAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    status: {
      type: String,
      enum: [
        'proposed',
        'approved',
        'active',
        'restructured',
        'completed',
        'defaulted',
        'cancelled',
      ],
      default: 'proposed',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

companyLoanSchema.pre('save', function (next) {
  if (!this.loanNumber && this.isNew) {
    const prefix =
      this.facilityType === 'murabaha' ? 'MRB' : this.facilityType === 'tawarruq' ? 'TWR' : 'LN';
    this.loanNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

companyLoanSchema.index({ organization: 1, status: 1 });
companyLoanSchema.index({ maturityDate: 1 });
companyLoanSchema.index({ facilityType: 1 });

/* ── Loan Drawdown (for revolving facilities) ── */
const loanDrawdownSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyLoan', required: true },
    drawdownNumber: { type: String },
    amount: { type: Number, required: true },
    drawdownDate: { type: Date, default: Date.now },
    maturityDate: { type: Date },
    purpose: { type: String },
    status: {
      type: String,
      enum: ['pending', 'disbursed', 'repaid', 'rolled_over'],
      default: 'pending',
    },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

loanDrawdownSchema.pre('save', function (next) {
  if (!this.drawdownNumber && this.isNew) {
    this.drawdownNumber = `DD-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

loanDrawdownSchema.index({ loanId: 1, drawdownDate: -1 });

const CompanyLoan = mongoose.models.CompanyLoan || mongoose.model('CompanyLoan', companyLoanSchema);
const LoanDrawdown = mongoose.models.LoanDrawdown || mongoose.model('LoanDrawdown', loanDrawdownSchema);

module.exports = { CompanyLoan, LoanDrawdown };
