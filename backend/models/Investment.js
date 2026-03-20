/**
 * Investment Portfolio Models
 * المحفظة الاستثمارية - Investment Tracking, Returns & Allocation
 * Equity, sukuk, mudarabah, real estate, funds tracking
 */
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    investmentNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    investmentType: {
      type: String,
      enum: [
        'equity',
        'sukuk',
        'mudarabah',
        'musharakah',
        'real_estate',
        'mutual_fund',
        'etf',
        'fixed_deposit',
        'government_bond',
        'private_equity',
        'venture_capital',
        'commodity',
        'other',
      ],
      required: true,
    },
    classification: {
      type: String,
      enum: ['fvtpl', 'fvoci', 'amortized_cost', 'equity_method', 'subsidiary'],
      default: 'fvtpl',
    },
    issuerName: { type: String },
    isinCode: { type: String },
    currency: { type: String, default: 'SAR' },
    acquisitionDate: { type: Date, required: true },
    maturityDate: { type: Date },
    quantity: { type: Number, default: 1 },
    acquisitionCost: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    fairValue: { type: Number, default: 0 },
    unrealizedGainLoss: { type: Number, default: 0 },
    realizedGainLoss: { type: Number, default: 0 },
    couponRate: { type: Number, default: 0 },
    expectedReturn: { type: Number, default: 0 },
    dividendIncome: { type: Number, default: 0 },
    profitIncome: { type: Number, default: 0 },
    portfolio: { type: String, default: 'main' },
    riskRating: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
      default: 'medium',
    },
    shariaCompliant: { type: Boolean, default: true },
    custodianBank: { type: String },
    valuationHistory: [
      {
        date: { type: Date },
        value: { type: Number },
        source: { type: String },
      },
    ],
    transactions: [
      {
        date: { type: Date },
        type: { type: String, enum: ['buy', 'sell', 'dividend', 'coupon', 'split', 'transfer'] },
        quantity: { type: Number },
        price: { type: Number },
        amount: { type: Number },
        fees: { type: Number, default: 0 },
        journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'matured', 'sold', 'impaired', 'written_off'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

investmentSchema.pre('save', async function (next) {
  if (!this.investmentNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.investmentNumber = `INV-${String(count + 1).padStart(5, '0')}`;
  }
  this.unrealizedGainLoss = (this.currentValue || 0) - (this.acquisitionCost || 0);
  next();
});

module.exports = mongoose.model('Investment', investmentSchema);
