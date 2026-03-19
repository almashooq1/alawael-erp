/**
 * Traffic Fine & Toll Routes - مسارات المخالفات المرورية والرسوم
 */

const express = require('express');
const router = express.Router();
const TrafficFineController = require('../controllers/trafficFineController');
const { protect, authorize } = require('../middleware/auth');

// ─── Traffic Fines ──────────────────────────────────────────────────

/**
 * @route   POST /api/traffic-fines
 * @desc    تسجيل مخالفة مرورية
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), TrafficFineController.createFine);

/**
 * @route   GET /api/traffic-fines
 * @desc    جلب جميع المخالفات
 * @access  Private
 */
router.get('/', protect, TrafficFineController.getAllFines);

/**
 * @route   GET /api/traffic-fines/statistics
 * @desc    إحصائيات المخالفات
 * @access  Private
 */
router.get('/statistics', protect, TrafficFineController.getFineStatistics);

/**
 * @route   GET /api/traffic-fines/overdue
 * @desc    مخالفات متأخرة
 * @access  Private
 */
router.get('/overdue', protect, TrafficFineController.getOverdue);

/**
 * @route   GET /api/traffic-fines/driver/:driverId
 * @desc    مخالفات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, TrafficFineController.getDriverFines);

/**
 * @route   GET /api/traffic-fines/vehicle/:vehicleId
 * @desc    مخالفات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, TrafficFineController.getVehicleFines);

/**
 * @route   GET /api/traffic-fines/:id
 * @desc    جلب مخالفة
 * @access  Private
 */
router.get('/:id', protect, TrafficFineController.getFineById);

/**
 * @route   PUT /api/traffic-fines/:id
 * @desc    تحديث مخالفة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), TrafficFineController.updateFine);

/**
 * @route   POST /api/traffic-fines/:id/pay
 * @desc    دفع مخالفة
 * @access  Private (Admin, Manager)
 */
router.post('/:id/pay', protect, authorize('admin', 'manager'), TrafficFineController.payFine);

/**
 * @route   POST /api/traffic-fines/:id/dispute
 * @desc    الاعتراض على مخالفة
 * @access  Private
 */
router.post('/:id/dispute', protect, TrafficFineController.disputeFine);

/**
 * @route   PUT /api/traffic-fines/:id/dispute/resolve
 * @desc    حل اعتراض
 * @access  Private (Admin)
 */
router.put(
  '/:id/dispute/resolve',
  protect,
  authorize('admin'),
  TrafficFineController.resolveDispute
);

/**
 * @route   POST /api/traffic-fines/:id/assign
 * @desc    تعيين مخالفة لسائق
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/assign',
  protect,
  authorize('admin', 'manager'),
  TrafficFineController.assignToDriver
);

// ─── Toll Transactions ──────────────────────────────────────────────

/**
 * @route   POST /api/traffic-fines/tolls
 * @desc    تسجيل معاملة عبور
 * @access  Private (Admin, Manager)
 */
router.post('/tolls', protect, authorize('admin', 'manager'), TrafficFineController.createToll);

/**
 * @route   GET /api/traffic-fines/tolls
 * @desc    جلب جميع معاملات العبور
 * @access  Private
 */
router.get('/tolls', protect, TrafficFineController.getAllTolls);

/**
 * @route   GET /api/traffic-fines/tolls/statistics
 * @desc    إحصائيات العبور
 * @access  Private
 */
router.get('/tolls/statistics', protect, TrafficFineController.getTollStatistics);

/**
 * @route   GET /api/traffic-fines/tolls/vehicle/:vehicleId
 * @desc    معاملات عبور المركبة
 * @access  Private
 */
router.get('/tolls/vehicle/:vehicleId', protect, TrafficFineController.getVehicleTolls);

module.exports = router;
