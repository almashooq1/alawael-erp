/**
 * Analytics Model - Phase 7
 * Advanced analytics and metrics tracking
 * Extends reporting with deeper insights
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    analyticsId: {
      type: String,
      unique: true,
      required: true,
    },
    analyticsType: {
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
      default: 'custom',
    },
    period: {
      startDate: Date,
      endDate: Date,
      periodType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      },
    },
    metrics: {
      // Financial Metrics
      revenue: {
        total: Number,
        byCategory: Map,
        growth: Number,
        trend: String,
      },
      expenses: {
        total: Number,
        byCategory: Map,
        variance: Number,
      },
      profitability: {
        grossProfit: Number,
        netProfit: Number,
        margin: Number,
        roi: Number,
      },
      // Operational Metrics
      efficiency: {
        processingTime: Number,
        errorRate: Number,
        throughput: Number,
        utilization: Number,
      },
      // Sales Metrics
      sales: {
        totalOrders: Number,
        totalUnits: Number,
        averageOrderValue: Number,
        conversionRate: Number,
        customerAcquisitionCost: Number,
      },
      // Customer Metrics
      customer: {
        newCustomers: Number,
        churnRate: Number,
        lifeTimeValue: Number,
        satisfaction: Number,
        retentionRate: Number,
      },
      // Inventory Metrics
      inventory: {
        turnoverRate: Number,
        stockoutDays: Number,
        carryingCost: Number,
        wastePercentage: Number,
      },
    },
    // Key Performance Indicators
    kpis: [
      {
        kpiName: String,
        kpiCode: String,
        category: String,
        currentValue: Number,
        targetValue: Number,
        status: {
          type: String,
          enum: ['on-track', 'at-risk', 'off-track'],
        },
        variance: Number,
        trend: {
          direction: String,
          percentage: Number,
          period: String,
        },
        formula: String,
        owner: String,
        lastUpdated: Date,
      },
    ],

    // Comparative Analysis
    comparisons: {
      previousPeriod: {
        metrics: Map,
        variance: Map,
      },
      benchmark: {
        industry: Map,
        competitors: Map,
        internal: Map,
      },
      yearOverYear: {
        metrics: Map,
        variance: Map,
      },
    },

    // Forecast Data
    forecast: {
      method: String,
      confidence: Number,
      nextPeriodProjection: Map,
      trendLine: [{ date: Date, value: Number }],
      seasonalAdjustment: Number,
    },

    // Anomalies Detected
    anomalies: [
      {
        metric: String,
        anomalyType: {
          type: String,
          enum: ['spike', 'dip', 'trend-shift', 'seasonal-deviation'],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        value: Number,
        expectedValue: Number,
        deviation: Number,
        probability: Number,
        detectedAt: Date,
        investigated: Boolean,
        rootCause: String,
        resolution: String,
      },
    ],

    // Segmentation
    segments: [
      {
        segmentName: String,
        segmentType: String,
        size: Number,
        metrics: Map,
        contribution: Number,
        trend: String,
      },
    ],

    // Insights & Recommendations
    insights: [
      {
        insight: String,
        category: String,
        confidence: Number,
        impact: {
          type: String,
          enum: ['positive', 'negative', 'neutral'],
        },
        actionableItems: [String],
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        generatedAt: Date,
        reviewed: Boolean,
        reviewedBy: String,
      },
    ],

    // Custom Dimensions
    dimensions: {
      geographic: [String],
      demographic: [String],
      behavioral: [String],
      psychographic: [String],
    },

    // Data Quality
    dataQuality: {
      completeness: Number,
      accuracy: Number,
      consistency: Number,
      timeliness: Number,
      overall: Number,
    },

    // Metadata
    createdBy: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
    lastReviewAt: Date,
    reviewedBy: String,
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    tags: [String],
    description: String,
    source: String,
  },
  {
    timestamps: true,
    collection: 'analytics',
  }
);

// Indexes for performance
analyticsSchema.index({ analyticsId: 1 });
analyticsSchema.index({ analyticsType: 1, 'period.startDate': 1 });
analyticsSchema.index({ status: 1, createdAt: -1 });
analyticsSchema.index({ tags: 1 });

// Instance Methods
analyticsSchema.methods.calculateGrowth = function () {
  if (this.comparisons?.previousPeriod?.metrics) {
    const current = this.metrics.revenue.total;
    const previous = this.comparisons.previousPeriod.metrics.get('revenue');
    if (previous) {
      return ((current - previous) / previous) * 100;
    }
  }
  return null;
};

analyticsSchema.methods.identifyAnomalies = async function () {
  // Will be implemented by ML service
  return this.anomalies || [];
};

analyticsSchema.methods.generateInsights = async function () {
  // Will be implemented by ML service
  return this.insights || [];
};

analyticsSchema.methods.getForecast = function () {
  return {
    method: this.forecast.method,
    confidence: this.forecast.confidence,
    projection: this.forecast.nextPeriodProjection,
    trend: this.forecast.trendLine,
  };
};

analyticsSchema.methods.getKeyFindingsForKPI = function (kpiCode) {
  return {
    kpi: this.kpis.find(k => k.kpiCode === kpiCode),
    relatedAnomalies: this.anomalies.filter(a => a.metric === kpiCode),
    relatedInsights: this.insights.filter(
      i => i.actionableItems && i.actionableItems.some(item => item.includes(kpiCode))
    ),
  };
};

analyticsSchema.methods.getPerformanceComparison = function (compareWith) {
  return {
    currentPeriod: this.metrics,
    comparePeriod: this.comparisons[compareWith],
    variances: this.comparisons[compareWith]?.variance || {},
  };
};

analyticsSchema.methods.publishAnalytics = async function () {
  this.status = 'published';
  this.updatedAt = new Date();
  return this.save();
};

analyticsSchema.methods.archiveAnalytics = async function () {
  this.status = 'archived';
  this.updatedAt = new Date();
  return this.save();
};

// Static Methods
analyticsSchema.statics.getAnalyticsByType = function (analyticsType) {
  return this.find({ analyticsType, status: 'published' }).sort({ createdAt: -1 });
};

analyticsSchema.statics.getLatestAnalytics = function (analyticsType, limit = 10) {
  return this.find({ analyticsType, status: 'published' }).sort({ createdAt: -1 }).limit(limit);
};

analyticsSchema.statics.getAnalyticsInDateRange = function (startDate, endDate) {
  return this.find({
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate },
    status: 'published',
  });
};

analyticsSchema.statics.getCriticalAnomalies = function () {
  return this.find({
    'anomalies.severity': 'critical',
    status: 'published',
  });
};

analyticsSchema.statics.getHighPriorityInsights = function () {
  return this.find({
    'insights.priority': 'critical',
    status: 'published',
  });
};

analyticsSchema.statics.getMetricsBySegment = function (segmentType) {
  return this.aggregate([
    { $unwind: '$segments' },
    { $match: { 'segments.segmentType': segmentType } },
    {
      $group: {
        _id: '$segments.segmentName',
        metrics: { $first: '$segments.metrics' },
        contribution: { $first: '$segments.contribution' },
      },
    },
  ]);
};

analyticsSchema.statics.getDataQualityReport = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        completeness: { $avg: '$dataQuality.completeness' },
        accuracy: { $avg: '$dataQuality.accuracy' },
        consistency: { $avg: '$dataQuality.consistency' },
        timeliness: { $avg: '$dataQuality.timeliness' },
        overall: { $avg: '$dataQuality.overall' },
      },
    },
  ]);
};

analyticsSchema.statics.searchByInsight = function (keyword) {
  return this.find({
    $or: [
      { 'insights.insight': new RegExp(keyword, 'i') },
      { tags: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') },
    ],
    status: 'published',
  });
};

// Virtual Properties
analyticsSchema.virtual('overallStatus').get(function () {
  const criticalAnomalies = this.anomalies.filter(a => a.severity === 'critical');
  if (criticalAnomalies.length > 0) return 'critical';

  const atRiskKpis = this.kpis.filter(k => k.status === 'at-risk');
  if (atRiskKpis.length > this.kpis.length * 0.25) return 'at-risk';

  return 'healthy';
});

analyticsSchema.virtual('readinessScore').get(function () {
  let score = 100;
  if (this.dataQuality?.overall) {
    score *= this.dataQuality.overall / 100;
  }
  return Math.round(score);
});

module.exports = mongoose.model('Analytics', analyticsSchema);
