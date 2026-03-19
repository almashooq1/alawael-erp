/**
 * متحكم الإشعارات الذكية
 * Smart Notifications Controller
 */

const SmartNotificationsService = require('../services/smartNotifications.service');
const Logger = require('../utils/logger');

class SmartNotificationsController {
  /**
   * إنشاء إشعار ذكي
   * POST /api/notifications/smart/create
   */
  static async createNotification(req, res) {
    try {
      const {
        title,
        message,
        type = 'info',
        priority = 'normal',
        channels = ['in-app'],
        metadata = {},
        scheduledFor = null,
      } = req.body;

      const userId = req.user?.id;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'العنوان والرسالة مطلوبة',
          en: 'Title and message are required',
        });
      }

      const notification = SmartNotificationsService.createSmartNotification({
        userId,
        title,
        message,
        type,
        priority,
        channels,
        metadata,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      });

      Logger.info(`Notification created: ${notification.id} for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الإشعار بنجاح',
        en: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      Logger.error(`Create notification error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء الإشعار',
        en: 'Failed to create notification',
        error: error.message,
      });
    }
  }

  /**
   * إرسال إشعار مجموعي
   * POST /api/notifications/smart/broadcast
   */
  static async broadcastNotification(req, res) {
    try {
      const {
        userIds,
        title,
        message,
        type = 'info',
        priority = 'normal',
        channels = ['in-app', 'email'],
        metadata = {},
      } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'قائمة معرفات المستخدمين مطلوبة',
          en: 'User IDs array is required',
        });
      }

      const notifications =
        SmartNotificationsService.broadcastNotification(userIds, {
          title,
          message,
          type,
          priority,
          channels,
          metadata,
        });

      Logger.info(
        `Broadcast notification sent to ${userIds.length} users`
      );

      res.status(201).json({
        success: true,
        message: `تم إرسال الإشعار إلى ${userIds.length} مستخدم`,
        en: `Notification sent to ${userIds.length} users`,
        data: {
          count: notifications.length,
          notifications,
        },
      });
    } catch (error) {
      Logger.error(`Broadcast notification error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إرسال الإشعار المجموعي',
        en: 'Failed to broadcast notification',
        error: error.message,
      });
    }
  }

  /**
   * جلب إشعارات المستخدم
   * GET /api/notifications/smart/list
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const {
        status = null,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
      } = req.query;

      const notifications = SmartNotificationsService.getUserNotifications(
        userId,
        {
          status,
          limit: parseInt(limit),
          offset: parseInt(offset),
          sortBy,
        }
      );

      const stats = SmartNotificationsService.getNotificationStats(userId);

      res.json({
        success: true,
        message: 'تم جلب الإشعارات',
        en: 'Notifications retrieved',
        data: {
          notifications,
          stats,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: stats.total,
          },
        },
      });
    } catch (error) {
      Logger.error(`Get notifications error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الإشعارات',
        en: 'Failed to get notifications',
        error: error.message,
      });
    }
  }

  /**
   * تحديث تفضيلات الإشعارات
   * PATCH /api/notifications/smart/preferences
   */
  static async updatePreferences(req, res) {
    try {
      const userId = req.user?.id;
      const preferences = req.body;

      const updated = SmartNotificationsService.updateUserPreferences(
        userId,
        preferences
      );

      Logger.info(`User ${userId} preferences updated`);

      res.json({
        success: true,
        message: 'تم تحديث التفضيلات',
        en: 'Preferences updated',
        data: updated,
      });
    } catch (error) {
      Logger.error(`Update preferences error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تحديث التفضيلات',
        en: 'Failed to update preferences',
        error: error.message,
      });
    }
  }

  /**
   * تسجيل التفاعل مع الإشعار
   * POST /api/notifications/smart/:notificationId/interact
   */
  static async recordInteraction(req, res) {
    try {
      const { notificationId } = req.params;
      const { action } = req.body; // 'read', 'click', 'dismiss'

      if (!['read', 'click', 'dismiss'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'إجراء غير صحيح',
          en: 'Invalid action',
        });
      }

      SmartNotificationsService.recordInteraction(notificationId, action);

      res.json({
        success: true,
        message: 'تم تسجيل التفاعل',
        en: 'Interaction recorded',
      });
    } catch (error) {
      Logger.error(`Record interaction error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تسجيل التفاعل',
        en: 'Failed to record interaction',
        error: error.message,
      });
    }
  }

  /**
   * حذف إشعار
   * DELETE /api/notifications/smart/:notificationId
   */
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;

      const deleted =
        SmartNotificationsService.deleteNotification(notificationId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'الإشعار غير موجود',
          en: 'Notification not found',
        });
      }

      Logger.info(`Notification ${notificationId} deleted`);

      res.json({
        success: true,
        message: 'تم حذف الإشعار',
        en: 'Notification deleted',
      });
    } catch (error) {
      Logger.error(`Delete notification error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل حذف الإشعار',
        en: 'Failed to delete notification',
        error: error.message,
      });
    }
  }

  /**
   * حذف جميع إشعارات المستخدم
   * DELETE /api/notifications/smart/all
   */
  static async clearAllNotifications(req, res) {
    try {
      const userId = req.user?.id;

      const count = SmartNotificationsService.clearUserNotifications(userId);

      Logger.info(`Cleared ${count} notifications for user ${userId}`);

      res.json({
        success: true,
        message: `تم حذف ${count} إشعار`,
        en: `Deleted ${count} notifications`,
        data: { deletedCount: count },
      });
    } catch (error) {
      Logger.error(`Clear notifications error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل حذف الإشعارات',
        en: 'Failed to clear notifications',
        error: error.message,
      });
    }
  }

  /**
   * جلب إحصائيات الإشعارات
   * GET /api/notifications/smart/stats
   */
  static async getStats(req, res) {
    try {
      const userId = req.user?.id;

      const stats = SmartNotificationsService.getNotificationStats(userId);

      res.json({
        success: true,
        message: 'تم جلب الإحصائيات',
        en: 'Statistics retrieved',
        data: stats,
      });
    } catch (error) {
      Logger.error(`Get stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الإحصائيات',
        en: 'Failed to get statistics',
        error: error.message,
      });
    }
  }

  /**
   * جلب تقرير الأداء
   * GET /api/notifications/smart/performance
   */
  static async getPerformanceReport(req, res) {
    try {
      const userId = req.user?.id;

      const report = SmartNotificationsService.getPerformanceReport(userId);

      res.json({
        success: true,
        message: 'تم جلب التقرير',
        en: 'Report retrieved',
        data: report,
      });
    } catch (error) {
      Logger.error(`Get performance report error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب التقرير',
        en: 'Failed to get report',
        error: error.message,
      });
    }
  }

  /**
   * معالجة طابور الإشعارات
   * POST /api/notifications/smart/process-queue
   */
  static async processQueue(req, res) {
    try {
      const processed = await SmartNotificationsService.processQueue();

      Logger.info(
        `Notification queue processed: ${processed.length} notifications sent`
      );

      res.json({
        success: true,
        message: `تم معالجة ${processed.length} إشعار`,
        en: `Processed ${processed.length} notifications`,
        data: {
          count: processed.length,
          notifications: processed,
        },
      });
    } catch (error) {
      Logger.error(`Process queue error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل معالجة الطابور',
        en: 'Failed to process queue',
        error: error.message,
      });
    }
  }
}

module.exports = SmartNotificationsController;
