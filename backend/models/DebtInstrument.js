/**
 * Debt Instrument Models
 * إدارة الديون - Bonds, Loans, Facilities, Covenants
 * Amortization schedules, covenant compliance, refinancing
 */
const mongoose = require('mongoose');

const debtInstrumentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    debtNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    instrumentType: {
      type: String,
      enum: [
        'term_loan',
        'revolving_facility',
        'bond',
        'sukuk',
        'murabaha',
        'overdraft',
        'trade_finance',
        'lease_finance',
        'bilateral_loan',
        'syndicated_loan',
        'commercial_paper',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'proposed',
        'negotiating',
        'approved',
        'active',
        'fully_drawn',
        'repaying',
        'matured',
        'defaulted',
        'refinanced',
        'cancelled',
      ],
      default: 'proposed',
    },
    lender: {
      name: { type: String },
      type: { type: String, enum: ['bank', 'institution', 'government', 'bond_market', 'private'] },
      contactPerson: { type: String },
      contactEmail: { type: String },
    },
    facility: {
      currency: { type: String, default: 'SAR' },
      facilityAmount: { type: Number, required: true },
      drawnAmount: { type: Number, default: 0 },
      availableAmount: { type: Number, default: 0 },
      commitmentFee: { type: Number, default: 0 },
    },
    terms: {
      effectiveDate: { type: Date },
      maturityDate: { type: Date },
      tenorMonths: { type: Number },
      gracePeriodMonths: { type: Number, default: 0 },
      interestType: { type: String, enum: ['fixed', 'floating', 'zero_coupon', 'murabaha_profit'] },
      interestRate: { type: Number },
      benchmark: { type: String, enum: ['SAIBOR', 'SIBOR', 'SOFR', 'EURIBOR', 'custom'] },
      spread: { type: Number, default: 0 },
      dayCount: { type: String, enum: ['30/360', 'actual/360', 'actual/365'], default: '30/360' },
      paymentFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'bullet'],
        default: 'quarterly',
      },
    },
    amortization: [
      {
        periodNumber: { type: Number },
        dueDate: { type: Date },
        principalAmount: { type: Number, default: 0 },
        interestAmount: { type: Number, default: 0 },
        totalPayment: { type: Number, default: 0 },
        outstandingBalance: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['scheduled', 'paid', 'overdue', 'waived'],
          default: 'scheduled',
        },
        paidDate: { type: Date },
        paidAmount: { type: Number },
      },
    ],
    covenants: [
      {
        covenantName: { type: String },
        covenantType: {
          type: String,
          enum: ['financial', 'operational', 'reporting', 'negative_pledge', 'information'],
        },
        description: { type: String },
        metric: { type: String },
        threshold: { type: Number },
        operator: { type: String, enum: ['>=', '<=', '>', '<', '=='] },
        currentValue: { type: Number },
        testFrequency: { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual'] },
        lastTestDate: { type: Date },
        compliant: { type: Boolean, default: true },
        waiverObtained: { type: Boolean, default: false },
      },
    ],
    security: {
      secured: { type: Boolean, default: false },
      collateralType: { type: String },
      collateralValue: { type: Number },
      ltv: { type: Number },
    },
    refinancing: {
      refinanceable: { type: Boolean, default: false },
      prepaymentPenalty: { type: Number, default: 0 },
      callDate: { type: Date },
      refinancedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'DebtInstrument' },
      refinancedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DebtInstrument' },
    },
    fees: [
      {
        feeType: {
          type: String,
          enum: ['arrangement', 'commitment', 'agency', 'legal', 'underwriting', 'other'],
        },
        amount: { type: Number },
        paid: { type: Boolean, default: false },
        paidDate: { type: Date },
      },
    ],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

debtInstrumentSchema.pre('save', async function () {
  if (!this.debtNumber) {
    const count = await this.constructor.countDocuments();
    this.debtNumber = `DBT-${String(count + 1).padStart(5, '0')}`;
  }
  this.facility.availableAmount = this.facility.facilityAmount - this.facility.drawnAmount;
});

module.exports = mongoose.models.DebtInstrument || mongoose.model('DebtInstrument', debtInstrumentSchema);
