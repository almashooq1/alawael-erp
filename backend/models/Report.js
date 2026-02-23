const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'performance',
      'disability-summary',
      'maintenance-schedule',
      'asset-depreciation',
      'custom'
    ],
    required: true
  },
  format: {
    type: String,
    enum: ['json', 'csv', 'pdf', 'xlsx'],
    default: 'json'
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'scheduled'],
    default: 'generating'
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  summary: {
    totalRecords: {
      type: Number,
      default: 0
    },
    dataPoints: {
      type: Number,
      default: 0
    }
  },
  processingTime: {
    type: Number,
    default: 0 // milliseconds
  },
  fileSize: {
    type: String,
    default: '0KB'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  // Scheduling
  isScheduled: {
    type: Boolean,
    default: false
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'monthly'
    },
    nextRun: Date,
    recipients: [String],
    enabled: Boolean
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  collection: 'reports'
});

// Index for commonly queried fields
reportSchema.index({ type: 1, requestedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ requestedBy: 1, createdAt: -1 });

// TTL index to auto-delete expired reports after expiration date
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Report', reportSchema);
