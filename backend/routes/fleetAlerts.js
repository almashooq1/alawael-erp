/**
 * Fleet Alert Routes - مسارات تنبيهات الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetAlertController = require('../controllers/fleetAlertController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-alerts
 * @desc    إنشاء تنبيه جديد
 * @access  Private
 */
router.post('/', protect, FleetAlertController.create);

/**
 * @route   GET /api/fleet-alerts
 * @desc    جلب جميع التنبيهات
 * @access  Private
 */
router.get('/', protect, FleetAlertController.getAll);

/**
 * @route   GET /api/fleet-alerts/statistics
 * @desc    إحصائيات التنبيهات
 * @access  Private
 */
router.get('/statistics', protect, FleetAlertController.getStatistics);

/**
 * @route   GET /api/fleet-alerts/active
 * @desc    التنبيهات النشطة
 * @access  Private
 */
router.get('/active', protect, FleetAlertController.getActive);

/**
 * @route   GET /api/fleet-alerts/critical
 * @desc    التنبيهات الحرجة
 * @access  Private
 */
router.get('/critical', protect, FleetAlertController.getCritical);

/**
 * @route   POST /api/fleet-alerts/bulk-acknowledge
 * @desc    تأكيد استلام مجمّع
 * @access  Private
 */
router.post('/bulk-acknowledge', protect, FleetAlertController.bulkAcknowledge);

/**
 * @route   GET /api/fleet-alerts/vehicle/:vehicleId
 * @desc    تنبيهات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetAlertController.getByVehicle);

/**
 * @route   GET /api/fleet-alerts/driver/:driverId
 * @desc    تنبيهات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetAlertController.getByDriver);

/**
 * @route   GET /api/fleet-alerts/:id
 * @desc    جلب تنبيه بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetAlertController.getById);

/**
 * @route   PUT /api/fleet-alerts/:id
 * @desc    تحديث تنبيه
 * @access  Private
 */
router.put('/:id', protect, FleetAlertController.update);

/**
 * @route   DELETE /api/fleet-alerts/:id
 * @desc    حذف تنبيه
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), FleetAlertController.delete);

/**
 * @route   POST /api/fleet-alerts/:id/acknowledge
 * @desc    تأكيد استلام التنبيه
 * @access  Private
 */
router.post('/:id/acknowledge', protect, FleetAlertController.acknowledge);

/**
 * @route   POST /api/fleet-alerts/:id/resolve
 * @desc    حل التنبيه
 * @access  Private
 */
router.post('/:id/resolve', protect, FleetAlertController.resolve);

/**
 * @route   POST /api/fleet-alerts/:id/dismiss
 * @desc    تجاهل التنبيه
 * @access  Private
 */
router.post('/:id/dismiss', protect, FleetAlertController.dismiss);

/**
 * @route   POST /api/fleet-alerts/:id/escalate
 * @desc    تصعيد التنبيه
 * @access  Private (Admin, Manager)
 */
router.post('/:id/escalate', protect, authorize('admin', 'manager'), FleetAlertController.escalate);

module.exports = router;
