/**
 * Dashboard Widget Routes
 * مسارات لوحة معلومات الويدجت
 *
 * Mount at /api/dashboard (NOT /api/dashboard/widgets — router paths include /widgets/*).
 * W776: literal routes before /:dashboardId; executive /stats lives on dashboard.stats.js.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, _authorize } = require('../middleware/auth');

const dashboardController = require('../controllers/dashboardWidget.controller');

// ── Widget CRUD (paths under /api/dashboard/widgets/*) ─────────────────────
router.post('/widgets/create', protect, dashboardController.createWidget);
router.get('/widgets/types', protect, dashboardController.getWidgetTypes);
router.get('/widgets/:widgetId', protect, dashboardController.getWidget);
router.patch('/widgets/:widgetId', protect, dashboardController.updateWidget);
router.delete('/widgets/:widgetId', protect, dashboardController.deleteWidget);

// ── Literal dashboard routes (MUST precede /:dashboardId) ────────────────────
router.post('/create', protect, dashboardController.createDashboard);
router.get('/user/all', protect, dashboardController.getUserDashboards);
router.get('/templates', protect, dashboardController.getTemplates);
router.post('/templates/create', protect, dashboardController.createTemplate);
router.get('/themes', protect, dashboardController.getThemes);
router.get('/health', protect, dashboardController.healthCheck);
router.get('/widget-stats', protect, dashboardController.getStats);

// ── Dashboard-by-id (ObjectId segments only for bare GET /:id) ───────────────
router.get('/:dashboardId', protect, (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.dashboardId)) return next();
  return dashboardController.getDashboard(req, res, next);
});

router.get('/:dashboardId/widgets', protect, dashboardController.getDashboardWidgets);
router.post('/:dashboardId/widgets/batch', protect, dashboardController.batchSaveWidgets);
router.post('/:dashboardId/widgets/reorder', protect, dashboardController.reorderWidgets);
router.patch('/:dashboardId', protect, dashboardController.updateDashboard);
router.delete('/:dashboardId', protect, dashboardController.deleteDashboard);
router.post('/:dashboardId/theme/:themeName', protect, dashboardController.applyTheme);
router.post('/:dashboardId/snapshot', protect, dashboardController.createSnapshot);
router.post(
  '/:dashboardId/snapshot/:snapshotId/restore',
  protect,
  dashboardController.restoreSnapshot
);
router.get('/:dashboardId/export', protect, dashboardController.exportDashboard);
router.post('/:dashboardId/import', protect, dashboardController.importDashboard);

module.exports = router;
