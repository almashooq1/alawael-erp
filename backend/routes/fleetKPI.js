/**
 * Fleet KPI & Analytics Routes - مسارات مؤشرات أداء الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetKPIController = require('../controllers/fleetKPIController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-kpi
 * @desc    إنشاء تقرير أداء يدوي
 * @access  Private (Admin)
 */
router.post('/', protect, authorize('admin'), FleetKPIController.create);

/**
 * @route   GET /api/fleet-kpi
 * @desc    جلب جميع التقارير
 * @access  Private
 */
router.get('/', protect, FleetKPIController.getAll);

/**
 * @route   GET /api/fleet-kpi/latest
 * @desc    جلب أحدث تقرير
 * @access  Private
 */
router.get('/latest', protect, FleetKPIController.getLatest);

/**
 * @route   GET /api/fleet-kpi/dashboard
 * @desc    ملخص لوحة القيادة
 * @access  Private
 */
router.get('/dashboard', protect, FleetKPIController.getDashboard);

/**
 * @route   GET /api/fleet-kpi/trend
 * @desc    اتجاه الأداء
 * @access  Private
 */
router.get('/trend', protect, FleetKPIController.getTrend);

/**
 * @route   GET /api/fleet-kpi/compare
 * @desc    مقارنة فترتين
 * @access  Private
 */
router.get('/compare', protect, FleetKPIController.compare);

/**
 * @route   POST /api/fleet-kpi/generate
 * @desc    توليد تقرير أداء تلقائي
 * @access  Private (Admin, Manager)
 */
router.post('/generate', protect, authorize('admin', 'manager'), FleetKPIController.generate);

/**
 * @route   GET /api/fleet-kpi/:id
 * @desc    جلب تقرير بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetKPIController.getById);

module.exports = router;
