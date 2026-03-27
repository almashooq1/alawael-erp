/**
 * Dashboard Routes
 * Handles all dashboard-related HTTP requests
 */

const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const _logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const controller = new DashboardController();

// Async error safety wrapper
const wrapAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/v1/dashboards
 * Create a new dashboard
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  wrapAsync(async (req, res, next) => {
    await controller.createDashboard(req, res, next);
  })
);

/**
 * GET /api/v1/dashboards
 * List user's dashboards
 */
router.get(
  '/',
  wrapAsync(async (req, res, next) => {
    await controller.listDashboards(req, res, next);
  })
);

/**
 * GET /api/v1/dashboards/:id
 * Get dashboard by ID
 */
router.get(
  '/:id',
  wrapAsync(async (req, res, next) => {
    await controller.getDashboard(req, res, next);
  })
);

/**
 * PUT /api/v1/dashboards/:id
 * Update dashboard
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  wrapAsync(async (req, res, next) => {
    await controller.updateDashboard(req, res, next);
  })
);

/**
 * DELETE /api/v1/dashboards/:id
 * Delete dashboard
 */
router.delete(
  '/:id',
  authorize('delete:dashboard'),
  wrapAsync(async (req, res, next) => {
    await controller.deleteDashboard(req, res, next);
  })
);

/**
 * POST /api/v1/dashboards/:id/widgets
 * Add widget to dashboard
 */
router.post(
  '/:id/widgets',
  authorize(['admin', 'manager']),
  wrapAsync(async (req, res, next) => {
    await controller.addWidget(req, res, next);
  })
);

/**
 * PUT /api/v1/dashboards/:dashboardId/widgets/:widgetId
 * Update widget
 */
router.put(
  '/:dashboardId/widgets/:widgetId',
  authorize(['admin', 'manager']),
  wrapAsync(async (req, res, next) => {
    await controller.updateWidget(req, res, next);
  })
);

/**
 * DELETE /api/v1/dashboards/:dashboardId/widgets/:widgetId
 * Remove widget from dashboard
 */
router.delete(
  '/:dashboardId/widgets/:widgetId',
  wrapAsync(async (req, res, next) => {
    await controller.removeWidget(req, res, next);
  })
);

/**
 * GET /api/v1/dashboards/:dashboardId/widgets/:widgetId/data
 * Get widget data
 */
router.get(
  '/:dashboardId/widgets/:widgetId/data',
  wrapAsync(async (req, res, next) => {
    await controller.getWidgetData(req, res, next);
  })
);

/**
 * POST /api/v1/dashboards/:dashboardId/widgets/:widgetId/refresh
 * Refresh widget data
 */
router.post(
  '/:dashboardId/widgets/:widgetId/refresh',
  wrapAsync(async (req, res, next) => {
    await controller.refreshWidget(req, res, next);
  })
);

/**
 * POST /api/v1/dashboards/:id/share
 * Share dashboard with users
 */
router.post(
  '/:id/share',
  authorize(['admin', 'manager']),
  wrapAsync(async (req, res, next) => {
    await controller.shareDashboard(req, res, next);
  })
);

/**
 * GET /api/v1/dashboards/:id/stats
 * Get dashboard statistics
 */
router.get(
  '/:id/stats',
  wrapAsync(async (req, res, next) => {
    await controller.getDashboardStats(req, res, next);
  })
);

module.exports = router;
