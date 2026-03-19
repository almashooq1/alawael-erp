/**
 * Fleet Inspection Routes - مسارات فحص المركبات
 */

const express = require('express');
const router = express.Router();
const FleetInspectionController = require('../controllers/fleetInspectionController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-inspections
 * @desc    إنشاء فحص جديد
 * @access  Private
 */
router.post('/', protect, FleetInspectionController.create);

/**
 * @route   GET /api/fleet-inspections
 * @desc    جلب جميع الفحوصات
 * @access  Private
 */
router.get('/', protect, FleetInspectionController.getAll);

/**
 * @route   GET /api/fleet-inspections/statistics
 * @desc    إحصائيات الفحوصات
 * @access  Private
 */
router.get('/statistics', protect, FleetInspectionController.getStatistics);

/**
 * @route   GET /api/fleet-inspections/templates
 * @desc    جلب قوالب الفحص
 * @access  Private
 */
router.get('/templates', protect, FleetInspectionController.getTemplates);

/**
 * @route   POST /api/fleet-inspections/templates
 * @desc    إنشاء قالب فحص
 * @access  Private (Admin, Manager)
 */
router.post(
  '/templates',
  protect,
  authorize('admin', 'manager'),
  FleetInspectionController.createTemplate
);

/**
 * @route   GET /api/fleet-inspections/templates/:id
 * @desc    جلب قالب فحص
 * @access  Private
 */
router.get('/templates/:id', protect, FleetInspectionController.getTemplateById);

/**
 * @route   PUT /api/fleet-inspections/templates/:id
 * @desc    تحديث قالب فحص
 * @access  Private (Admin, Manager)
 */
router.put(
  '/templates/:id',
  protect,
  authorize('admin', 'manager'),
  FleetInspectionController.updateTemplate
);

/**
 * @route   GET /api/fleet-inspections/vehicle/:vehicleId
 * @desc    سجل فحوصات المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetInspectionController.getVehicleHistory);

/**
 * @route   GET /api/fleet-inspections/:id
 * @desc    جلب فحص بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetInspectionController.getById);

/**
 * @route   PUT /api/fleet-inspections/:id
 * @desc    تحديث فحص
 * @access  Private
 */
router.put('/:id', protect, FleetInspectionController.update);

/**
 * @route   POST /api/fleet-inspections/:id/start
 * @desc    بدء الفحص
 * @access  Private
 */
router.post('/:id/start', protect, FleetInspectionController.startInspection);

/**
 * @route   POST /api/fleet-inspections/:id/complete
 * @desc    إكمال الفحص
 * @access  Private
 */
router.post('/:id/complete', protect, FleetInspectionController.completeInspection);

/**
 * @route   PUT /api/fleet-inspections/:id/items/:itemId
 * @desc    تحديث عنصر فحص
 * @access  Private
 */
router.put('/:id/items/:itemId', protect, FleetInspectionController.updateItem);

/**
 * @route   PUT /api/fleet-inspections/:id/defects/:defectId/resolve
 * @desc    حل خلل
 * @access  Private
 */
router.put('/:id/defects/:defectId/resolve', protect, FleetInspectionController.resolveDefect);

module.exports = router;
