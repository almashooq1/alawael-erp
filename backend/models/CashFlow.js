/* eslint-disable no-unused-vars */
/**
 * CashFlow Model
 * ط¥ط¯ط§ط±ط© ط§ظ„طھط¯ظپظ‚ ط§ظ„ظ†ظ‚ط¯ظٹ ظˆط§ظ„طھظ†ط¨ط¤ط§طھ
 * ظٹطھط§ط¨ط¹ ط§ظ„ط¯ط®ظˆظ„ ظˆط§ظ„ط®ط±ظˆط¬ط§طھ ظˆط§ظ„ط§ط­طھظٹط§ط·ظٹط§طھ
 */

const mongoose = require('mongoose');

const cashFlowSchema = new mongoose.Schema(
  {
    // ظ…ط¹ط±ظپط§طھ ط£ط³ط§ط³ظٹط©
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

    // ط§ظ„ظ†ظ‚ط¯ ط§ظ„ط­ط§ظ„ظٹ
    cashPosition: {
      current: {
        type: Number,
        required: true,
        min: 0,
      },
      previous: {
        type: Number,
      },
      changeAmount: {
        type: Number,
      },
      changePercentage: {
        type: Number,
      },
    },

    // ط§ظ„ط¯ط®ظˆظ„ (4 ظ…طµط§ط¯ط±)
    inflows: {
      type: [
        {
          source: {
            type: String,
            enum: ['sales', 'investments', 'loans', 'grants'],
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          expectedDate: Date,
          actualDate: Date,
          category: String,
        },
      ],
      default: [],
    },

    // ط§ظ„ط®ط±ظˆط¬ط§طھ (6 ظپط¦ط§طھ)
    outflows: {
      type: [
        {
          purpose: {
            type: String,
            enum: ['salaries', 'purchases', 'rent', 'utilities', 'maintenance', 'taxes'],
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          dueDate: Date,
          paidDate: Date,
          category: String,
          priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium',
          },
        },
      ],
      default: [],
    },

    // ط§ظ„ط­ط³ط§ط¨ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©
    calculations: {
      totalInflows: {
        type: Number,
        default: 0,
      },
      totalOutflows: {
        type: Number,
        default: 0,
      },
      netCashFlow: {
        type: Number,
      },
      endBalance: {
        type: Number,
      },
    },

    // ط§ظ„طھظ†ط¨ط¤ط§طھ (3 ظ†ظ…ط§ط°ط¬)
    forecasts: {
      model: {
        type: String,
        enum: ['arima', 'exponential', 'linear', 'neural'],
        default: 'arima',
      },
      precision: {
        type: Number,
        min: 0,
        max: 100,
      },
      predictions: [
        {
          period: {
            month: Number,
            year: Number,
          },
          predictedAmount: Number,
          confidence: {
            level: {
              type: String,
              enum: ['90%', '95%', '99%'],
              default: '90%',
            },
            lower: Number,
            upper: Number,
          },
          trend: {
            type: String,
            enum: ['increasing', 'decreasing', 'stable'],
          },
        },
      ],
      lastRun: Date,
    },

    // ط§ظ„ط§ط­طھظٹط§ط·ظٹط§طھ
    reserves: {
      total: {
        type: Number,
        default: 0,
      },
      adequacyRatio: {
        type: Number,
      },
      requiredReserve: {
        type: Number,
      },
      gap: {
        type: Number,
      },
      breakdown: {
        operational: Number,
        emergency: Number,
        strategic: Number,
        seasonal: Number,
      },
    },

    // ط§ظ„طھط­ظ„ظٹظ„ط§طھ
    analysis: {
      incomeTraend: {
        type: String,
        enum: ['stable', 'increasing', 'decreasing'],
      },
      expensesTrend: {
        type: String,
        enum: ['stable', 'increasing', 'decreasing'],
      },
      financialHealth: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      recommendations: [String],
    },

    // ط§ظ„ظپطھط±ط© ط§ظ„ط²ظ…ظ†ظٹط©
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    // ط­ط§ظ„ط© ط§ظ„طھظ‚ط±ظٹط±
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'archived'],
      default: 'draft',
    },

    // ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط¥ظ†ط´ط§ط، ظˆط§ظ„طھط¹ط¯ظٹظ„
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ط§ظ„طھط¹ظ„ظٹظ‚ط§طھ ظˆط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ
    comments: [
      {
        user: mongoose.Schema.Types.ObjectId,
        text: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // ظ†ط³ط®ط© ط§ظ„طھظ‚ط±ظٹط±
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'cash_flows',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== INDEXES =====
cashFlowSchema.index({ organizationId: 1, 'period.startDate': -1 });
cashFlowSchema.index({ status: 1 });
cashFlowSchema.index({ createdBy: 1 });
cashFlowSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

// ===== HOOKS =====
cashFlowSchema.pre('save', function (next) {
  // ط­ط³ط§ط¨ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط§طھ
  this.calculations.totalInflows = this.inflows.reduce((sum, inflow) => sum + inflow.amount, 0);
  this.calculations.totalOutflows = this.outflows.reduce((sum, outflow) => sum + outflow.amount, 0);
  this.calculations.netCashFlow = this.calculations.totalInflows - this.calculations.totalOutflows;
  this.calculations.endBalance = this.cashPosition.current + this.calculations.netCashFlow;

  // ط­ط³ط§ط¨ ظ†ط³ط¨ط© ظƒظپط§ظٹط© ط§ظ„ط§ط­طھظٹط§ط·ظٹط§طھ
  if (this.calculations.totalOutflows > 0) {
    this.reserves.adequacyRatio = (this.reserves.total / this.calculations.totalOutflows) * 100;
  }

  next();
});

// ===== METHODS =====
cashFlowSchema.methods.calculateHealthScore = function () {
  let score = 100;

  if (this.calculations.netCashFlow < 0) score -= 20;
  if (this.reserves.adequacyRatio < 25) score -= 20;
  if (this.analysis.riskLevel === 'high') score -= 15;
  if (this.analysis.riskLevel === 'critical') score -= 30;

  return Math.max(0, score);
};

cashFlowSchema.methods.addInflow = function (source, amount, description) {
  this.inflows.push({ source, amount, description, expectedDate: new Date() });
  return this.save();
};

cashFlowSchema.methods.addOutflow = function (purpose, amount, description, dueDate) {
  this.outflows.push({ purpose, amount, description, dueDate });
  return this.save();
};

// ===== STATICS =====
cashFlowSchema.statics.getLatestReport = function (organizationId) {
  return this.findOne({ organizationId, status: { $ne: 'archived' } }).sort({ createdAt: -1 });
};

cashFlowSchema.statics.getReportsPeriod = function (organizationId, startDate, endDate) {
  return this.find({
    organizationId,
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate },
    status: { $ne: 'archived' },
  }).sort({ 'period.startDate': -1 });
};

module.exports = mongoose.models.CashFlow || mongoose.model('CashFlow', cashFlowSchema);
