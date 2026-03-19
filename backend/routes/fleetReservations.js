/**
 * Fleet Reservation Routes - مسارات حجوزات الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetReservationController = require('../controllers/fleetReservationController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-reservations
 * @desc    إنشاء حجز جديد
 * @access  Private
 */
router.post('/', protect, FleetReservationController.create);

/**
 * @route   GET /api/fleet-reservations
 * @desc    جلب جميع الحجوزات
 * @access  Private
 */
router.get('/', protect, FleetReservationController.getAll);

/**
 * @route   GET /api/fleet-reservations/statistics
 * @desc    إحصائيات الحجوزات
 * @access  Private
 */
router.get('/statistics', protect, FleetReservationController.getStatistics);

/**
 * @route   GET /api/fleet-reservations/upcoming
 * @desc    الحجوزات القادمة
 * @access  Private
 */
router.get('/upcoming', protect, FleetReservationController.getUpcoming);

/**
 * @route   GET /api/fleet-reservations/availability
 * @desc    التحقق من التوفر
 * @access  Private
 */
router.get('/availability', protect, FleetReservationController.checkAvailability);

/**
 * @route   GET /api/fleet-reservations/:id
 * @desc    جلب حجز بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetReservationController.getById);

/**
 * @route   PUT /api/fleet-reservations/:id
 * @desc    تحديث حجز
 * @access  Private
 */
router.put('/:id', protect, FleetReservationController.update);

/**
 * @route   DELETE /api/fleet-reservations/:id
 * @desc    حذف حجز
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetReservationController.delete);

/**
 * @route   POST /api/fleet-reservations/:id/approve
 * @desc    الموافقة على الحجز
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/approve',
  protect,
  authorize('admin', 'manager'),
  FleetReservationController.approve
);

/**
 * @route   POST /api/fleet-reservations/:id/reject
 * @desc    رفض الحجز
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/reject',
  protect,
  authorize('admin', 'manager'),
  FleetReservationController.reject
);

/**
 * @route   POST /api/fleet-reservations/:id/activate
 * @desc    تفعيل الحجز
 * @access  Private
 */
router.post('/:id/activate', protect, FleetReservationController.activate);

/**
 * @route   POST /api/fleet-reservations/:id/complete
 * @desc    إكمال الحجز
 * @access  Private
 */
router.post('/:id/complete', protect, FleetReservationController.complete);

/**
 * @route   POST /api/fleet-reservations/:id/cancel
 * @desc    إلغاء الحجز
 * @access  Private
 */
router.post('/:id/cancel', protect, FleetReservationController.cancel);

module.exports = router;
