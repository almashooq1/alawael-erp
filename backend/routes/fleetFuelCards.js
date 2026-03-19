/**
 * Fleet Fuel Card Routes - مسارات بطاقات الوقود
 */

const express = require('express');
const router = express.Router();
const FleetFuelCardController = require('../controllers/fleetFuelCard.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-fuel-cards
 * @desc    إنشاء بطاقة وقود جديدة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetFuelCardController.create);

/**
 * @route   GET /api/fleet-fuel-cards
 * @desc    جلب جميع البطاقات
 * @access  Private
 */
router.get('/', protect, FleetFuelCardController.getAll);

/**
 * @route   GET /api/fleet-fuel-cards/statistics
 * @desc    إحصائيات بطاقات الوقود
 * @access  Private
 */
router.get('/statistics', protect, FleetFuelCardController.getStatistics);

/**
 * @route   GET /api/fleet-fuel-cards/expiring
 * @desc    البطاقات المنتهية قريبًا
 * @access  Private
 */
router.get('/expiring', protect, FleetFuelCardController.getExpiring);

/**
 * @route   GET /api/fleet-fuel-cards/fraud-alerts
 * @desc    تنبيهات الاحتيال غير المحلولة
 * @access  Private (Admin, Manager)
 */
router.get(
  '/fraud-alerts',
  protect,
  authorize('admin', 'manager'),
  FleetFuelCardController.getUnresolvedAlerts
);

/**
 * @route   GET /api/fleet-fuel-cards/consumption-report
 * @desc    تقرير الاستهلاك
 * @access  Private
 */
router.get('/consumption-report', protect, FleetFuelCardController.getConsumptionReport);

/**
 * @route   GET /api/fleet-fuel-cards/:id
 * @desc    جلب بطاقة بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, FleetFuelCardController.getById);

/**
 * @route   PUT /api/fleet-fuel-cards/:id
 * @desc    تحديث بطاقة
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetFuelCardController.update);

/**
 * @route   POST /api/fleet-fuel-cards/:id/activate
 * @desc    تفعيل بطاقة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/activate',
  protect,
  authorize('admin', 'manager'),
  FleetFuelCardController.activate
);

/**
 * @route   POST /api/fleet-fuel-cards/:id/suspend
 * @desc    تعليق بطاقة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/suspend',
  protect,
  authorize('admin', 'manager'),
  FleetFuelCardController.suspend
);

/**
 * @route   POST /api/fleet-fuel-cards/:id/assign
 * @desc    تعيين بطاقة لمركبة/سائق
 * @access  Private (Admin, Manager)
 */
router.post('/:id/assign', protect, authorize('admin', 'manager'), FleetFuelCardController.assign);

/**
 * @route   POST /api/fleet-fuel-cards/:id/transactions
 * @desc    تسجيل معاملة وقود
 * @access  Private
 */
router.post('/:id/transactions', protect, FleetFuelCardController.recordTransaction);

/**
 * @route   GET /api/fleet-fuel-cards/:id/transactions
 * @desc    جلب معاملات البطاقة
 * @access  Private
 */
router.get('/:id/transactions', protect, FleetFuelCardController.getTransactions);

/**
 * @route   PUT /api/fleet-fuel-cards/:id/fraud-alerts/:alertId/resolve
 * @desc    حل تنبيه احتيال
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/fraud-alerts/:alertId/resolve',
  protect,
  authorize('admin', 'manager'),
  FleetFuelCardController.resolveFraudAlert
);

module.exports = router;
