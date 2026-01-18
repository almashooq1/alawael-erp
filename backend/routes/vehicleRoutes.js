/**
 * Vehicle Routes - مسارات المركبات
 *
 * API endpoints لإدارة المركبات والأسطول
 * ✅ CRUD Operations
 * ✅ Fleet Management
 * ✅ Analytics & Reports
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const authenticate = authenticateToken;
const authorize = requireRole;
const fleetService = require('../services/fleetService');
const driverService = require('../services/driverService');
const logger = require('../utils/logger');

// ==================== إدارة المركبات ====================

/**
 * @route   GET /api/vehicles
 * @desc    الحصول على جميع المركبات
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      owner: req.query.owner,
      assignedDriver: req.query.assignedDriver,
      isActive: req.query.isActive !== 'false',
    };

    const result = await fleetService.getAllVehicles(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب المركبات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/:id
 * @desc    الحصول على بيانات مركبة معينة
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getVehicleDetails(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب بيانات المركبة:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/vehicles
 * @desc    إضافة مركبة جديدة
 * @access  Private/Admin
 */
router.post('/', authenticate, authorize('admin', 'fleet-manager'), async (req, res) => {
  try {
    const result = await fleetService.addVehicle(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إضافة المركبة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/vehicles/:id
 * @desc    تحديث بيانات المركبة
 * @access  Private/Admin
 */
router.put('/:id', authenticate, authorize('admin', 'fleet-manager'), async (req, res) => {
  try {
    const result = await fleetService.updateVehicle(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في تحديث المركبة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    حذف مركبة
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await fleetService.deleteVehicle(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حذف المركبة:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة الصيانة ====================

/**
 * @route   POST /api/vehicles/:id/maintenance
 * @desc    إضافة سجل صيانة
 * @access  Private/Admin
 */
router.post('/:id/maintenance', authenticate, authorize('admin', 'fleet-manager'), async (req, res) => {
  try {
    const result = await fleetService.addMaintenanceRecord(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إضافة سجل الصيانة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/:id/maintenance
 * @desc    الحصول على جدول الصيانة
 * @access  Private
 */
router.get('/:id/maintenance', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getMaintenanceSchedule(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب جدول الصيانة:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/maintenance/needed
 * @desc    الحصول على المركبات التي تحتاج صيانة
 * @access  Private
 */
router.get('/maintenance/list/needed', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getVehiclesNeedingMaintenance();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب المركبات التي تحتاج صيانة:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة الفحص ====================

/**
 * @route   POST /api/vehicles/:id/inspection
 * @desc    تسجيل فحص دوري
 * @access  Private/Admin
 */
router.post('/:id/inspection', authenticate, authorize('admin', 'fleet-manager', 'inspector'), async (req, res) => {
  try {
    const result = await fleetService.recordInspection(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في تسجيل الفحص:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/inspection/needed
 * @desc    الحصول على المركبات التي تحتاج فحص
 * @access  Private
 */
router.get('/inspection/list/needed', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getVehiclesNeedingInspection();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب المركبات التي تحتاج فحص:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== إدارة المخالفات ====================

/**
 * @route   POST /api/vehicles/:id/violations
 * @desc    تسجيل مخالفة
 * @access  Private/Admin
 */
router.post('/:id/violations', authenticate, authorize('admin', 'traffic-officer'), async (req, res) => {
  try {
    const result = await fleetService.recordViolation(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في تسجيل المخالفة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== الإحصائيات والتقارير ====================

/**
 * @route   GET /api/vehicles/stats/fleet
 * @desc    الحصول على إحصائيات الأسطول
 * @access  Private
 */
router.get('/stats/fleet/overview', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getFleetStatistics();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب إحصائيات الأسطول:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/reports/compliance
 * @desc    الحصول على تقرير الامتثال
 * @access  Private
 */
router.get('/reports/compliance/status', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getComplianceReport();
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب تقرير الامتثال:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/:id/reports/performance
 * @desc    الحصول على تقرير الأداء
 * @access  Private
 */
router.get('/:id/reports/performance', authenticate, async (req, res) => {
  try {
    const result = await fleetService.getPerformanceReport(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب تقرير الأداء:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/vehicles/:id/costs
 * @desc    حساب تكلفة التشغيل
 * @access  Private
 */
router.get('/:id/costs', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await fleetService.calculateOperatingCost(req.params.id, new Date(startDate), new Date(endDate));
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب تكلفة التشغيل:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
