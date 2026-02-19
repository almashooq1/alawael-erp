const mongoose = require('mongoose');
const moment = require('moment');

/**
 * Notification Schema
 * Tracks all notifications with multi-channel delivery
 */
const NotificationSchema = new mongoose.Schema(
  {
    // Notification ID
    notificationId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Recipients
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    recipientEmail: String,

    recipientPhone: String,

    // Notification Type
    type: {
      type: String,
      enum: [
        'payment_confirmation', // Payment related
        'invoice_reminder', // Invoice related
        'budget_alert', // Budget warning
        'document_shared', // Document collaboration
        'message_received', // Direct message
        'task_assigned', // Task management
        'system_alert', // System notifications
        'promotion', // Marketing related
        'order_update', // Order status
        'deadline_reminder', // Time-sensitive
      ],
      required: true,
      index: true,
    },

    // Content
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    description: String,

    // Channels
    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app', 'slack', 'webhook'],
      },
    ],

    // Template Information
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },

    templateName: String,

    variableData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Delivery Status
    status: {
      type: String,
      enum: ['scheduled', 'pending', 'sending', 'sent', 'failed', 'bounced', 'unopened'],
      default: 'pending',
      index: true,
    },

    // Scheduling
    scheduledFor: {
      type: Date,
      index: true,
    },

    sentAt: Date,

    deliveredAt: Date,

    readAt: Date,

    // Per-Channel Status
    channelStatus: [
      {
        channel: {
          type: String,
          enum: ['email', 'sms', 'push', 'in_app', 'slack', 'webhook'],
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'bounced', 'delivered'],
        },
        sentAt: Date,
        failureReason: String,
        deliveryId: String,
      },
    ],

    // Priority & Importance
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },

    isUrgent: {
      type: Boolean,
      default: false,
    },

    requiresAction: {
      type: Boolean,
      default: false,
    },

    actionUrl: String,

    actionLabel: String,

    // Categorization
    category: String,

    tags: [String],

    relatedEntityType: String, // 'invoice', 'payment', 'budget', etc.

    relatedEntityId: mongoose.Schema.Types.ObjectId,

    // User Preferences
    userPreferencesApplied: {
      type: Boolean,
      default: true,
    },

    respectQuietHours: {
      type: Boolean,
      default: true,
    },

    // Tracking
    openCount: {
      type: Number,
      default: 0,
    },

    clickCount: {
      type: Number,
      default: 0,
    },

    bounceCount: {
      type: Number,
      default: 0,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    // Campaign Related
    campaignId: mongoose.Schema.Types.ObjectId,

    campaignName: String,

    batchId: String,

    // Unsubscribe Information
    unsubscribeToken: String,

    isUnsubscribed: {
      type: Boolean,
      default: false,
    },

    unsubscribedAt: Date,

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    sentBy: String, // Service name

    ipAddress: String,

    userAgent: String,

    // Analytics
    conversionTracking: {
      converted: Boolean,
      conversionDate: Date,
      conversionValue: Number,
    },

    // Soft Delete
    deletedAt: {
      type: Date,
      default: null,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ campaignId: 1 });
NotificationSchema.index({ relatedEntityId: 1 });

// Virtuals

/**
 * Is notification read
 */
NotificationSchema.virtual('isRead').get(function () {
  return this.readAt !== undefined && this.readAt !== null;
});

/**
 * Time until scheduled send
 */
NotificationSchema.virtual('timeUntilSend').get(function () {
  if (!this.scheduledFor) return 0;
  return moment(this.scheduledFor).diff(moment(), 'seconds');
});

/**
 * Is scheduled in past
 */
NotificationSchema.virtual('isScheduledInPast').get(function () {
  if (!this.scheduledFor) return false;
  return moment(this.scheduledFor).isBefore(moment());
});

/**
 * Days since sent
 */
NotificationSchema.virtual('daysSinceSent').get(function () {
  if (!this.sentAt) return 0;
  return moment().diff(moment(this.sentAt), 'days');
});

// Instance Methods

/**
 * Mark as read
 */
NotificationSchema.methods.markAsRead = function () {
  this.readAt = new Date();
  this.status = 'sent';
  return this.save();
};

/**
 * Mark as delivered
 */
NotificationSchema.methods.markAsDelivered = function (channel) {
  this.deliveredAt = new Date();
  const channelStatus = this.channelStatus.find(cs => cs.channel === channel);
  if (channelStatus) {
    channelStatus.status = 'delivered';
    channelStatus.deliveryId = `DEL-${Date.now()}`;
  }
  return this.save();
};

/**
 * Record click
 */
NotificationSchema.methods.recordClick = function () {
  this.clickCount = (this.clickCount || 0) + 1;
  return this.save();
};

/**
 * Mark as failed
 */
NotificationSchema.methods.markAsFailed = function (channel, reason) {
  this.status = 'failed';
  const channelStatus = this.channelStatus.find(cs => cs.channel === channel);
  if (channelStatus) {
    channelStatus.status = 'failed';
    channelStatus.failureReason = reason;
  } else {
    this.channelStatus.push({
      channel,
      status: 'failed',
      failureReason: reason,
    });
  }
  return this.save();
};

/**
 * Retry sending
 */
NotificationSchema.methods.retry = function () {
  this.retryCount = (this.retryCount || 0) + 1;
  this.status = 'pending';
  return this.save();
};

/**
 * Unsubscribe
 */
NotificationSchema.methods.unsubscribe = function () {
  this.isUnsubscribed = true;
  this.unsubscribedAt = new Date();
  return this.save();
};

/**
 * Track conversion
 */
NotificationSchema.methods.trackConversion = function (value = 0) {
  this.conversionTracking = {
    converted: true,
    conversionDate: new Date(),
    conversionValue: value,
  };
  return this.save();
};

// Static Methods

/**
 * Get unread notifications
 */
NotificationSchema.statics.getUnread = function (recipientId) {
  return this.find({
    recipientId,
    readAt: { $exists: false },
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

/**
 * Get pending notifications to send
 */
NotificationSchema.statics.getPending = function () {
  return this.find({
    status: { $in: ['pending', 'scheduled'] },
    scheduledFor: { $lte: new Date() },
    deletedAt: null,
  }).sort({ scheduledFor: 1 });
};

/**
 * Get failed notifications
 */
NotificationSchema.statics.getFailed = function (retryThreshold = 3) {
  return this.find({
    status: 'failed',
    retryCount: { $lt: retryThreshold },
    deletedAt: null,
  });
};

/**
 * Get notifications by type
 */
NotificationSchema.statics.getByType = function (recipientId, type) {
  return this.find({
    recipientId,
    type,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

/**
 * Calculate delivery rate
 */
NotificationSchema.statics.getDeliveryStats = function (hours = 24) {
  const sinceDate = moment().subtract(hours, 'hours').toDate();
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: sinceDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        delivered: { $sum: { $cond: ['$deliveredAt', 1, 0] } },
        opened: { $sum: { $cond: ['$readAt', 1, 0] } },
        clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
        avgRetries: { $avg: '$retryCount' },
        deliveryRate: {
          $cond: [{ $gt: ['$total', 0] }, { $divide: ['$delivered', '$total'] }, 0],
        },
        openRate: {
          $cond: [{ $gt: ['$total', 0] }, { $divide: ['$opened', '$total'] }, 0],
        },
        clickRate: {
          $cond: [{ $gt: ['$total', 0] }, { $divide: ['$clicked', '$total'] }, 0],
        },
      },
    },
  ]);
};

module.exports = mongoose.model('Notification', NotificationSchema);
