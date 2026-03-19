/**
 * Geofence Routes - مسارات السياج الجغرافي
 */

const express = require('express');
const router = express.Router();
const GeofenceController = require('../controllers/geofence.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/geofences
 * @desc    إنشاء سياج جغرافي جديد
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), GeofenceController.create);

/**
 * @route   GET /api/geofences
 * @desc    جلب جميع السياجات الجغرافية
 * @access  Private
 */
router.get('/', protect, GeofenceController.getAll);

/**
 * @route   GET /api/geofences/statistics
 * @desc    إحصائيات السياجات الجغرافية
 * @access  Private
 */
router.get('/statistics', protect, GeofenceController.getStatistics);

/**
 * @route   GET /api/geofences/nearby
 * @desc    البحث عن سياجات قريبة
 * @access  Private
 */
router.get('/nearby', protect, GeofenceController.findNearby);

/**
 * @route   GET /api/geofences/:id
 * @desc    جلب سياج بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, GeofenceController.getById);

/**
 * @route   PUT /api/geofences/:id
 * @desc    تحديث سياج جغرافي
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), GeofenceController.update);

/**
 * @route   DELETE /api/geofences/:id
 * @desc    حذف سياج جغرافي
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), GeofenceController.delete);

/**
 * @route   POST /api/geofences/:id/check-vehicle
 * @desc    فحص مركبة داخل السياج
 * @access  Private
 */
router.post('/:id/check-vehicle', protect, GeofenceController.checkVehicle);

/**
 * @route   POST /api/geofences/:id/entry
 * @desc    تسجيل دخول مركبة للسياج
 * @access  Private
 */
router.post('/:id/entry', protect, GeofenceController.recordEntry);

/**
 * @route   POST /api/geofences/:id/exit
 * @desc    تسجيل خروج مركبة من السياج
 * @access  Private
 */
router.post('/:id/exit', protect, GeofenceController.recordExit);

/**
 * @route   GET /api/geofences/:id/alerts
 * @desc    جلب تنبيهات السياج
 * @access  Private
 */
router.get('/:id/alerts', protect, GeofenceController.getAlerts);

/**
 * @route   PUT /api/geofences/:id/alerts/:alertId/acknowledge
 * @desc    تأكيد تنبيه
 * @access  Private
 */
router.put('/:id/alerts/:alertId/acknowledge', protect, GeofenceController.acknowledgeAlert);

module.exports = router;
