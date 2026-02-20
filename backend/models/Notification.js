const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // المستخدم المستلم للإشعار
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // نوع الإشعار
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'system', 'message', 'task', 'reminder'],
      default: 'info',
    },

    // عنوان الإشعار
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // محتوى الإشعار
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // أيقونة الإشعار (اختياري)
    icon: {
      type: String,
      default: 'NotificationsIcon',
    },

    // لون الإشعار (اختياري)
    color: {
      type: String,
      default: '#1976d2',
    },

    // رابط للإشعار (اختياري)
    link: {
      type: String,
      trim: true,
    },

    // بيانات إضافية (JSON)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // حالة الأرشفة
    archiveStatus: {
      type: String,
      enum: ['pending', 'archived', 'failed'],
      default: 'pending',
    },
    archiveId: { type: String },

    // حالة التوقيع الإلكتروني
    signatureStatus: {
      type: String,
      enum: ['none', 'pending', 'signed', 'failed'],
      default: 'none',
    },
    signatureId: { type: String },

    // حالة الختم الإلكتروني
    stampStatus: {
      type: String,
      enum: ['none', 'pending', 'stamped', 'failed'],
      default: 'none',
    },
    stampId: { type: String },

    // حالة القراءة
    isRead: {
      type: Boolean,
      default: false,
    },

    // تاريخ القراءة
    readAt: {
      type: Date,
    },

    // الأولوية
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // تاريخ الانتهاء (للإشعارات المؤقتة)
    expiresAt: {
      type: Date,
    },

    // هل تم إرساله عبر WebSocket
    sentViaWebSocket: {
      type: Boolean,
      default: false,
    },

    // المرسل (اختياري)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // الفئة
    category: {
      type: String,
      default: 'general',
    },

    // رقم تسلسلي مميز لكل خطاب/إشعار
    serialNumber: {
      type: String,
      unique: true,
      sparse: true
    },

    // باركود (Base64 أو نص)
    barcode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes للأداء
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual لعرض الوقت المنقضي
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

// Method لتحديد الإشعار كمقروء
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Method لتحديد الإشعار كغير مقروء
notificationSchema.methods.markAsUnread = async function () {
  this.isRead = false;
  this.readAt = null;
  return await this.save();
};

// Static method لإنشاء إشعار جديد
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  return await notification.save();
};

// Static method لإنشاء إشعار لعدة مستخدمين
notificationSchema.statics.createBulkNotifications = async function (userIds, notificationData) {
  const notifications = userIds.map(userId => ({
    ...notificationData,
    userId,
  }));
  return await this.insertMany(notifications);
};

// Static method لحذف الإشعارات القديمة
notificationSchema.statics.deleteOldNotifications = async function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

// Middleware قبل الحفظ
notificationSchema.pre('save', function (next) {
  // تعيين لون افتراضي حسب النوع
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
    };
    this.color = colorMap[this.type] || '#1976d2';
  }
  next();
});

// Prevent model recompilation in tests
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
