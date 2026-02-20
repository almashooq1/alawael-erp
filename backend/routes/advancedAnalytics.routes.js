/**
 * مسارات التحليلات والتقارير المتقدم
 * Advanced Analytics Routes
 */

const express = require('express');
const router = express.Router();
const AdvancedAnalyticsController = require('../controllers/advancedAnalytics.controller');
const { protect, authorize } = require('../middleware/auth');

// جميع المسارات تتطلب المصادقة
router.use(protect);

// ========== تسجيل الأحداث والمقاييس ==========

/**
 * @route   POST /api/analytics/events
 * @desc    تسجيل حدث تحليلي
 * @access  Private
 */
router.post('/events', AdvancedAnalyticsController.logEvent);

/**
 * @route   POST /api/analytics/metrics
 * @desc    تتبع مقياس
 * @access  Private
 */
router.post('/metrics', AdvancedAnalyticsController.trackMetric);

/**
 * @route   GET /api/analytics/events
 * @desc    جلب الأحداث
 * @access  Private
 */
router.get('/events', AdvancedAnalyticsController.getEvents);

// ========== التقارير ==========

/**
 * @route   POST /api/analytics/reports
 * @desc    إنشاء تقرير مخصص
 * @access  Private
 */
router.post('/reports', AdvancedAnalyticsController.generateReport);

/**
 * @route   GET /api/analytics/reports/:reportId/export
 * @desc    تصدير التقرير
 * @access  Private
 */
router.get('/reports/:reportId/export', AdvancedAnalyticsController.exportReport);

// ========== التنبؤ ==========

/**
 * @route   POST /api/analytics/predict
 * @desc    التنبؤ بالقيم المستقبلية
 * @access  Private
 */
router.post('/predict', AdvancedAnalyticsController.predictValues);

// ========== الشذوذ ==========

/**
 * @route   GET /api/analytics/anomalies
 * @desc    جلب الشذوذ المكتشفة
 * @access  Private
 */
router.get('/anomalies', AdvancedAnalyticsController.getAnomalies);

// ========== لوحات المعلومات ==========

/**
 * @route   POST /api/analytics/dashboards
 * @desc    إنشاء لوحة معلومات
 * @access  Private
 */
router.post('/dashboards', AdvancedAnalyticsController.createDashboard);

/**
 * @route   GET /api/analytics/dashboards/:dashboardId
 * @desc    جلب بيانات لوحة المعلومات
 * @access  Private
 */
router.get('/dashboards/:dashboardId', AdvancedAnalyticsController.getDashboard);

/**
 * @route   POST /api/analytics/dashboards/:dashboardId/widgets
 * @desc    إضافة widget إلى لوحة المعلومات
 * @access  Private
 */
router.post('/dashboards/:dashboardId/widgets', AdvancedAnalyticsController.addWidget);

// ========== التحليل المقارن ==========

/**
 * @route   POST /api/analytics/compare
 * @desc    جلب التحليل المقارن للمقاييس
 * @access  Private
 */
router.post('/compare', AdvancedAnalyticsController.getComparativeAnalysis);

// ========== الإحصائيات ==========

/**
 * @route   GET /api/analytics/stats
 * @desc    جلب الإحصائيات العامة
 * @access  Private
 */
router.get('/stats', AdvancedAnalyticsController.getStatistics);

module.exports = router;
