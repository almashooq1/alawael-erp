/**
 * Treasury Operation Models
 * إدارة الخزينة المتقدمة - Cash Pools, FX Hedging, Bank Relations
 * Cash management, counterparty limits, interest rate operations
 */
const mongoose = require('mongoose');

const treasuryOperationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    operationNumber: { type: String, unique: true },
    operationType: {
      type: String,
      enum: [
        'cash_pool',
        'fx_spot',
        'fx_forward',
        'fx_swap',
        'interest_rate_swap',
        'money_market',
        'deposit',
        'loan_drawdown',
        'repayment',
        'guarantee',
        'letter_of_credit',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'executed',
        'settled',
        'cancelled',
        'expired',
        'matured',
      ],
      default: 'draft',
    },
    tradeDate: { type: Date, required: true },
    valueDate: { type: Date },
    maturityDate: { type: Date },
    counterparty: {
      name: { type: String },
      bankCode: { type: String },
      swiftCode: { type: String },
      country: { type: String },
      creditRating: { type: String },
      exposureLimit: { type: Number, default: 0 },
      currentExposure: { type: Number, default: 0 },
    },
    amounts: {
      baseCurrency: { type: String, default: 'SAR' },
      baseAmount: { type: Number, default: 0 },
      counterCurrency: { type: String },
      counterAmount: { type: Number, default: 0 },
      exchangeRate: { type: Number },
      spotRate: { type: Number },
      forwardPoints: { type: Number },
    },
    interestRate: {
      type: { type: String, enum: ['fixed', 'floating', 'zero'] },
      rate: { type: Number },
      benchmark: { type: String, enum: ['SAIBOR', 'SIBOR', 'SOFR', 'EURIBOR', 'custom'] },
      spread: { type: Number, default: 0 },
      dayCount: {
        type: String,
        enum: ['30/360', 'actual/360', 'actual/365', 'actual/actual'],
        default: '30/360',
      },
    },
    cashPool: {
      poolName: { type: String },
      poolType: { type: String, enum: ['physical', 'notional', 'zero_balance'] },
      headerAccount: { type: String },
      participatingAccounts: [
        {
          accountNumber: { type: String },
          bankName: { type: String },
          currency: { type: String },
          balance: { type: Number, default: 0 },
          sweepTarget: { type: Number, default: 0 },
        },
      ],
    },
    hedging: {
      isHedge: { type: Boolean, default: false },
      hedgeType: { type: String, enum: ['fair_value', 'cash_flow', 'net_investment'] },
      hedgedItem: { type: String },
      hedgeEffectiveness: { type: Number },
      hedgeRatio: { type: Number },
    },
    settlement: {
      method: { type: String, enum: ['gross', 'net', 'delivery'] },
      bankAccount: { type: String },
      confirmationRef: { type: String },
      settledDate: { type: Date },
      settledAmount: { type: Number },
    },
    approval: {
      requiredLevel: {
        type: String,
        enum: ['standard', 'senior', 'executive', 'board'],
        default: 'standard',
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedDate: { type: Date },
      comments: { type: String },
    },
    notes: { type: String },
    attachments: [
      { fileName: { type: String }, filePath: { type: String }, uploadDate: { type: Date } },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

treasuryOperationSchema.pre('save', async function () {
  if (!this.operationNumber) {
    const count = await this.constructor.countDocuments();
    this.operationNumber = `TRS-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.models.TreasuryOperation || mongoose.model('TreasuryOperation', treasuryOperationSchema);
