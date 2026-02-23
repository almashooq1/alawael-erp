/**
 * Analytics Service - خدمة التحليلات المتقدمة
 * Enterprise Analytics for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Analytics Configuration
 */
const analyticsConfig = {
  // Event tracking
  tracking: {
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
  },
  
  // Aggregation
  aggregation: {
    intervals: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    retention: {
      hourly: 7, // 7 days
      daily: 90, // 90 days
      weekly: 52, // 52 weeks
      monthly: 24, // 24 months
      yearly: 5, // 5 years
    },
  },
  
  // Metrics
  metrics: {
    prefix: 'alawael',
    defaultTags: ['environment', 'tenant', 'version'],
  },
};

/**
 * Analytics Event Schema
 */
const AnalyticsEventSchema = new mongoose.Schema({
  // Event identification
  event: { type: String, required: true, index: true },
  category: { type: String, default: 'general' },
  
  // Context
  properties: mongoose.Schema.Types.Mixed,
  
  // User info
  userId: { type: String, index: true },
  sessionId: String,
  
  // Device/Platform
  platform: String,
  device: String,
  browser: String,
  ipAddress: String,
  
  // Timing
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Tenant
  tenantId: { type: String, index: true },
}, {
  collection: 'analytics_events',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'event',
    granularity: 'minutes',
  },
});

/**
 * Metric Schema
 */
const MetricSchema = new mongoose.Schema({
  // Metric identification
  name: { type: String, required: true },
  type: { type: String, enum: ['counter', 'gauge', 'histogram', 'summary'], required: true },
  
  // Value
  value: { type: Number, required: true },
  
  // Tags
  tags: mongoose.Schema.Types.Mixed,
  
  // Timing
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'analytics_metrics',
});

/**
 * Aggregated Metric Schema
 */
const AggregatedMetricSchema = new mongoose.Schema({
  // Identification
  metric: { type: String, required: true },
  interval: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'], required: true },
  
  // Time bucket
  date: { type: Date, required: true },
  
  // Aggregations
  sum: Number,
  avg: Number,
  min: Number,
  max: Number,
  count: Number,
  
  // Percentiles (for histograms)
  p50: Number,
  p75: Number,
  p90: Number,
  p95: Number,
  p99: Number,
  
  // Tags
  tags: mongoose.Schema.Types.Mixed,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'analytics_aggregated',
});

// Compound index for uniqueness
AggregatedMetricSchema.index({ metric: 1, interval: 1, date: 1, tenantId: 1 }, { unique: true });

/**
 * Analytics Service Class
 */
class AnalyticsService {
  constructor() {
    this.AnalyticsEvent = null;
    this.Metric = null;
    this.AggregatedMetric = null;
    
    this.eventBuffer = [];
    this.flushTimer = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.AnalyticsEvent = connection.model('AnalyticsEvent', AnalyticsEventSchema);
    this.Metric = connection.model('Metric', MetricSchema);
    this.AggregatedMetric = connection.model('AggregatedMetric', AggregatedMetricSchema);
    
    // Start flush timer
    this.startFlushTimer();
    
    console.log('✅ Analytics Service initialized');
  }
  
  /**
   * Track event
   */
  async track(event, properties = {}, options = {}) {
    const eventDoc = {
      event,
      category: options.category || 'general',
      properties,
      userId: options.userId,
      sessionId: options.sessionId,
      platform: options.platform,
      device: options.device,
      browser: options.browser,
      ipAddress: options.ipAddress,
      tenantId: options.tenantId,
    };
    
    // Add to buffer
    this.eventBuffer.push(eventDoc);
    
    // Flush if buffer is full
    if (this.eventBuffer.length >= analyticsConfig.tracking.batchSize) {
      await this.flush();
    }
    
    return eventDoc;
  }
  
  /**
   * Flush events to database
   */
  async flush() {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      await this.AnalyticsEvent.insertMany(events, { ordered: false });
    } catch (error) {
      console.error('Analytics flush error:', error.message);
    }
  }
  
  /**
   * Start flush timer
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, analyticsConfig.tracking.flushInterval);
  }
  
  /**
   * Record metric
   */
  async recordMetric(name, value, type = 'gauge', tags = {}) {
    return this.Metric.create({
      name: `${analyticsConfig.metrics.prefix}.${name}`,
      type,
      value,
      tags,
      timestamp: new Date(),
    });
  }
  
  /**
   * Increment counter
   */
  async increment(name, value = 1, tags = {}) {
    return this.recordMetric(name, value, 'counter', tags);
  }
  
  /**
   * Record timing
   */
  async timing(name, durationMs, tags = {}) {
    return this.recordMetric(name, durationMs, 'histogram', tags);
  }
  
  /**
   * Get event counts
   */
  async getEventCounts(event, startDate, endDate, options = {}) {
    const match = {
      event,
      timestamp: { $gte: startDate, $lte: endDate },
    };
    
    if (options.tenantId) match.tenantId = options.tenantId;
    
    const result = await this.AnalyticsEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);
    
    return result;
  }
  
  /**
   * Get funnel analysis
   */
  async getFunnel(steps, startDate, endDate, options = {}) {
    const results = [];
    let previousUsers = null;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const match = {
        event: step.event,
        timestamp: { $gte: startDate, $lte: endDate },
      };
      
      if (options.tenantId) match.tenantId = options.tenantId;
      
      const users = await this.AnalyticsEvent.distinct('userId', match);
      
      const stepResult = {
        step: step.name || step.event,
        users: users.length,
        conversionRate: previousUsers ? (users.length / previousUsers) * 100 : 100,
        dropoff: previousUsers ? ((previousUsers - users.length) / previousUsers) * 100 : 0,
      };
      
      results.push(stepResult);
      previousUsers = users.length;
    }
    
    return {
      steps: results,
      totalConversion: results.length > 1 ? (results[results.length - 1].users / results[0].users) * 100 : 100,
    };
  }
  
  /**
   * Get retention analysis
   */
  async getRetention(cohortDate, options = {}) {
    // Get users who signed up in the cohort
    const cohortUsers = await this.AnalyticsEvent.distinct('userId', {
      event: 'user_signup',
      timestamp: {
        $gte: cohortDate,
        $lt: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000),
      },
      tenantId: options.tenantId,
    });
    
    const retention = [];
    
    for (let day = 0; day <= 30; day++) {
      const targetDate = new Date(cohortDate.getTime() + day * 24 * 60 * 60 * 1000);
      
      const activeUsers = await this.AnalyticsEvent.distinct('userId', {
        event: { $in: ['page_view', 'login', 'action'] },
        userId: { $in: cohortUsers },
        timestamp: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      
      retention.push({
        day,
        activeUsers: activeUsers.length,
        retentionRate: cohortUsers.length > 0 ? (activeUsers.length / cohortUsers.length) * 100 : 0,
      });
    }
    
    return {
      cohortSize: cohortUsers.length,
      cohortDate,
      retention,
    };
  }
  
  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(metric, interval, startDate, endDate, options = {}) {
    const match = {
      metric: `${analyticsConfig.metrics.prefix}.${metric}`,
      interval,
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (options.tenantId) match.tenantId = options.tenantId;
    
    return this.AggregatedMetric.find(match).sort({ date: 1 });
  }
  
  /**
   * Aggregate metrics
   */
  async aggregateMetrics(interval = 'daily') {
    const now = new Date();
    const bucketStart = this.getBucketStart(now, interval);
    
    const metrics = await this.Metric.aggregate([
      {
        $match: {
          timestamp: { $gte: bucketStart, $lt: now },
        },
      },
      {
        $group: {
          _id: '$name',
          sum: { $sum: '$value' },
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
          values: { $push: '$value' },
        },
      },
    ]);
    
    for (const metric of metrics) {
      const sortedValues = metric.values.sort((a, b) => a - b);
      
      await this.AggregatedMetric.findOneAndUpdate(
        { metric: metric._id, interval, date: bucketStart },
        {
          sum: metric.sum,
          avg: metric.avg,
          min: metric.min,
          max: metric.max,
          count: metric.count,
          p50: this.percentile(sortedValues, 50),
          p75: this.percentile(sortedValues, 75),
          p90: this.percentile(sortedValues, 90),
          p95: this.percentile(sortedValues, 95),
          p99: this.percentile(sortedValues, 99),
        },
        { upsert: true, new: true }
      );
    }
    
    return { aggregated: metrics.length, interval, bucketStart };
  }
  
  /**
   * Get bucket start time
   */
  getBucketStart(date, interval) {
    const d = new Date(date);
    
    switch (interval) {
      case 'hourly':
        d.setMinutes(0, 0, 0);
        break;
      case 'daily':
        d.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        break;
      case 'monthly':
        d.setHours(0, 0, 0, 0);
        d.setDate(1);
        break;
      case 'yearly':
        d.setHours(0, 0, 0, 0);
        d.setMonth(0, 1);
        break;
    }
    
    return d;
  }
  
  /**
   * Calculate percentile
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
  
  /**
   * Get dashboard stats
   */
  async getDashboardStats(options = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const [
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth,
      eventsToday,
      topEvents,
    ] = await Promise.all([
      this.AnalyticsEvent.distinct('userId', { tenantId: options.tenantId }),
      this.AnalyticsEvent.distinct('userId', {
        timestamp: { $gte: today },
        tenantId: options.tenantId,
      }),
      this.AnalyticsEvent.distinct('userId', {
        timestamp: { $gte: lastWeek },
        tenantId: options.tenantId,
      }),
      this.AnalyticsEvent.distinct('userId', {
        timestamp: { $gte: lastMonth },
        tenantId: options.tenantId,
      }),
      this.AnalyticsEvent.countDocuments({
        timestamp: { $gte: today },
        tenantId: options.tenantId,
      }),
      this.AnalyticsEvent.aggregate([
        { $match: { timestamp: { $gte: lastWeek }, tenantId: options.tenantId } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);
    
    return {
      users: {
        total: totalUsers.length,
        activeToday: activeUsersToday.length,
        activeWeek: activeUsersWeek.length,
        activeMonth: activeUsersMonth.length,
      },
      events: {
        today: eventsToday,
        topEvents: topEvents.map(e => ({ event: e._id, count: e.count })),
      },
    };
  }
  
  /**
   * Shutdown
   */
  async shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

/**
 * Pre-defined Analytics Events
 */
const analyticsEvents = {
  // User events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PROFILE_UPDATE: 'user_profile_update',
  
  // Page events
  PAGE_VIEW: 'page_view',
  
  // Action events
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  SEARCH: 'search',
  
  // Business events
  ORDER_CREATED: 'order_created',
  ORDER_COMPLETED: 'order_completed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
};

module.exports = {
  AnalyticsService,
  analyticsService,
  analyticsConfig,
  analyticsEvents,
};