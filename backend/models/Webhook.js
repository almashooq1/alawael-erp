const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  // Core
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  url: {
    type: String,
    required: true
  },

  // Configuration
  events: [{
    type: String,
    enum: [
      'asset.created', 'asset.updated', 'asset.deleted',
      'schedule.created', 'schedule.updated', 'schedule.confirmed',
      'maintenance.created', 'maintenance.completed',
      'report.generated', 'report.scheduled',
      'disability.program.created', 'disability.session.completed'
    ]
  }],

  // Security
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  secretKey: String,
  bearerToken: String,
  authType: {
    type: String,
    enum: ['none', 'bearer', 'api-key', 'hmac'],
    default: 'none'
  },

  // Headers and Customization
  headers: {
    type: Map,
    of: String
  },
  customPayload: {
    type: mongoose.Schema.Types.Mixed
  },
  retryPolicy: {
    maxRetries: {
      type: Number,
      default: 3
    },
    backoffMultiplier: {
      type: Number,
      default: 2
    },
    initialDelayMs: {
      type: Number,
      default: 1000
    }
  },

  // Monitoring
  isVerified: Boolean,
  documentationUrl: String,
  rateLimit: {
    requestsPerMinute: Number,
    requestsPerHour: Number
  },

  // Statistics
  totalDeliveries: {
    type: Number,
    default: 0
  },
  successfulDeliveries: {
    type: Number,
    default: 0
  },
  failedDeliveries: {
    type: Number,
    default: 0
  },
  lastDeliveryDate: Date,
  lastDeliveryStatus: String,
  averageResponseTime: Number, // milliseconds

  // Ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriberEmail: String,
  organization: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'failed', 'suspended'],
    default: 'active',
    index: true
  },
  suspendedReason: String,

  // Metadata
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    index: -1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
webhookSchema.index({ createdBy: 1, status: 1 });
webhookSchema.index({ events: 1, isActive: 1 });
webhookSchema.index({ status: 1, lastDeliveryDate: -1 });
webhookSchema.index({ createdBy: 1, createdAt: -1 });

// Pre-save middleware
webhookSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);
