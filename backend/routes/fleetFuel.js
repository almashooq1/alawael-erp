/**
 * Fleet Fuel Routes - مسارات إدارة الوقود
 */

const express = require('express');
const router = express.Router();
const FleetFuelController = require('../controllers/fleetFuelController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-fuel
 * @desc    تسجيل معاملة وقود جديدة
 * @access  Private
 */
router.post('/', protect, FleetFuelController.create);

/**
 * @route   GET /api/fleet-fuel
 * @desc    جلب جميع سجلات الوقود
 * @access  Private
 */
router.get('/', protect, FleetFuelController.getAll);

/**
 * @route   GET /api/fleet-fuel/statistics
 * @desc    إحصائيات الوقود
 * @access  Private
 */
router.get('/statistics', protect, FleetFuelController.getStatistics);

/**
 * @route   GET /api/fleet-fuel/anomalies
 * @desc    حالات الشذوذ في استهلاك الوقود
 * @access  Private
 */
router.get('/anomalies', protect, FleetFuelController.getAnomalies);

/**
 * @route   GET /api/fleet-fuel/vehicle/:vehicleId
 * @desc    سجلات وقود المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetFuelController.getByVehicle);

/**
 * @route   GET /api/fleet-fuel/vehicle/:vehicleId/efficiency
 * @desc    تقرير كفاءة الوقود للمركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId/efficiency', protect, FleetFuelController.getEfficiencyReport);

/**
 * @route   GET /api/fleet-fuel/driver/:driverId
 * @desc    سجلات وقود السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetFuelController.getByDriver);

/**
 * @route   GET /api/fleet-fuel/:id
 * @desc    جلب سجل وقود بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetFuelController.getById);

/**
 * @route   PUT /api/fleet-fuel/:id
 * @desc    تحديث سجل وقود
 * @access  Private
 */
router.put('/:id', protect, FleetFuelController.update);

/**
 * @route   DELETE /api/fleet-fuel/:id
 * @desc    حذف سجل وقود
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetFuelController.delete);

/**
 * @route   POST /api/fleet-fuel/:id/verify
 * @desc    التحقق من سجل الوقود
 * @access  Private (Admin, Manager)
 */
router.post('/:id/verify', protect, authorize('admin', 'manager'), FleetFuelController.verify);

module.exports = router;
