/**
 * Vehicle Assignment Routes - مسارات تعيينات المركبات
 */

const express = require('express');
const router = express.Router();
const VehicleAssignmentController = require('../controllers/vehicleAssignmentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/vehicle-assignments
 * @desc    إنشاء تعيين جديد
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), VehicleAssignmentController.create);

/**
 * @route   GET /api/vehicle-assignments
 * @desc    جلب جميع التعيينات
 * @access  Private
 */
router.get('/', protect, VehicleAssignmentController.getAll);

/**
 * @route   GET /api/vehicle-assignments/statistics
 * @desc    إحصائيات التعيينات
 * @access  Private
 */
router.get('/statistics', protect, VehicleAssignmentController.getStatistics);

/**
 * @route   GET /api/vehicle-assignments/vehicle/:vehicleId/active
 * @desc    التعيين النشط للمركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId/active', protect, VehicleAssignmentController.getActiveByVehicle);

/**
 * @route   GET /api/vehicle-assignments/vehicle/:vehicleId/history
 * @desc    سجل تعيينات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId/history', protect, VehicleAssignmentController.getHistory);

/**
 * @route   GET /api/vehicle-assignments/driver/:driverId/active
 * @desc    التعيين النشط للسائق
 * @access  Private
 */
router.get('/driver/:driverId/active', protect, VehicleAssignmentController.getActiveByDriver);

/**
 * @route   GET /api/vehicle-assignments/driver/:driverId/history
 * @desc    سجل تعيينات السائق
 * @access  Private
 */
router.get('/driver/:driverId/history', protect, VehicleAssignmentController.getDriverHistory);

/**
 * @route   GET /api/vehicle-assignments/:id
 * @desc    جلب تعيين بالمعرف
 * @access  Private
 */
router.get('/:id', protect, VehicleAssignmentController.getById);

/**
 * @route   PUT /api/vehicle-assignments/:id
 * @desc    تحديث تعيين
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), VehicleAssignmentController.update);

/**
 * @route   DELETE /api/vehicle-assignments/:id
 * @desc    حذف تعيين
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), VehicleAssignmentController.delete);

/**
 * @route   POST /api/vehicle-assignments/:id/handover
 * @desc    تسجيل التسليم
 * @access  Private
 */
router.post('/:id/handover', protect, VehicleAssignmentController.recordHandover);

/**
 * @route   POST /api/vehicle-assignments/:id/return
 * @desc    تسجيل الإرجاع
 * @access  Private
 */
router.post('/:id/return', protect, VehicleAssignmentController.recordReturn);

/**
 * @route   POST /api/vehicle-assignments/:id/transfer
 * @desc    نقل المركبة لسائق آخر
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/transfer',
  protect,
  authorize('admin', 'manager'),
  VehicleAssignmentController.transfer
);

module.exports = router;
