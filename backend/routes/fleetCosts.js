/**
 * Fleet Cost & Budget Routes - مسارات تكاليف وميزانية الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetCostController = require('../controllers/fleetCost.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-costs
 * @desc    إنشاء ميزانية جديدة
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), FleetCostController.createBudget);

/**
 * @route   GET /api/fleet-costs
 * @desc    جلب جميع الميزانيات
 * @access  Private
 */
router.get('/', protect, FleetCostController.getAllBudgets);

/**
 * @route   GET /api/fleet-costs/statistics
 * @desc    الإحصائيات العامة
 * @access  Private
 */
router.get('/statistics', protect, FleetCostController.getOverallStatistics);

/**
 * @route   GET /api/fleet-costs/alerts
 * @desc    تنبيهات الميزانية
 * @access  Private
 */
router.get('/alerts', protect, FleetCostController.getBudgetAlerts);

/**
 * @route   GET /api/fleet-costs/compare-vehicles
 * @desc    مقارنة تكاليف المركبات
 * @access  Private
 */
router.get('/compare-vehicles', protect, FleetCostController.compareVehicleCosts);

/**
 * @route   GET /api/fleet-costs/monthly-report
 * @desc    التقرير الشهري
 * @access  Private
 */
router.get('/monthly-report', protect, FleetCostController.getMonthlyReport);

/**
 * @route   GET /api/fleet-costs/tco/:vehicleId
 * @desc    حساب التكلفة الكلية للملكية
 * @access  Private
 */
router.get('/tco/:vehicleId', protect, FleetCostController.calculateTCO);

/**
 * @route   GET /api/fleet-costs/:id
 * @desc    جلب ميزانية بالمعرّف
 * @access  Private
 */
router.get('/:id', protect, FleetCostController.getBudgetById);

/**
 * @route   PUT /api/fleet-costs/:id
 * @desc    تحديث ميزانية
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), FleetCostController.updateBudget);

/**
 * @route   POST /api/fleet-costs/:id/entries
 * @desc    إضافة مصروف
 * @access  Private
 */
router.post('/:id/entries', protect, FleetCostController.addCostEntry);

/**
 * @route   DELETE /api/fleet-costs/:id/entries/:entryId
 * @desc    حذف مصروف
 * @access  Private (Admin, Manager)
 */
router.delete(
  '/:id/entries/:entryId',
  protect,
  authorize('admin', 'manager'),
  FleetCostController.removeCostEntry
);

/**
 * @route   POST /api/fleet-costs/:id/approve
 * @desc    اعتماد ميزانية
 * @access  Private (Admin)
 */
router.post('/:id/approve', protect, authorize('admin'), FleetCostController.approveBudget);

module.exports = router;
