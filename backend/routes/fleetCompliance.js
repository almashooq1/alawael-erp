/**
 * Fleet Compliance Routes - مسارات الامتثال التنظيمي للأسطول
 */

const express = require('express');
const router = express.Router();
const FleetComplianceController = require('../controllers/fleetComplianceController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-compliance
 * @desc    إنشاء عنصر امتثال
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetComplianceController.create);

/**
 * @route   GET /api/fleet-compliance
 * @desc    جلب جميع عناصر الامتثال
 * @access  Private
 */
router.get('/', protect, FleetComplianceController.getAll);

/**
 * @route   GET /api/fleet-compliance/statistics
 * @desc    إحصائيات الامتثال
 * @access  Private
 */
router.get('/statistics', protect, FleetComplianceController.getStatistics);

/**
 * @route   GET /api/fleet-compliance/expiring
 * @desc    عناصر تنتهي قريباً
 * @access  Private
 */
router.get('/expiring', protect, FleetComplianceController.getExpiring);

/**
 * @route   GET /api/fleet-compliance/non-compliant
 * @desc    عناصر غير ممتثلة
 * @access  Private
 */
router.get('/non-compliant', protect, FleetComplianceController.getNonCompliant);

/**
 * @route   GET /api/fleet-compliance/vehicle/:vehicleId
 * @desc    امتثال المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetComplianceController.getVehicleCompliance);

/**
 * @route   GET /api/fleet-compliance/vehicle/:vehicleId/score
 * @desc    نقاط امتثال المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId/score', protect, FleetComplianceController.getScore);

/**
 * @route   GET /api/fleet-compliance/driver/:driverId
 * @desc    امتثال السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetComplianceController.getDriverCompliance);

/**
 * @route   GET /api/fleet-compliance/:id
 * @desc    جلب عنصر امتثال
 * @access  Private
 */
router.get('/:id', protect, FleetComplianceController.getById);

/**
 * @route   PUT /api/fleet-compliance/:id
 * @desc    تحديث عنصر امتثال
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetComplianceController.update);

/**
 * @route   POST /api/fleet-compliance/:id/compliant
 * @desc    تعيين كممتثل
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/compliant',
  protect,
  authorize('admin', 'manager'),
  FleetComplianceController.markCompliant
);

/**
 * @route   POST /api/fleet-compliance/:id/non-compliant
 * @desc    تعيين كغير ممتثل
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/non-compliant',
  protect,
  authorize('admin', 'manager'),
  FleetComplianceController.markNonCompliant
);

/**
 * @route   POST /api/fleet-compliance/:id/document
 * @desc    إضافة مستند
 * @access  Private
 */
router.post('/:id/document', protect, FleetComplianceController.addDocument);

module.exports = router;
