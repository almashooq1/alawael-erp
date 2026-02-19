/**
 * Insight Model - Phase 7
 * AI-generated insights and actionable recommendations
 */

const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    insightId: {
      type: String,
      unique: true,
      required: true,
    },
    insightType: {
      type: String,
      enum: ['trend', 'anomaly', 'correlation', 'recommendation', 'alert', 'opportunity'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'sales',
        'financial',
        'inventory',
        'customer',
        'supply_chain',
        'performance',
        'custom',
      ],
    },

    // Core Insight Data
    title: {
      type: String,
      required: true,
    },
    description: String,
    summary: String,
    detailedExplanation: String,

    // Data Context
    source: {
      type: String,
      enum: [
        'analytics',
        'prediction',
        'anomaly-detection',
        'correlation-analysis',
        'nlp',
        'custom',
      ],
    },
    dataSource: String, // Reference to data that generated insight
    metrics: [
      {
        metricName: String,
        value: Number,
        change: Number,
        trend: String,
      },
    ],

    // Confidence & Significance
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    significance: {
      type: Number,
      min: 0,
      max: 100,
    },
    relevance: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Business Impact
    impact: {
      category: {
        type: String,
        enum: ['revenue', 'cost', 'efficiency', 'quality', 'risk', 'opportunity'],
      },
      magnitude: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      estimatedValue: Number,
      currency: String,
      timeframe: String,
    },

    // Business Context
    context: {
      businessArea: String,
      stakeholders: [String],
      relatedProcesses: [String],
      historicalContext: String,
      externalFactors: [String],
    },

    // Actionable Items
    actionItems: [
      {
        action: String,
        description: String,
        owner: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        estimatedEffort: String,
        expectedOutcome: String,
        deadline: Date,
        status: {
          type: String,
          enum: ['not-started', 'in-progress', 'completed', 'blocked'],
        },
      },
    ],

    // Supporting Evidence
    evidence: [
      {
        type: String,
        weight: Number,
        source: String,
        timestamp: Date,
      },
    ],

    // Similar Insights
    similarInsights: [String], // References to other insight IDs

    // Comparison Data
    comparison: {
      baseline: Map,
      current: Map,
      trend: String,
      variance: Number,
    },

    // Visualization Recommendations
    visualization: {
      recommendedType: String,
      dimensions: [String],
      measures: [String],
      filterSuggestions: [String],
    },

    // Trend Analysis
    trend: {
      direction: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable', 'cyclical'],
      },
      strength: String,
      seasonality: Boolean,
      forecastedChange: Number,
    },

    // Risk & Opportunity Assessment
    riskAssessment: {
      identified: Boolean,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      mitigation: String,
      contingency: String,
    },
    opportunityAssessment: {
      identified: Boolean,
      opportunitySize: String,
      requiredInvestment: Number,
      timeToRealize: String,
      successFactors: [String],
    },

    // Stakeholder Feedback
    feedback: [
      {
        giverId: String,
        giverName: String,
        feedback: String,
        sentiment: {
          type: String,
          enum: ['very-negative', 'negative', 'neutral', 'positive', 'very-positive'],
        },
        actionability: {
          type: String,
          enum: ['not-actionable', 'somewhat-actionable', 'highly-actionable'],
        },
        givenAt: Date,
      },
    ],

    // Review & Approval
    review: {
      requiredApprovals: [String],
      approvals: [
        {
          approver: String,
          approvedAt: Date,
          comments: String,
        },
      ],
      rejections: [
        {
          rejector: String,
          rejectedAt: Date,
          reason: String,
        },
      ],
    },

    // Implementation Tracking
    implementation: {
      status: {
        type: String,
        enum: ['not-started', 'planned', 'in-progress', 'completed', 'abandoned'],
        default: 'not-started',
      },
      startDate: Date,
      completionDate: Date,
      outcomes: [
        {
          metric: String,
          expected: Number,
          actual: Number,
          date: Date,
        },
      ],
    },

    // Metadata
    createdBy: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
    expirationDate: Date,
    tags: [String],
    status: {
      type: String,
      enum: ['draft', 'pending-review', 'approved', 'published', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['private', 'team', 'department', 'organization'],
      default: 'organization',
    },
  },
  {
    timestamps: true,
    collection: 'insights',
  }
);

// Indexes
insightSchema.index({ insightId: 1 });
insightSchema.index({ insightType: 1, status: 1 });
insightSchema.index({ category: 1 });
insightSchema.index({ 'impact.magnitude': 1, confidence: -1 });
insightSchema.index({ tags: 1 });
insightSchema.index({ createdAt: -1 });

// Instance Methods
insightSchema.methods.approve = async function (approverId, comments = '') {
  if (!this.review.approvals) {
    this.review.approvals = [];
  }

  this.review.approvals.push({
    approver: approverId,
    approvedAt: new Date(),
    comments,
  });

  if (this.review.approvals.length >= this.review.requiredApprovals.length) {
    this.status = 'approved';
  }

  return this.save();
};

insightSchema.methods.reject = async function (rejectorId, reason) {
  if (!this.review.rejections) {
    this.review.rejections = [];
  }

  this.review.rejections.push({
    rejector: rejectorId,
    rejectedAt: new Date(),
    reason,
  });

  this.status = 'draft';
  return this.save();
};

insightSchema.methods.publish = async function () {
  if (this.status !== 'approved') {
    throw new Error('Insight must be approved before publishing');
  }
  this.status = 'published';
  return this.save();
};

insightSchema.methods.archive = async function () {
  this.status = 'archived';
  return this.save();
};

insightSchema.methods.addFeedback = async function (giverId, giverName, feedback, sentiment) {
  if (!this.feedback) {
    this.feedback = [];
  }

  this.feedback.push({
    giverId,
    giverName,
    feedback,
    sentiment,
    givenAt: new Date(),
  });

  return this.save();
};

insightSchema.methods.startImplementation = async function (startDate = new Date()) {
  this.implementation.status = 'in-progress';
  this.implementation.startDate = startDate;
  return this.save();
};

insightSchema.methods.recordOutcome = async function (metric, actual) {
  const expected = this.actionItems[0]?.expectedOutcome || 0;

  this.implementation.outcomes.push({
    metric,
    expected,
    actual,
    date: new Date(),
  });

  return this.save();
};

insightSchema.methods.completeImplementation = async function () {
  this.implementation.status = 'completed';
  this.implementation.completionDate = new Date();
  return this.save();
};

// Static Methods
insightSchema.statics.getHighImpactInsights = function (limit = 10) {
  return this.find({
    status: 'published',
    'impact.magnitude': { $in: ['high', 'critical'] },
  })
    .sort({ confidence: -1, 'impact.magnitude': -1 })
    .limit(limit);
};

insightSchema.statics.getInsightsByType = function (insightType) {
  return this.find({
    insightType,
    status: 'published',
  }).sort({ createdAt: -1 });
};

insightSchema.statics.getInsightsByCategory = function (category) {
  return this.find({
    category,
    status: 'published',
  }).sort({ confidence: -1 });
};

insightSchema.statics.getPendingApproval = function () {
  return this.find({ status: 'pending-review' });
};

insightSchema.statics.getExpired = function () {
  return this.find({
    expirationDate: { $lt: new Date() },
    status: 'published',
  });
};

insightSchema.statics.getByTag = function (tag) {
  return this.find({ tags: tag, status: 'published' });
};

insightSchema.statics.searchInsights = function (keyword) {
  return this.find({
    $or: [
      { title: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') },
      { tags: keyword },
    ],
    status: 'published',
  });
};

insightSchema.statics.getImplementationStatus = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$implementation.status',
        count: { $sum: 1 },
      },
    },
  ]);
};

// Virtual Properties
insightSchema.virtual('requiresAttention').get(function () {
  return (
    (this.impact.magnitude === 'critical' || this.impact.magnitude === 'high') &&
    this.implementation.status === 'not-started'
  );
});

insightSchema.virtual('isApproved').get(function () {
  return this.status === 'approved' || this.status === 'published';
});

insightSchema.virtual('effectivenessScore').get(function () {
  if (this.implementation.status !== 'completed') return null;

  const outcomes = this.implementation.outcomes;
  if (!outcomes || outcomes.length === 0) return 0;

  const avgAccuracy =
    outcomes.reduce((sum, outcome) => {
      const accuracy = outcome.actual / outcome.expected;
      return sum + Math.min(accuracy, 1);
    }, 0) / outcomes.length;

  return Math.round(avgAccuracy * 100);
});

module.exports = mongoose.model('Insight', insightSchema);
