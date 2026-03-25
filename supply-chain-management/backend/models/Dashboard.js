const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema(
  {
    // Core Identification
    dashboardId: {
      type: String,
      unique: true,
      default: () => `DASHBOARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    dashboardName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Dashboard Configuration
    dashboardType: {
      type: String,
      enum: ['executive', 'operational', 'financial', 'sales', 'inventory', 'custom'],
      required: true,
    },

    // Layout & Display
    layout: {
      columns: {
        type: Number,
        default: 12,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'custom'],
        default: 'light',
      },
      refreshInterval: {
        type: Number,
        default: 300000, // 5 minutes in ms
      },
    },

    // Widgets Configuration
    widgets: [
      {
        widgetId: String,
        widgetName: String,
        widgetType: String, // 'chart', 'metric', 'table', 'gauge', 'map', 'graph'
        reportId: mongoose.Schema.Types.ObjectId,
        reportCode: String,

        // Widget Display Properties
        position: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
          _id: false,
        },

        // Widget Configuration
        configuration: {
          chartType: String, // for chart widgets: 'bar', 'line', 'pie', 'area'
          dataSource: String,
          metricField: String,
          labelField: String,
          colorScheme: String,
          showLegend: Boolean,
          showTooltip: Boolean,
          _id: false,
        },

        // Filters Applied
        filters: [
          {
            field: String,
            operator: String, // 'equals', 'greater', 'less', 'between'
            value: mongoose.Schema.Types.Mixed,
            _id: false,
          },
        ],

        // Drill-down Configuration
        isInteractive: {
          type: Boolean,
          default: true,
        },
        drillDownReportId: mongoose.Schema.Types.ObjectId,

        // Caching
        isCached: Boolean,
        cachedAt: Date,
        cacheExpiry: Date,

        createdAt: {
          type: Date,
          default: () => new Date(),
        },
        _id: false,
      },
    ],

    // Key Performance Indicators
    kpis: [
      {
        kpiName: String,
        kpiCode: String,
        currentValue: mongoose.Schema.Types.Mixed,
        targetValue: mongoose.Schema.Types.Mixed,
        previousValue: mongoose.Schema.Types.Mixed,
        unit: String,
        status: String, // 'on-track', 'at-risk', 'off-track'
        trendDirection: String, // 'up', 'down', 'stable'
        trendPercentage: Number,
        formula: String,
        lastUpdatedAt: Date,
        _id: false,
      },
    ],

    // Alerts Configuration
    alerts: [
      {
        alertName: String,
        alertType: String, // 'threshold', 'trend', 'anomaly'
        condition: String,
        threshold: mongoose.Schema.Types.Mixed,
        severity: String, // 'info', 'warning', 'critical'
        enabled: Boolean,
        recipients: [String],
        _id: false,
      },
    ],

    // Dashboard Permissions & Sharing
    accessLevel: {
      type: String,
      enum: ['private', 'team', 'department', 'public'],
      default: 'private',
    },
    owner: String,
    ownerName: String,
    department: String,

    sharedWith: [
      {
        userId: String,
        email: String,
        name: String,
        permission: String, // 'view', 'edit', 'manage'
        sharedAt: Date,
        _id: false,
      },
    ],

    // Scheduling & Versioning
    isScheduled: Boolean,
    refreshSchedule: {
      frequency: String, // 'realtime', '5min', 'hourly', 'daily'
      lastRefreshAt: Date,
      nextRefreshAt: Date,
      _id: false,
    },

    // Snapshots & History
    snapshots: [
      {
        snapshotId: String,
        capturedAt: Date,
        data: mongoose.Schema.Types.Mixed,
        fileName: String,
        _id: false,
      },
    ],

    // Performance Metrics
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: Date,
    lastViewedBy: String,
    avgLoadTime: Number, // milliseconds

    // Customization & Preferences
    customColors: mongoose.Schema.Types.Mixed,
    customBranding: {
      logo: String,
      headerText: String,
      footerText: String,
      _id: false,
    },

    // Export & Download Configuration
    exportFormats: [String], // ['pdf', 'excel', 'png', 'json']
    isExportable: {
      type: Boolean,
      default: true,
    },

    // Notifications
    enableNotifications: Boolean,
    notificationRecipients: [String],

    // Tags & Metadata
    tags: [String],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'deleted'],
      default: 'draft',
    },

    createdAt: {
      type: Date,
      default: () => new Date(),
    },
    updatedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
DashboardSchema.index({ dashboardId: 1 });
DashboardSchema.index({ owner: 1, createdAt: -1 });
DashboardSchema.index({ dashboardType: 1, status: 1 });
DashboardSchema.index({ 'sharedWith.userId': 1 });
DashboardSchema.index({ lastViewedAt: -1 });

// Virtuals
DashboardSchema.virtual('widgetCount').get(function () {
  return this.widgets.length;
});

DashboardSchema.virtual('kpiCount').get(function () {
  return this.kpis.length;
});

DashboardSchema.virtual('alertCount').get(function () {
  return this.alerts.length;
});

DashboardSchema.virtual('healthStatus').get(function () {
  const okKpis = this.kpis.filter(k => k.status === 'on-track').length;
  const allKpis = this.kpis.length;
  if (allKpis === 0) return 'unknown';
  const percentage = (okKpis / allKpis) * 100;
  if (percentage >= 80) return 'healthy';
  if (percentage >= 50) return 'warning';
  return 'critical';
});

// Instance Methods
DashboardSchema.methods.addWidget = function (widget) {
  widget.widgetId = `WIDGET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  this.widgets.push(widget);
  return this.save();
};

DashboardSchema.methods.removeWidget = function (widgetId) {
  this.widgets = this.widgets.filter(w => w.widgetId !== widgetId);
  return this.save();
};

DashboardSchema.methods.updateWidget = function (widgetId, widgetData) {
  const widget = this.widgets.find(w => w.widgetId === widgetId);
  if (widget) {
    Object.assign(widget, widgetData);
  }
  return this.save();
};

DashboardSchema.methods.addKPI = function (kpi) {
  this.kpis.push(kpi);
  return this.save();
};

DashboardSchema.methods.updateKPI = function (kpiCode, updates) {
  const kpi = this.kpis.find(k => k.kpiCode === kpiCode);
  if (kpi) {
    kpi.previousValue = kpi.currentValue;
    Object.assign(kpi, updates);
    kpi.lastUpdatedAt = new Date();
  }
  return this.save();
};

DashboardSchema.methods.addAlert = function (alert) {
  alert.enabled = true;
  this.alerts.push(alert);
  return this.save();
};

DashboardSchema.methods.removeAlert = function (alertName) {
  this.alerts = this.alerts.filter(a => a.alertName !== alertName);
  return this.save();
};

DashboardSchema.methods.shareWith = function (userId, email, name, permission) {
  const shareExists = this.sharedWith.find(s => s.userId === userId);
  if (!shareExists) {
    this.sharedWith.push({ userId, email, name, permission, sharedAt: new Date() });
  }
  return this.save();
};

DashboardSchema.methods.revokeAccess = function (userId) {
  this.sharedWith = this.sharedWith.filter(s => s.userId !== userId);
  return this.save();
};

DashboardSchema.methods.recordView = function (userId) {
  this.viewCount++;
  this.lastViewedAt = new Date();
  this.lastViewedBy = userId;
  return this.save();
};

DashboardSchema.methods.refreshData = async function () {
  if (this.refreshSchedule) {
    this.refreshSchedule.lastRefreshAt = new Date();
    this.refreshSchedule.nextRefreshAt = new Date(Date.now() + 5 * 60 * 1000);
  }
  return this.save();
};

DashboardSchema.methods.captureSnapshot = async function () {
  const snapshot = {
    snapshotId: `SNAP-${Date.now()}`,
    capturedAt: new Date(),
    data: {
      widgets: this.widgets,
      kpis: this.kpis,
    },
    fileName: `${this.dashboardId}-snap-${Date.now()}.json`,
  };
  this.snapshots.push(snapshot);
  return this.save();
};

DashboardSchema.methods.getSummary = function () {
  return {
    dashboardId: this.dashboardId,
    dashboardName: this.dashboardName,
    dashboardType: this.dashboardType,
    widgetCount: this.widgetCount,
    kpiCount: this.kpiCount,
    alertCount: this.alertCount,
    healthStatus: this.healthStatus,
    viewCount: this.viewCount,
    lastViewedAt: this.lastViewedAt,
  };
};

// Static Methods
DashboardSchema.statics.getActive = function () {
  return this.find({ status: 'active' });
};

DashboardSchema.statics.getByType = function (type) {
  return this.find({ dashboardType: type, status: 'active' });
};

DashboardSchema.statics.getByOwner = function (ownerId) {
  return this.find({ owner: ownerId, status: { $ne: 'deleted' } });
};

DashboardSchema.statics.getSharedWith = function (userId) {
  return this.find({
    'sharedWith.userId': userId,
    status: { $ne: 'deleted' },
  });
};

DashboardSchema.statics.getMostViewed = function (limit = 10, days = 30) {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    lastViewedAt: { $gte: sinceDate },
  })
    .sort({ viewCount: -1 })
    .limit(limit);
};

DashboardSchema.statics.getHealthStatus = function () {
  return this.find({ status: 'active' }).then(dashboards => {
    return dashboards.map(d => ({
      dashboardId: d.dashboardId,
      dashboardName: d.dashboardName,
      healthStatus: d.healthStatus,
      kpis: d.kpis.length,
    }));
  });
};

DashboardSchema.statics.getNeedingRefresh = function () {
  return this.find({
    isScheduled: true,
    status: 'active',
    'refreshSchedule.nextRefreshAt': { $lte: new Date() },
  });
};

DashboardSchema.statics.getUsageAnalytics = function () {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$dashboardType',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        avgWidgets: { $avg: { $size: '$widgets' } },
      },
    },
    { $sort: { totalViews: -1 } },
  ]);
};

module.exports = mongoose.model('Dashboard', DashboardSchema);
