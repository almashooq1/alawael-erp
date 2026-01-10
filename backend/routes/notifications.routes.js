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

module.exports = router;
