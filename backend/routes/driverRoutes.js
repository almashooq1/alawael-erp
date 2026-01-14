/**
 * Driver Routes - مسارات السائقين
 *
 * API endpoints لإدارة السائقين والترخيص
 * ✅ Driver Management
 * ✅ License Tracking
 * ✅ Performance Monitoring
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const driverService = require('../services/driverService');
const logger = require('../utils/logger');

// ==================== إدارة السائقين ====================

/**
 * @route   GET /api/drivers
 * @desc    الحصول على جميع السائقين
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      isActive: req.query.isActive !== 'false',
    };

    const result = await driverService.getAllDrivers(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب السائقين:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/:id
 * @desc    الحصول على بيانات سائق معين
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await driverService.getDriverDetails(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب بيانات السائق:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/drivers
 * @desc    إضافة سائق جديد
 * @access  Private/Admin
 */
router.post('/', authenticate, authorize('admin', 'fleet-manager', 'hr'), async (req, res) => {
  try {
    const result = await driverService.addDriver(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إضافة السائق:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/drivers/:id
 * @desc    تحديث بيانات السائق
 * @access  Private/Admin
 */
router.put('/:id', authenticate, authorize('admin', 'fleet-manager', 'hr'), async (req, res) => {
  try {
    const result = await driverService.updateDriver(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في تحديث السائق:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/drivers/:id
 * @desc    حذف سائق
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await driverService.deleteDriver(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حذف السائق:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة الترخيص ====================

/**
 * @route   GET /api/drivers/:id/license
 * @desc    الحصول على حالة الترخيص
 * @access  Private
 */
router.get('/:id/license', authenticate, async (req, res) => {
  try {
    const result = await driverService.getLicenseStatus(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب حالة الترخيص:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/licenses/expiring
 * @desc    الحصول على السائقين الذين تقارب تواريخ انتهاء رخصهم
 * @access  Private
 */
router.get('/licenses/expiring/list', authenticate, async (req, res) => {
  try {
    const daysThreshold = req.query.days || 30;
    const result = await driverService.getDriversWithExpiringLicenses(parseInt(daysThreshold));
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب السائقين الذين تقارب تواريخ انتهاء رخصهم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة المخالفات ====================

/**
 * @route   POST /api/drivers/:id/violations
 * @desc    تسجيل مخالفة
 * @access  Private/Admin
 */
router.post('/:id/violations', authenticate, authorize('admin', 'traffic-officer'), async (req, res) => {
  try {
    const result = await driverService.recordViolation(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في تسجيل المخالفة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/:id/violations
 * @desc    الحصول على سجل المخالفات
 * @access  Private
 */
router.get('/:id/violations', authenticate, async (req, res) => {
  try {
    const result = await driverService.getViolationHistory(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب سجل المخالفات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/violations/suspended
 * @desc    الحصول على السائقين الممنوعين من القيادة
 * @access  Private
 */
router.get('/violations/suspended/list', authenticate, async (req, res) => {
  try {
    const result = await driverService.getSuspendedDrivers();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب السائقين الممنوعين:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/drivers/:id/violations/reset
 * @desc    إعادة تعيين النقاط السنوية
 * @access  Private/Admin
 */
router.post('/:id/violations/reset', authenticate, authorize('admin', 'traffic-officer'), async (req, res) => {
  try {
    const result = await driverService.resetAnnualPoints(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إعادة تعيين النقاط:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة الحوادث ====================

/**
 * @route   POST /api/drivers/:id/accidents
 * @desc    تسجيل حادثة
 * @access  Private/Admin
 */
router.post('/:id/accidents', authenticate, authorize('admin', 'traffic-officer'), async (req, res) => {
  try {
    const result = await driverService.recordAccident(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في تسجيل الحادثة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/:id/accidents
 * @desc    الحصول على سجل الحوادث
 * @access  Private
 */
router.get('/:id/accidents', authenticate, async (req, res) => {
  try {
    const result = await driverService.getAccidentHistory(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب سجل الحوادث:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة الأداء ====================

/**
 * @route   GET /api/drivers/:id/performance
 * @desc    الحصول على تقييم الأداء
 * @access  Private
 */
router.get('/:id/performance', authenticate, async (req, res) => {
  try {
    const result = await driverService.getPerformanceRating(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب تقييم الأداء:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/drivers/:id/performance/review
 * @desc    تحديث تقييم الأداء
 * @access  Private/Admin
 */
router.post('/:id/performance/review', authenticate, authorize('admin', 'fleet-manager'), async (req, res) => {
  try {
    const { rating, review } = req.body;
    const result = await driverService.updatePerformanceRating(req.params.id, rating, review);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في تحديث التقييم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة التدريب ====================

/**
 * @route   GET /api/drivers/:id/training
 * @desc    الحصول على حالة التدريب والشهادات
 * @access  Private
 */
router.get('/:id/training', authenticate, async (req, res) => {
  try {
    const result = await driverService.getTrainingStatus(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب حالة التدريب:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/drivers/training/needed
 * @desc    الحصول على السائقين الذين يحتاجون تدريب
 * @access  Private
 */
router.get('/training/needed/list', authenticate, async (req, res) => {
  try {
    const result = await driverService.getDriversNeedingTraining();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب السائقين الذين يحتاجون تدريب:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== التقارير ====================

/**
 * @route   GET /api/drivers/:id/reports/comprehensive
 * @desc    الحصول على تقرير شامل عن السائق
 * @access  Private
 */
router.get('/:id/reports/comprehensive', authenticate, async (req, res) => {
  try {
    const result = await driverService.getComprehensiveReport(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب التقرير الشامل:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
