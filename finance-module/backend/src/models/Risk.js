/**
 * Risk Management Model
 * Financial risk assessment and management
 */

const mongoose = require('mongoose');

const RiskItemSchema = new mongoose.Schema({
  riskId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['operational', 'financial', 'market', 'credit', 'liquidity', 'compliance', 'strategic'],
    required: true
  },
  probability: {
    value: { type: Number, min: 1, max: 10, required: true },
    description: String,
    historicalOccurrence: Number // percentage
  },
  impact: {
    value: { type: Number, min: 1, max: 10, required: true },
    financial: { type: Number, description: 'Estimated financial impact' },
    operational: { type: String, description: 'Operational consequences' },
    reputational: { type: String, description: 'Reputational impact' }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  severity: {
    probabilityScore: Number,
    impactScore: Number,
    riskScore: { type: Number, required: true }, // probability * impact
    zone: {
      type: String,
      enum: ['green', 'yellow', 'orange', 'red'],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['identified', 'assessed', 'mitigating', 'monitored', 'resolved', 'accepted'],
    default: 'identified'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mitigationStrategies: [{
    strategy: String,
    description: String,
    owner: mongoose.Schema.Types.ObjectId,
    targetDate: Date,
    status: { type: String, enum: ['planned', 'in_progress', 'completed'] },
    expectedImpactReduction: Number // percentage
  }],
  contingencyPlans: [{
    plan: String,
    trigger: String,
    actions: [String],
    owner: mongoose.Schema.Types.ObjectId,
    cost: Number
  }],
  relatedRisks: [mongoose.Schema.Types.ObjectId],

  monitoring: {
    indicators: [{
      name: String,
      currentValue: Number,
      threshold: Number,
      status: { type: String, enum: ['normal', 'warning', 'alert'] }
    }],
    reviewFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
    lastReview: Date,
    nextReview: Date
  },

  history: [{
    date: { type: Date, default: Date.now },
    action: String,
    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    performedBy: mongoose.Schema.Types.ObjectId
  }]
}, { timestamps: true });

const RiskMatrixSchema = new mongoose.Schema({
  assessmentPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  riskItems: [RiskItemSchema],

  matrixStats: {
    totalIdentifiedRisks: Number,
    risksByZone: {
      green: Number,
      yellow: Number,
      orange: Number,
      red: Number
    },
    risksByCategory: {},
    averageRiskScore: Number,
    trend: { type: String, enum: ['improving', 'stable', 'deteriorating'] }
  },

  heatmapData: [{
    probability: Number, // 1-10
    impact: Number, // 1-10
    count: Number,
    risks: [mongoose.Schema.Types.ObjectId]
  }],

  topRisks: [{
    riskId: mongoose.Schema.Types.ObjectId,
    riskScore: Number,
    priority: String,
    mitigationProgress: Number
  }],

  recommendations: [{
    title: String,
    description: String,
    affectedRisks: [mongoose.Schema.Types.ObjectId],
    estimatedCost: Number,
    implementationTimeline: String,
    expectedBenefit: String,
    urgency: { type: String, enum: ['low', 'medium', 'high'] }
  }],

  approvals: [{
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    role: String,
    comments: String
  }],

  status: {
    type: String,
    enum: ['draft', 'in_review', 'approved', 'active', 'archived'],
    default: 'draft'
  }
}, { timestamps: true });

const RiskTrendSchema = new mongoose.Schema({
  analysisDate: { type: Date, default: Date.now },

  trends: {
    period: String, // '1M', '3M', '6M', '1Y'
    riskScoreTrend: [Number], // historical scores
    newRisksIdentified: Number,
    resolvedRisks: Number,
    escalatedRisks: Number
  },

  forecast: {
    expect30Days: [{
      riskId: mongoose.Schema.Types.ObjectId,
      expectedChange: String, // 'increase', 'decrease', 'stable'
      confidence: Number
    }]
  },

  insights: [{
    category: String,
    finding: String,
    severity: String,
    recommendation: String
  }]
}, { timestamps: true });

RiskItemSchema.index({ category: 1, status: 1 });
RiskItemSchema.index({ 'severity.riskScore': -1 });
RiskMatrixSchema.index({ assessmentPeriod: 1 });

module.exports = {
  RiskItem: mongoose.model('RiskItem', RiskItemSchema),
  RiskMatrix: mongoose.model('RiskMatrix', RiskMatrixSchema),
  RiskTrend: mongoose.model('RiskTrend', RiskTrendSchema)
};
