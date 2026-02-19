/**
 * PortalNotification Model
 * نموذج التنبيهات في بوابة المستفيد/ولي الأمر
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PortalNotificationSchema = new Schema(
  {
    // Recipient المستقبل
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },

    // Notification Details تفاصيل التنبيه
    type: {
      type: String,
      enum: [
        'attendance',
        'grade',
        'payment',
        'behavior',
        'achievement',
        'alert',
        'report',
        'event',
        'message',
        'system',
        'general',
      ],
      required: [true, 'نوع التنبيه مطلوب'],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    title_ar: {
      type: String,
      required: [true, 'العنوان (عربي) مطلوب'],
      maxlength: 100,
    },
    title_en: {
      type: String,
      required: [true, 'Title (English) is required'],
      maxlength: 100,
    },
    message_ar: {
      type: String,
      required: [true, 'الرسالة (عربية) مطلوبة'],
      maxlength: 1000,
    },
    message_en: {
      type: String,
      required: [true, 'Message (English) is required'],
      maxlength: 1000,
    },
    icon: String,
    actionUrl: String,

    // Related Items العناصر المرتبطة
    relatedType: {
      type: String,
      enum: [
        'beneficiary',
        'progress_report',
        'payment',
        'attendance_record',
        'grade',
        'behavior_record',
        'achievement',
        'event',
        'document',
        'message',
        'account',
      ],
      default: 'general',
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Status التالة
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    // Delivery Information معلومات التسليم
    deliveryMethods: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
          default: 'pending',
        },
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
          default: 'pending',
        },
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
          default: 'pending',
        },
      },
      inApp: {
        sent: { type: Boolean, default: true },
        sentAt: Date,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered'],
          default: 'sent',
        },
      },
    },

    // Scheduling الجدولة
    scheduledFor: Date,
    isScheduled: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,

    // Interaction التفاعل
    actionTaken: {
      type: Boolean,
      default: false,
    },
    actionType: String,
    actionTakenAt: Date,

    // Expiry الصلاحية
    expiresAt: Date,
    isExpired: {
      type: Boolean,
      default: false,
    },

    // Sender المرسل
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderType: {
      type: String,
      enum: ['system', 'admin', 'staff', 'automated'],
      default: 'system',
    },

    // Additional Data بيانات إضافية
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Archiving الأرشفة
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: Date,

    // Audit Trail
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
  {
    timestamps: true,
    collection: 'portal_notifications',
  }
);

// Indexes
PortalNotificationSchema.index({ guardianId: 1, createdAt: -1 });
PortalNotificationSchema.index({ beneficiaryId: 1, isRead: 1 });
PortalNotificationSchema.index({ type: 1, createdAt: -1 });
PortalNotificationSchema.index({ status: 1, isRead: 1 });
PortalNotificationSchema.index({ isArchived: 1 });

// Virtual: Display Title
PortalNotificationSchema.virtual('displayTitle').get(function () {
  // This would be determined by user's preferred language
  return this.title_ar || this.title_en;
});

// Virtual: Display Message
PortalNotificationSchema.virtual('displayMessage').get(function () {
  return this.message_ar || this.message_en;
});

// Virtual: Is Urgent
PortalNotificationSchema.virtual('isUrgent').get(function () {
  return this.priority === 'urgent' || this.priority === 'high';
});

// Virtual: Days Since Sent
PortalNotificationSchema.virtual('daysSinceSent').get(function () {
  if (!this.sentAt) return null;
  return Math.floor((Date.now() - this.sentAt) / (1000 * 60 * 60 * 24));
});

// Static Methods
PortalNotificationSchema.statics.getForGuardian = function (guardianId, limit = 50) {
  return this.find({
    guardianId,
    isArchived: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

PortalNotificationSchema.statics.getUnreadForGuardian = function (guardianId) {
  return this.find({
    guardianId,
    isRead: false,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

PortalNotificationSchema.statics.getUnreadCountForGuardian = function (guardianId) {
  return this.countDocuments({
    guardianId,
    isRead: false,
    isArchived: false,
  });
};

PortalNotificationSchema.statics.getByType = function (guardianId, type) {
  return this.find({
    guardianId,
    type,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

PortalNotificationSchema.statics.getUrgentNotifications = function (guardianId) {
  return this.find({
    guardianId,
    priority: { $in: ['urgent', 'high'] },
    isRead: false,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

PortalNotificationSchema.statics.getByRelated = function (guardianId, relatedType, relatedId) {
  return this.find({
    guardianId,
    relatedType,
    relatedId,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

PortalNotificationSchema.statics.getRecentNotifications = function (guardianId, days = 7) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  return this.find({
    guardianId,
    createdAt: { $gte: dateFrom },
    isArchived: false,
  }).sort({ createdAt: -1 });
};

PortalNotificationSchema.statics.getNotificationStats = function (guardianId) {
  return this.aggregate([
    { $match: { guardianId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $in: ['$priority', ['urgent', 'high']] }, 1, 0] } },
        byType: { $push: '$type' },
      },
    },
  ]);
};

// Instance Methods
PortalNotificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

PortalNotificationSchema.methods.markAsUnread = async function () {
  this.isRead = false;
  this.readAt = null;
  this.status = 'delivered';
  return this.save();
};

PortalNotificationSchema.methods.archive = async function () {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

PortalNotificationSchema.methods.unarchive = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

PortalNotificationSchema.methods.recordAction = async function (actionType) {
  this.actionTaken = true;
  this.actionType = actionType;
  this.actionTakenAt = new Date();

  if (!this.isRead) {
    this.markAsRead();
  }

  return this.save();
};

PortalNotificationSchema.methods.markEmailDelivered = async function () {
  this.deliveryMethods.email.sent = true;
  this.deliveryMethods.email.sentAt = new Date();
  this.deliveryMethods.email.status = 'delivered';
  return this.save();
};

PortalNotificationSchema.methods.markSmsDelivered = async function () {
  this.deliveryMethods.sms.sent = true;
  this.deliveryMethods.sms.sentAt = new Date();
  this.deliveryMethods.sms.status = 'delivered';
  return this.save();
};

PortalNotificationSchema.methods.markPushDelivered = async function () {
  this.deliveryMethods.push.sent = true;
  this.deliveryMethods.push.sentAt = new Date();
  this.deliveryMethods.push.status = 'delivered';
  return this.save();
};

PortalNotificationSchema.methods.markAsFailed = async function (method) {
  if (this.deliveryMethods[method]) {
    this.deliveryMethods[method].status = 'failed';
    this.deliveryMethods[method].sentAt = new Date();
  }
  return this.save();
};

// Middleware
PortalNotificationSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Automatically mark as expired if expiresAt is in the past
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
  }

  next();
});

// Static: Create notification helper
PortalNotificationSchema.statics.createNotification = async function (notificationData) {
  const notification = new this(notificationData);
  return notification.save();
};

// Static: Create and send notification
PortalNotificationSchema.statics.createAndSend = async function (
  guardianId,
  beneficiaryId,
  notificationType,
  titleAr,
  titleEn,
  messageAr,
  messageEn,
  relatedType = null,
  relatedId = null
) {
  const notification = new this({
    guardianId,
    beneficiaryId,
    type: notificationType,
    title_ar: titleAr,
    title_en: titleEn,
    message_ar: messageAr,
    message_en: messageEn,
    relatedType: relatedType || 'general',
    relatedId,
    sentAt: new Date(),
    status: 'delivered',
  });

  return notification.save();
};

module.exports = mongoose.model('PortalNotification', PortalNotificationSchema);
