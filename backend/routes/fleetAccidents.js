/**
 * Fleet Accident Routes - مسارات حوادث الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetAccidentController = require('../controllers/fleetAccidentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-accidents
 * @desc    تسجيل تقرير حادث جديد
 * @access  Private
 */
router.post('/', protect, FleetAccidentController.create);

/**
 * @route   GET /api/fleet-accidents
 * @desc    جلب جميع تقارير الحوادث
 * @access  Private
 */
router.get('/', protect, FleetAccidentController.getAll);

/**
 * @route   GET /api/fleet-accidents/statistics
 * @desc    إحصائيات الحوادث
 * @access  Private
 */
router.get('/statistics', protect, FleetAccidentController.getStatistics);

/**
 * @route   GET /api/fleet-accidents/pending-claims
 * @desc    مطالبات التأمين المعلقة
 * @access  Private
 */
router.get('/pending-claims', protect, FleetAccidentController.getPendingClaims);

/**
 * @route   GET /api/fleet-accidents/vehicle/:vehicleId
 * @desc    حوادث المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetAccidentController.getByVehicle);

/**
 * @route   GET /api/fleet-accidents/driver/:driverId
 * @desc    حوادث السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetAccidentController.getByDriver);

/**
 * @route   GET /api/fleet-accidents/:id
 * @desc    جلب تقرير حادث بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetAccidentController.getById);

/**
 * @route   PUT /api/fleet-accidents/:id
 * @desc    تحديث تقرير حادث
 * @access  Private
 */
router.put('/:id', protect, FleetAccidentController.update);

/**
 * @route   DELETE /api/fleet-accidents/:id
 * @desc    حذف تقرير حادث
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetAccidentController.delete);

/**
 * @route   PATCH /api/fleet-accidents/:id/status
 * @desc    تحديث حالة الحادث
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:id/status',
  protect,
  authorize('admin', 'manager'),
  FleetAccidentController.updateStatus
);

/**
 * @route   PATCH /api/fleet-accidents/:id/insurance-claim
 * @desc    تحديث مطالبة التأمين
 * @access  Private
 */
router.patch('/:id/insurance-claim', protect, FleetAccidentController.updateInsuranceClaim);

/**
 * @route   POST /api/fleet-accidents/:id/witness
 * @desc    إضافة شاهد للحادث
 * @access  Private
 */
router.post('/:id/witness', protect, FleetAccidentController.addWitness);

module.exports = router;
