const mongoose = require('mongoose');

const ReportTemplateSchema = new mongoose.Schema(
  {
    // Core Identification
    templateId: {
      type: String,
      unique: true,
      default: () => `TEMPLATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    templateCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Template Category
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
      required: true,
    },

    // Report Configuration
    reportConfiguration: {
      reportType: String,

      // Metrics Definition
      metrics: [
        {
          metricName: String,
          metricCode: String,
          field: String,
          aggregationType: String, // 'sum', 'average', 'count', 'max', 'min'
          format: String, // 'currency', 'percent', 'number', 'date'
          label: String,
          description: String,
          displayOrder: Number,
          _id: false,
        },
      ],

      // Dimensions (Grouping)
      dimensions: [
        {
          dimensionName: String,
          field: String,
          label: String,
          sortOrder: String, // 'asc', 'desc'
          isDefault: Boolean,
          _id: false,
        },
      ],

      // Filters
      defaultFilters: [
        {
          filterName: String,
          field: String,
          operator: String, // 'equals', 'greater', 'less', 'between', 'contains'
          value: mongoose.Schema.Types.Mixed,
          isRequired: Boolean,
          _id: false,
        },
      ],

      // Date Range
      dateRangeConfig: {
        field: String,
        defaultRange: String, // 'last7days', 'lastmonth', 'lastyear', 'custom'
        allowCustomRange: Boolean,
        _id: false,
      },

      // Sorting
      defaultSort: [
        {
          field: String,
          direction: String, // 'asc', 'desc'
          _id: false,
        },
      ],

      // Pagination
      pageSize: {
        type: Number,
        default: 100,
      },
    },

    // Visualization Configuration
    visualizations: [
      {
        visualizationType: String, // 'table', 'chart', 'gauge', 'map', 'heatmap'
        title: String,
        description: String,

        // Chart Configuration
        chartConfig: {
          chartType: String, // 'bar', 'line', 'pie', 'area', 'scatter'
          xAxis: String,
          yAxis: String,
          colorScheme: String,
          showLegend: Boolean,
          showGrid: Boolean,
          enableExport: Boolean,
          _id: false,
        },

        // Table Configuration
        tableConfig: {
          showHeader: Boolean,
          showFooter: Boolean,
          enableSort: Boolean,
          enableFilter: Boolean,
          enableExport: Boolean,
          rowsPerPage: Number,
          _id: false,
        },

        // Data Binding
        dataBinding: {
          dataSource: String,
          primaryMetric: String,
          secondaryMetrics: [String],
          _id: false,
        },

        displayOrder: Number,
        isInteractive: Boolean,
        isConditionallyVisible: Boolean,
        visibilityCondition: String,
        _id: false,
      },
    ],

    // Sections (for structured reports)
    sections: [
      {
        sectionName: String,
        sectionType: String, // 'summary', 'detailed', 'analysis', 'recommendations'
        displayOrder: Number,
        visualizations: [mongoose.Schema.Types.Mixed],
        enablePageBreak: Boolean,
        _id: false,
      },
    ],

    // Export Configuration
    exportConfig: {
      supportedFormats: [String], // ['pdf', 'excel', 'csv', 'json']
      defaultFormat: String,
      pdfConfig: {
        pageSize: String, // 'A4', 'Letter'
        orientation: String, // 'portrait', 'landscape'
        includeHeader: Boolean,
        includeFooter: Boolean,
        headerText: String,
        footerText: String,
        _id: false,
      },
      excelConfig: {
        includeNumbering: Boolean,
        freezeHeaderRow: Boolean,
        autoAdjustColumns: Boolean,
        _id: false,
      },
    },

    // Scheduling & Distribution
    scheduleConfig: {
      isScheduleable: {
        type: Boolean,
        default: true,
      },
      defaultFrequency: String, // 'daily', 'weekly', 'monthly'
      supportedFrequencies: [String],
      distributionMethod: String, // 'email', 'download', 'storage'
      defaultRecipients: [String],
      _id: false,
    },

    // Approval Workflow
    approvalRequired: Boolean,
    approverRole: String,
    approverEmail: String,
    isApproved: Boolean,
    approvedBy: String,
    approvedAt: Date,

    // Performance Recommendations
    performanceSettings: {
      cacheResults: Boolean,
      cacheExpiry: Number, // hours
      maxRows: Number,
      enablePagination: Boolean,
      optimizeForSpeed: Boolean,
      _id: false,
    },

    // Usage Statistics
    usageStats: {
      totalUsage: {
        type: Number,
        default: 0,
      },
      totalReportsGenerated: {
        type: Number,
        default: 0,
      },
      totalScheduledReports: {
        type: Number,
        default: 0,
      },
      lastUsedAt: Date,
      lastUsedBy: String,
      totalDownloads: {
        type: Number,
        default: 0,
      },
      _id: false,
    },

    // Version Control
    version: {
      type: Number,
      default: 1,
    },
    changelog: [
      {
        version: Number,
        changes: String,
        changedBy: String,
        changedAt: Date,
        _id: false,
      },
    ],

    // Template Variants (A/B Testing)
    variants: [
      {
        variantName: String,
        variantCode: String,
        configuration: mongoose.Schema.Types.Mixed,
        isActive: Boolean,
        _id: false,
      },
    ],

    // Metadata
    author: String,
    authorEmail: String,
    tags: [String],
    keywords: [String],
    industry: String,

    // Status & Lifecycle
    status: {
      type: String,
      enum: ['draft', 'published', 'deprecated', 'archived'],
      default: 'draft',
    },
    isPublic: {
      type: Boolean,
      default: false,
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
ReportTemplateSchema.index({ templateCode: 1 }, { unique: true });
ReportTemplateSchema.index({ category: 1, status: 1 });
ReportTemplateSchema.index({ author: 1, createdAt: -1 });
ReportTemplateSchema.index({ tags: 1 });
ReportTemplateSchema.index({ isApproved: 1 });

// Virtuals
ReportTemplateSchema.virtual('metricsCount').get(function () {
  return this.reportConfiguration?.metrics?.length || 0;
});

ReportTemplateSchema.virtual('visualizationCount').get(function () {
  return this.visualizations?.length || 0;
});

ReportTemplateSchema.virtual('dimensionCount').get(function () {
  return this.reportConfiguration?.dimensions?.length || 0;
});

ReportTemplateSchema.virtual('isStale').get(function () {
  const lastUsed = this.usageStats?.lastUsedAt;
  if (!lastUsed) return true;
  const daysSinceUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUse > 90;
});

// Instance Methods
ReportTemplateSchema.methods.validate = async function () {
  const errors = [];

  if (!this.templateName) errors.push('Template name is required');
  if (!this.templateCode) errors.push('Template code is required');
  if (!this.category) errors.push('Category is required');
  if (!this.reportConfiguration?.metrics || this.reportConfiguration.metrics.length === 0) {
    errors.push('At least one metric is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

ReportTemplateSchema.methods.recordUsage = async function (userId) {
  this.usageStats.totalUsage++;
  this.usageStats.totalReportsGenerated++;
  this.usageStats.lastUsedAt = new Date();
  this.usageStats.lastUsedBy = userId;
  return this.save();
};

ReportTemplateSchema.methods.recordScheduledUsage = async function () {
  this.usageStats.totalScheduledReports++;
  return this.save();
};

ReportTemplateSchema.methods.recordDownload = async function () {
  this.usageStats.totalDownloads++;
  return this.save();
};

ReportTemplateSchema.methods.addMetric = function (metric) {
  metric.displayOrder = this.reportConfiguration.metrics.length + 1;
  this.reportConfiguration.metrics.push(metric);
  return this.save();
};

ReportTemplateSchema.methods.removeMetric = function (metricCode) {
  this.reportConfiguration.metrics = this.reportConfiguration.metrics.filter(
    m => m.metricCode !== metricCode
  );
  return this.save();
};

ReportTemplateSchema.methods.addVisualization = function (visualization) {
  visualization.displayOrder = this.visualizations.length + 1;
  this.visualizations.push(visualization);
  return this.save();
};

ReportTemplateSchema.methods.removeVisualization = function (visualizationType) {
  this.visualizations = this.visualizations.filter(v => v.visualizationType !== visualizationType);
  return this.save();
};

ReportTemplateSchema.methods.addVariant = function (variant) {
  this.variants.push(variant);
  return this.save();
};

ReportTemplateSchema.methods.approve = async function (approverEmail) {
  this.isApproved = true;
  this.approvedBy = approverEmail;
  this.approvedAt = new Date();
  this.status = 'published';
  return this.save();
};

ReportTemplateSchema.methods.deprecate = async function () {
  this.status = 'deprecated';
  return this.save();
};

ReportTemplateSchema.methods.createVersion = async function (changes, changedBy) {
  this.changelog.push({
    version: this.version,
    changes,
    changedBy,
    changedAt: new Date(),
  });
  this.version++;
  return this.save();
};

ReportTemplateSchema.methods.getSummary = function () {
  return {
    templateId: this.templateId,
    templateCode: this.templateCode,
    templateName: this.templateName,
    category: this.category,
    status: this.status,
    metricsCount: this.metricsCount,
    visualizationCount: this.visualizationCount,
    usageCount: this.usageStats.totalUsage,
    isApproved: this.isApproved,
  };
};

// Static Methods
ReportTemplateSchema.statics.getByCategory = function (category) {
  return this.find({ category, status: 'published' });
};

ReportTemplateSchema.statics.getByCode = function (code) {
  return this.findOne({ templateCode: code });
};

ReportTemplateSchema.statics.getApproved = function () {
  return this.find({ isApproved: true, status: 'published' });
};

ReportTemplateSchema.statics.getPending = function () {
  return this.find({ approvalRequired: true, isApproved: false });
};

ReportTemplateSchema.statics.getMostUsed = function (limit = 10) {
  return this.find({ status: 'published' }).sort({ 'usageStats.totalUsage': -1 }).limit(limit);
};

ReportTemplateSchema.statics.getPublic = function () {
  return this.find({ isPublic: true, status: 'published' });
};

ReportTemplateSchema.statics.getByAuthor = function (authorEmail) {
  return this.find({ authorEmail, status: { $ne: 'archived' } });
};

ReportTemplateSchema.statics.getStale = function (days = 90) {
  const staleDateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    'usageStats.lastUsedAt': { $lt: staleDateThreshold },
    status: 'published',
  });
};

ReportTemplateSchema.statics.searchByKeyword = function (keyword) {
  return this.find({
    $or: [
      { templateName: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [keyword] } },
      { keywords: { $in: [keyword] } },
    ],
    status: 'published',
  });
};

ReportTemplateSchema.statics.getAnalytics = function () {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalUsage: { $sum: '$usageStats.totalUsage' },
        avgMetrics: { $avg: { $size: '$reportConfiguration.metrics' } },
      },
    },
    { $sort: { totalUsage: -1 } },
  ]);
};

module.exports = mongoose.model('ReportTemplate', ReportTemplateSchema);
