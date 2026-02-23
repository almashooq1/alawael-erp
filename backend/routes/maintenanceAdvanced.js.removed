/**
 * Advanced Maintenance Routes - مسارات الصيانة المتقدمة
 *
 * API متقدمة وشاملة لنظام الصيانة الذكي
 * ✅ Smart Scheduling
 * ✅ Task Management
 * ✅ Issue Tracking
 * ✅ Analytics
 * ✅ AI Predictions
 */

const express = require('express');
const router = express.Router();

const advancedMaintenanceService = require('../services/advancedMaintenanceService');
const maintenanceAIService = require('../services/maintenanceAIService');
const maintenanceAnalyticsService = require('../services/maintenanceAnalyticsService');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// ==================== جداول الصيانة ====================

/**
 * @route   POST /api/v1/maintenance/schedules
 * @access  Private/Admin
 * @desc    إنشاء جدول صيانة ذكي
 */
router.post('/schedules', protect, authorize(['admin', 'fleet_manager']), async (req, res) => {
  try {
    const { vehicleId, scheduleData } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'معرف المركبة مطلوب' });
    }

    const result = await advancedMaintenanceService.createSmartMaintenanceSchedule(
      vehicleId,
      scheduleData
    );

    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء الجدول:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/schedules
 * @access  Private
 * @desc    الحصول على جداول الصيانة النشطة
 */
router.get('/schedules', protect, async (req, res) => {
  try {
    const filters = {
      vehicle: req.query.vehicle,
      category: req.query.category,
      priority: req.query.priority,
    };

    const result = await advancedMaintenanceService.getActiveSchedules(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب الجداول:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/v1/maintenance/schedules/:id/tasks
 * @access  Private/Admin
 * @desc    إنشاء مهام من جدول
 */
router.post('/schedules/:id/tasks', protect, authorize(['admin']), async (req, res) => {
  try {
    const result = await advancedMaintenanceService.createTasksFromSchedule(req.params.id);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء المهام:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== مهام الصيانة ====================

/**
 * @route   GET /api/v1/maintenance/tasks/upcoming
 * @access  Private
 * @desc    الحصول على المهام القادمة
 */
router.get('/tasks/upcoming', protect, async (req, res) => {
  try {
    const filters = {
      vehicle: req.query.vehicle,
      priority: req.query.priority,
    };

    const result = await advancedMaintenanceService.getUpcomingTasks(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب المهام:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/v1/maintenance/tasks/:id/progress
 * @access  Private
 * @desc    تحديث تقدم المهمة
 */
router.patch('/tasks/:id/progress', protect, async (req, res) => {
  try {
    const { progress, notes } = req.body;

    if (progress === undefined) {
      return res.status(400).json({ error: 'نسبة التقدم مطلوبة' });
    }

    const result = await advancedMaintenanceService.updateTaskProgress(
      req.params.id,
      progress,
      notes
    );

    res.json(result);
  } catch (error) {
    logger.error('خطأ في تحديث التقدم:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== مشاكل الصيانة ====================

/**
 * @route   POST /api/v1/maintenance/issues
 * @access  Private
 * @desc    تسجيل مشكلة صيانة جديدة
 */
router.post('/issues', protect, async (req, res) => {
  try {
    const { vehicleId, issueData } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'معرف المركبة مطلوب' });
    }

    issueData.reportedBy = req.user._id;
    issueData.reporterName = req.user.name;

    const result = await advancedMaintenanceService.reportMaintenanceIssue(vehicleId, issueData);

    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في تسجيل المشكلة:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/v1/maintenance/issues/:id/diagnose
 * @access  Private/Admin
 * @desc    تشخيص تلقائي للمشكلة
 */
router.post('/issues/:id/diagnose', protect, authorize(['admin', 'technician']), async (req, res) => {
  try {
    const result = await advancedMaintenanceService.autodiagnosisIssue(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في التشخيص:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== المخزون ====================

/**
 * @route   GET /api/v1/maintenance/inventory/critical
 * @access  Private/Admin
 * @desc    فحص مستويات المخزون الحرجة
 */
router.get('/inventory/critical', protect, authorize(['admin', 'store_manager']), async (req, res) => {
  try {
    const result = await advancedMaintenanceService.checkInventoryCriticalLevels();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في فحص المخزون:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/v1/maintenance/inventory/:id/reorder
 * @access  Private/Admin
 * @desc    إنشاء طلب شراء تلقائي
 */
router.post('/inventory/:id/reorder', protect, authorize(['admin', 'store_manager']), async (req, res) => {
  try {
    const result = await advancedMaintenanceService.createAutoPurchaseOrder(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء طلب الشراء:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== الذكاء الاصطناعي والتنبؤات ====================

/**
 * @route   GET /api/v1/maintenance/predict/:vehicleId
 * @access  Private
 * @desc    التنبؤ باحتياجات الصيانة
 */
router.get('/predict/:vehicleId', protect, async (req, res) => {
  try {
    const result = await maintenanceAIService.predictMaintenanceNeeds(req.params.vehicleId);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في التنبؤ:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/anomalies/:vehicleId
 * @access  Private
 * @desc    كشف حالات شاذة
 */
router.get('/anomalies/:vehicleId', protect, async (req, res) => {
  try {
    const result = await maintenanceAIService.detectAnomalies(req.params.vehicleId);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في كشف الحالات الشاذة:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/recommendations/:vehicleId
 * @access  Private
 * @desc    الحصول على توصيات ذكية
 */
router.get('/recommendations/:vehicleId', protect, async (req, res) => {
  try {
    const result = await maintenanceAIService.getSmartRecommendations(req.params.vehicleId);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في الحصول على التوصيات:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== التحليلات والتقارير ====================

/**
 * @route   GET /api/v1/maintenance/reports/:vehicleId
 * @access  Private
 * @desc    تقرير صيانة شامل
 */
router.get('/reports/:vehicleId', protect, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const result = await maintenanceAnalyticsService.generateComprehensiveReport(
      req.params.vehicleId,
      startDate,
      endDate
    );

    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء التقرير:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/reports/providers/performance
 * @access  Private/Admin
 * @desc    تقرير أداء مراكز الصيانة
 */
router.get('/reports/providers/performance', protect, authorize(['admin']), async (req, res) => {
  try {
    const result = await maintenanceAnalyticsService.getProviderPerformanceReport();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء تقرير الأداء:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/reports/inventory
 * @access  Private/Admin
 * @desc    تقرير حالة المخزون
 */
router.get('/reports/inventory', protect, authorize(['admin', 'store_manager']), async (req, res) => {
  try {
    const result = await maintenanceAnalyticsService.getInventoryHealthReport();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء تقرير المخزون:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/reports/:vehicleId/compliance
 * @access  Private
 * @desc    تقرير الامتثال والسلامة
 */
router.get('/reports/:vehicleId/compliance', protect, async (req, res) => {
  try {
    const result = await maintenanceAnalyticsService.getComplianceReport(req.params.vehicleId);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء تقرير الامتثال:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== الصحة والتحليلات ====================

/**
 * @route   GET /api/v1/maintenance/vehicle/:vehicleId/health
 * @access  Private
 * @desc    ملخص صحة المركبة
 */
router.get('/vehicle/:vehicleId/health', protect, async (req, res) => {
  try {
    const result = await advancedMaintenanceService.getVehicleHealthSummary(req.params.vehicleId);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب ملخص الصحة:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/v1/maintenance/vehicle/:vehicleId/costs
 * @access  Private
 * @desc    تحليل التكاليف
 */
router.get('/vehicle/:vehicleId/costs', protect, async (req, res) => {
  try {
    const period = req.query.period || 12; // بالأشهر
    const result = await advancedMaintenanceService.getMaintenanceCostAnalysis(
      req.params.vehicleId,
      period
    );

    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب التكاليف:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== التنبيهات ====================

/**
 * @route   GET /api/v1/maintenance/alerts
 * @access  Private
 * @desc    الحصول على جميع التنبيهات
 */
router.get('/alerts', protect, async (req, res) => {
  try {
    const result = await advancedMaintenanceService.triggerSmartAlerts();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب التنبيهات:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
