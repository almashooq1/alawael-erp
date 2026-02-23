const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  // Webhook Reference
  webhookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true,
    index: true
  },

  // Event Details
  event: {
    type: String,
    required: true,
    index: true
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Delivery Tracking
  url: String,
  deliveryAttempt: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'retrying'],
    default: 'pending',
    index: true
  },

  // Timing
  scheduledTime: {
    type: Date,
    default: Date.now
  },
  sentTime: Date,
  completedTime: Date,
  executionTimeMs: Number,

  // Request/Response
  requestPayload: mongoose.Schema.Types.Mixed,
  requestHeaders: {
    type: Map,
    of: String
  },
  responseStatus: Number,
  responseHeaders: {
    type: Map,
    of: String
  },
  responseBody: String,
  errorMessage: String,
  errorStack: String,

  // Retry Information
  nextRetryTime: Date,
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryTime: Date,
  maxRetries: {
    type: Number,
    default: 3
  },

  // Analytics
  httpMethod: {
    type: String,
    default: 'POST',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  contentType: {
    type: String,
    default: 'application/json'
  },
  signature: String,

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
webhookDeliverySchema.index({ webhookId: 1, status: 1 });
webhookDeliverySchema.index({ status: 1, createdAt: -1 });
webhookDeliverySchema.index({ event: 1, status: 1 });
webhookDeliverySchema.index({ nextRetryTime: 1 });

// TTL Index: Auto-delete deliveries older than 90 days
webhookDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Pre-save middleware
webhookDeliverySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
