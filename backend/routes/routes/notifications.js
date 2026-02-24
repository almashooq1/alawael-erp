// تسجيل أو تحديث FCM Token للمستخدم الحالي
router.post('/register-fcm', notificationController.registerFcmToken);
// جلب تفضيلات الإشعارات للمستخدم الحالي
router.get('/preferences', notificationController.getNotificationPreferences);

// تحديث تفضيلات الإشعارات للمستخدم الحالي
router.put('/preferences', notificationController.updateNotificationPreferences);
const scheduledNotificationController = require('../controllers/scheduledNotificationController');
// جدولة إشعار جديد
router.post('/schedule', scheduledNotificationController.schedule);

// جلب الإشعارات المجدولة للمستخدم الحالي
router.get('/scheduled', scheduledNotificationController.getMyScheduled);
const notificationAnalyticsController = require('../controllers/notificationAnalyticsController');
// تحليلات الإشعارات (usage, delivery, engagement)
router.get('/analytics/summary', notificationAnalyticsController.getSummary);
const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
// اختبار إرسال إشعار متعدد القنوات (للتكامل)
router.post('/send', async (req, res) => {
  try {
    const { userId, title, message, channels, email, phone } = req.body;
    const result = await NotificationService.sendNotification(userId, {
      title,
      message,
      channels,
      email,
      phone,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

/**
 * Routes للإشعارات
 * جميع المسارات تحتاج مصادقة
 */

// المسارات العامة (لجميع المستخدمين المسجلين)
router.use(authenticateToken);

// الحصول على إشعارات المستخدم الحالي
router.get('/', notificationController.getMyNotifications);

// الحصول على عدد الإشعارات غير المقروءة
router.get('/unread/count', notificationController.getUnreadCount);

// تحديد إشعار كمقروء
router.put('/:id/read', notificationController.markAsRead);

// تصدير إشعار كـ PDF مع رقم وباركود
router.get('/:id/export-pdf', notificationController.exportNotificationPDF);

// تحديد إشعار كغير مقروء
router.put('/:id/unread', notificationController.markAsUnread);

// تحديد جميع الإشعارات كمقروءة
router.put('/read-all', notificationController.markAllAsRead);

// تسجيل حدث النقر على الإشعار (analytics)
router.post('/:id/click', notificationController.logClickEvent);

// حذف إشعار واحد
router.delete('/:id', notificationController.deleteNotification);

// حذف جميع الإشعارات المقروءة
router.delete('/read/all', notificationController.deleteReadNotifications);

// المسارات المقيدة للإداريين فقط
// إنشاء إشعار جديد
router.post(
  '/',
  checkPermission('notifications', 'create'),
  notificationController.createNotification
);

// إنشاء إشعارات متعددة
router.post(
  '/bulk',
  checkPermission('notifications', 'create'),
  notificationController.createBulkNotifications
);

// حذف الإشعارات القديمة (مهمة صيانة)
router.delete(
  '/cleanup',
  checkPermission('notifications', 'delete'),
  notificationController.cleanupOldNotifications
);

module.exports = router;
