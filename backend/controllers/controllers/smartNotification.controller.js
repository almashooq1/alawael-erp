/**
 * Smart Notifications Controller - Phase 31
 * متحكم الإشعارات الذكية المتقدمة
 */

const NotificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

class SmartNotificationController {
  /**
   * إرسال إشعار فوري
   * POST /api/notifications/send
   */
  static async sendNotification(req, res) {
    try {
      const { recipientId, title, message, notificationType, priority, channels } =
        req.body;

      if (!recipientId || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'البيانات المطلوبة ناقصة',
        });
      }

      const notification = await NotificationService.sendQuickNotification(
        recipientId,
        {
          title,
          message,
          notificationType: notificationType || 'custom',
          priority: priority || 'normal',
          channels: channels || {
            sms: false,
            email: false,
            push: true,
            inApp: true,
          },
        }
      );

      return res.status(201).json({
        success: true,
        message: 'تم إرسال الإشعار بنجاح',
        notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * إرسال تنبيه انتهاك
   * POST /api/notifications/violation-alert
   */
  static async sendViolationAlert(req, res) {
    try {
      const { driverId, violationType, details } = req.body;

      if (!driverId || !violationType) {
        return res.status(400).json({
          success: false,
          message: 'معرف السائق ونوع الانتهاك مطلوبان',
        });
      }

      const alert = await NotificationService.sendViolationAlert(
        driverId,
        violationType,
        details || {}
      );

      return res.status(201).json({
        success: true,
        message: 'تم إرسال التنبيه',
        alert,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * إرسال تقرير الأداء
   * POST /api/notifications/performance-report
   */
  static async sendPerformanceReport(req, res) {
    try {
      const { driverId, report } = req.body;

      if (!driverId || !report) {
        return res.status(400).json({
          success: false,
          message: 'معرف السائق والتقرير مطلوبان',
        });
      }

      const notification = await NotificationService.sendPerformanceReport(
        driverId,
        report
      );

      return res.status(201).json({
        success: true,
        message: 'تم إرسال التقرير',
        notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * جدولة إشعار
   * POST /api/notifications/schedule
   */
  static async scheduleNotification(req, res) {
    try {
      const { recipientId, title, message, scheduledTime, isRecurring, recurrencePattern } =
        req.body;

      if (!recipientId || !title || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'البيانات المطلوبة ناقصة',
        });
      }

      const result = await NotificationService.scheduleNotification(
        recipientId,
        { title, message },
        scheduledTime,
        isRecurring,
        recurrencePattern
      );

      return res.status(201).json({
        success: true,
        message: 'تم جدولة الإشعار',
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على الإشعارات غير المقروءة
   * GET /api/notifications/unread?limit=20
   */
  static async getUnreadNotifications(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const limit = parseInt(req.query.limit) || 20;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const notifications = await NotificationService.getUnreadNotifications(
        userId,
        limit
      );

      return res.status(200).json({
        success: true,
        count: notifications.length,
        notifications,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على جميع الإشعارات
   * GET /api/notifications?skip=0&limit=20&status=all
   */
  static async getAllNotifications(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const { skip = 0, limit = 20, status = 'all' } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const query = { recipient: userId };
      if (status !== 'all') {
        query.status = status;
      }

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit)),
        Notification.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        total,
        count: notifications.length,
        notifications,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * تحديد الإشعار كمقروء
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.body.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const result = await NotificationService.markAsRead(id, userId);

      return res.status(200).json({
        success: true,
        message: 'تم تحديد الإشعار كمقروء',
        notification: result.notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * حذف الإشعار
   * DELETE /api/notifications/:id
   */
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.body.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const result = await NotificationService.deleteNotification(id, userId);

      return res.status(200).json({
        success: true,
        message: 'تم حذف الإشعار',
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * إحصائيات الإشعارات
   * GET /api/notifications/stats?timeRange=week
   */
  static async getStats(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const { timeRange = 'week' } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const stats = await NotificationService.getNotificationStats(userId, timeRange);

      return res.status(200).json({
        success: true,
        stats,
        timeRange,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * معاينة الإشعار
   * POST /api/notifications/preview
   */
  static async previewNotification(req, res) {
    try {
      const { title, message, channels } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'العنوان والرسالة مطلوبان',
        });
      }

      const preview = await NotificationService.previewNotification({
        title,
        message,
        channels,
      });

      return res.status(200).json({
        success: true,
        preview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * إرسال إشعارات جماعية
   * POST /api/notifications/bulk-send
   */
  static async sendBulkNotification(req, res) {
    try {
      const { filterCriteria, title, message, notificationType, priority } = req.body;

      if (!filterCriteria || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'المعايير والعنوان والرسالة مطلوبة',
        });
      }

      const result = await NotificationService.sendBulkNotification(
        filterCriteria,
        {
          title,
          message,
          notificationType: notificationType || 'custom',
          priority: priority || 'normal',
        }
      );

      return res.status(201).json({
        success: true,
        message: `تم إرسال ${result.sentCount} إشعار`,
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * عد الإشعارات غير المقروءة
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم مطلوب',
        });
      }

      const count = await Notification.countDocuments({
        recipient: userId,
        'channels.inApp.read': false,
        status: { $ne: 'cancelled' },
      });

      return res.status(200).json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = SmartNotificationController;
