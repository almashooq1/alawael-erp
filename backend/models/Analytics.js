const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    index: true
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  module: {
    type: String,
    enum: ['disability', 'maintenance', 'assets', 'webhooks', 'schedules', 'reports'],
    default: 'webhooks'
  },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'trigger', 'test'],
    default: 'read'
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  duration: {
    type: Number,
    default: 0 // milliseconds
  },
  endpoint: {
    type: String,
    default: null
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default: 'GET'
  },
  statusCode: {
    type: Number,
    default: 200
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  collection: 'analytics'
});

// Indexes for time-series queries
// Note: TTL index on timestamp also provides sorting index
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ module: 1, action: 1, timestamp: -1 });
analyticsSchema.index({ status: 1, timestamp: -1 });

// TTL index: automatically delete records older than 90 days
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Analytics', analyticsSchema);
