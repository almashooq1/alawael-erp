/**
 * Lease Accounting Models - IFRS 16
 * محاسبة الإيجارات - Right-of-Use Assets & Lease Liabilities
 * ROU calculation, amortization, interest expense, modification handling
 */
const mongoose = require('mongoose');

const leasePaymentScheduleSchema = new mongoose.Schema({
  paymentNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  leasePayment: { type: Number, required: true },
  interestExpense: { type: Number, default: 0 },
  principalReduction: { type: Number, default: 0 },
  closingLiability: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  status: {
    type: String,
    enum: ['upcoming', 'due', 'paid', 'overdue'],
    default: 'upcoming',
  },
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
});

const leaseSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    leaseNumber: { type: String, unique: true },
    lessorName: { type: String, required: true },
    assetDescription: { type: String, required: true },
    assetCategory: {
      type: String,
      enum: [
        'building',
        'vehicle',
        'equipment',
        'land',
        'office_space',
        'warehouse',
        'it_equipment',
        'other',
      ],
      default: 'building',
    },
    leaseType: {
      type: String,
      enum: ['finance_lease', 'operating_lease', 'short_term', 'low_value'],
      default: 'finance_lease',
    },
    commencementDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaseTermMonths: { type: Number, required: true },
    hasRenewalOption: { type: Boolean, default: false },
    renewalTermMonths: { type: Number },
    renewalReasonablyCertain: { type: Boolean, default: false },
    monthlyPayment: { type: Number, required: true },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
      default: 'monthly',
    },
    annualEscalation: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    incrementalBorrowingRate: { type: Number, required: true }, // Discount rate %
    // IFRS 16 Calculations
    rouAssetInitial: { type: Number, default: 0 },
    rouAssetCurrent: { type: Number, default: 0 },
    leaseLiabilityInitial: { type: Number, default: 0 },
    leaseLiabilityCurrent: { type: Number, default: 0 },
    totalInterestExpense: { type: Number, default: 0 },
    totalDepreciation: { type: Number, default: 0 },
    depreciationMethod: {
      type: String,
      enum: ['straight_line', 'reducing_balance'],
      default: 'straight_line',
    },
    paymentSchedule: [leasePaymentScheduleSchema],
    modifications: [
      {
        modificationDate: { type: Date },
        description: { type: String },
        type: {
          type: String,
          enum: ['term_extension', 'term_reduction', 'payment_change', 'scope_change'],
          default: 'payment_change',
        },
        newMonthlyPayment: { type: Number },
        newEndDate: { type: Date },
        rouAdjustment: { type: Number, default: 0 },
        liabilityAdjustment: { type: Number, default: 0 },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    status: {
      type: String,
      enum: [
        'draft',
        'active',
        'modified',
        'terminated',
        'expired',
        'short_term_exempt',
        'low_value_exempt',
      ],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

leaseSchema.pre('save', async function (next) {
  if (!this.leaseNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.leaseNumber = `LSE-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.models.LeaseContract || mongoose.model('LeaseContract', leaseSchema);
