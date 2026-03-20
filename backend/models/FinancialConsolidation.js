/**
 * Financial Consolidation Models
 * التجميع المالي - Multi-Entity/Branch Consolidation
 * Consolidated reporting, elimination entries, currency translation
 */
const mongoose = require('mongoose');

const eliminationEntrySchema = new mongoose.Schema({
  debitAccount: { type: String, required: true },
  creditAccount: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  eliminationType: {
    type: String,
    enum: [
      'intercompany_revenue',
      'intercompany_payable',
      'intercompany_investment',
      'unrealized_profit',
      'dividend',
      'other',
    ],
    default: 'other',
  },
});

const consolidationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    consolidationNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    period: { type: String, required: true }, // e.g., '2026-Q1'
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    entities: [
      {
        entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
        entityName: { type: String, required: true },
        ownershipPct: { type: Number, default: 100 },
        currency: { type: String, default: 'SAR' },
        exchangeRate: { type: Number, default: 1 },
        consolidationMethod: {
          type: String,
          enum: ['full', 'proportional', 'equity', 'excluded'],
          default: 'full',
        },
        totalAssets: { type: Number, default: 0 },
        totalLiabilities: { type: Number, default: 0 },
        totalEquity: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 },
        netIncome: { type: Number, default: 0 },
      },
    ],
    eliminationEntries: [eliminationEntrySchema],
    consolidated: {
      totalAssets: { type: Number, default: 0 },
      totalLiabilities: { type: Number, default: 0 },
      totalEquity: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      netIncome: { type: Number, default: 0 },
      minorityInterest: { type: Number, default: 0 },
    },
    currencyTranslation: {
      method: {
        type: String,
        enum: ['current_rate', 'temporal', 'monetary_nonmonetary'],
        default: 'current_rate',
      },
      functionalCurrency: { type: String, default: 'SAR' },
      translationAdjustment: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'review', 'approved', 'published'],
      default: 'draft',
    },
    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

consolidationSchema.pre('save', async function (next) {
  if (!this.consolidationNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.consolidationNumber = `CON-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('FinancialConsolidation', consolidationSchema);
