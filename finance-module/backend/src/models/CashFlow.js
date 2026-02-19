/**
 * Cash Flow Model
 * Manages financial flows (inflows, outflows, forecasts, reserves)
 */

const mongoose = require('mongoose');

const CashFlowItemSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['revenue', 'expense', 'capital', 'loan', 'investment'],
    required: true
  },
  subcategory: String,
  description: String,
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['projected', 'actual', 'pending'],
    default: 'projected'
  },
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    endDate: Date
  }
});

const CashFlowSchema = new mongoose.Schema({
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  inflows: [CashFlowItemSchema],
  outflows: [CashFlowItemSchema],

  summary: {
    totalInflows: { type: Number, default: 0 },
    totalOutflows: { type: Number, default: 0 },
    netCashFlow: { type: Number, default: 0 },
    openingBalance: { type: Number, required: true },
    closingBalance: { type: Number }
  },

  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'executed'],
    default: 'draft'
  },

  approvals: [{
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    comments: String,
    level: { type: String, enum: ['manager', 'director', 'cfo'] }
  }],

  lastModified: { type: Date, default: Date.now },
  modifiedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const ForecastSchema = new mongoose.Schema({
  forecastPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  baseline: {
    month1: { inflows: Number, outflows: Number },
    month2: { inflows: Number, outflows: Number },
    month3: { inflows: Number, outflows: Number }
  },

  scenarios: [{
    name: { type: String, enum: ['optimistic', 'pessimistic', 'conservative'] },
    month1: { inflows: Number, outflows: Number },
    month2: { inflows: Number, outflows: Number },
    month3: { inflows: Number, outflows: Number },
    probability: Number // 0-100
  }],

  confidenceIntervals: {
    lower: {
      month1: { inflows: Number, outflows: Number },
      month2: { inflows: Number, outflows: Number },
      month3: { inflows: Number, outflows: Number }
    },
    upper: {
      month1: { inflows: Number, outflows: Number },
      month2: { inflows: Number, outflows: Number },
      month3: { inflows: Number, outflows: Number }
    }
  },

  riskFactors: [{
    factor: String,
    impact: Number, // percentage
    probability: Number, // 0-100
    mitigation: String
  }],

  assumptions: [String],

  accuracy: {
    lastActual: { month: Number, year: Number },
    variancePercentage: Number
  },

  status: {
    type: String,
    enum: ['draft', 'in_review', 'approved', 'obsolete'],
    default: 'draft'
  },

  generatedAt: { type: Date, default: Date.now },
  generatedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const ReserveSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['operating_reserve', 'contingency_reserve', 'emergency_fund', 'strategic_reserve']
  },

  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, required: true },

  adequacyRatio: {
    actual: Number, // current / target
    minimum: Number, // acceptable minimum
    required: Number, // optimal level
    status: {
      type: String,
      enum: ['below_minimum', 'insufficient', 'adequate', 'surplus'],
      default: 'adequate'
    }
  },

  allocation: [{
    purpose: String,
    amount: Number,
    percentage: Number
  }],

  transactions: [{
    date: { type: Date, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer'] },
    amount: { type: Number, required: true },
    description: String,
    approvedBy: mongoose.Schema.Types.ObjectId
  }],

  lastReviewDate: Date,
  nextReviewDate: Date

}, { timestamps: true });

const CashFlowAnalysisSchema = new mongoose.Schema({
  analysisPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  patterns: {
    seasonal: {
      detected: Boolean,
      months: [Number], // months with peaks
      intensity: Number // 0-100
    },
    cyclical: {
      detected: Boolean,
      cycleLengthDays: Number,
      amplitude: Number
    },
    trends: {
      inflowTrend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
      outflowTrend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
      netFlowTrend: { type: String, enum: ['increasing', 'decreasing', 'stable'] }
    }
  },

  anomalies: [{
    date: Date,
    type: { type: String, enum: ['outlier', 'anomaly', 'unusual_pattern'] },
    amount: Number,
    deviation: Number, // standard deviations
    description: String,
    investigated: Boolean,
    resolution: String
  }],

  insights: [String],

  recommendations: [{
    category: String,
    description: String,
    potentialImpact: String,
    urgency: { type: String, enum: ['low', 'medium', 'high'] }
  }]
}, { timestamps: true });

CashFlowSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
ForecastSchema.index({ 'forecastPeriod.startDate': 1, status: 1 });
ReserveSchema.index({ name: 1 });

module.exports = {
  CashFlow: mongoose.model('CashFlow', CashFlowSchema),
  Forecast: mongoose.model('Forecast', ForecastSchema),
  Reserve: mongoose.model('Reserve', ReserveSchema),
  CashFlowAnalysis: mongoose.model('CashFlowAnalysis', CashFlowAnalysisSchema)
};
