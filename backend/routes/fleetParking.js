/**
 * Fleet Parking Routes - مسارات مواقف الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetParkingController = require('../controllers/fleetParkingController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-parking
 * @desc    إنشاء سجل موقف جديد
 * @access  Private
 */
router.post('/', protect, FleetParkingController.create);

/**
 * @route   GET /api/fleet-parking
 * @desc    جلب جميع السجلات
 * @access  Private
 */
router.get('/', protect, FleetParkingController.getAll);

/**
 * @route   GET /api/fleet-parking/statistics
 * @desc    إحصائيات المواقف
 * @access  Private
 */
router.get('/statistics', protect, FleetParkingController.getStatistics);

/**
 * @route   GET /api/fleet-parking/zones
 * @desc    جلب مناطق المواقف
 * @access  Private
 */
router.get('/zones', protect, FleetParkingController.getZones);

/**
 * @route   GET /api/fleet-parking/zones/:zoneId/occupancy
 * @desc    إشغال المنطقة
 * @access  Private
 */
router.get('/zones/:zoneId/occupancy', protect, FleetParkingController.getZoneOccupancy);

/**
 * @route   POST /api/fleet-parking/entry
 * @desc    تسجيل دخول مركبة
 * @access  Private
 */
router.post('/entry', protect, FleetParkingController.logEntry);

/**
 * @route   POST /api/fleet-parking/violations
 * @desc    تسجيل مخالفة مواقف
 * @access  Private
 */
router.post('/violations', protect, FleetParkingController.createViolation);

/**
 * @route   GET /api/fleet-parking/vehicle/:vehicleId/violations
 * @desc    مخالفات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId/violations', protect, FleetParkingController.getVehicleViolations);

/**
 * @route   GET /api/fleet-parking/:id
 * @desc    جلب سجل بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetParkingController.getById);

/**
 * @route   PUT /api/fleet-parking/:id
 * @desc    تحديث سجل
 * @access  Private
 */
router.put('/:id', protect, FleetParkingController.update);

/**
 * @route   DELETE /api/fleet-parking/:id
 * @desc    حذف سجل
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), FleetParkingController.delete);

/**
 * @route   POST /api/fleet-parking/:id/exit
 * @desc    تسجيل خروج مركبة
 * @access  Private
 */
router.post('/:id/exit', protect, FleetParkingController.logExit);

/**
 * @route   POST /api/fleet-parking/:id/pay
 * @desc    دفع مخالفة
 * @access  Private
 */
router.post('/:id/pay', protect, FleetParkingController.payViolation);

module.exports = router;
