/**
 * Fleet Penalty Routes - مسارات المخالفات والغرامات
 */

const express = require('express');
const router = express.Router();
const FleetPenaltyController = require('../controllers/fleetPenaltyController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-penalties
 * @desc    تسجيل مخالفة جديدة
 * @access  Private
 */
router.post('/', protect, FleetPenaltyController.create);

/**
 * @route   GET /api/fleet-penalties
 * @desc    جلب جميع المخالفات
 * @access  Private
 */
router.get('/', protect, FleetPenaltyController.getAll);

/**
 * @route   GET /api/fleet-penalties/statistics
 * @desc    إحصائيات المخالفات
 * @access  Private
 */
router.get('/statistics', protect, FleetPenaltyController.getStatistics);

/**
 * @route   GET /api/fleet-penalties/unpaid
 * @desc    المخالفات غير المدفوعة
 * @access  Private
 */
router.get('/unpaid', protect, FleetPenaltyController.getUnpaid);

/**
 * @route   GET /api/fleet-penalties/vehicle/:vehicleId
 * @desc    مخالفات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetPenaltyController.getByVehicle);

/**
 * @route   GET /api/fleet-penalties/driver/:driverId
 * @desc    مخالفات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetPenaltyController.getByDriver);

/**
 * @route   GET /api/fleet-penalties/driver/:driverId/demerit-points
 * @desc    نقاط مخالفات السائق
 * @access  Private
 */
router.get(
  '/driver/:driverId/demerit-points',
  protect,
  FleetPenaltyController.getDriverDemeritPoints
);

/**
 * @route   GET /api/fleet-penalties/:id
 * @desc    جلب مخالفة بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetPenaltyController.getById);

/**
 * @route   PUT /api/fleet-penalties/:id
 * @desc    تحديث مخالفة
 * @access  Private
 */
router.put('/:id', protect, FleetPenaltyController.update);

/**
 * @route   DELETE /api/fleet-penalties/:id
 * @desc    حذف مخالفة
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetPenaltyController.delete);

/**
 * @route   POST /api/fleet-penalties/:id/pay
 * @desc    دفع المخالفة
 * @access  Private
 */
router.post('/:id/pay', protect, FleetPenaltyController.pay);

/**
 * @route   POST /api/fleet-penalties/:id/appeal
 * @desc    تقديم اعتراض على المخالفة
 * @access  Private
 */
router.post('/:id/appeal', protect, FleetPenaltyController.fileAppeal);

/**
 * @route   POST /api/fleet-penalties/:id/appeal/resolve
 * @desc    حل الاعتراض
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/appeal/resolve',
  protect,
  authorize('admin', 'manager'),
  FleetPenaltyController.resolveAppeal
);

module.exports = router;
