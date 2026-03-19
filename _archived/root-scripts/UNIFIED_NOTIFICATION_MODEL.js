/**
 * UNIFIED NOTIFICATION MODEL
 * Consolidated from 4 different notification schemas across the system
 * Combines features from: erp_new_system, backend, alawael-erp, and supply-chain-management
 *
 * This is the CANONICAL notification model for the entire system.
 * All backends should reference this file to prevent model registration conflicts.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ==================== RECIPIENT FIELDS (Support all variants for compatibility) ====================

    // Primary recipient reference (unified field)
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Legacy aliases for backward compatibility
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    recipientEmail: String,
    recipientPhone: String,

    // ==================== CORE NOTIFICATION FIELDS ====================

    // Unique notification identifier
    notificationId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Notification type (comprehensive enum combining all systems)
    type: {
      type: String,
      enum: [
        // ERP/Business types
        'payment_confirmation',
        'invoice_reminder',
        'budget_alert',
        'document_shared',
        'order_update',
        'task_assigned',
        'deadline_reminder',
        'promotion',
        // Basic types
        'info',
        'success',
        'warning',
        'error',
        'system',
        'message',
        'task',
        'reminder',
        // Legacy capitalized variants
        'INFO',
        'WARNING',
        'SUCCESS',
        'ERROR',
        'TASK',
        'MESSAGE',
      ],
      default: 'info',
    },

    // Title and message
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    // ==================== VISUAL/DISPLAY FIELDS ====================

    icon: {
      type: String,
      default: 'NotificationsIcon',
    },

    color: {
      type: String,
      default: '#1976d2',
    },

    link: String,

    actionUrl: String,
    actionLabel: String,

    // Action buttons
    actions: [
      {
        label: String,
        url: String,
        type: String,
      },
    ],

    // ==================== STATUS FIELDS ====================

    // Read status (support both variants)
    isRead: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },

    readAt: Date,

    // Archive status
    archived: {
      type: Boolean,
      default: false,
    },
    archiveStatus: {
      type: String,
      enum: ['pending', 'archived', 'failed'],
      default: 'pending',
    },
    archiveId: String,
    archivedAt: Date,

    // Delivery status
    status: {
      type: String,
      enum: [
        'scheduled',
        'pending',
        'sending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'unopened',
      ],
      default: 'pending',
    },

    sentAt: Date,
    deliveredAt: Date,

    // ==================== ADVANCED STATUS FIELDS ====================

    // Electronic signatures and stamps
    signatureStatus: {
      type: String,
      enum: ['none', 'pending', 'signed', 'failed'],
      default: 'none',
    },
    signatureId: String,

    stampStatus: {
      type: String,
      enum: ['none', 'pending', 'stamped', 'failed'],
      default: 'none',
    },
    stampId: String,

    // WebSocket delivery
    sentViaWebSocket: {
      type: Boolean,
      default: false,
    },

    // ==================== MULTI-CHANNEL DELIVERY ====================

    // Notification channels
    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app', 'slack', 'webhook'],
      },
    ],

    // Per-channel status
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

    // ==================== PRIORITY & URGENCY ====================

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical', 'urgent'],
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

    // ==================== CATEGORIZATION ====================

    category: {
      type: String,
      default: 'general',
    },

    tags: [String],

    relatedEntityType: String, // 'invoice', 'payment', 'budget', 'document', etc.
    relatedEntityId: mongoose.Schema.Types.ObjectId,

    // ==================== SCHEDULING ====================

    scheduledFor: Date,

    expiresAt: Date,

    respectQuietHours: {
      type: Boolean,
      default: true,
    },

    // ==================== TEMPLATE & VARIABLES ====================

    templateId: mongoose.Schema.Types.ObjectId,
    templateName: String,

    variableData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ==================== USER PREFERENCES ====================

    userPreferencesApplied: {
      type: Boolean,
      default: true,
    },

    favorite: {
      type: Boolean,
      default: false,
    },

    snoozed: {
      type: Boolean,
      default: false,
    },
    snoozedUntil: Date,

    // ==================== TRACKING METRICS ====================

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

    lastRetryAt: Date,

    // ==================== CAMPAIGN TRACKING ====================

    campaignId: mongoose.Schema.Types.ObjectId,
    campaignName: String,
    batchId: String,

    // ==================== UNSUBSCRIBE MANAGEMENT ====================

    unsubscribeToken: String,
    isUnsubscribed: {
      type: Boolean,
      default: false,
    },
    unsubscribedAt: Date,

    // ==================== CONVERSION TRACKING ====================

    conversionTracking: {
      converted: Boolean,
      conversionDate: Date,
      conversionValue: Number,
    },

    // ==================== AUDIT TRAIL ====================

    senderId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    sentBy: String, // Service name

    ipAddress: String,
    userAgent: String,

    // ==================== SPECIAL FIELDS ====================

    serialNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    barcode: String,

    // ==================== SOFT DELETE ====================

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // TTL index for 30 days auto-delete
    expires: 2592000,
  }
);

// ==================== INDEXES FOR PERFORMANCE ====================

// Core lookups
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Status queries
notificationSchema.index({ status: 1, recipientId: 1 });
notificationSchema.index({ type: 1, status: 1 });

// Scheduling and expiration
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Campaign and entity tracking
notificationSchema.index({ campaignId: 1 });
notificationSchema.index({ relatedEntityId: 1 });

// Delivery and retry
notificationSchema.index({ sentAt: 1, deliveredAt: 1 });
notificationSchema.index({ status: { $in: ['pending', 'scheduled'] } });

// ==================== VIRTUALS ====================

/**
 * Check if notification is read
 */
notificationSchema.virtual('isReadVirtual').get(function () {
  return this.readAt !== undefined && this.readAt !== null;
});

/**
 * Time until scheduled send
 */
notificationSchema.virtual('timeUntilSend').get(function () {
  if (!this.scheduledFor) return 0;
  const diffMs = new Date(this.scheduledFor).getTime() - Date.now();
  return Math.floor(diffMs / 1000);
});

/**
 * Is scheduled in past
 */
notificationSchema.virtual('isScheduledInPast').get(function () {
  if (!this.scheduledFor) return false;
  return new Date(this.scheduledFor).getTime() < Date.now();
});

/**
 * Time ago (Arabic and English)
 */
notificationSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `منذ ${days} يوم`;
  if (hours > 0) return `منذ ${hours} ساعة`;
  if (minutes > 0) return `منذ ${minutes} دقيقة`;
  return 'الآن';
});

/**
 * Days since sent
 */
notificationSchema.virtual('daysSinceSent').get(function () {
  if (!this.sentAt) return 0;
  const diffMs = Date.now() - new Date(this.sentAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// ==================== PRE-SAVE MIDDLEWARE ====================

notificationSchema.pre('save', function (next) {
  // Synchronize userId/recipient/recipientId fields
  if (this.recipientId && !this.userId) {
    this.userId = this.recipientId;
  }
  if (this.recipientId && !this.recipient) {
    this.recipient = this.recipientId;
  }
  if (this.userId && !this.recipientId) {
    this.recipientId = this.userId;
  }
  if (this.recipient && !this.recipientId) {
    this.recipientId = this.recipient;
  }

  // Synchronize read/isRead fields
  if (this.read !== undefined) {
    this.isRead = this.read;
  }
  if (this.isRead !== undefined) {
    this.read = this.isRead;
  }

  // Set default color based on type
  if (!this.color) {
    const colorMap = {
      info: '#1976d2',
      success: '#2e7d32',
      warning: '#ed6c02',
      error: '#d32f2f',
      system: '#9c27b0',
      message: '#0288d1',
      task: '#f57c00',
      reminder: '#7b1fa2',
      INFO: '#1976d2',
      WARNING: '#ed6c02',
      SUCCESS: '#2e7d32',
      ERROR: '#d32f2f',
    };
    this.color = colorMap[this.type] || '#1976d2';
  }

  // Initialize notificationId if not set
  if (!this.notificationId) {
    this.notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark as read
 */
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.read = true;
  this.readAt = new Date();
  return await this.save();
};

/**
 * Mark as unread
 */
notificationSchema.methods.markAsUnread = async function () {
  this.isRead = false;
  this.read = false;
  this.readAt = null;
  return await this.save();
};

/**
 * Mark as delivered
 */
notificationSchema.methods.markAsDelivered = function (channel) {
  this.deliveredAt = new Date();
  this.status = 'delivered';

  if (channel && this.channelStatus) {
    const channelStatus = this.channelStatus.find(cs => cs.channel === channel);
    if (channelStatus) {
      channelStatus.status = 'delivered';
      channelStatus.deliveryId = `DEL-${Date.now()}`;
    }
  }
  return this.save();
};

/**
 * Record click
 */
notificationSchema.methods.recordClick = function () {
  this.clickCount = (this.clickCount || 0) + 1;
  return this.save();
};

/**
 * Mark as failed
 */
notificationSchema.methods.markAsFailed = function (channel, reason) {
  this.status = 'failed';

  if (channel && this.channelStatus) {
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
  }
  return this.save();
};

/**
 * Retry sending
 */
notificationSchema.methods.retry = function () {
  this.retryCount = (this.retryCount || 0) + 1;
  this.lastRetryAt = new Date();
  this.status = 'pending';
  return this.save();
};

/**
 * Track conversion
 */
notificationSchema.methods.trackConversion = function (value = 0) {
  this.conversionTracking = {
    converted: true,
    conversionDate: new Date(),
    conversionValue: value,
  };
  return this.save();
};

/**
 * Unsubscribe
 */
notificationSchema.methods.unsubscribe = function () {
  this.isUnsubscribed = true;
  this.unsubscribedAt = new Date();
  return this.save();
};

/**
 * Archive notification
 */
notificationSchema.methods.archive = function () {
  this.archived = true;
  this.archiveStatus = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

/**
 * Soft delete
 */
notificationSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get unread notifications
 */
notificationSchema.statics.getUnread = function (recipientId) {
  return this.find({
    $or: [{ recipientId }, { userId: recipientId }, { recipient: recipientId }],
    readAt: { $exists: false },
    isRead: false,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

/**
 * Get pending notifications to send
 */
notificationSchema.statics.getPending = function () {
  return this.find({
    status: { $in: ['pending', 'scheduled'] },
    $or: [{ scheduledFor: { $lte: new Date() } }, { scheduledFor: { $exists: false } }],
    deletedAt: null,
  }).sort({ scheduledFor: 1 });
};

/**
 * Get failed notifications
 */
notificationSchema.statics.getFailed = function (retryThreshold = 3) {
  return this.find({
    status: 'failed',
    retryCount: { $lt: retryThreshold },
    deletedAt: null,
  });
};

/**
 * Get notifications by type
 */
notificationSchema.statics.getByType = function (recipientId, type) {
  return this.find({
    $or: [{ recipientId }, { userId: recipientId }, { recipient: recipientId }],
    type,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

/**
 * Get high impact insights
 */
notificationSchema.statics.getHighImpactInsights = function (limit = 10) {
  return this.find({
    priority: { $in: ['high', 'critical', 'urgent'] },
    deletedAt: null,
  })
    .limit(limit)
    .sort({ createdAt: -1 });
};

/**
 * Get active models
 */
notificationSchema.statics.getActiveModels = function () {
  return this.find({
    status: 'sent',
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

/**
 * Get models needing retraining
 */
notificationSchema.statics.getModelsNeedingRetraining = function () {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 3 },
    deletedAt: null,
  });
};

/**
 * Calculate delivery rate
 */
notificationSchema.statics.getDeliveryStats = function (hours = 24) {
  const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
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
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
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

/**
 * Create notification
 */
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  return await notification.save();
};

/**
 * Create bulk notifications
 */
notificationSchema.statics.createBulkNotifications = async function (
  recipientIds,
  notificationData
) {
  const notifications = recipientIds.map(recipientId => ({
    ...notificationData,
    recipientId,
  }));
  return await this.insertMany(notifications);
};

/**
 * Delete old notifications
 */
notificationSchema.statics.deleteOldNotifications = async function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

/**
 * Safety: Prevent model recompilation in tests and multiple requires
 * This is critical for preventing duplicate model registration
 */
const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
