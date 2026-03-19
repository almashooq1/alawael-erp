/**
 * Fleet Toll Routes - مسارات رسوم المرور
 */

const express = require('express');
const router = express.Router();
const FleetTollController = require('../controllers/fleetTollController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-tolls
 * @desc    تسجيل رسم مرور جديد
 * @access  Private
 */
router.post('/', protect, FleetTollController.create);

/**
 * @route   GET /api/fleet-tolls
 * @desc    جلب جميع سجلات الرسوم
 * @access  Private
 */
router.get('/', protect, FleetTollController.getAll);

/**
 * @route   GET /api/fleet-tolls/statistics
 * @desc    إحصائيات الرسوم
 * @access  Private
 */
router.get('/statistics', protect, FleetTollController.getStatistics);

/**
 * @route   GET /api/fleet-tolls/unpaid
 * @desc    الرسوم غير المدفوعة
 * @access  Private
 */
router.get('/unpaid', protect, FleetTollController.getUnpaid);

/**
 * @route   GET /api/fleet-tolls/vehicle/:vehicleId
 * @desc    رسوم المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetTollController.getByVehicle);

/**
 * @route   GET /api/fleet-tolls/tag/:tagId
 * @desc    ملخص بطاقة المرور
 * @access  Private
 */
router.get('/tag/:tagId', protect, FleetTollController.getTagSummary);

/**
 * @route   GET /api/fleet-tolls/:id
 * @desc    جلب سجل رسم بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetTollController.getById);

/**
 * @route   PUT /api/fleet-tolls/:id
 * @desc    تحديث سجل رسم
 * @access  Private
 */
router.put('/:id', protect, FleetTollController.update);

/**
 * @route   DELETE /api/fleet-tolls/:id
 * @desc    حذف سجل رسم
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetTollController.delete);

/**
 * @route   POST /api/fleet-tolls/:id/reconcile
 * @desc    مطابقة سجل الرسم
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/reconcile',
  protect,
  authorize('admin', 'manager'),
  FleetTollController.reconcile
);

/**
 * @route   POST /api/fleet-tolls/:id/pay
 * @desc    دفع الرسم
 * @access  Private
 */
router.post('/:id/pay', protect, FleetTollController.pay);

module.exports = router;
