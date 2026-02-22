/**
 * ===================================================================
 * COST CENTERS ROUTES - مسارات مراكز التكلفة
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const costCentersController = require('../controllers/costCenters.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// ===================================================================
// COST CENTERS CRUD
// ===================================================================

/**
 * @route   GET /api/accounting/cost-centers
 * @desc    Get all cost centers with filters
 * @access  Private
 */
router.get('/', authenticateToken, costCentersController.getAllCostCenters);

/**
 * @route   GET /api/accounting/cost-centers/:id
 * @desc    Get single cost center
 * @access  Private
 */
router.get('/:id', authenticateToken, costCentersController.getCostCenterById);

/**
 * @route   POST /api/accounting/cost-centers
 * @desc    Create new cost center
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  costCentersController.createCostCenter
);

/**
 * @route   PUT /api/accounting/cost-centers/:id
 * @desc    Update cost center
 * @access  Private (Admin, Accountant)
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  costCentersController.updateCostCenter
);

/**
 * @route   DELETE /api/accounting/cost-centers/:id
 * @desc    Delete cost center
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  costCentersController.deleteCostCenter
);

// ===================================================================
// COST & REVENUE OPERATIONS
// ===================================================================

/**
 * @route   POST /api/accounting/cost-centers/:id/cost
 * @desc    Record cost for cost center
 * @access  Private
 */
router.post('/:id/cost', authenticateToken, costCentersController.recordCost);

/**
 * @route   POST /api/accounting/cost-centers/:id/revenue
 * @desc    Record revenue for cost center
 * @access  Private
 */
router.post('/:id/revenue', authenticateToken, costCentersController.recordRevenue);

/**
 * @route   POST /api/accounting/cost-centers/:id/allocate
 * @desc    Allocate costs to other cost centers
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/allocate',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  costCentersController.allocateCosts
);

// ===================================================================
// BUDGET OPERATIONS
// ===================================================================

/**
 * @route   PUT /api/accounting/cost-centers/:id/budget
 * @desc    Update budget for cost center
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/budget',
  authenticateToken,
  requireRole(['admin', 'manager']),
  costCentersController.updateBudget
);

/**
 * @route   GET /api/accounting/cost-centers/:id/budget-analysis
 * @desc    Get budget analysis for cost center
 * @access  Private
 */
router.get('/:id/budget-analysis', authenticateToken, costCentersController.getBudgetAnalysis);

/**
 * @route   GET /api/accounting/cost-centers/over-budget
 * @desc    Get cost centers over budget
 * @access  Private
 */
router.get('/over-budget', authenticateToken, costCentersController.getOverBudget);

// ===================================================================
// KPI OPERATIONS
// ===================================================================

/**
 * @route   PUT /api/accounting/cost-centers/:id/kpi
 * @desc    Update KPI for cost center
 * @access  Private
 */
router.put('/:id/kpi', authenticateToken, costCentersController.updateKPI);

/**
 * @route   GET /api/accounting/cost-centers/:id/kpis
 * @desc    Get all KPIs for cost center
 * @access  Private
 */
router.get('/:id/kpis', authenticateToken, costCentersController.getKPIs);

// ===================================================================
// REPORTS & ANALYTICS
// ===================================================================

/**
 * @route   GET /api/accounting/cost-centers/performance
 * @desc    Get performance report for all cost centers
 * @access  Private
 */
router.get('/performance', authenticateToken, costCentersController.getPerformanceReport);

/**
 * @route   GET /api/accounting/cost-centers/:id/profitability
 * @desc    Get profitability analysis for cost center
 * @access  Private
 */
router.get('/:id/profitability', authenticateToken, costCentersController.getProfitabilityAnalysis);

/**
 * @route   GET /api/accounting/cost-centers/stats
 * @desc    Get cost centers statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, costCentersController.getStats);

/**
 * @route   GET /api/accounting/cost-centers/by-type
 * @desc    Get cost centers grouped by type
 * @access  Private
 */
router.get('/by-type', authenticateToken, costCentersController.getByType);

module.exports = router;
