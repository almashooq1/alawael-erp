/**
 * Cargo Routes - مسارات إدارة الشحنات
 */

const express = require('express');
const router = express.Router();
const CargoController = require('../controllers/cargoController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/cargo
 * @desc    إنشاء شحنة جديدة
 * @access  Private
 */
router.post('/', protect, CargoController.create);

/**
 * @route   GET /api/cargo
 * @desc    جلب جميع الشحنات
 * @access  Private
 */
router.get('/', protect, CargoController.getAll);

/**
 * @route   GET /api/cargo/statistics
 * @desc    إحصائيات الشحنات
 * @access  Private
 */
router.get('/statistics', protect, CargoController.getStatistics);

/**
 * @route   GET /api/cargo/in-transit
 * @desc    الشحنات قيد النقل
 * @access  Private
 */
router.get('/in-transit', protect, CargoController.getInTransit);

/**
 * @route   GET /api/cargo/delayed
 * @desc    الشحنات المتأخرة
 * @access  Private
 */
router.get('/delayed', protect, CargoController.getDelayed);

/**
 * @route   GET /api/cargo/vehicle/:vehicleId
 * @desc    شحنات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, CargoController.getByVehicle);

/**
 * @route   GET /api/cargo/driver/:driverId
 * @desc    شحنات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, CargoController.getByDriver);

/**
 * @route   GET /api/cargo/:id
 * @desc    جلب شحنة بالمعرف
 * @access  Private
 */
router.get('/:id', protect, CargoController.getById);

/**
 * @route   PUT /api/cargo/:id
 * @desc    تحديث شحنة
 * @access  Private
 */
router.put('/:id', protect, CargoController.update);

/**
 * @route   DELETE /api/cargo/:id
 * @desc    حذف شحنة
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), CargoController.delete);

/**
 * @route   PATCH /api/cargo/:id/status
 * @desc    تحديث حالة الشحنة
 * @access  Private
 */
router.patch('/:id/status', protect, CargoController.updateStatus);

/**
 * @route   POST /api/cargo/:id/confirm-delivery
 * @desc    تأكيد التسليم (إثبات التسليم)
 * @access  Private
 */
router.post('/:id/confirm-delivery', protect, CargoController.confirmDelivery);

module.exports = router;
