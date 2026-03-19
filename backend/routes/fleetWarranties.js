/**
 * Fleet Warranty Routes - مسارات ضمانات الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetWarrantyController = require('../controllers/fleetWarrantyController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-warranties
 * @desc    إنشاء ضمان جديد
 * @access  Private
 */
router.post('/', protect, FleetWarrantyController.create);

/**
 * @route   GET /api/fleet-warranties
 * @desc    جلب جميع الضمانات
 * @access  Private
 */
router.get('/', protect, FleetWarrantyController.getAll);

/**
 * @route   GET /api/fleet-warranties/statistics
 * @desc    إحصائيات الضمانات
 * @access  Private
 */
router.get('/statistics', protect, FleetWarrantyController.getStatistics);

/**
 * @route   GET /api/fleet-warranties/expiring
 * @desc    الضمانات القريبة من الانتهاء
 * @access  Private
 */
router.get('/expiring', protect, FleetWarrantyController.getExpiring);

/**
 * @route   GET /api/fleet-warranties/expired
 * @desc    الضمانات المنتهية
 * @access  Private
 */
router.get('/expired', protect, FleetWarrantyController.getExpired);

/**
 * @route   GET /api/fleet-warranties/vehicle/:vehicleId
 * @desc    ضمانات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetWarrantyController.getByVehicle);

/**
 * @route   GET /api/fleet-warranties/:id
 * @desc    جلب ضمان بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetWarrantyController.getById);

/**
 * @route   PUT /api/fleet-warranties/:id
 * @desc    تحديث ضمان
 * @access  Private
 */
router.put('/:id', protect, FleetWarrantyController.update);

/**
 * @route   DELETE /api/fleet-warranties/:id
 * @desc    حذف ضمان
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetWarrantyController.delete);

/**
 * @route   POST /api/fleet-warranties/:id/claim
 * @desc    إضافة مطالبة ضمان
 * @access  Private
 */
router.post('/:id/claim', protect, FleetWarrantyController.addClaim);

/**
 * @route   PATCH /api/fleet-warranties/:id/claim/:claimNumber
 * @desc    تحديث مطالبة ضمان
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:id/claim/:claimNumber',
  protect,
  authorize('admin', 'manager'),
  FleetWarrantyController.updateClaim
);

module.exports = router;
