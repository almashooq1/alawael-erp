/**
 * Driver Shift & Scheduling Routes - مسارات مناوبات وجدولة السائقين
 */

const express = require('express');
const router = express.Router();
const DriverShiftController = require('../controllers/driverShiftController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/driver-shifts
 * @desc    إنشاء مناوبة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), DriverShiftController.create);

/**
 * @route   GET /api/driver-shifts
 * @desc    جلب جميع المناوبات
 * @access  Private
 */
router.get('/', protect, DriverShiftController.getAll);

/**
 * @route   GET /api/driver-shifts/statistics
 * @desc    إحصائيات المناوبات
 * @access  Private
 */
router.get('/statistics', protect, DriverShiftController.getStatistics);

/**
 * @route   GET /api/driver-shifts/roster
 * @desc    جدول اليومي
 * @access  Private
 */
router.get('/roster', protect, DriverShiftController.getDailyRoster);

/**
 * @route   GET /api/driver-shifts/templates
 * @desc    جلب قوالب المناوبات
 * @access  Private
 */
router.get('/templates', protect, DriverShiftController.getTemplates);

/**
 * @route   POST /api/driver-shifts/templates
 * @desc    إنشاء قالب مناوبة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/templates',
  protect,
  authorize('admin', 'manager'),
  DriverShiftController.createTemplate
);

/**
 * @route   POST /api/driver-shifts/generate
 * @desc    توليد مناوبات من قالب
 * @access  Private (Admin, Manager)
 */
router.post(
  '/generate',
  protect,
  authorize('admin', 'manager'),
  DriverShiftController.generateFromTemplate
);

/**
 * @route   GET /api/driver-shifts/driver/:driverId/schedule
 * @desc    جدول السائق
 * @access  Private
 */
router.get('/driver/:driverId/schedule', protect, DriverShiftController.getDriverSchedule);

/**
 * @route   GET /api/driver-shifts/driver/:driverId/hos
 * @desc    فحص امتثال ساعات الخدمة
 * @access  Private
 */
router.get('/driver/:driverId/hos', protect, DriverShiftController.checkHOS);

/**
 * @route   GET /api/driver-shifts/:id
 * @desc    جلب مناوبة
 * @access  Private
 */
router.get('/:id', protect, DriverShiftController.getById);

/**
 * @route   PUT /api/driver-shifts/:id
 * @desc    تحديث مناوبة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), DriverShiftController.update);

/**
 * @route   POST /api/driver-shifts/:id/clock-in
 * @desc    تسجيل حضور
 * @access  Private
 */
router.post('/:id/clock-in', protect, DriverShiftController.clockIn);

/**
 * @route   POST /api/driver-shifts/:id/clock-out
 * @desc    تسجيل انصراف
 * @access  Private
 */
router.post('/:id/clock-out', protect, DriverShiftController.clockOut);

/**
 * @route   POST /api/driver-shifts/:id/confirm
 * @desc    تأكيد مناوبة
 * @access  Private
 */
router.post('/:id/confirm', protect, DriverShiftController.confirm);

/**
 * @route   POST /api/driver-shifts/:id/cancel
 * @desc    إلغاء مناوبة
 * @access  Private (Admin, Manager)
 */
router.post('/:id/cancel', protect, authorize('admin', 'manager'), DriverShiftController.cancel);

/**
 * @route   POST /api/driver-shifts/:id/no-show
 * @desc    تسجيل عدم حضور
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/no-show',
  protect,
  authorize('admin', 'manager'),
  DriverShiftController.markNoShow
);

/**
 * @route   POST /api/driver-shifts/:id/swap
 * @desc    طلب تبديل مناوبة
 * @access  Private
 */
router.post('/:id/swap', protect, DriverShiftController.requestSwap);

/**
 * @route   POST /api/driver-shifts/:id/swap/approve
 * @desc    الموافقة على تبديل
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/swap/approve',
  protect,
  authorize('admin', 'manager'),
  DriverShiftController.approveSwap
);

module.exports = router;
