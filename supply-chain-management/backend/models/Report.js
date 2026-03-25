const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    // Core Identification
    reportId: {
      type: String,
      unique: true,
      default: () => `REPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    reportName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Report Configuration
    templateId: mongoose.Schema.Types.ObjectId,
    templateCode: String,
    reportType: {
      type: String,
      enum: [
        'sales_summary',
        'inventory_analysis',
        'financial_overview',
        'customer_analytics',
        'supply_chain_metrics',
        'performance_dashboard',
        'custom',
      ],
      required: true,
    },

    // Data Source & Filters
    dataFilters: {
      startDate: Date,
      endDate: Date,
      departments: [String],
      suppliers: [mongoose.Schema.Types.ObjectId],
      products: [mongoose.Schema.Types.ObjectId],
      customerIds: [String],
      status: [String],
      customFilters: mongoose.Schema.Types.Mixed,
    },

    // Report Metrics
    metrics: [
      {
        name: String,
        field: String,
        type: String, // 'sum', 'average', 'count', 'percentage', 'trend'
        label: String,
        format: String, // 'currency', 'percent', 'number', 'date'
        _id: false,
      },
    ],

    // Grouping & Aggregation
    groupBy: [
      {
        field: String,
        label: String,
        sortOrder: String, // 'asc', 'desc'
        _id: false,
      },
    ],

    // Report Data (Cached)
    reportData: {
      summary: mongoose.Schema.Types.Mixed,
      details: [mongoose.Schema.Types.Mixed],
      charts: [
        {
          type: String, // 'bar', 'line', 'pie', 'table', 'heatmap'
          title: String,
          data: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
      totals: mongoose.Schema.Types.Mixed,
      pageCount: Number,
    },

    // Generation & Timing
    generatedAt: {
      type: Date,
      default: () => new Date(),
    },
    generatedBy: String,
    lastRefreshedAt: Date,
    refreshFrequency: String, // 'daily', 'weekly', 'monthly', 'on-demand'

    // Scheduling
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledFor: Date,
    cronExpression: String,
    nextScheduledRun: Date,

    // Export & Distribution
    exports: [
      {
        format: String, // 'pdf', 'excel', 'csv', 'json'
        generatedAt: Date,
        filePath: String,
        fileSize: Number,
        downloadCount: Number,
        _id: false,
      },
    ],

    // Recipients & Distribution
    recipients: [
      {
        email: String,
        name: String,
        role: String,
        addedAt: Date,
        lastSentAt: Date,
        _id: false,
      },
    ],

    // Performance Tracking
    generationTime: Number, // milliseconds
    executionStatus: {
      type: String,
      enum: ['pending', 'generating', 'complete', 'failed', 'cached'],
      default: 'pending',
    },
    error: String,
    retryCount: {
      type: Number,
      default: 0,
    },

    // Caching & Performance
    isCached: {
      type: Boolean,
      default: false,
    },
    cacheExpiresAt: Date,

    // Metadata
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    owner: String,
    department: String,

    // Sharing & Permissions
    sharedWith: [
      {
        userId: String,
        email: String,
        permission: String, // 'view', 'edit', 'delete'
        sharedAt: Date,
        _id: false,
      },
    ],

    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        version: Number,
        generatedAt: Date,
        fileName: String,
        _id: false,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'archived', 'deleted'],
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

// Indexes for performance
ReportSchema.index({ reportId: 1 });
ReportSchema.index({ owner: 1, createdAt: -1 });
ReportSchema.index({ reportType: 1, status: 1 });
ReportSchema.index({ 'dataFilters.startDate': 1, 'dataFilters.endDate': 1 });
ReportSchema.index({ nextScheduledRun: 1 });

// Virtuals
ReportSchema.virtual('isStale').get(function () {
  if (!this.lastRefreshedAt) return true;
  const lastRefresh = new Date(this.lastRefreshedAt);
  const now = new Date();
  const ageInHours = (now - lastRefresh) / (1000 * 60 * 60);
  return ageInHours > 24;
});

ReportSchema.virtual('dataSize').get(function () {
  if (!this.reportData) return 0;
  return JSON.stringify(this.reportData).length;
});

ReportSchema.virtual('recipientCount').get(function () {
  return this.recipients.length;
});

ReportSchema.virtual('generationTimeSeconds').get(function () {
  return this.generationTime ? (this.generationTime / 1000).toFixed(2) : null;
});

// Instance Methods
ReportSchema.methods.regenerate = async function () {
  this.executionStatus = 'generating';
  this.generationTime = null;
  this.reportData = {};
  return this.save();
};

ReportSchema.methods.updateData = async function (data) {
  const startTime = Date.now();
  this.reportData = data;
  this.generationTime = Date.now() - startTime;
  this.executionStatus = 'complete';
  this.lastRefreshedAt = new Date();
  this.isCached = true;
  this.cacheExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.save();
};

ReportSchema.methods.addRecipient = function (email, name, role) {
  const recipientExists = this.recipients.find(r => r.email === email);
  if (!recipientExists) {
    this.recipients.push({ email, name, role, addedAt: new Date() });
  }
  return this.save();
};

ReportSchema.methods.removeRecipient = function (email) {
  this.recipients = this.recipients.filter(r => r.email !== email);
  return this.save();
};

ReportSchema.methods.shareWith = function (userId, email, permission) {
  const shareExists = this.sharedWith.find(s => s.userId === userId);
  if (!shareExists) {
    this.sharedWith.push({ userId, email, permission, sharedAt: new Date() });
  }
  return this.save();
};

ReportSchema.methods.addExport = async function (format, filePath, fileSize) {
  this.exports.push({
    format,
    generatedAt: new Date(),
    filePath,
    fileSize,
    downloadCount: 0,
  });
  return this.save();
};

ReportSchema.methods.recordDownload = function (format) {
  const exportRecord = this.exports.find(e => e.format === format);
  if (exportRecord) {
    exportRecord.downloadCount++;
  }
  return this.save();
};

ReportSchema.methods.archiveVersion = async function () {
  this.previousVersions.push({
    version: this.version,
    generatedAt: this.generatedAt,
    fileName: `${this.reportId}-v${this.version}.json`,
  });
  this.version++;
  return this.save();
};

ReportSchema.methods.markAsFailed = function (error) {
  this.executionStatus = 'failed';
  this.error = error;
  this.retryCount++;
  return this.save();
};

ReportSchema.methods.getSummary = function () {
  return {
    reportId: this.reportId,
    reportName: this.reportName,
    reportType: this.reportType,
    status: this.status,
    generatedAt: this.generatedAt,
    generationTime: this.generationTime,
    dataPointCount: this.reportData?.details?.length || 0,
    recipientCount: this.recipientCount,
    cacheStatus: this.isCached ? 'cached' : 'fresh',
  };
};

// Static Methods
ReportSchema.statics.getActive = function () {
  return this.find({ status: 'active', executionStatus: 'complete' });
};

ReportSchema.statics.getByType = function (reportType) {
  return this.find({ reportType, status: 'active' });
};

ReportSchema.statics.getPending = function () {
  return this.find({ executionStatus: 'pending' }).sort({ createdAt: 1 });
};

ReportSchema.statics.getFailedReports = function (hours = 24) {
  const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    executionStatus: 'failed',
    updatedAt: { $gte: sinceTime },
  });
};

ReportSchema.statics.getMostDownloaded = function (limit = 10) {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $addFields: {
        totalDownloads: {
          $sum: '$exports.downloadCount',
        },
      },
    },
    { $sort: { totalDownloads: -1 } },
    { $limit: limit },
  ]);
};

ReportSchema.statics.getScheduledReports = function () {
  return this.find({
    isScheduled: true,
    status: 'active',
    nextScheduledRun: { $lte: new Date() },
  });
};

ReportSchema.statics.getReportsByOwner = function (ownerId) {
  return this.find({ owner: ownerId, status: { $ne: 'deleted' } });
};

ReportSchema.statics.getSharedWithUser = function (userId) {
  return this.find({
    'sharedWith.userId': userId,
    status: { $ne: 'deleted' },
  });
};

ReportSchema.statics.getAnalytics = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$reportType',
        count: { $sum: 1 },
        avgGenerationTime: { $avg: '$generationTime' },
        totalDownloads: { $sum: { $sum: '$exports.downloadCount' } },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model('Report', ReportSchema);
