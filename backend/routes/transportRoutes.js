/**
 * Transport Route Routes - مسارات API لمسارات النقل
 */

const express = require('express');
const router = express.Router();
const TransportRouteController = require('../controllers/transportRoute.controller');
const { protect, authorize } = require('../middleware/auth');

// ========== مسارات عامة ==========

/**
 * @route   POST /api/transport-routes
 * @desc    إنشاء مسار جديد
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), TransportRouteController.createRoute);

/**
 * @route   GET /api/transport-routes
 * @desc    جلب جميع المسارات
 * @access  Private
 */
router.get('/', protect, TransportRouteController.getAllRoutes);

/**
 * @route   GET /api/transport-routes/nearby
 * @desc    البحث عن مسارات قريبة
 * @access  Private
 */
router.get('/nearby', protect, TransportRouteController.findNearbyRoutes);

/**
 * @route   GET /api/transport-routes/available
 * @desc    البحث عن مسارات متاحة
 * @access  Private
 */
router.get('/available', protect, TransportRouteController.findAvailableRoutes);

/**
 * @route   GET /api/transport-routes/statistics
 * @desc    جلب إحصائيات جميع المسارات
 * @access  Private
 */
router.get('/statistics', protect, TransportRouteController.getAllRoutesStatistics);

/**
 * @route   GET /api/transport-routes/:id
 * @desc    جلب مسار بواسطة ID
 * @access  Private
 */
router.get('/:id', protect, TransportRouteController.getRouteById);

/**
 * @route   GET /api/transport-routes/:id/nearby
 * @desc    جلب نقاط قريبة من المسار
 * @access  Private
 */
router.get('/:id/nearby', protect, TransportRouteController.getNearbyPoints);

/**
 * @route   PUT /api/transport-routes/:id
 * @desc    تحديث مسار
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), TransportRouteController.updateRoute);

/**
 * @route   DELETE /api/transport-routes/:id
 * @desc    حذف مسار
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), TransportRouteController.deleteRoute);

/**
 * @route   PATCH /api/transport-routes/:id/status
 * @desc    تحديث حالة المسار
 * @access  Private (Manager, Admin)
 */
router.patch('/:id/status', protect, authorize('manager', 'admin'), TransportRouteController.updateRouteStatus);

// ========== مسارات التحسين ==========

/**
 * @route   POST /api/transport-routes/:id/optimize
 * @desc    تحسين المسار
 * @access  Private (Manager, Admin)
 */
router.post('/:id/optimize', protect, authorize('manager', 'admin'), TransportRouteController.optimizeRoute);

/**
 * @route   POST /api/transport-routes/:id/alternatives
 * @desc    اقتراح مسارات بديلة
 * @access  Private (Manager, Admin)
 */
router.post('/:id/alternatives', protect, authorize('manager', 'admin'), TransportRouteController.suggestAlternatives);

// ========== مسارات الركاب ==========

/**
 * @route   POST /api/transport-routes/:id/passengers
 * @desc    إضافة راكب للمسار
 * @access  Private (Manager, Admin)
 */
router.post('/:id/passengers', protect, authorize('manager', 'admin'), TransportRouteController.addPassenger);

/**
 * @route   DELETE /api/transport-routes/:id/passengers/:userId
 * @desc    إزالة راكب من المسار
 * @access  Private (Manager, Admin)
 */
router.delete('/:id/passengers/:userId', protect, authorize('manager', 'admin'), TransportRouteController.removePassenger);

// ========== مسارات الرحلات ==========

/**
 * @route   POST /api/transport-routes/:id/trip-status
 * @desc    تحديث حالة الرحلة
 * @access  Private (Driver, Manager, Admin)
 */
router.post('/:id/trip-status', protect, authorize('driver', 'manager', 'admin'), TransportRouteController.updateTripStatus);

// ========== مسارات التقييم ==========

/**
 * @route   POST /api/transport-routes/:id/rating
 * @desc    إضافة تقييم للمسار
 * @access  Private
 */
router.post('/:id/rating', protect, TransportRouteController.addRating);

// ========== مسارات الإحصائيات ==========

/**
 * @route   GET /api/transport-routes/:id/statistics
 * @desc    جلب إحصائيات المسار
 * @access  Private
 */
router.get('/:id/statistics', protect, TransportRouteController.getRouteStatistics);

// ========== مسارات التعيين ==========

/**
 * @route   POST /api/transport-routes/:id/assign-vehicle
 * @desc    تعيين مركبة للمسار
 * @access  Private (Manager, Admin)
 */
router.post('/:id/assign-vehicle', protect, authorize('manager', 'admin'), TransportRouteController.assignVehicle);

module.exports = router;
