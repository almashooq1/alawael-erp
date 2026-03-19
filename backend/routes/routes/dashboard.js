/**
 * Dashboard Routes
 * System monitoring, health checks, and metrics
 * Phase 11: System Integration
 */

const express = require('express');
const router = express.Router();
const systemDashboard = require('../services/systemDashboard');
const responseFormatter = require('../services/responseFormatter');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/dashboard/health
 * System health check
 */
router.get('/health', optionalAuth, (_req, res) => {
  try {
    const health = systemDashboard.getSystemHealth();
    res.json(responseFormatter.success(health, 'System health status'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Health check failed', error));
  }
});

/**
 * GET /api/dashboard/summary
 * Dashboard summary
 */
router.get('/summary', optionalAuth, (_req, res) => {
  try {
    const summary = systemDashboard.getDashboardSummary();
    res.json(responseFormatter.success(summary, 'Dashboard summary'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Summary retrieval failed', error));
  }
});

/**
 * GET /api/dashboard/services
 * List all services status
 */
router.get('/services', optionalAuth, (_req, res) => {
  try {
    const health = systemDashboard.getSystemHealth();
    res.json(responseFormatter.list(health.services, 'Services status'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Services retrieval failed', error));
  }
});

/**
 * GET /api/dashboard/services/:name
 * Get specific service status
 */
router.get('/services/:name', optionalAuth, (req, res) => {
  try {
    const { name } = req.params;
    const status = systemDashboard.checkServiceStatus(name);

    if (status.status === 'unknown') {
      return res.status(404).json(responseFormatter.notFound(`Service ${name}`));
    }

    res.json(responseFormatter.success(status, `Service ${name} status`));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Service check failed', error));
  }
});

/**
 * GET /api/dashboard/integrations
 * List all integrations status
 */
router.get('/integrations', optionalAuth, (req, res) => {
  try {
    const health = systemDashboard.getSystemHealth();
    res.json(responseFormatter.success(health.integrations, 'Integrations status'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Integrations retrieval failed', error));
  }
});

/**
 * GET /api/dashboard/performance
 * Performance metrics
 */
router.get('/performance', optionalAuth, (req, res) => {
  try {
    const health = systemDashboard.getSystemHealth();
    res.json(responseFormatter.analytics(health.performance, 'current', 'Performance metrics'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Performance metrics failed', error));
  }
});

/**
 * GET /api/dashboard/alerts
 * System alerts
 */
router.get('/alerts', requireAdmin, (req, res) => {
  try {
    const summary = systemDashboard.getDashboardSummary();
    res.json(responseFormatter.list(summary.recentAlerts, 'Recent alerts'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Alerts retrieval failed', error));
  }
});

/**
 * GET /api/dashboard/events
 * System events log
 */
router.get('/events', requireAdmin, (req, res) => {
  try {
    const summary = systemDashboard.getDashboardSummary();
    res.json(responseFormatter.list(summary.recentEvents, 'Recent events'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Events retrieval failed', error));
  }
});

/**
 * POST /api/dashboard/alert
 * Add custom alert
 */
router.post('/alert', requireAdmin, (req, res) => {
  try {
    const { severity, message, details } = req.body;

    if (!severity || !message) {
      return res
        .status(400)
        .json(responseFormatter.validationError(['severity and message are required']));
    }

    const alert = systemDashboard.addAlert(severity, message, details);
    res.status(201).json(responseFormatter.created(alert, 'Alert created'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Alert creation failed', error));
  }
});

/**
 * GET /api/dashboard/export
 * Export all metrics
 */
router.get('/export', requireAdmin, (req, res) => {
  try {
    const metrics = systemDashboard.exportMetrics();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=metrics.json');
    res.json(metrics);
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Export failed', error));
  }
});

/**
 * GET /api/dashboard/config
 * Get system configuration (admin only)
 */
router.get('/config', requireAdmin, (req, res) => {
  try {
    const config = require('../config/production').getConfig();
    const sanitized = {
      server: config.server,
      features: config.features,
      deployment: config.deployment,
      version: config.deployment.version,
    };
    res.json(responseFormatter.success(sanitized, 'System configuration'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Config retrieval failed', error));
  }
});

module.exports = router;
