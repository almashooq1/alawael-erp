/**
 * Fleet Disposal Routes - مسارات التخلص من المركبات
 */

const express = require('express');
const router = express.Router();
const FleetDisposalController = require('../controllers/fleetDisposalController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-disposals
 * @desc    بدء عملية تخلص جديدة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetDisposalController.create);

/**
 * @route   GET /api/fleet-disposals
 * @desc    جلب جميع سجلات التخلص
 * @access  Private
 */
router.get('/', protect, FleetDisposalController.getAll);

/**
 * @route   GET /api/fleet-disposals/statistics
 * @desc    إحصائيات التخلص
 * @access  Private
 */
router.get('/statistics', protect, FleetDisposalController.getStatistics);

/**
 * @route   GET /api/fleet-disposals/vehicle/:vehicleId
 * @desc    سجلات تخلص المركبة
 * @access  Private
 */
router.get('/vehicle/:vehicleId', protect, FleetDisposalController.getByVehicle);

/**
 * @route   GET /api/fleet-disposals/:id
 * @desc    جلب سجل تخلص بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetDisposalController.getById);

/**
 * @route   PUT /api/fleet-disposals/:id
 * @desc    تحديث سجل تخلص
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetDisposalController.update);

/**
 * @route   DELETE /api/fleet-disposals/:id
 * @desc    حذف سجل تخلص
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), FleetDisposalController.delete);

/**
 * @route   POST /api/fleet-disposals/:id/approve
 * @desc    الموافقة على التخلص
 * @access  Private (Admin)
 */
router.post('/:id/approve', protect, authorize('admin'), FleetDisposalController.approve);

/**
 * @route   POST /api/fleet-disposals/:id/reject
 * @desc    رفض التخلص
 * @access  Private (Admin)
 */
router.post('/:id/reject', protect, authorize('admin'), FleetDisposalController.reject);

/**
 * @route   POST /api/fleet-disposals/:id/auction
 * @desc    إدراج للمزاد
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/auction',
  protect,
  authorize('admin', 'manager'),
  FleetDisposalController.listForAuction
);

/**
 * @route   POST /api/fleet-disposals/:id/bid
 * @desc    إضافة عرض مزاد
 * @access  Private
 */
router.post('/:id/bid', protect, FleetDisposalController.addBid);

/**
 * @route   POST /api/fleet-disposals/:id/award
 * @desc    ترسية المزاد
 * @access  Private (Admin, Manager)
 */
router.post('/:id/award', protect, authorize('admin', 'manager'), FleetDisposalController.awardBid);

/**
 * @route   POST /api/fleet-disposals/:id/sale
 * @desc    تسجيل البيع
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/sale',
  protect,
  authorize('admin', 'manager'),
  FleetDisposalController.recordSale
);

/**
 * @route   POST /api/fleet-disposals/:id/complete
 * @desc    إكمال عملية التخلص
 * @access  Private (Admin)
 */
router.post('/:id/complete', protect, authorize('admin'), FleetDisposalController.complete);

module.exports = router;
