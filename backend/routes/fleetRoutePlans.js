/**
 * Fleet Route Plan Routes - مسارات تخطيط المسارات
 */

const express = require('express');
const router = express.Router();
const FleetRoutePlanController = require('../controllers/fleetRoutePlanController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-route-plans
 * @desc    إنشاء خطة مسار جديدة
 * @access  Private
 */
router.post('/', protect, FleetRoutePlanController.create);

/**
 * @route   GET /api/fleet-route-plans
 * @desc    جلب جميع خطط المسارات
 * @access  Private
 */
router.get('/', protect, FleetRoutePlanController.getAll);

/**
 * @route   GET /api/fleet-route-plans/statistics
 * @desc    إحصائيات المسارات
 * @access  Private
 */
router.get('/statistics', protect, FleetRoutePlanController.getStatistics);

/**
 * @route   GET /api/fleet-route-plans/active
 * @desc    المسارات النشطة
 * @access  Private
 */
router.get('/active', protect, FleetRoutePlanController.getActive);

/**
 * @route   GET /api/fleet-route-plans/upcoming
 * @desc    المسارات القادمة
 * @access  Private
 */
router.get('/upcoming', protect, FleetRoutePlanController.getUpcoming);

/**
 * @route   GET /api/fleet-route-plans/:id
 * @desc    جلب خطة مسار بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetRoutePlanController.getById);

/**
 * @route   PUT /api/fleet-route-plans/:id
 * @desc    تحديث خطة مسار
 * @access  Private
 */
router.put('/:id', protect, FleetRoutePlanController.update);

/**
 * @route   DELETE /api/fleet-route-plans/:id
 * @desc    حذف خطة مسار
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetRoutePlanController.delete);

/**
 * @route   POST /api/fleet-route-plans/:id/approve
 * @desc    الموافقة على خطة المسار
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/approve',
  protect,
  authorize('admin', 'manager'),
  FleetRoutePlanController.approve
);

/**
 * @route   POST /api/fleet-route-plans/:id/start
 * @desc    بدء المسار
 * @access  Private
 */
router.post('/:id/start', protect, FleetRoutePlanController.start);

/**
 * @route   POST /api/fleet-route-plans/:id/complete
 * @desc    إكمال المسار
 * @access  Private
 */
router.post('/:id/complete', protect, FleetRoutePlanController.complete);

/**
 * @route   POST /api/fleet-route-plans/:id/waypoint/:order/complete
 * @desc    تسجيل وصول نقطة توقف
 * @access  Private
 */
router.post('/:id/waypoint/:order/complete', protect, FleetRoutePlanController.completeWaypoint);

/**
 * @route   POST /api/fleet-route-plans/:id/waypoint/:order/skip
 * @desc    تخطي نقطة توقف
 * @access  Private
 */
router.post('/:id/waypoint/:order/skip', protect, FleetRoutePlanController.skipWaypoint);

module.exports = router;
