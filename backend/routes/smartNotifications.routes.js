/**
 * مسارات الإشعارات الذكية
 * Smart Notifications Routes
 */

const express = require('express');
const router = express.Router();
const SmartNotificationsController = require('../controllers/smartNotifications.controller');
const { protect, authorize } = require('../middleware/auth');

// جميع المسارات تتطلب المصادقة
router.use(protect);

// ========== إدارة الإشعارات ==========

/**
 * @route   POST /api/notifications/smart/create
 * @desc    إنشاء إشعار ذكي
 * @access  Private
 */
router.post('/create', SmartNotificationsController.createNotification);

/**
 * @route   POST /api/notifications/smart/broadcast
 * @desc    إرسال إشعار مجموعي
 * @access  Private (Admin, Manager)
 */
router.post(
  '/broadcast',
  authorize('admin', 'manager'),
  SmartNotificationsController.broadcastNotification
);

/**
 * @route   GET /api/notifications/smart/list
 * @desc    جلب إشعارات المستخدم
 * @access  Private
 */
router.get('/list', SmartNotificationsController.getNotifications);

/**
 * @route   GET /api/notifications/smart/stats
 * @desc    جلب إحصائيات الإشعارات
 * @access  Private
 */
router.get('/stats', SmartNotificationsController.getStats);

/**
 * @route   GET /api/notifications/smart/performance
 * @desc    جلب تقرير أداء الإشعارات
 * @access  Private
 */
router.get('/performance', SmartNotificationsController.getPerformanceReport);

// ========== تفضيلات الإشعارات ==========

/**
 * @route   PATCH /api/notifications/smart/preferences
 * @desc    تحديث تفضيلات الإشعارات
 * @access  Private
 */
router.patch('/preferences', SmartNotificationsController.updatePreferences);

// ========== التفاعل والحذف ==========

/**
 * @route   POST /api/notifications/smart/:notificationId/interact
 * @desc    تسجيل التفاعل مع الإشعار
 * @access  Private
 */
router.post('/:notificationId/interact', SmartNotificationsController.recordInteraction);

/**
 * @route   DELETE /api/notifications/smart/:notificationId
 * @desc    حذف إشعار محدد
 * @access  Private
 */
router.delete('/:notificationId', SmartNotificationsController.deleteNotification);

/**
 * @route   DELETE /api/notifications/smart/all
 * @desc    حذف جميع إشعارات المستخدم
 * @access  Private
 */
router.delete('/', SmartNotificationsController.clearAllNotifications);

// ========== معالجة الطابور (Admin only) ==========

/**
 * @route   POST /api/notifications/smart/process-queue
 * @desc    معالجة طابور الإشعارات
 * @access  Private (Admin)
 */
router.post('/process-queue', authorize('admin'), SmartNotificationsController.processQueue);

module.exports = router;
