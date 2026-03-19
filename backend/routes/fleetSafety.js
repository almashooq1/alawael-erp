/**
 * Fleet Safety & Incidents Routes - مسارات السلامة والحوادث
 */

const express = require('express');
const router = express.Router();
const FleetSafetyController = require('../controllers/fleetSafety.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-safety
 * @desc    تسجيل حادثة جديدة
 * @access  Private
 */
router.post('/', protect, FleetSafetyController.reportIncident);

/**
 * @route   GET /api/fleet-safety
 * @desc    جلب جميع الحوادث
 * @access  Private
 */
router.get('/', protect, FleetSafetyController.getAll);

/**
 * @route   GET /api/fleet-safety/statistics
 * @desc    إحصائيات السلامة
 * @access  Private
 */
router.get('/statistics', protect, FleetSafetyController.getStatistics);

/**
 * @route   GET /api/fleet-safety/high-risk-drivers
 * @desc    السائقون عالي المخاطر
 * @access  Private (Admin, Manager)
 */
router.get(
  '/high-risk-drivers',
  protect,
  authorize('admin', 'manager'),
  FleetSafetyController.getHighRiskDrivers
);

/**
 * @route   GET /api/fleet-safety/driver/:driverId
 * @desc    حوادث سائق محدد
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetSafetyController.getDriverIncidents);

/**
 * @route   GET /api/fleet-safety/driver/:driverId/score
 * @desc    نقاط سلامة السائق
 * @access  Private
 */
router.get('/driver/:driverId/score', protect, FleetSafetyController.getDriverSafetyScore);

/**
 * @route   GET /api/fleet-safety/vehicle/:vehicleId
 * @desc    حوادث مركبة محددة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetSafetyController.getVehicleIncidents);

/**
 * @route   GET /api/fleet-safety/:id
 * @desc    جلب حادثة بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, FleetSafetyController.getById);

/**
 * @route   PUT /api/fleet-safety/:id
 * @desc    تحديث حادثة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetSafetyController.update);

/**
 * @route   POST /api/fleet-safety/:id/investigate
 * @desc    بدء التحقيق
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/investigate',
  protect,
  authorize('admin', 'manager'),
  FleetSafetyController.startInvestigation
);

/**
 * @route   POST /api/fleet-safety/:id/complete-investigation
 * @desc    إكمال التحقيق
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/complete-investigation',
  protect,
  authorize('admin', 'manager'),
  FleetSafetyController.completeInvestigation
);

/**
 * @route   POST /api/fleet-safety/:id/corrective-actions
 * @desc    إضافة إجراء تصحيحي
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/corrective-actions',
  protect,
  authorize('admin', 'manager'),
  FleetSafetyController.addCorrectiveAction
);

/**
 * @route   PUT /api/fleet-safety/:id/corrective-actions/:actionId
 * @desc    تحديث إجراء تصحيحي
 * @access  Private
 */
router.put(
  '/:id/corrective-actions/:actionId',
  protect,
  FleetSafetyController.updateCorrectiveAction
);

/**
 * @route   POST /api/fleet-safety/:id/close
 * @desc    إغلاق الحادثة
 * @access  Private (Admin)
 */
router.post('/:id/close', protect, authorize('admin'), FleetSafetyController.closeIncident);

/**
 * @route   POST /api/fleet-safety/:id/insurance-claim
 * @desc    تقديم مطالبة تأمين
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/insurance-claim',
  protect,
  authorize('admin', 'manager'),
  FleetSafetyController.fileInsuranceClaim
);

/**
 * @route   POST /api/fleet-safety/:id/documents
 * @desc    إضافة مستند
 * @access  Private
 */
router.post('/:id/documents', protect, FleetSafetyController.addDocument);

module.exports = router;
