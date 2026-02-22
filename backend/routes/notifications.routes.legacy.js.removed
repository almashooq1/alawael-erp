const express = require('express');
const router = express.Router();
const {
  Notification,
  EmailService,
  SMSService,
  PushNotificationService,
  NotificationPreferences,
} = require('../models/Notification.memory');
const { authenticateToken } = require('../middleware/auth');
const SmartNotificationService = require('../services/smartNotificationService');
const AdvancedMessagingAlertSystem = require('../services/advancedMessagingAlertSystem');

// Initialize services
const smartNotificationService = new SmartNotificationService();
const advancedMessagingAlertSystem = new AdvancedMessagingAlertSystem();

router.use(authenticateToken);

// ==================== NOTIFICATIONS ====================

/**
 * @route   GET /api/notifications
 * @desc    الحصول على إشعارات المستخدم
 */
router.get('/', (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = Notification.findByUserId(userId);
    const unreadCount = Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/notifications/unread
 * @desc    عدد الإشعارات غير المقروءة
 */
router.get('/unread', (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    وضع علامة على إشعار كمقروء
 */
router.patch('/:id/read', (req, res) => {
  try {
    const notification = Notification.markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== EMAIL SERVICE ====================

/**
 * @route   POST /api/notifications/email/send
 * @desc    إرسال بريد إلكتروني
 */
router.post('/email/send', async (req, res) => {
  try {
    const { userId, subject, message, recipient } = req.body;

    if (!userId || !subject || !message || !recipient) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    const notification = Notification.create({
      userId,
      title: subject,
      message: message,
      type: 'info',
      channels: ['email'],
      recipient: recipient,
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال البريد بنجاح',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== SMS SERVICE ====================

/**
 * @route   POST /api/notifications/sms/send
 * @desc    إرسال رسالة نصية
 */
router.post('/sms/send', async (req, res) => {
  try {
    const { phone, message, userId } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف والرسالة مطلوبان',
      });
    }

    const result = await SMSService.sendBulkSMS([phone], message);

    if (userId) {
      Notification.create({
        userId,
        title: 'رسالة نصية',
        message: message,
        type: 'info',
        channels: ['sms'],
        recipient: phone,
      });
    }

    res.json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/sms/otp
 * @desc    إرسال رمز التحقق
 */
router.post('/sms/otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const result = await SMSService.sendOTP(phone, otp);

    res.json({
      success: true,
      data: result,
      otp: otp, // للاختبار فقط
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== PUSH NOTIFICATIONS ====================

/**
 * @route   POST /api/notifications/push
 * @desc    إرسال إشعار فوري
 */
router.post('/push', async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId و title و message مطلوبة',
      });
    }

    const notification = await PushNotificationService.sendPushNotification(userId, title, message, { type: type || 'info' });

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/push/bulk
 * @desc    إرسال إشعار لعدة مستخدمين
 */
router.post('/push/bulk', async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userIds و title و message مطلوبة',
      });
    }

    const notifications = await PushNotificationService.sendToMultiple(userIds, title, message, { type: type || 'info' });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== PREFERENCES ====================

/**
 * @route   POST /api/notifications/preferences
 * @desc    حفظ تفضيلات الإخطارات
 */
router.post('/preferences', (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = NotificationPreferences.create(userId, req.body);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== SMART NOTIFICATION SERVICE ====================

/**
 * @route   POST /api/notifications/smart/create
 * @desc    إنشاء إشعار ذكي موجه
 */
router.post('/smart/create', (req, res) => {
  try {
    const { workflow, type, userId } = req.body;

    if (!workflow || !type || !userId) {
      return res.status(400).json({
        success: false,
        message: 'workflow, type, userId مطلوبة',
      });
    }

    const notification = smartNotificationService.createSmartNotification(workflow, type, userId);
    const result = smartNotificationService.sendNotification(userId, notification);

    res.json({
      success: result.success,
      data: {
        notification,
        sentAt: result.sentAt,
        channels: result.channels,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/notifications/smart/:userId
 * @desc    الحصول على الإشعارات الذكية للمستخدم
 */
router.get('/smart/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all', limit = 50 } = req.query;

    let notifications;
    if (type === 'unread') {
      notifications = smartNotificationService.getUnreadNotifications(userId);
    } else {
      notifications = smartNotificationService.getAllNotifications(userId, parseInt(limit));
    }

    const stats = smartNotificationService.getNotificationStats(userId);

    res.json({
      success: true,
      data: {
        notifications,
        stats,
        total: notifications.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/notifications/smart/:id/read
 * @desc    وضع علامة على إشعار ذكي كمقروء
 */
router.put('/smart/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    smartNotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'تم وضع علامة على الإشعار كمقروء',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/notifications/smart/:id
 * @desc    حذف إشعار ذكي
 */
router.delete('/smart/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    smartNotificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/notifications/smart/clear/:userId
 * @desc    حذف جميع الإشعارات
 */
router.delete('/smart/clear/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const count = smartNotificationService.clearAllNotifications(userId);

    res.json({
      success: true,
      message: `تم حذف ${count} إشعارات`,
      deletedCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/smart/schedule
 * @desc    جدولة إشعار للإرسال لاحقاً
 */
router.post('/smart/schedule', (req, res) => {
  try {
    const { notification, scheduledTime, userId } = req.body;

    if (!notification || !scheduledTime || !userId) {
      return res.status(400).json({
        success: false,
        message: 'notification, scheduledTime, userId مطلوبة',
      });
    }

    const result = smartNotificationService.scheduleNotification(notification, new Date(scheduledTime), userId);

    res.json({
      success: result.success,
      data: {
        scheduleId: result.scheduleId,
        scheduledTime: scheduledTime,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== ADVANCED MESSAGING & ALERTS ====================

/**
 * @route   POST /api/notifications/messages/send
 * @desc    إرسال رسالة باستخدام القوالب
 */
router.post('/messages/send', async (req, res) => {
  try {
    const { recipientId, messageType, data, options } = req.body;

    if (!recipientId || !messageType || !data) {
      return res.status(400).json({
        success: false,
        message: 'recipientId, messageType, data مطلوبة',
      });
    }

    const result = await advancedMessagingAlertSystem.sendMessage(recipientId, messageType, data, options || {});

    res.json({
      success: result.success,
      data: {
        messageId: result.messageId,
        channels: result.results.successful,
        failed: result.results.failed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/alerts/create
 * @desc    إنشاء قاعدة إنذار جديدة
 */
router.post('/alerts/create', (req, res) => {
  try {
    const { name, rule, action } = req.body;

    if (!name || !rule || !action) {
      return res.status(400).json({
        success: false,
        message: 'name, rule, action مطلوبة',
      });
    }

    const alert = advancedMessagingAlertSystem.createAlert(name, rule, action);

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/notifications/alerts
 * @desc    الحصول على قائمة الإنذارات
 */
router.get('/alerts', (req, res) => {
  try {
    const alerts = Array.from(advancedMessagingAlertSystem.alertRules.values());
    const stats = advancedMessagingAlertSystem.getAlertStats();

    res.json({
      success: true,
      data: {
        alerts,
        stats,
        total: alerts.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/notifications/alerts/check
 * @desc    التحقق من قواعس الإنذارات وتطبيقها
 */
router.post('/alerts/check', (req, res) => {
  try {
    const { workflows } = req.body;

    if (!Array.isArray(workflows)) {
      return res.status(400).json({
        success: false,
        message: 'workflows مطلوبة (صفيف)',
      });
    }

    const triggeredAlerts = advancedMessagingAlertSystem.checkAndTriggerAlerts(workflows);
    const stats = advancedMessagingAlertSystem.getAlertStats();

    res.json({
      success: true,
      data: {
        triggeredAlerts,
        triggeredCount: triggeredAlerts.length,
        stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/notifications/messages/stats/:userId
 * @desc    الحصول على إحصائيات الرسائل والإنذارات
 */
router.get('/messages/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const messageStats = advancedMessagingAlertSystem.getMessageStats(userId);
    const alertStats = advancedMessagingAlertSystem.getAlertStats();

    res.json({
      success: true,
      data: {
        messages: messageStats,
        alerts: alertStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/notifications/alerts/:id
 * @desc    حذف قاعدة إنذار
 */
router.delete('/alerts/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (advancedMessagingAlertSystem.alertRules.has(id)) {
      advancedMessagingAlertSystem.alertRules.delete(id);

      res.json({
        success: true,
        message: 'تم حذف القاعدة بنجاح',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'القاعدة غير موجودة',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

