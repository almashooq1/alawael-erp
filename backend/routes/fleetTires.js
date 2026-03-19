/**
 * Fleet Tire Management Routes - مسارات إدارة الإطارات
 */

const express = require('express');
const router = express.Router();
const FleetTireController = require('../controllers/fleetTire.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-tires
 * @desc    إنشاء سجل إطار جديد
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetTireController.create);

/**
 * @route   GET /api/fleet-tires
 * @desc    جلب جميع الإطارات
 * @access  Private
 */
router.get('/', protect, FleetTireController.getAll);

/**
 * @route   GET /api/fleet-tires/statistics
 * @desc    إحصائيات الإطارات
 * @access  Private
 */
router.get('/statistics', protect, FleetTireController.getStatistics);

/**
 * @route   GET /api/fleet-tires/needing-replacement
 * @desc    الإطارات التي تحتاج استبدال
 * @access  Private
 */
router.get('/needing-replacement', protect, FleetTireController.needingReplacement);

/**
 * @route   GET /api/fleet-tires/needing-rotation
 * @desc    الإطارات التي تحتاج تدوير
 * @access  Private
 */
router.get('/needing-rotation', protect, FleetTireController.needingRotation);

/**
 * @route   GET /api/fleet-tires/vehicle/:vehicleId
 * @desc    إطارات مركبة محددة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetTireController.getVehicleTires);

/**
 * @route   GET /api/fleet-tires/:id
 * @desc    جلب إطار بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, FleetTireController.getById);

/**
 * @route   PUT /api/fleet-tires/:id
 * @desc    تحديث إطار
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetTireController.update);

/**
 * @route   POST /api/fleet-tires/:id/install
 * @desc    تركيب إطار على مركبة
 * @access  Private
 */
router.post('/:id/install', protect, FleetTireController.install);

/**
 * @route   POST /api/fleet-tires/:id/remove
 * @desc    إزالة إطار من مركبة
 * @access  Private
 */
router.post('/:id/remove', protect, FleetTireController.remove);

/**
 * @route   POST /api/fleet-tires/rotate
 * @desc    تدوير إطارات مركبة
 * @access  Private
 */
router.post('/rotate', protect, FleetTireController.rotateTires);

/**
 * @route   POST /api/fleet-tires/:id/tread-reading
 * @desc    تسجيل قراءة عمق المداس
 * @access  Private
 */
router.post('/:id/tread-reading', protect, FleetTireController.recordTread);

/**
 * @route   POST /api/fleet-tires/:id/pressure
 * @desc    تسجيل قراءة ضغط
 * @access  Private
 */
router.post('/:id/pressure', protect, FleetTireController.recordPressure);

/**
 * @route   POST /api/fleet-tires/:id/repair
 * @desc    إضافة إصلاح
 * @access  Private
 */
router.post('/:id/repair', protect, FleetTireController.addRepair);

/**
 * @route   POST /api/fleet-tires/:id/dispose
 * @desc    التخلص من إطار
 * @access  Private (Admin, Manager)
 */
router.post('/:id/dispose', protect, authorize('admin', 'manager'), FleetTireController.dispose);

module.exports = router;
