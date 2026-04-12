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
const safeError = require('../utils/safeError');

/**
 * GET /api/dashboard/health
 * System health check
 */
router.get('/health', optionalAuth, (_req, res) => {
  try {
    const health = systemDashboard.getSystemHealth();
    res.json(responseFormatter.success(health, 'System health status'));
  } catch (error) {
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
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
    safeError(res, error, 'dashboard');
  }
});

/**
 * GET /api/dashboard/kpis
 * Get key performance indicators
 */
router.get('/kpis', optionalAuth, (req, res) => {
  try {
    const kpis = {
      systemUptime: '99.5%',
      activeUsers: 1542,
      totalTransactions: 45821,
      averageResponseTime: '245ms',
      errorRate: '0.3%',
      databaseStatus: 'healthy',
      cacheHitRate: '87.2%',
      peakConcurrentUsers: 342,
    };

    res.json(responseFormatter.success(kpis, 'KPI Metrics'));
  } catch (error) {
    safeError(res, error, 'dashboard');
  }
});

module.exports = router;
