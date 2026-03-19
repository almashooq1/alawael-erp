/**
 * Trip Routes - مسارات API للرحلات
 */

const express = require('express');
const router = express.Router();
const TripController = require('../controllers/trip.controller');
const { protect, authorize } = require('../middleware/auth');

// ========== مسارات عامة ==========

/**
 * @route   POST /api/trips
 * @desc    إنشاء رحلة جديدة
 * @access  Private (Admin, Manager, Driver)
 */
router.post('/', protect, authorize('admin', 'manager', 'driver'), TripController.createTrip);

/**
 * @route   GET /api/trips
 * @desc    جلب جميع الرحلات
 * @access  Private
 */
router.get('/', protect, TripController.getAllTrips);

/**
 * @route   GET /api/trips/active
 * @desc    جلب الرحلات النشطة
 * @access  Private
 */
router.get('/active', protect, TripController.getActiveTrips);

/**
 * @route   GET /api/trips/today
 * @desc    جلب رحلات اليوم
 * @access  Private
 */
router.get('/today', protect, TripController.getTodayTrips);

/**
 * @route   GET /api/trips/statistics
 * @desc    جلب إحصائيات الرحلات
 * @access  Private
 */
router.get('/statistics', protect, TripController.listTripStatistics);

/**
 * @route   GET /api/trips/:id
 * @desc    جلب رحلة بواسطة ID
 * @access  Private
 */
router.get('/:id', protect, TripController.getTripById);

/**
 * @route   PUT /api/trips/:id
 * @desc    تحديث رحلة
 * @access  Private (Admin, Manager, Driver)
 */
router.put('/:id', protect, authorize('admin', 'manager', 'driver'), TripController.updateTrip);

/**
 * @route   DELETE /api/trips/:id
 * @desc    حذف رحلة
 * @access  Private (Admin, Manager, Driver)
 */
router.delete('/:id', protect, authorize('admin', 'manager', 'driver'), TripController.deleteTrip);

/**
 * @route   POST /api/trips/:id/cancel
 * @desc    إلغاء رحلة
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/cancel',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.cancelTrip
);

/**
 * @route   PATCH /api/trips/:id/passengers
 * @desc    تحديث عدد الركاب
 * @access  Private (Driver, Manager, Admin)
 */
router.patch(
  '/:id/passengers',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.updatePassengers
);

// ========== مسارات التحكم في الرحلة ==========

/**
 * @route   POST /api/trips/:id/start
 * @desc    بدء رحلة
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/start',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.startTrip
);

/**
 * @route   POST /api/trips/:id/complete
 * @desc    إنهاء رحلة
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/complete',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.completeTrip
);

// ========== مسارات GPS ==========

/**
 * @route   POST /api/trips/:id/gps
 * @desc    تحديث موقع GPS للرحلة
 * @access  Private (Driver, Manager, Admin)
 */
router.post('/:id/gps', protect, authorize('driver', 'manager', 'admin'), TripController.updateGPS);

// ========== مسارات المحطات ==========

/**
 * @route   POST /api/trips/:id/arrive-stop
 * @desc    تسجيل الوصول لمحطة
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/arrive-stop',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.arriveAtStop
);

/**
 * @route   POST /api/trips/:id/depart-stop
 * @desc    تسجيل المغادرة من محطة
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/depart-stop',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.departFromStop
);

// ========== مسارات الحوادث ==========

/**
 * @route   POST /api/trips/:id/incident
 * @desc    إضافة حادث
 * @access  Private (Driver, Manager, Admin)
 */
router.post(
  '/:id/incident',
  protect,
  authorize('driver', 'manager', 'admin'),
  TripController.addIncident
);

// ========== مسارات التحليل والتقييم ==========

/**
 * @route   GET /api/trips/:id/driver-score
 * @desc    حساب تقييم سلوك السائق
 * @access  Private (Manager, Admin)
 */
router.get(
  '/:id/driver-score',
  protect,
  authorize('manager', 'admin'),
  TripController.calculateDriverScore
);

/**
 * @route   GET /api/trips/:id/behavior-analysis
 * @desc    تحليل سلوك السائق
 * @access  Private (Manager, Admin)
 */
router.get(
  '/:id/behavior-analysis',
  protect,
  authorize('manager', 'admin'),
  TripController.analyzeBehavior
);

/**
 * @route   POST /api/trips/:id/feedback
 * @desc    إضافة تقييم للرحلة
 * @access  Private
 */
router.post('/:id/feedback', protect, TripController.addFeedback);

// ========== مسارات الإحصائيات والتقارير ==========

/**
 * @route   GET /api/trips/:id/statistics
 * @desc    جلب إحصائيات الرحلة
 * @access  Private
 */
router.get('/:id/statistics', protect, TripController.getTripStatistics);

/**
 * @route   POST /api/trips/driver-report
 * @desc    إنشاء تقرير سلوك السائق
 * @access  Private (Manager, Admin)
 */
router.post(
  '/driver-report',
  protect,
  authorize('manager', 'admin'),
  TripController.generateDriverReport
);

module.exports = router;
