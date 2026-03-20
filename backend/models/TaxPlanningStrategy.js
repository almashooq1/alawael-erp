/**
 * Tax Planning Strategy Models
 * التخطيط الضريبي - Tax Optimization, ZATCA Compliance Forecasting
 * Withholding planning, transfer pricing, scenario modeling
 */
const mongoose = require('mongoose');

const taxPlanningStrategySchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    strategyNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    strategyType: {
      type: String,
      enum: [
        'vat_optimization',
        'withholding_planning',
        'transfer_pricing',
        'zakat_planning',
        'income_tax',
        'customs_duty',
        'excise_tax',
        'real_estate_tax',
        'comprehensive',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'under_review', 'approved', 'active', 'completed', 'archived'],
      default: 'draft',
    },
    fiscalYear: { type: Number, required: true },
    period: {
      startDate: { type: Date },
      endDate: { type: Date },
      quarter: { type: Number },
    },
    currentTaxPosition: {
      vatPayable: { type: Number, default: 0 },
      vatReceivable: { type: Number, default: 0 },
      netVat: { type: Number, default: 0 },
      withholdingTax: { type: Number, default: 0 },
      zakatBase: { type: Number, default: 0 },
      zakatDue: { type: Number, default: 0 },
      incomeTax: { type: Number, default: 0 },
      totalTaxLiability: { type: Number, default: 0 },
    },
    scenarios: [
      {
        scenarioName: { type: String },
        description: { type: String },
        assumptions: [
          { parameter: { type: String }, value: { type: mongoose.Schema.Types.Mixed } },
        ],
        projectedRevenue: { type: Number, default: 0 },
        projectedExpenses: { type: Number, default: 0 },
        projectedTaxLiability: { type: Number, default: 0 },
        taxSavings: { type: Number, default: 0 },
        effectiveTaxRate: { type: Number, default: 0 },
        riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
        recommended: { type: Boolean, default: false },
      },
    ],
    vatPlanning: {
      inputVatOptimization: { type: Number, default: 0 },
      exemptSupplies: { type: Number, default: 0 },
      zeroRatedSupplies: { type: Number, default: 0 },
      partialExemption: { type: Number, default: 0 },
      capitalGoodsScheme: { type: Boolean, default: false },
      groupRegistration: { type: Boolean, default: false },
    },
    withholdingPlanning: [
      {
        paymentType: { type: String },
        country: { type: String },
        treatyRate: { type: Number },
        standardRate: { type: Number },
        estimatedPayments: { type: Number, default: 0 },
        estimatedWithholding: { type: Number, default: 0 },
        optimizedWithholding: { type: Number, default: 0 },
      },
    ],
    transferPricing: {
      applicable: { type: Boolean, default: false },
      relatedParties: [
        {
          entityName: { type: String },
          jurisdiction: { type: String },
          transactionType: {
            type: String,
            enum: ['goods', 'services', 'royalties', 'interest', 'management_fees'],
          },
          amount: { type: Number, default: 0 },
          pricingMethod: { type: String, enum: ['CUP', 'RPM', 'CPM', 'TNMM', 'PSM'] },
          armLengthCompliant: { type: Boolean, default: true },
        },
      ],
      documentation: { type: String, enum: ['local_file', 'master_file', 'cbcr', 'all'] },
    },
    zatcaCompliance: {
      eInvoicingReady: { type: Boolean, default: true },
      phase: { type: String, enum: ['phase1', 'phase2'] },
      complianceScore: { type: Number, default: 100 },
      filingDeadlines: [
        {
          filingType: { type: String },
          dueDate: { type: Date },
          status: { type: String, enum: ['pending', 'filed', 'overdue'] },
        },
      ],
      penalties: {
        estimated: { type: Number, default: 0 },
        actual: { type: Number, default: 0 },
      },
    },
    recommendations: [
      {
        title: { type: String },
        description: { type: String },
        potentialSavings: { type: Number, default: 0 },
        riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
        implementationCost: { type: Number, default: 0 },
        priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        status: {
          type: String,
          enum: ['proposed', 'accepted', 'implemented', 'rejected'],
          default: 'proposed',
        },
      },
    ],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taxPlanningStrategySchema.pre('save', async function () {
  if (!this.strategyNumber) {
    const count = await this.constructor.countDocuments();
    this.strategyNumber = `TXP-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('TaxPlanningStrategy', taxPlanningStrategySchema);
