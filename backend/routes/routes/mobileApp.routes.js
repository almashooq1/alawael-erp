/**
 * Mobile App Backend Routes
 * مسارات تطبيق الهاتف المحمول
 * 
 * Phase 21: Mobile App Backend Support
 * تاريخ الإنشاء: 17 فبراير 2026
 */

const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const mobileAppController = require('../controllers/mobileApp.controller');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// ============================================================
// Device Management Routes
// ============================================================

/**
 * POST /api/mobile/devices/register
 * تسجيل جهاز محمول جديد
 * Register new mobile device
 */
router.post('/devices/register', mobileAppController.registerDevice);

/**
 * GET /api/mobile/devices
 * الحصول على أجهزة المستخدم
 * Get user devices
 */
router.get('/devices', mobileAppController.getUserDevices);

/**
 * POST /api/mobile/devices/trust
 * الثقة في جهاز
 * Trust device for biometric auth
 */
router.post('/devices/trust', mobileAppController.trustDevice);

/**
 * POST /api/mobile/devices/untrust
 * إزالة الثقة من جهاز
 * Untrust device
 */
router.post('/devices/untrust', mobileAppController.untrustDevice);

/**
 * POST /api/mobile/devices/biometric/enable
 * تفعيل البيومتري
 * Enable biometric authentication
 */
router.post('/devices/biometric/enable', mobileAppController.enableBiometric);

/**
 * DELETE /api/mobile/devices/:deviceId
 * حذف جهاز
 * Delete device
 */
router.delete('/devices/:deviceId', mobileAppController.deleteDevice);

// ============================================================
// Offline Sync Routes
// ============================================================

/**
 * GET /api/mobile/sync/pending
 * الحصول على العمليات المعلقة
 * Get pending offline operations
 */
router.get('/sync/pending', mobileAppController.getPendingOperations);

/**
 * POST /api/mobile/sync/queue
 * إضافة عملية إلى قائمة الانتظار
 * Queue offline operation
 */
router.post('/sync/queue', mobileAppController.queueOperation);

/**
 * POST /api/mobile/sync/sync
 * مزامنة العمليات المعلقة
 * Sync pending operations
 */
router.post('/sync/sync', mobileAppController.syncOperations);

/**
 * GET /api/mobile/sync/status
 * الحصول على حالة المزامنة
 * Get sync status
 */
router.get('/sync/status', mobileAppController.getSyncStatus);

/**
 * POST /api/mobile/sync/conflict/resolve
 * حل تعارض في البيانات
 * Resolve data conflict
 */
router.post('/sync/conflict/resolve', mobileAppController.resolveConflict);

// ============================================================
// Push Notifications Routes
// ============================================================

/**
 * POST /api/mobile/push/send
 * إرسال إشعار دفع
 * Send push notification
 */
router.post('/push/send', mobileAppController.sendPushNotification);

/**
 * POST /api/mobile/push/batch
 * إرسال إشعارات مجموعية
 * Send batch push notifications
 */
router.post('/push/batch', mobileAppController.sendBatchNotifications);

/**
 * POST /api/mobile/push/token/register
 * تسجيل رمز الإشعارات
 * Register push token
 */
router.post('/push/token/register', mobileAppController.registerPushToken);

/**
 * POST /api/mobile/push/test
 * اختبار إرسال الإشعارات
 * Test push notification delivery
 */
router.post('/push/test', mobileAppController.testPushDelivery);

/**
 * GET /api/mobile/push/stats
 * الحصول على إحصائيات الإشعارات
 * Get push notification statistics
 */
router.get('/push/stats', mobileAppController.getPushStats);

// ============================================================
// Mobile Analytics Routes
// ============================================================

/**
 * POST /api/mobile/analytics/session/start
 * بدء جلسة محمول
 * Start mobile session
 */
router.post('/analytics/session/start', mobileAppController.startSession);

/**
 * POST /api/mobile/analytics/session/end
 * إنهاء جلسة
 * End session
 */
router.post('/analytics/session/end', mobileAppController.endSession);

/**
 * POST /api/mobile/analytics/event
 * تتبع حدث
 * Track event
 */
router.post('/analytics/event', mobileAppController.trackEvent);

/**
 * POST /api/mobile/analytics/crash
 * تسجيل توقف أو خطأ
 * Log crash
 */
router.post('/analytics/crash', mobileAppController.logCrash);

/**
 * GET /api/mobile/analytics/session/stats
 * الحصول على إحصائيات الجلسة
 * Get session statistics
 */
router.get('/analytics/session/stats', mobileAppController.getSessionStats);

/**
 * GET /api/mobile/analytics/user
 * الحصول على تحليلات المستخدم
 * Get user analytics
 */
router.get('/analytics/user', mobileAppController.getUserAnalytics);

/**
 * GET /api/mobile/analytics/crashes
 * الحصول على تقرير الأعطال
 * Get crash report
 */
router.get('/analytics/crashes', mobileAppController.getCrashReport);

/**
 * GET /api/mobile/analytics/performance
 * الحصول على تقرير الأداء
 * Get performance report
 */
router.get('/analytics/performance', mobileAppController.getPerformanceReport);

// ============================================================
// Health Check
// ============================================================

/**
 * GET /api/mobile/health
 * التحقق من صحة الخدمة
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Mobile backend is operational',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
