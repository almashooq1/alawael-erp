/**
 * Fleet Document Routes - مسارات مستندات الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetDocumentController = require('../controllers/fleetDocumentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-documents
 * @desc    إنشاء مستند جديد
 * @access  Private
 */
router.post('/', protect, FleetDocumentController.create);

/**
 * @route   GET /api/fleet-documents
 * @desc    جلب جميع المستندات
 * @access  Private
 */
router.get('/', protect, FleetDocumentController.getAll);

/**
 * @route   GET /api/fleet-documents/statistics
 * @desc    إحصائيات المستندات
 * @access  Private
 */
router.get('/statistics', protect, FleetDocumentController.getStatistics);

/**
 * @route   GET /api/fleet-documents/expiring
 * @desc    المستندات القريبة من الانتهاء
 * @access  Private
 */
router.get('/expiring', protect, FleetDocumentController.getExpiring);

/**
 * @route   GET /api/fleet-documents/expired
 * @desc    المستندات المنتهية
 * @access  Private
 */
router.get('/expired', protect, FleetDocumentController.getExpired);

/**
 * @route   GET /api/fleet-documents/vehicle/:vehicleId
 * @desc    مستندات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetDocumentController.getByVehicle);

/**
 * @route   GET /api/fleet-documents/driver/:driverId
 * @desc    مستندات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, FleetDocumentController.getByDriver);

/**
 * @route   GET /api/fleet-documents/:id
 * @desc    جلب مستند بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetDocumentController.getById);

/**
 * @route   PUT /api/fleet-documents/:id
 * @desc    تحديث مستند
 * @access  Private
 */
router.put('/:id', protect, FleetDocumentController.update);

/**
 * @route   DELETE /api/fleet-documents/:id
 * @desc    حذف مستند
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetDocumentController.delete);

/**
 * @route   POST /api/fleet-documents/:id/verify
 * @desc    التحقق من المستند
 * @access  Private (Admin, Manager)
 */
router.post('/:id/verify', protect, authorize('admin', 'manager'), FleetDocumentController.verify);

/**
 * @route   POST /api/fleet-documents/:id/renew
 * @desc    تجديد المستند
 * @access  Private
 */
router.post('/:id/renew', protect, FleetDocumentController.renew);

module.exports = router;
