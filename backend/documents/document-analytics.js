/**
 * Document Analytics Service - خدمة تحليلات المستندات
 * Comprehensive Analytics & Insights for Document Management
 */

const mongoose = require('mongoose');

/**
 * Analytics Configuration
 */
const analyticsConfig = {
  // Time periods
  periods: {
    today: { label: 'اليوم', days: 1 },
    week: { label: 'هذا الأسبوع', days: 7 },
    month: { label: 'هذا الشهر', days: 30 },
    quarter: { label: 'هذا الربع', days: 90 },
    year: { label: 'هذه السنة', days: 365 },
  },
  
  // Metrics
  metrics: {
    views: 'المشاهدات',
    downloads: 'التنزيلات',
    shares: 'المشاركات',
    comments: 'التعليقات',
    edits: 'التعديلات',
  },
  
  // Chart types
  chartTypes: {
    line: 'خطي',
    bar: 'أعمدة',
    pie: 'دائري',
    area: 'مساحة',
  },
};

/**
 * Analytics Event Schema
 */
const AnalyticsEventSchema = new mongoose.Schema({
  // Event identification
  eventType: { 
    type: String, 
    enum: ['view', 'download', 'share', 'comment', 'edit', 'create', 'delete', 'search'],
    required: true 
  },
  
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  documentNumber: String,
  
  // User info
  user: {
    userId: String,
    name: String,
    department: String,
    role: String,
  },
  
  // Context
  context: {
    ip: String,
    userAgent: String,
    device: { type: String, enum: ['desktop', 'mobile', 'tablet'] },
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
    },
  },
  
  // Event details
  details: mongoose.Schema.Types.Mixed,
  
  // Session
  sessionId: String,
  
  // Timestamp
  timestamp: { type: Date, default: Date.now },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'analytics_events',
});

// Indexes
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ documentId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'user.userId': 1, timestamp: -1 });

/**
 * Analytics Report Schema
 */
const AnalyticsReportSchema = new mongoose.Schema({
  // Report identification
  name: { type: String, required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
  
  // Date range
  dateRange: {
    start: Date,
    end: Date,
  },
  
  // Metrics included
  metrics: [String],
  
  // Data
  data: mongoose.Schema.Types.Mixed,
  
  // Summary
  summary: {
    totalEvents: Number,
    uniqueUsers: Number,
    uniqueDocuments: Number,
    highlights: [String],
  },
  
  // Status
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  
  // Creator
  createdBy: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'analytics_reports',
});

/**
 * Dashboard Widget Schema
 */
const DashboardWidgetSchema = new mongoose.Schema({
  // Widget identification
  title: { type: String, required: true },
  type: { type: String, enum: ['chart', 'counter', 'list', 'table', 'heatmap'] },
  
  // Configuration
  config: {
    metric: String,
    period: String,
    chartType: String,
    groupBy: String,
    limit: Number,
    filters: mongoose.Schema.Types.Mixed,
  },
  
  // Position
  position: {
    row: Number,
    col: Number,
    width: Number,
    height: Number,
  },
  
  // Cache
  cache: {
    enabled: { type: Boolean, default: true },
    ttl: Number,
    lastUpdated: Date,
    data: mongoose.Schema.Types.Mixed,
  },
  
  // Owner
  userId: String,
  isGlobal: { type: Boolean, default: false },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'analytics_widgets',
});

/**
 * Document Analytics Service Class
 */
class DocumentAnalyticsService {
  constructor() {
    this.AnalyticsEvent = null;
    this.AnalyticsReport = null;
    this.DashboardWidget = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.AnalyticsEvent = connection.model('AnalyticsEvent', AnalyticsEventSchema);
    this.AnalyticsReport = connection.model('AnalyticsReport', AnalyticsReportSchema);
    this.DashboardWidget = connection.model('DashboardWidget', DashboardWidgetSchema);
    
    console.log('✅ Document Analytics Service initialized');
  }
  
  /**
   * Track event
   */
  async trackEvent(eventType, data = {}) {
    const event = await this.AnalyticsEvent.create({
      eventType,
      documentId: data.documentId,
      documentNumber: data.documentNumber,
      user: {
        userId: data.userId,
        name: data.userName,
        department: data.department,
        role: data.role,
      },
      context: {
        ip: data.ip,
        userAgent: data.userAgent,
        device: data.device,
        browser: data.browser,
        os: data.os,
        location: data.location,
      },
      details: data.details,
      sessionId: data.sessionId,
      tenantId: data.tenantId,
    });
    
    return event;
  }
  
  /**
   * Get document analytics
   */
  async getDocumentAnalytics(documentId, period = 'month') {
    const days = analyticsConfig.periods[period]?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const events = await this.AnalyticsEvent.find({
      documentId,
      timestamp: { $gte: startDate },
    });
    
    // Aggregate by type
    const byType = {};
    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    }
    
    // Aggregate by day
    const byDay = {};
    for (const event of events) {
      const day = event.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }
    
    // Unique users
    const uniqueUsers = new Set(events.map(e => e.user?.userId).filter(Boolean));
    
    // Top viewers
    const viewers = {};
    for (const event of events) {
      if (event.user?.userId) {
        viewers[event.user.userId] = (viewers[event.user.userId] || 0) + 1;
      }
    }
    
    const topViewers = Object.entries(viewers)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      documentId,
      period,
      summary: {
        totalEvents: events.length,
        uniqueUsers: uniqueUsers.size,
        ...byType,
      },
      timeline: Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topViewers,
    };
  }
  
  /**
   * Get user activity
   */
  async getUserActivity(userId, period = 'month') {
    const days = analyticsConfig.periods[period]?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const events = await this.AnalyticsEvent.find({
      'user.userId': userId,
      timestamp: { $gte: startDate },
    });
    
    // Aggregate by type
    const byType = {};
    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    }
    
    // Recent documents
    const documents = {};
    for (const event of events) {
      if (event.documentId) {
        documents[event.documentId] = event.timestamp;
      }
    }
    
    const recentDocuments = Object.entries(documents)
      .map(([id, time]) => ({ documentId: id, lastAccess: time }))
      .sort((a, b) => new Date(b.lastAccess) - new Date(a.lastAccess))
      .slice(0, 10);
    
    return {
      userId,
      period,
      summary: {
        totalEvents: events.length,
        ...byType,
      },
      recentDocuments,
    };
  }
  
  /**
   * Get dashboard data
   */
  async getDashboard(tenantId, period = 'month') {
    const days = analyticsConfig.periods[period]?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const filter = { timestamp: { $gte: startDate } };
    if (tenantId) filter.tenantId = tenantId;
    
    const [
      totalEvents,
      eventsByType,
      eventsByDay,
      topDocuments,
      topUsers,
      eventsByCategory,
    ] = await Promise.all([
      // Total events
      this.AnalyticsEvent.countDocuments(filter),
      
      // Events by type
      this.AnalyticsEvent.aggregate([
        { $match: filter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      // Events by day
      this.AnalyticsEvent.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      
      // Top documents
      this.AnalyticsEvent.aggregate([
        { $match: { ...filter, documentId: { $exists: true } } },
        { $group: { _id: '$documentId', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
      
      // Top users
      this.AnalyticsEvent.aggregate([
        { $match: { ...filter, 'user.userId': { $exists: true } } },
        { $group: { _id: '$user.userId', name: { $first: '$user.name' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      
      // Events by document category (from details)
      this.AnalyticsEvent.aggregate([
        { $match: { ...filter, 'details.category': { $exists: true } } },
        { $group: { _id: '$details.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);
    
    return {
      period,
      summary: {
        totalEvents,
        eventsByType: eventsByType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      },
      charts: {
        eventsByDay: eventsByDay.map(item => ({ date: item._id, count: item.count })),
        eventsByType: eventsByType.map(item => ({ type: item._id, count: item.count })),
        eventsByCategory: eventsByCategory.map(item => ({ category: item._id, count: item.count })),
      },
      topDocuments: topDocuments.map(item => ({ documentId: item._id, views: item.views })),
      topUsers: topUsers.map(item => ({ userId: item._id, name: item.name, count: item.count })),
    };
  }
  
  /**
   * Get trends
   */
  async getTrends(tenantId, metric = 'views', period = 'month') {
    const days = analyticsConfig.periods[period]?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const filter = {
      timestamp: { $gte: startDate },
      eventType: metric === 'all' ? { $exists: true } : metric,
    };
    if (tenantId) filter.tenantId = tenantId;
    
    const data = await this.AnalyticsEvent.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Calculate trend
    const values = data.map(d => d.count);
    const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    
    // Simple trend calculation
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    
    const trendDirection = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    const trendPercentage = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
    
    return {
      metric,
      period,
      data: data.map(item => ({ date: item._id, value: item.count })),
      trend: {
        direction: trendDirection,
        percentage: Math.abs(trendPercentage),
        average: Math.round(avgValue),
      },
    };
  }
  
  /**
   * Get search analytics
   */
  async getSearchAnalytics(tenantId, period = 'month') {
    const days = analyticsConfig.periods[period]?.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const filter = {
      timestamp: { $gte: startDate },
      eventType: 'search',
    };
    if (tenantId) filter.tenantId = tenantId;
    
    const searches = await this.AnalyticsEvent.find(filter);
    
    // Extract search terms
    const searchTerms = {};
    for (const search of searches) {
      const term = search.details?.query?.toLowerCase();
      if (term) {
        searchTerms[term] = (searchTerms[term] || 0) + 1;
      }
    }
    
    // Top searches
    const topSearches = Object.entries(searchTerms)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    // Zero results searches
    const zeroResults = searches.filter(s => s.details?.resultCount === 0);
    
    return {
      period,
      totalSearches: searches.length,
      uniqueTerms: Object.keys(searchTerms).length,
      topSearches,
      zeroResultSearches: zeroResults.length,
      topZeroResultTerms: zeroResults
        .map(s => s.details?.query?.toLowerCase())
        .filter(Boolean)
        .slice(0, 10),
    };
  }
  
  /**
   * Generate report
   */
  async generateReport(type, options = {}) {
    const report = await this.AnalyticsReport.create({
      name: options.name || `${type} Report ${new Date().toISOString()}`,
      type,
      dateRange: {
        start: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: options.endDate || new Date(),
      },
      metrics: options.metrics || ['views', 'downloads', 'shares'],
      createdBy: options.userId,
      tenantId: options.tenantId,
    });
    
    // Generate report data based on type
    try {
      const data = await this.generateReportData(report);
      report.data = data;
      report.status = 'completed';
      await report.save();
    } catch (error) {
      report.status = 'failed';
      await report.save();
    }
    
    return report;
  }
  
  /**
   * Generate report data
   */
  async generateReportData(report) {
    const filter = {
      timestamp: { $gte: report.dateRange.start, $lte: report.dateRange.end },
    };
    if (report.tenantId) filter.tenantId = report.tenantId;
    
    const events = await this.AnalyticsEvent.find(filter);
    
    return {
      totalEvents: events.length,
      eventsByType: this.groupBy(events, 'eventType'),
      eventsByDay: this.groupByDate(events),
    };
  }
  
  /**
   * Group by field helper
   */
  groupBy(items, field) {
    const result = {};
    for (const item of items) {
      const key = item[field] || 'unknown';
      result[key] = (result[key] || 0) + 1;
    }
    return result;
  }
  
  /**
   * Group by date helper
   */
  groupByDate(items) {
    const result = {};
    for (const item of items) {
      const date = item.timestamp.toISOString().split('T')[0];
      result[date] = (result[date] || 0) + 1;
    }
    return result;
  }
  
  /**
   * Create dashboard widget
   */
  async createWidget(widgetData) {
    return this.DashboardWidget.create(widgetData);
  }
  
  /**
   * Get widgets for user
   */
  async getWidgets(userId, tenantId) {
    return this.DashboardWidget.find({
      $or: [{ userId }, { isGlobal: true }],
      tenantId,
    }).sort({ 'position.row': 1, 'position.col': 1 });
  }
  
  /**
   * Clean old events
   */
  async cleanOldEvents(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await this.AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
    
    return { deleted: result.deletedCount };
  }
}

// Singleton instance
const documentAnalyticsService = new DocumentAnalyticsService();

/**
 * Event Types (Arabic)
 */
const eventTypes = {
  view: { label: 'مشاهدة', icon: 'eye', color: 'blue' },
  download: { label: 'تنزيل', icon: 'download', color: 'green' },
  share: { label: 'مشاركة', icon: 'share', color: 'purple' },
  comment: { label: 'تعليق', icon: 'message', color: 'orange' },
  edit: { label: 'تعديل', icon: 'edit', color: 'yellow' },
  create: { label: 'إنشاء', icon: 'plus', color: 'green' },
  delete: { label: 'حذف', icon: 'trash', color: 'red' },
  search: { label: 'بحث', icon: 'search', color: 'gray' },
};

module.exports = {
  DocumentAnalyticsService,
  documentAnalyticsService,
  analyticsConfig,
  eventTypes,
};