/**
 * Financial Planning & Analysis Models
 * التخطيط والتحليل المالي - FP&A
 * Scenario modeling, rolling forecasts, KPI dashboards, variance analysis
 */
const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String },
  category: {
    type: String,
    enum: ['profitability', 'liquidity', 'efficiency', 'leverage', 'growth', 'custom'],
    default: 'custom',
  },
  formula: { type: String },
  targetValue: { type: Number },
  actualValue: { type: Number, default: 0 },
  unit: {
    type: String,
    enum: ['percentage', 'currency', 'ratio', 'days', 'count'],
    default: 'currency',
  },
  trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
  status: { type: String, enum: ['on_track', 'at_risk', 'off_track'], default: 'on_track' },
});

const financialPlanSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    planNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    planType: {
      type: String,
      enum: ['annual_budget', 'rolling_forecast', 'scenario', 'long_range', 'strategic'],
      default: 'annual_budget',
    },
    fiscalYear: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    currency: { type: String, default: 'SAR' },
    // Revenue plan
    revenuePlan: [
      {
        period: { type: String }, // e.g., '2026-01'
        category: { type: String },
        planned: { type: Number, default: 0 },
        actual: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        variancePct: { type: Number, default: 0 },
      },
    ],
    // Expense plan
    expensePlan: [
      {
        period: { type: String },
        category: { type: String },
        costCenter: { type: String },
        planned: { type: Number, default: 0 },
        actual: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        variancePct: { type: Number, default: 0 },
      },
    ],
    // Capital expenditure plan
    capexPlan: [
      {
        description: { type: String },
        category: { type: String },
        amount: { type: Number, default: 0 },
        quarter: { type: String },
        approved: { type: Boolean, default: false },
      },
    ],
    // Cash flow projections
    cashFlowProjection: [
      {
        period: { type: String },
        operatingInflow: { type: Number, default: 0 },
        operatingOutflow: { type: Number, default: 0 },
        investingCashFlow: { type: Number, default: 0 },
        financingCashFlow: { type: Number, default: 0 },
        netCashFlow: { type: Number, default: 0 },
        closingBalance: { type: Number, default: 0 },
      },
    ],
    assumptions: [
      {
        name: { type: String },
        value: { type: String },
        basis: { type: String },
      },
    ],
    kpis: [kpiSchema],
    scenarios: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['base', 'optimistic', 'pessimistic', 'stress'],
          default: 'base',
        },
        revenueMultiplier: { type: Number, default: 1 },
        expenseMultiplier: { type: Number, default: 1 },
        projectedNetIncome: { type: Number, default: 0 },
        notes: { type: String },
      },
    ],
    totalPlannedRevenue: { type: Number, default: 0 },
    totalPlannedExpense: { type: Number, default: 0 },
    totalPlannedCapex: { type: Number, default: 0 },
    projectedNetIncome: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'approved', 'active', 'revised', 'archived'],
      default: 'draft',
    },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

financialPlanSchema.pre('save', async function (next) {
  if (!this.planNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.planNumber = `FPA-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('FinancialPlan', financialPlanSchema);
