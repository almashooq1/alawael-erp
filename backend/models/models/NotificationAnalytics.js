const mongoose = require('mongoose');

const notificationAnalyticsSchema = new mongoose.Schema({
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: String,
    enum: ['delivered', 'read', 'clicked', 'dismissed', 'failed'],
    required: true,
  },
  channel: {
    type: String,
    enum: ['in-app', 'email', 'sms', 'whatsapp', 'push', 'other'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

notificationAnalyticsSchema.index({ notificationId: 1, event: 1, channel: 1 });
notificationAnalyticsSchema.index({ userId: 1, event: 1 });

const NotificationAnalytics = mongoose.model('NotificationAnalytics', notificationAnalyticsSchema);

module.exports = NotificationAnalytics;
