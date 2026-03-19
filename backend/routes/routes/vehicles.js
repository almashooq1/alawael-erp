/**
 * Vehicle Routes - مسارات API للمركبات
 */

const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/vehicle.controller');
const { protect, authorize } = require('../middleware/auth');

// ========== مسارات عامة ==========

/**
 * @route   POST /api/vehicles
 * @desc    إنشاء مركبة جديدة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), VehicleController.createVehicle);

/**
 * @route   GET /api/vehicles
 * @desc    جلب جميع المركبات
 * @access  Private
 */
router.get('/', protect, VehicleController.getAllVehicles);

/**
 * @route   GET /api/vehicles/statistics
 * @desc    جلب إحصائيات المركبات
 * @access  Private
 */
router.get('/statistics', protect, VehicleController.listVehicleStatistics);

/**
 * @route   GET /api/vehicles/low-fuel
 * @desc    جلب المركبات منخفضة الوقود
 * @access  Private
 */
router.get('/low-fuel', protect, VehicleController.getLowFuelVehicles);

/**
 * @route   GET /api/vehicles/nearby
 * @desc    البحث عن مركبات قريبة
 * @access  Private
 */
router.get('/nearby', protect, VehicleController.findNearbyVehicles);

/**
 * @route   GET /api/vehicles/available
 * @desc    البحث عن مركبات متاحة
 * @access  Private
 */
router.get('/available', protect, VehicleController.findAvailableVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    جلب مركبة بواسطة ID
 * @access  Private
 */
router.get('/:id', protect, VehicleController.getVehicleById);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    تحديث مركبة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), VehicleController.updateVehicle);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    حذف مركبة
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), VehicleController.deleteVehicle);

// ========== مسارات GPS ==========

/**
 * @route   PATCH /api/vehicles/:id/gps
 * @desc    تحديث موقع GPS للمركبة
 * @access  Private (Driver, Manager, Admin)
 */
router.patch('/:id/gps', protect, authorize('driver', 'manager', 'admin'), VehicleController.updateGPS);

// ========== مسارات الصيانة ==========

/**
 * @route   POST /api/vehicles/:id/maintenance
 * @desc    إضافة سجل صيانة
 * @access  Private (Manager, Admin)
 */
router.post('/:id/maintenance', protect, authorize('manager', 'admin'), VehicleController.addMaintenanceRecord);

// ========== مسارات الطوارئ ==========

/**
 * @route   POST /api/vehicles/:id/emergency
 * @desc    إضافة إنذار طوارئ
 * @access  Private (Driver, Manager, Admin)
 */
router.post('/:id/emergency', protect, authorize('driver', 'manager', 'admin'), VehicleController.addEmergencyAlert);

// ========== مسارات الوقود ==========

/**
 * @route   POST /api/vehicles/:id/fuel
 * @desc    تحديث استهلاك الوقود
 * @access  Private (Driver, Manager, Admin)
 */
router.post('/:id/fuel', protect, authorize('driver', 'manager', 'admin'), VehicleController.updateFuel);

// ========== مسارات الإحصائيات ==========

/**
 * @route   GET /api/vehicles/:id/statistics
 * @desc    جلب إحصائيات المركبة
 * @access  Private
 */
router.get('/:id/statistics', protect, VehicleController.getVehicleStatistics);

// ========== مسارات التعيين ==========

/**
 * @route   POST /api/vehicles/:id/assign-driver
 * @desc    تعيين سائق للمركبة
 * @access  Private (Manager, Admin)
 */
router.post('/:id/assign-driver', protect, authorize('manager', 'admin'), VehicleController.assignDriver);

module.exports = router;
