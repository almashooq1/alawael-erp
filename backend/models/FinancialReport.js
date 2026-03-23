/* eslint-disable no-unused-vars */
/**
 * FinancialReport Model
 * طھظ‚ط§ط±ظٹط± ظ…ط§ظ„ظٹط© ط´ط§ظ…ظ„ط© (ط§ظ„ظ…ظٹط²ط§ظ†ظٹط© - ظ‚ط§ط¦ظ…ط©
ط§ظ„ط¯ط®ظ„ - ط§ظ„طھط¯ظپظ‚ط§طھ - ط§ظ„ظ†ط³ط¨)
 */

const mongoose = require('mongoose');

const financialReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },

    reportType: {
      type: String,
      enum: ['balance_sheet', 'income_statement', 'cash_flow', 'ratios', 'consolidated'],
      required: true,
      index: true,
    },

    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    balanceSheet: {
      assets: {
        current: {
          cash: Number,
          receivables: Number,
          inventory: Number,
          total: Number,
        },
        fixed: {
          propertyPlantEquipment: Number,
          intangibleAssets: Number,
          total: Number,
        },
        totalAssets: Number,
      },
      liabilities: {
        current: { payables: Number, shortTermBorrowings: Number, total: Number },
        longTerm: { longTermBorrowings: Number, total: Number },
        totalLiabilities: Number,
      },
      equity: { sharesCapital: Number, retainedEarnings: Number, totalEquity: Number },
    },

    incomeStatement: {
      revenue: { sales: Number, servicesRevenue: Number, totalRevenue: Number },
      costOfGoodsSold: Number,
      grossProfit: Number,
      operatingExpenses: {
        salaries: Number,
        rent: Number,
        utilities: Number,
        totalExpenses: Number,
      },
      operatingIncome: Number,
      financialCosts: { interestExpense: Number, total: Number },
      incomeBeforeTax: Number,
      incomeTax: Number,
      netIncome: Number,
    },

    cashFlowStatement: {
      operatingActivities: {
        netIncome: Number,
        depreciationAmortization: Number,
        netCashFromOperations: Number,
      },
      investingActivities: {
        capitalExpenditures: Number,
        salesOfAssets: Number,
        netCashFromInvesting: Number,
      },
      financingActivities: {
        debtProceeds: Number,
        debtRepayments: Number,
        netCashFromFinancing: Number,
      },
      netChangeInCash: Number,
      endingCashBalance: Number,
    },

    ratios: {
      profitability: {
        grossProfitMargin: Number,
        operatingProfitMargin: Number,
        netProfitMargin: Number,
        returnOnAssets: Number,
        returnOnEquity: Number,
      },
      liquidity: { currentRatio: Number, quickRatio: Number },
      efficiency: { assetTurnover: Number, receivablesTurnover: Number },
      leverage: { debtToEquityRatio: Number, equityRatio: Number },
    },

    consolidated: {
      branches: { type: [mongoose.Schema.Types.ObjectId], ref: 'Branch', default: [] },
      intercompanyTransactions: [
        {
          from: mongoose.Schema.Types.ObjectId,
          to: mongoose.Schema.Types.ObjectId,
          amount: Number,
        },
      ],
    },

    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'archived'],
      default: 'draft',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    exports: [
      {
        format: { type: String, enum: ['pdf', 'excel', 'csv', 'json'] },
        filename: String,
        exportedAt: Date,
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
    collection: 'financial_reports',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

financialReportSchema.index({ organizationId: 1, reportType: 1 });
financialReportSchema.index({ 'period.endDate': -1 });

financialReportSchema.pre('save', function (next) {
  if (this.balanceSheet) {
    const assets = this.balanceSheet.assets;
    if (assets.current)
      assets.current.total =
        (assets.current.cash || 0) +
        (assets.current.receivables || 0) +
        (assets.current.inventory || 0);
    if (assets.fixed)
      assets.fixed.total =
        (assets.fixed.propertyPlantEquipment || 0) + (assets.fixed.intangibleAssets || 0);
    assets.totalAssets = (assets.current?.total || 0) + (assets.fixed?.total || 0);

    const liabilities = this.balanceSheet.liabilities;
    if (liabilities.current)
      liabilities.current.total =
        (liabilities.current.payables || 0) + (liabilities.current.shortTermBorrowings || 0);
    if (liabilities.longTerm)
      liabilities.longTerm.total = liabilities.longTerm.longTermBorrowings || 0;
    liabilities.totalLiabilities =
      (liabilities.current?.total || 0) + (liabilities.longTerm?.total || 0);

    this.balanceSheet.equity.totalEquity = assets.totalAssets - liabilities.totalLiabilities;
  }

  if (this.incomeStatement) {
    const income = this.incomeStatement;
    income.grossProfit = (income.revenue?.totalRevenue || 0) - (income.costOfGoodsSold || 0);
    income.operatingIncome = income.grossProfit - (income.operatingExpenses?.totalExpenses || 0);
    income.incomeBeforeTax = income.operatingIncome - (income.financialCosts?.total || 0);
    income.netIncome = income.incomeBeforeTax - (income.incomeTax || 0);
  }

  next();
});

financialReportSchema.methods.validateEquation = function () {
  if (this.balanceSheet) {
    const assets = this.balanceSheet.totalAssets;
    const liabilities = this.balanceSheet.liabilities.totalLiabilities;
    const equity = this.balanceSheet.equity.totalEquity;
    return Math.abs(assets - (liabilities + equity)) < 0.01;
  }
  return true;
};

financialReportSchema.statics.getLatestReport = function (organizationId, reportType) {
  return this.findOne({ organizationId, reportType, status: { $ne: 'archived' } }).sort({
    'period.endDate': -1,
  });
};

module.exports = mongoose.models.FinancialReport || mongoose.model('FinancialReport', financialReportSchema);
