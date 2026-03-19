/**
 * Driver Leave Routes - مسارات إجازات السائقين
 */

const express = require('express');
const router = express.Router();
const DriverLeaveController = require('../controllers/driverLeaveController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/driver-leaves
 * @desc    إنشاء طلب إجازة
 * @access  Private
 */
router.post('/', protect, DriverLeaveController.create);

/**
 * @route   GET /api/driver-leaves
 * @desc    جلب جميع الإجازات
 * @access  Private
 */
router.get('/', protect, DriverLeaveController.getAll);

/**
 * @route   GET /api/driver-leaves/statistics
 * @desc    إحصائيات الإجازات
 * @access  Private
 */
router.get('/statistics', protect, DriverLeaveController.getStatistics);

/**
 * @route   GET /api/driver-leaves/active
 * @desc    الإجازات النشطة حالياً
 * @access  Private
 */
router.get('/active', protect, DriverLeaveController.getActiveLeaves);

/**
 * @route   GET /api/driver-leaves/upcoming
 * @desc    الإجازات القادمة
 * @access  Private
 */
router.get('/upcoming', protect, DriverLeaveController.getUpcoming);

/**
 * @route   GET /api/driver-leaves/pending
 * @desc    طلبات الموافقة المعلقة
 * @access  Private (Admin, Manager)
 */
router.get(
  '/pending',
  protect,
  authorize('admin', 'manager'),
  DriverLeaveController.getPendingApprovals
);

/**
 * @route   GET /api/driver-leaves/balance/:driverId
 * @desc    رصيد إجازات السائق
 * @access  Private
 */
router.get('/balance/:driverId', protect, DriverLeaveController.getDriverBalance);

/**
 * @route   GET /api/driver-leaves/:id
 * @desc    جلب إجازة بالمعرف
 * @access  Private
 */
router.get('/:id', protect, DriverLeaveController.getById);

/**
 * @route   PUT /api/driver-leaves/:id
 * @desc    تحديث إجازة
 * @access  Private
 */
router.put('/:id', protect, DriverLeaveController.update);

/**
 * @route   DELETE /api/driver-leaves/:id
 * @desc    حذف إجازة
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), DriverLeaveController.delete);

/**
 * @route   POST /api/driver-leaves/:id/approve
 * @desc    الموافقة على الإجازة
 * @access  Private (Admin, Manager)
 */
router.post('/:id/approve', protect, authorize('admin', 'manager'), DriverLeaveController.approve);

/**
 * @route   POST /api/driver-leaves/:id/reject
 * @desc    رفض الإجازة
 * @access  Private (Admin, Manager)
 */
router.post('/:id/reject', protect, authorize('admin', 'manager'), DriverLeaveController.reject);

/**
 * @route   POST /api/driver-leaves/:id/cancel
 * @desc    إلغاء الإجازة
 * @access  Private
 */
router.post('/:id/cancel', protect, DriverLeaveController.cancel);

/**
 * @route   POST /api/driver-leaves/:id/substitute
 * @desc    تعيين سائق بديل
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/substitute',
  protect,
  authorize('admin', 'manager'),
  DriverLeaveController.assignSubstitute
);

module.exports = router;
