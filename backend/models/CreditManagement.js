/**
 * Credit Management Models
 * إدارة الائتمان - Customer Credit Limits, Scoring & Insurance
 * Credit policies, risk assessment, credit holds, insurance coverage
 */
const mongoose = require('mongoose');

const creditProfileSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    creditLimit: { type: Number, required: true },
    usedCredit: { type: Number, default: 0 },
    availableCredit: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    creditScore: { type: Number, min: 0, max: 100, default: 50 },
    riskCategory: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high', 'blacklisted'],
      default: 'medium',
    },
    paymentTermsDays: { type: Number, default: 30 },
    averagePaymentDays: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    totalOverdue: { type: Number, default: 0 },
    overdueInvoicesCount: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
    lastReviewDate: { type: Date },
    nextReviewDate: { type: Date },
    creditInsurance: {
      insured: { type: Boolean, default: false },
      insurer: { type: String },
      policyNumber: { type: String },
      coverageAmount: { type: Number, default: 0 },
      coveragePct: { type: Number, default: 0 },
      expiryDate: { type: Date },
    },
    approvalHistory: [
      {
        date: { type: Date },
        previousLimit: { type: Number },
        newLimit: { type: Number },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
      },
    ],
    holdStatus: {
      onHold: { type: Boolean, default: false },
      holdDate: { type: Date },
      holdReason: { type: String },
      heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    status: {
      type: String,
      enum: ['active', 'under_review', 'suspended', 'on_hold', 'closed'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

creditProfileSchema.pre('save', function (next) {
  this.availableCredit = Math.max(0, (this.creditLimit || 0) - (this.usedCredit || 0));
  next();
});

const CreditProfile = mongoose.models.CreditProfile || mongoose.model('CreditProfile', creditProfileSchema);

// Credit Application - طلب ائتمان
const creditApplicationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    applicationNumber: { type: String, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    requestedLimit: { type: Number, required: true },
    currentLimit: { type: Number, default: 0 },
    applicationType: {
      type: String,
      enum: ['new', 'increase', 'decrease', 'renewal'],
      default: 'new',
    },
    financialStatements: {
      annualRevenue: { type: Number },
      totalAssets: { type: Number },
      totalLiabilities: { type: Number },
      netIncome: { type: Number },
      currentRatio: { type: Number },
      debtEquityRatio: { type: Number },
    },
    tradeReferences: [
      {
        companyName: { type: String },
        contactPerson: { type: String },
        phone: { type: String },
        creditLimit: { type: Number },
        paymentHistory: { type: String },
      },
    ],
    creditCheckResult: {
      performed: { type: Boolean, default: false },
      provider: { type: String },
      score: { type: Number },
      rating: { type: String },
      checkedDate: { type: Date },
    },
    approvedLimit: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditApplicationSchema.pre('save', async function (next) {
  if (!this.applicationNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.applicationNumber = `CRA-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const CreditApplication = mongoose.models.CreditApplication || mongoose.model('CreditApplication', creditApplicationSchema);

module.exports = { CreditProfile, CreditApplication };
