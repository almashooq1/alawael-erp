/**
 * Dispatch & Cargo Routes - مسارات الإرسال والشحن
 */

const express = require('express');
const router = express.Router();
const DispatchController = require('../controllers/dispatch.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/dispatch
 * @desc    إنشاء أمر إرسال جديد
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), DispatchController.createOrder);

/**
 * @route   GET /api/dispatch
 * @desc    جلب جميع أوامر الإرسال
 * @access  Private
 */
router.get('/', protect, DispatchController.getAll);

/**
 * @route   GET /api/dispatch/active
 * @desc    جلب الأوامر النشطة
 * @access  Private
 */
router.get('/active', protect, DispatchController.getActive);

/**
 * @route   GET /api/dispatch/statistics
 * @desc    إحصائيات الإرسال
 * @access  Private
 */
router.get('/statistics', protect, DispatchController.getStatistics);

/**
 * @route   GET /api/dispatch/driver/:driverId
 * @desc    جلب أوامر سائق محدد
 * @access  Private
 */
router.get('/driver/:driverId', protect, DispatchController.getDriverOrders);

/**
 * @route   GET /api/dispatch/:id
 * @desc    جلب أمر إرسال بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, DispatchController.getById);

/**
 * @route   PUT /api/dispatch/:id
 * @desc    تحديث أمر إرسال
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), DispatchController.update);

/**
 * @route   POST /api/dispatch/:id/assign
 * @desc    تعيين مركبة وسائق
 * @access  Private (Admin, Manager)
 */
router.post('/:id/assign', protect, authorize('admin', 'manager'), DispatchController.assign);

/**
 * @route   POST /api/dispatch/:id/start
 * @desc    بدء الإرسال
 * @access  Private
 */
router.post('/:id/start', protect, DispatchController.startDispatch);

/**
 * @route   PUT /api/dispatch/:id/stops/:stopIndex
 * @desc    تحديث حالة نقطة توقف
 * @access  Private
 */
router.put('/:id/stops/:stopIndex', protect, DispatchController.updateStop);

/**
 * @route   POST /api/dispatch/:id/cancel
 * @desc    إلغاء أمر إرسال
 * @access  Private (Admin, Manager)
 */
router.post('/:id/cancel', protect, authorize('admin', 'manager'), DispatchController.cancel);

/**
 * @route   POST /api/dispatch/:id/rate
 * @desc    تقييم أمر إرسال
 * @access  Private
 */
router.post('/:id/rate', protect, DispatchController.rate);

/**
 * @route   POST /api/dispatch/:id/optimize-route
 * @desc    تحسين المسار
 * @access  Private
 */
router.post('/:id/optimize-route', protect, DispatchController.optimizeRoute);

module.exports = router;
