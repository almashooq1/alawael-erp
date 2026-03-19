/**
 * Fleet Parts Routes - مسارات قطع غيار الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetPartController = require('../controllers/fleetPartController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-parts
 * @desc    إضافة قطعة جديدة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetPartController.create);

/**
 * @route   GET /api/fleet-parts
 * @desc    جلب جميع القطع
 * @access  Private
 */
router.get('/', protect, FleetPartController.getAll);

/**
 * @route   GET /api/fleet-parts/statistics
 * @desc    إحصائيات المخزون
 * @access  Private
 */
router.get('/statistics', protect, FleetPartController.getStatistics);

/**
 * @route   GET /api/fleet-parts/low-stock
 * @desc    القطع منخفضة المخزون
 * @access  Private
 */
router.get('/low-stock', protect, FleetPartController.getLowStock);

/**
 * @route   GET /api/fleet-parts/out-of-stock
 * @desc    القطع المنتهية من المخزون
 * @access  Private
 */
router.get('/out-of-stock', protect, FleetPartController.getOutOfStock);

/**
 * @route   GET /api/fleet-parts/compatible
 * @desc    القطع المتوافقة مع المركبة
 * @access  Private
 */
router.get('/compatible', protect, FleetPartController.getCompatible);

/**
 * @route   GET /api/fleet-parts/category/:category
 * @desc    القطع حسب الفئة
 * @access  Private
 */
router.get('/category/:category', protect, FleetPartController.getByCategory);

/**
 * @route   GET /api/fleet-parts/:id
 * @desc    جلب قطعة بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetPartController.getById);

/**
 * @route   PUT /api/fleet-parts/:id
 * @desc    تحديث قطعة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetPartController.update);

/**
 * @route   DELETE /api/fleet-parts/:id
 * @desc    حذف قطعة
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), FleetPartController.delete);

/**
 * @route   POST /api/fleet-parts/:id/adjust-stock
 * @desc    تعديل المخزون
 * @access  Private
 */
router.post('/:id/adjust-stock', protect, FleetPartController.adjustStock);

module.exports = router;
