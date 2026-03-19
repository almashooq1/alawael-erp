/**
 * Smart Notifications Routes - Phase 31
 * مسارات نظام الإشعارات المتقدم
 */

const express = require('express');
const SmartNotificationController = require('../controllers/smartNotification.controller');

const router = express.Router();

/**
 * ===== إرسال الإشعارات =====
 */

/**
 * إرسال إشعار فوري
 * POST /api/notifications/send
 */
router.post('/send', SmartNotificationController.sendNotification);

/**
 * إرسال تنبيه انتهاك
 * POST /api/notifications/violation-alert
 */
router.post('/violation-alert', SmartNotificationController.sendViolationAlert);

/**
 * إرسال تقرير الأداء
 * POST /api/notifications/performance-report
 */
router.post('/performance-report', SmartNotificationController.sendPerformanceReport);

/**
 * إرسال إشعارات جماعية
 * POST /api/notifications/bulk-send
 */
router.post('/bulk-send', SmartNotificationController.sendBulkNotification);

/**
 * جدولة إشعار
 * POST /api/notifications/schedule
 */
router.post('/schedule', SmartNotificationController.scheduleNotification);

/**
 * ===== الجلب والقراءة =====
 */

/**
 * الحصول على الإشعارات غير المقروءة
 * GET /api/notifications/unread?limit=20
 */
router.get('/unread', SmartNotificationController.getUnreadNotifications);

/**
 * عد الإشعارات غير المقروءة
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', SmartNotificationController.getUnreadCount);

/**
 * الحصول على جميع الإشعارات
 * GET /api/notifications?skip=0&limit=20&status=all
 */
router.get('/', SmartNotificationController.getAllNotifications);

/**
 * الحصول على إحصائيات
 * GET /api/notifications/stats?timeRange=week
 */
router.get('/stats', SmartNotificationController.getStats);

/**
 * ===== معالجة =====
 */

/**
 * تحديد الإشعار كمقروء
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', SmartNotificationController.markAsRead);

/**
 * حذف الإشعار
 * DELETE /api/notifications/:id
 */
router.delete('/:id', SmartNotificationController.deleteNotification);

/**
 * ===== أدوات =====
 */

/**
 * معاينة الإشعار
 * POST /api/notifications/preview
 */
router.post('/preview', SmartNotificationController.previewNotification);

module.exports = router;
