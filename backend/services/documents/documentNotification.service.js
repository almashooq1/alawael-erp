'use strict';

/**
 * Document Notification Service — خدمة الإشعارات للمستندات
 * ═══════════════════════════════════════════════════════════════
 * نظام إشعارات شامل لجميع أحداث المستندات مع دعم
 * للإشعارات الداخلية والبريد الإلكتروني والإشعارات الفورية
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// أنواع الإشعارات
// ─────────────────────────────────────────────

const NOTIFICATION_TYPES = {
  // المستندات
  document_uploaded: {
    label: 'مستند جديد',
    labelEn: 'New Document',
    icon: '📤',
    color: '#3B82F6',
    template: 'تم رفع مستند جديد: {title}',
    templateEn: 'New document uploaded: {title}',
  },
  document_shared: {
    label: 'مستند مشارك',
    labelEn: 'Document Shared',
    icon: '🔗',
    color: '#8B5CF6',
    template: 'تمت مشاركة المستند "{title}" معك بصلاحية {permission}',
    templateEn: 'Document "{title}" shared with you ({permission})',
  },
  document_updated: {
    label: 'تحديث مستند',
    labelEn: 'Document Updated',
    icon: '✏️',
    color: '#F59E0B',
    template: 'تم تحديث المستند: {title}',
    templateEn: 'Document updated: {title}',
  },
  document_deleted: {
    label: 'حذف مستند',
    labelEn: 'Document Deleted',
    icon: '🗑️',
    color: '#EF4444',
    template: 'تم حذف المستند: {title}',
    templateEn: 'Document deleted: {title}',
  },
  document_downloaded: {
    label: 'تنزيل مستند',
    labelEn: 'Document Downloaded',
    icon: '📥',
    color: '#10B981',
    template: 'تم تنزيل المستند: {title} بواسطة {userName}',
    templateEn: 'Document downloaded: {title} by {userName}',
  },
  new_version: {
    label: 'إصدار جديد',
    labelEn: 'New Version',
    icon: '🔄',
    color: '#06B6D4',
    template: 'تم رفع إصدار جديد (v{version}) للمستند: {title}',
    templateEn: 'New version (v{version}) of: {title}',
  },

  // سير العمل
  workflow_assigned: {
    label: 'مهمة جديدة',
    labelEn: 'Task Assigned',
    icon: '📋',
    color: '#8B5CF6',
    template: 'تم تعيينك لمراجعة المستند: {title}',
    templateEn: 'You have been assigned to review: {title}',
  },
  workflow_approved: {
    label: 'تمت الموافقة',
    labelEn: 'Approved',
    icon: '✅',
    color: '#10B981',
    template: 'تمت الموافقة على المستند: {title}',
    templateEn: 'Document approved: {title}',
  },
  workflow_rejected: {
    label: 'تم الرفض',
    labelEn: 'Rejected',
    icon: '❌',
    color: '#EF4444',
    template: 'تم رفض المستند: {title} — السبب: {reason}',
    templateEn: 'Document rejected: {title} — Reason: {reason}',
  },
  workflow_revision: {
    label: 'يحتاج تعديل',
    labelEn: 'Revision Required',
    icon: '🔄',
    color: '#F97316',
    template: 'المستند "{title}" يحتاج إلى تعديلات',
    templateEn: 'Document "{title}" needs revision',
  },

  // التنبيهات
  expiry_warning: {
    label: 'تحذير انتهاء',
    labelEn: 'Expiry Warning',
    icon: '⏰',
    color: '#F59E0B',
    template: 'المستند "{title}" سينتهي خلال {days} يوم',
    templateEn: 'Document "{title}" expires in {days} days',
  },
  expiry_expired: {
    label: 'منتهي الصلاحية',
    labelEn: 'Expired',
    icon: '🚨',
    color: '#EF4444',
    template: 'المستند "{title}" انتهت صلاحيته',
    templateEn: 'Document "{title}" has expired',
  },
  sla_warning: {
    label: 'تحذير SLA',
    labelEn: 'SLA Warning',
    icon: '⚡',
    color: '#F97316',
    template: 'المهمة على المستند "{title}" تقترب من الموعد النهائي',
    templateEn: 'Task on "{title}" is approaching deadline',
  },
  sla_breached: {
    label: 'تجاوز SLA',
    labelEn: 'SLA Breached',
    icon: '🔴',
    color: '#EF4444',
    template: 'تم تجاوز الموعد النهائي للمستند: {title}',
    templateEn: 'SLA breached for document: {title}',
  },

  // التوقيعات
  signature_requested: {
    label: 'طلب توقيع',
    labelEn: 'Signature Requested',
    icon: '✍️',
    color: '#8B5CF6',
    template: 'مطلوب توقيعك على المستند: {title}',
    templateEn: 'Your signature is requested on: {title}',
  },
  signature_completed: {
    label: 'تم التوقيع',
    labelEn: 'Signed',
    icon: '✅',
    color: '#10B981',
    template: 'تم توقيع المستند "{title}" بواسطة {signerName}',
    templateEn: 'Document "{title}" signed by {signerName}',
  },

  // التعليقات
  comment_added: {
    label: 'تعليق جديد',
    labelEn: 'New Comment',
    icon: '💬',
    color: '#6366F1',
    template: 'تعليق جديد على المستند "{title}" من {authorName}',
    templateEn: 'New comment on "{title}" by {authorName}',
  },
  mention: {
    label: 'إشارة',
    labelEn: 'Mention',
    icon: '📢',
    color: '#EC4899',
    template: 'تم ذكرك في تعليق على المستند: {title}',
    templateEn: 'You were mentioned in a comment on: {title}',
  },
};

// ─────────────────────────────────────────────
// مخطط الإشعارات
// ─────────────────────────────────────────────

const NotificationSchema = new mongoose.Schema(
  {
    // المستلم
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // النوع
    type: {
      type: String,
      enum: Object.keys(NOTIFICATION_TYPES),
      required: true,
    },

    // المحتوى
    title: { type: String, required: true },
    titleEn: String,
    message: { type: String, required: true },
    messageEn: String,
    icon: String,
    color: String,

    // المرجع
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowInstance',
    },

    // المرسل
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    triggeredByName: String,

    // الحالة
    isRead: { type: Boolean, default: false },
    readAt: Date,
    isArchived: { type: Boolean, default: false },

    // الأولوية
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // إجراء مقترح
    actionUrl: String,
    actionLabel: String,
    actionLabelEn: String,

    // بيانات إضافية
    metadata: mongoose.Schema.Types.Mixed,

    // انتهاء الصلاحية
    expiresAt: Date,
  },
  {
    timestamps: true,
    collection: 'document_notifications',
  }
);

// فهارس
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ documentId: 1, type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification =
  mongoose.models.DocumentNotification ||
  mongoose.model('DocumentNotification', NotificationSchema);

// ─────────────────────────────────────────────
// تفضيلات الإشعارات
// ─────────────────────────────────────────────

const NotificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // الإشعارات المفعلة لكل نوع
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
    },
    // تفضيلات حسب النوع
    typePreferences: {
      type: Map,
      of: {
        enabled: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      default: {},
    },
    // وقت الهدوء
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    // تجميع الإشعارات
    digest: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        default: 'daily',
      },
    },
  },
  {
    timestamps: true,
    collection: 'notification_preferences',
  }
);

const NotificationPreferences =
  mongoose.models.NotificationPreferences ||
  mongoose.model('NotificationPreferences', NotificationPreferencesSchema);

// ─────────────────────────────────────────────
// خدمة الإشعارات
// ─────────────────────────────────────────────

class DocumentNotificationService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * إرسال إشعار
   */
  async notify(userId, type, data = {}) {
    try {
      const config = NOTIFICATION_TYPES[type];
      if (!config) {
        logger.warn(`[Notification] نوع إشعار غير معروف: ${type}`);
        return null;
      }

      // فحص تفضيلات المستخدم
      const prefs = await this._getUserPreferences(userId);
      if (!this._shouldNotify(prefs, type)) {
        return null;
      }

      // بناء الرسالة
      const message = this._buildMessage(config.template, data);
      const messageEn = this._buildMessage(config.templateEn, data);

      const notification = new Notification({
        userId,
        type,
        title: config.label,
        titleEn: config.labelEn,
        message,
        messageEn,
        icon: config.icon,
        color: config.color,
        documentId: data.documentId || null,
        workflowId: data.workflowId || null,
        triggeredBy: data.triggeredBy || null,
        triggeredByName: data.triggeredByName || '',
        priority: data.priority || 'medium',
        actionUrl:
          data.actionUrl ||
          (data.documentId ? `/document-management/list?doc=${data.documentId}` : ''),
        actionLabel: data.actionLabel || 'عرض',
        actionLabelEn: data.actionLabelEn || 'View',
        metadata: data.metadata || {},
        expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
      });

      await notification.save();

      // إطلاق حدث للإشعار الفوري (WebSocket)
      this.emit('notification:new', {
        userId,
        notification: this._formatNotification(notification),
      });

      logger.info(`[Notification] إشعار لـ ${userId}: ${type}`);

      return notification;
    } catch (err) {
      logger.error(`[Notification] خطأ: ${err.message}`);
      return null;
    }
  }

  /**
   * إرسال إشعارات جماعية
   */
  async notifyBulk(userIds, type, data = {}) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.notify(userId, type, data);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * جلب إشعارات المستخدم
   */
  async getNotifications(userId, options = {}) {
    try {
      const query = { userId, isArchived: false };
      if (options.isRead !== undefined) query.isRead = options.isRead;
      if (options.type) query.type = options.type;
      if (options.priority) query.priority = options.priority;

      const page = parseInt(options.page) || 1;
      const limit = Math.min(100, parseInt(options.limit) || 20);

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ priority: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, isRead: false, isArchived: false }),
      ]);

      return {
        notifications: notifications.map(n => this._formatNotification(n)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (err) {
      logger.error(`[Notification] خطأ في جلب الإشعارات: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحديد إشعار كمقروء
   */
  async markAsRead(notificationId, userId) {
    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return result ? this._formatNotification(result) : null;
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { updatedCount: result.modifiedCount };
  }

  /**
   * أرشفة إشعار
   */
  async archiveNotification(notificationId, userId) {
    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isArchived: true },
      { new: true }
    );
    return result ? this._formatNotification(result) : null;
  }

  /**
   * حذف إشعار
   */
  async deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    return { success: result.deletedCount > 0 };
  }

  /**
   * عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false, isArchived: false });
  }

  /**
   * جلب ملخص الإشعارات
   */
  async getNotificationSummary(userId) {
    try {
      const [unreadCount, typeCounts, recentUrgent] = await Promise.all([
        Notification.countDocuments({ userId, isRead: false, isArchived: false }),
        Notification.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              isRead: false,
              isArchived: false,
            },
          },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Notification.find({
          userId,
          isRead: false,
          priority: { $in: ['high', 'urgent'] },
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      return {
        unreadCount,
        byType: typeCounts.map(t => ({
          type: t._id,
          count: t.count,
          ...(NOTIFICATION_TYPES[t._id] || {}),
        })),
        urgentNotifications: recentUrgent.map(n => this._formatNotification(n)),
      };
    } catch (err) {
      logger.error(`[Notification] خطأ في الملخص: ${err.message}`);
      return { unreadCount: 0, byType: [], urgentNotifications: [] };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  تفضيلات الإشعارات
  // ═══════════════════════════════════════════════════════════

  async getPreferences(userId) {
    let prefs = await NotificationPreferences.findOne({ userId }).lean();
    if (!prefs) {
      prefs = await new NotificationPreferences({ userId }).save();
    }
    return prefs;
  }

  async updatePreferences(userId, updates) {
    const prefs = await NotificationPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );
    return prefs;
  }

  // ═══════════════════════════════════════════════════════════
  //  أدوات داخلية
  // ═══════════════════════════════════════════════════════════

  async _getUserPreferences(userId) {
    try {
      return await NotificationPreferences.findOne({ userId }).lean();
    } catch {
      return null;
    }
  }

  _shouldNotify(prefs, type) {
    if (!prefs) return true;
    if (!prefs.channels?.inApp) return false;
    if (prefs.typePreferences?.get?.(type)?.enabled === false) return false;

    // فحص وقت الهدوء
    if (prefs.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime >= prefs.quietHours.start || currentTime <= prefs.quietHours.end) {
        // فقط الإشعارات العاجلة
        return ['sla_breached', 'expiry_expired'].includes(type);
      }
    }

    return true;
  }

  _buildMessage(template, data) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
  }

  _formatNotification(notification) {
    const config = NOTIFICATION_TYPES[notification.type] || {};
    return {
      id: notification._id,
      type: notification.type,
      typeConfig: {
        label: config.label || notification.type,
        labelEn: config.labelEn || '',
        icon: config.icon || '📄',
        color: config.color || '#6B7280',
      },
      title: notification.title,
      titleEn: notification.titleEn,
      message: notification.message,
      messageEn: notification.messageEn,
      icon: notification.icon || config.icon,
      color: notification.color || config.color,
      documentId: notification.documentId,
      workflowId: notification.workflowId,
      triggeredBy: notification.triggeredBy,
      triggeredByName: notification.triggeredByName,
      isRead: notification.isRead,
      readAt: notification.readAt,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      actionLabelEn: notification.actionLabelEn,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      timeAgo: this._getTimeAgo(notification.createdAt),
    };
  }

  _getTimeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
    if (seconds < 2592000) return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
    return `منذ ${Math.floor(seconds / 2592000)} شهر`;
  }

  // ─── تصدير الثوابت ────────────────────────
  getNotificationTypes() {
    return NOTIFICATION_TYPES;
  }
}

module.exports = new DocumentNotificationService();
module.exports.Notification = Notification;
module.exports.NotificationPreferences = NotificationPreferences;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
