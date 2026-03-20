/**
 * ImportExportJob Model
 * =====================
 * نظام تتبع مهام الاستيراد والتصدير
 * Tracks all import/export operations with full audit trail
 *
 * @module models/ImportExportJob
 */

const mongoose = require('mongoose');

const columnMappingSchema = new mongoose.Schema(
  {
    sourceColumn: { type: String, required: true },
    targetField: { type: String, required: true },
    dataType: {
      type: String,
      enum: [
        'string',
        'number',
        'date',
        'boolean',
        'email',
        'phone',
        'currency',
        'array',
        'object',
      ],
      default: 'string',
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    transformRule: { type: String }, // e.g., 'uppercase', 'trim', 'dateFormat:YYYY-MM-DD'
    validationRule: { type: String }, // regex or built-in rule
  },
  { _id: false }
);

const validationErrorSchema = new mongoose.Schema(
  {
    row: { type: Number },
    column: { type: String },
    field: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    severity: { type: String, enum: ['error', 'warning', 'info'], default: 'error' },
  },
  { _id: false }
);

const importExportJobSchema = new mongoose.Schema(
  {
    // Job Identity
    jobId: { type: String, unique: true, index: true },
    jobName: { type: String, required: true, trim: true },
    jobNameAr: { type: String, trim: true },

    // Job Type & Configuration
    type: {
      type: String,
      required: true,
      enum: ['export', 'import'],
      index: true,
    },
    format: {
      type: String,
      required: true,
      enum: ['xlsx', 'csv', 'json', 'pdf', 'xml', 'zip'],
      index: true,
    },

    // Data Source
    dataSource: {
      module: { type: String, required: true, index: true }, // e.g., 'employees', 'fleet', 'finance'
      model: { type: String }, // Mongoose model name
      collection: { type: String },
      query: { type: mongoose.Schema.Types.Mixed, default: {} }, // MongoDB query for export
      fields: [{ type: String }], // Selected fields to export
      sort: { type: mongoose.Schema.Types.Mixed },
      dateRange: {
        field: { type: String },
        from: { type: Date },
        to: { type: Date },
      },
    },

    // Column Mapping (for imports)
    columnMappings: [columnMappingSchema],

    // File Information
    file: {
      originalName: { type: String },
      storedName: { type: String },
      path: { type: String },
      size: { type: Number, default: 0 },
      mimeType: { type: String },
      encoding: { type: String, default: 'utf-8' },
      checksum: { type: String }, // SHA-256
      downloadUrl: { type: String },
      expiresAt: { type: Date },
    },

    // Processing Status
    status: {
      type: String,
      enum: [
        'pending',
        'validating',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'partial',
        'queued',
        'paused',
      ],
      default: 'pending',
      index: true,
    },

    // Progress Tracking
    progress: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      currentStep: { type: String },
      estimatedTimeRemaining: { type: Number }, // seconds
    },

    // Validation Results (for imports)
    validation: {
      isValid: { type: Boolean },
      errors: [validationErrorSchema],
      warnings: [validationErrorSchema],
      previewData: [{ type: mongoose.Schema.Types.Mixed }], // First N rows preview
      totalRows: { type: Number },
      validRows: { type: Number },
      invalidRows: { type: Number },
    },

    // Export Options
    exportOptions: {
      includeHeaders: { type: Boolean, default: true },
      includeMetadata: { type: Boolean, default: false },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      numberFormat: { type: String },
      currencyCode: { type: String, default: 'SAR' },
      language: { type: String, enum: ['ar', 'en', 'both'], default: 'both' },
      encoding: { type: String, default: 'utf-8' },
      delimiter: { type: String, default: ',' }, // for CSV
      compression: { type: Boolean, default: false },
      password: { type: String }, // encrypted, for protected exports
      watermark: { type: String },
      branding: {
        logo: { type: Boolean, default: true },
        companyName: { type: String },
        headerColor: { type: String },
      },
      pageSize: { type: String, default: 'A4' }, // for PDF
      orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
      sheetName: { type: String, default: 'Data' },
      maxRowsPerSheet: { type: Number, default: 50000 },
      splitByField: { type: String }, // Split export into multiple sheets by field value
    },

    // Import Options
    importOptions: {
      mode: { type: String, enum: ['insert', 'update', 'upsert', 'replace'], default: 'insert' },
      skipDuplicates: { type: Boolean, default: true },
      duplicateCheckField: { type: String }, // Field to check for duplicates
      skipEmptyRows: { type: Boolean, default: true },
      headerRow: { type: Number, default: 1 },
      startRow: { type: Number, default: 2 },
      batchSize: { type: Number, default: 100 },
      validateOnly: { type: Boolean, default: false }, // Dry run
      rollbackOnError: { type: Boolean, default: false },
      trimWhitespace: { type: Boolean, default: true },
      ignoreUnknownColumns: { type: Boolean, default: true },
      transformBeforeInsert: { type: Boolean, default: false },
    },

    // Scheduling
    schedule: {
      isScheduled: { type: Boolean, default: false },
      cronExpression: { type: String },
      frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly', 'custom'] },
      nextRunAt: { type: Date },
      lastRunAt: { type: Date },
      timezone: { type: String, default: 'Asia/Riyadh' },
      isActive: { type: Boolean, default: true },
      repeatCount: { type: Number }, // 0 = infinite
      executionCount: { type: Number, default: 0 },
      notifyOnComplete: { type: Boolean, default: true },
      notifyEmail: { type: String },
    },

    // Template reference
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportExportTemplate' },

    // Processing Details
    processingDetails: {
      startedAt: { type: Date },
      completedAt: { type: Date },
      duration: { type: Number }, // milliseconds
      serverNode: { type: String },
      memoryUsed: { type: Number }, // bytes
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
      errorMessage: { type: String },
      errorStack: { type: String },
    },

    // Results Summary
    results: {
      insertedIds: [{ type: mongoose.Schema.Types.ObjectId }],
      updatedIds: [{ type: mongoose.Schema.Types.ObjectId }],
      failedRows: [{ type: Number }],
      summary: { type: mongoose.Schema.Types.Mixed },
    },

    // Audit Trail
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    department: { type: String },

    // Tags & Notes
    tags: [{ type: String, trim: true }],
    notes: { type: String },

    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
importExportJobSchema.index({ createdBy: 1, createdAt: -1 });
importExportJobSchema.index({ type: 1, status: 1 });
importExportJobSchema.index({ 'dataSource.module': 1, type: 1 });
importExportJobSchema.index({ status: 1, 'schedule.isScheduled': 1, 'schedule.nextRunAt': 1 });
importExportJobSchema.index({ createdAt: -1 });
importExportJobSchema.index({ isDeleted: 1, status: 1 });

// Virtual: completion percentage
importExportJobSchema.virtual('completionRate').get(function () {
  if (!this.progress.total) return 0;
  return Math.round((this.progress.processed / this.progress.total) * 100);
});

// Virtual: success rate
importExportJobSchema.virtual('successRate').get(function () {
  if (!this.progress.processed) return 0;
  return Math.round((this.progress.successful / this.progress.processed) * 100);
});

// Pre-save: Generate jobId
importExportJobSchema.pre('save', function (next) {
  if (!this.jobId) {
    const prefix = this.type === 'export' ? 'EXP' : 'IMP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.jobId = `${prefix}-${timestamp}-${random}`;
  }

  // Update progress percentage
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round((this.progress.processed / this.progress.total) * 100);
  }

  next();
});

// Static: get module statistics
importExportJobSchema.statics.getModuleStats = async function (module) {
  return this.aggregate([
    { $match: { 'dataSource.module': module, isDeleted: false } },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalRows: { $sum: '$progress.total' },
        totalProcessed: { $sum: '$progress.processed' },
      },
    },
  ]);
};

// Static: get overall dashboard stats
importExportJobSchema.statics.getDashboardStats = async function (userId, dateRange) {
  const match = { isDeleted: false };
  if (userId) match.createdBy = mongoose.Types.ObjectId(userId);
  if (dateRange) {
    match.createdAt = {};
    if (dateRange.from) match.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) match.createdAt.$lte = new Date(dateRange.to);
  }

  return this.aggregate([
    { $match: match },
    {
      $facet: {
        byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byFormat: [{ $group: { _id: '$format', count: { $sum: 1 } } }],
        byModule: [{ $group: { _id: '$dataSource.module', count: { $sum: 1 } } }],
        recentJobs: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              jobId: 1,
              jobName: 1,
              type: 1,
              format: 1,
              status: 1,
              progress: 1,
              createdAt: 1,
            },
          },
        ],
        totalStats: [
          {
            $group: {
              _id: null,
              totalJobs: { $sum: 1 },
              totalRows: { $sum: '$progress.total' },
              totalProcessed: { $sum: '$progress.processed' },
              avgDuration: { $avg: '$processingDetails.duration' },
            },
          },
        ],
      },
    },
  ]);
};

module.exports = mongoose.model('ImportExportJob', importExportJobSchema);
