/**
 * Vehicle Insurance Routes - مسارات تأمين المركبات
 */

const express = require('express');
const router = express.Router();
const VehicleInsuranceController = require('../controllers/vehicleInsuranceController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/vehicle-insurance
 * @desc    إنشاء بوليصة تأمين
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), VehicleInsuranceController.create);

/**
 * @route   GET /api/vehicle-insurance
 * @desc    جلب جميع البوالص
 * @access  Private
 */
router.get('/', protect, VehicleInsuranceController.getAll);

/**
 * @route   GET /api/vehicle-insurance/statistics
 * @desc    إحصائيات التأمين
 * @access  Private
 */
router.get('/statistics', protect, VehicleInsuranceController.getStatistics);

/**
 * @route   GET /api/vehicle-insurance/expiring
 * @desc    بوالص تنتهي قريباً
 * @access  Private
 */
router.get('/expiring', protect, VehicleInsuranceController.getExpiring);

/**
 * @route   GET /api/vehicle-insurance/vehicle/:vehicleId
 * @desc    تأمينات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, VehicleInsuranceController.getVehicleInsurance);

/**
 * @route   GET /api/vehicle-insurance/:id
 * @desc    جلب بوليصة
 * @access  Private
 */
router.get('/:id', protect, VehicleInsuranceController.getById);

/**
 * @route   PUT /api/vehicle-insurance/:id
 * @desc    تحديث بوليصة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), VehicleInsuranceController.update);

/**
 * @route   POST /api/vehicle-insurance/:id/activate
 * @desc    تفعيل بوليصة
 * @access  Private (Admin)
 */
router.post('/:id/activate', protect, authorize('admin'), VehicleInsuranceController.activate);

/**
 * @route   POST /api/vehicle-insurance/:id/cancel
 * @desc    إلغاء بوليصة
 * @access  Private (Admin)
 */
router.post('/:id/cancel', protect, authorize('admin'), VehicleInsuranceController.cancel);

/**
 * @route   POST /api/vehicle-insurance/:id/payment
 * @desc    إضافة دفعة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/payment',
  protect,
  authorize('admin', 'manager'),
  VehicleInsuranceController.addPayment
);

/**
 * @route   POST /api/vehicle-insurance/:id/claim
 * @desc    تقديم مطالبة
 * @access  Private
 */
router.post('/:id/claim', protect, VehicleInsuranceController.fileClaim);

/**
 * @route   PUT /api/vehicle-insurance/:id/claims/:claimId
 * @desc    تحديث مطالبة
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/claims/:claimId',
  protect,
  authorize('admin', 'manager'),
  VehicleInsuranceController.updateClaim
);

/**
 * @route   POST /api/vehicle-insurance/:id/renew
 * @desc    تجديد بوليصة
 * @access  Private (Admin, Manager)
 */
router.post('/:id/renew', protect, authorize('admin', 'manager'), VehicleInsuranceController.renew);

module.exports = router;
