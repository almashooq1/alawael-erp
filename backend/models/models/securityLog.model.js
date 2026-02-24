/**
 * Security Log Model - نموذج سجل الأمان
 */

const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: String,
  statusCode: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  eventType: {
    type: String,
    enum: ['login', 'logout', 'access', 'modification', 'deletion', 'failed_auth', 'suspicious'],
    default: 'access',
  },
  details: {
    body: Object,
    query: Object,
    errorMessage: String,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// الفهارس للاستعلامات السريعة
securityLogSchema.index({ userId: 1, timestamp: -1 });
securityLogSchema.index({ ip: 1, timestamp: -1 });
securityLogSchema.index({ eventType: 1, severity: 1 });
securityLogSchema.index({ resolved: 1 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
