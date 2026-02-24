/**
 * analytics.routes.js
 * AlAwael ERP - Analytics API Routes
 * Real-time KPI dashboards, trends, forecasts, and alerts
 * February 22, 2026
 */

const express = require('express');
const router = express.Router();

// ===========================
// METRICS & KPI ROUTES
// ===========================

/**
 * GET /api/v1/analytics/metrics
 * Get all system metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const metrics = analyticsService.getAllMetrics();

    res.json({
      success: true,
      count: metrics.length,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/metrics/:name
 * Get specific metric details
 */
router.get('/metrics/:name', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name } = req.params;
    const metric = analyticsService.getMetric(name);

    if (!metric) {
      return res.status(404).json({
        success: false,
        error: `Metric "${name}" not found`
      });
    }

    res.json({
      success: true,
      metric: {
        name: metric.name,
        label: metric.label,
        description: metric.description,
        value: metric.value,
        trend: metric.trend,
        status: metric.status,
        unit: metric.unit,
        trendColor: metric.getTrendColor(),
        statusColor: metric.getStatusColor(),
        lastUpdated: metric.lastUpdated,
        threshold: metric.threshold,
        historyCount: metric.history.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/analytics/metrics/:name
 * Update metric value
 */
router.put('/metrics/:name', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    const metric = analyticsService.updateMetric(name, value);

    res.json({
      success: true,
      metric: {
        name: metric.name,
        value: metric.value,
        trend: metric.trend,
        status: metric.status,
        lastUpdated: metric.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/analytics/metrics
 * Create new metric
 */
router.post('/metrics', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name, label, description, unit } = req.body;

    if (!name || !label) {
      return res.status(400).json({
        success: false,
        error: 'Name and label are required'
      });
    }

    const metric = analyticsService.createMetric(name, label, description, unit);

    res.status(201).json({
      success: true,
      metric: {
        name: metric.name,
        label: metric.label,
        unit: metric.unit,
        value: metric.value
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/analytics/metrics/:name/threshold
 * Set metric threshold
 */
router.put('/metrics/:name/threshold', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name } = req.params;
    const { warning, critical } = req.body;

    analyticsService.setMetricThreshold(name, warning, critical);
    const metric = analyticsService.getMetric(name);

    res.json({
      success: true,
      name,
      threshold: metric.threshold,
      status: metric.status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// DASHBOARD ROUTES
// ===========================

/**
 * GET /api/v1/analytics/dashboards
 * List all dashboards
 */
router.get('/dashboards', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const dashboards = analyticsService.getAllDashboards();

    res.json({
      success: true,
      count: dashboards.length,
      dashboards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/dashboards/:name
 * Get specific dashboard with all widgets
 */
router.get('/dashboards/:name', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name } = req.params;
    const dashboard = analyticsService.getDashboard(name);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: `Dashboard "${name}" not found`
      });
    }

    res.json({
      success: true,
      dashboard: {
        name: dashboard.name,
        title: dashboard.title,
        description: dashboard.description,
        widgetCount: dashboard.widgets.length,
        refreshInterval: dashboard.refreshInterval,
        createdAt: dashboard.createdAt,
        widgets: dashboard.widgets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/analytics/dashboards
 * Create custom dashboard
 */
router.post('/dashboards', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name, title, description } = req.body;

    if (!name || !title) {
      return res.status(400).json({
        success: false,
        error: 'Name and title are required'
      });
    }

    const dashboard = analyticsService.createDashboard(name, title, description);

    res.status(201).json({
      success: true,
      dashboard: {
        name: dashboard.name,
        title: dashboard.title,
        description: dashboard.description
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/analytics/dashboards/:name/widgets
 * Add widget to dashboard
 */
router.post('/dashboards/:name/widgets', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { name } = req.params;
    const widget = req.body;

    const dashboard = analyticsService.addWidgetToDashboard(name, widget);

    res.status(201).json({
      success: true,
      dashboard: {
        name: dashboard.name,
        widgetCount: dashboard.widgets.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// TREND ANALYSIS ROUTES
// ===========================

/**
 * GET /api/v1/analytics/trends/:metricName
 * Get trend analysis for metric
 */
router.get('/trends/:metricName', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { metricName } = req.params;
    const { period = '30' } = req.query;

    let trend;
    const periodNum = parseInt(period);

    if (periodNum === 30) {
      trend = analyticsService.analyze30DayTrend(metricName);
    } else if (periodNum === 60) {
      trend = analyticsService.analyze60DayTrend(metricName);
    } else if (periodNum === 90) {
      trend = analyticsService.analyze90DayTrend(metricName);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Period must be 30, 60, or 90'
      });
    }

    res.json({
      success: true,
      metric: metricName,
      period: `${periodNum}days`,
      trend
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/trends/:metric1/:metric2
 * Compare trends between two metrics
 */
router.get('/trends/:metric1/:metric2', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { metric1, metric2 } = req.params;

    const comparison = analyticsService.getComparisonTrends(metric1, metric2);

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// DATA AGGREGATION ROUTES
// ===========================

/**
 * GET /api/v1/analytics/aggregate/:metricName
 * Aggregate metric data by period
 */
router.get('/aggregate/:metricName', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { metricName } = req.params;
    const { period = 'daily' } = req.query;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Period must be daily, weekly, or monthly'
      });
    }

    const aggregated = analyticsService.aggregateMetricByPeriod(metricName, period);

    res.json({
      success: true,
      metric: metricName,
      period,
      dataPoints: aggregated.length,
      data: aggregated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// SNAPSHOT ROUTES
// ===========================

/**
 * POST /api/v1/analytics/snapshots
 * Take system snapshot
 */
router.post('/snapshots', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { label } = req.body;

    const snapshot = analyticsService.takeSnapshot(label);

    res.status(201).json({
      success: true,
      snapshot: {
        id: snapshot.id,
        label: snapshot.label,
        timestamp: snapshot.timestamp,
        metricCount: Object.keys(snapshot.metrics).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/snapshots
 * Get snapshot history
 */
router.get('/snapshots', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { limit = 10 } = req.query;

    const snapshots = analyticsService.getSnapshotHistory(parseInt(limit));

    res.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map(s => ({
        id: s.id,
        label: s.label,
        timestamp: s.timestamp,
        metricCount: Object.keys(s.metrics).length
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/snapshots/:id
 * Get specific snapshot
 */
router.get('/snapshots/:id', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { id } = req.params;

    const snapshot = analyticsService.getSnapshot(id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: `Snapshot "${id}" not found`
      });
    }

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/analytics/snapshots/compare
 * Compare two snapshots
 */
router.post('/snapshots/compare', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { snapshot1Id, snapshot2Id } = req.body;

    if (!snapshot1Id || !snapshot2Id) {
      return res.status(400).json({
        success: false,
        error: 'Both snapshot IDs are required'
      });
    }

    const comparison = analyticsService.compareSnapshots(snapshot1Id, snapshot2Id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        error: 'One or both snapshots not found'
      });
    }

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// ALERTS ROUTES
// ===========================

/**
 * POST /api/v1/analytics/alerts
 * Create alert
 */
router.post('/alerts', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { metricName, condition, threshold, severity } = req.body;

    if (!metricName || !condition || threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: 'metricName, condition, and threshold are required'
      });
    }

    const alert = analyticsService.createAlert(
      metricName,
      condition,
      threshold,
      severity
    );

    res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/alerts
 * Get all alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const alerts = analyticsService.getAlertHistory();

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/alerts/active
 * Get triggered alerts
 */
router.get('/alerts/active', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const triggered = analyticsService.evaluateAlerts();

    res.json({
      success: true,
      count: triggered.length,
      alerts: triggered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// SYSTEM STATISTICS ROUTES
// ===========================

/**
 * GET /api/v1/analytics/stats
 * Get system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const stats = analyticsService.getSystemStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/health
 * Get system health report
 */
router.get('/health', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const healthReport = analyticsService.getHealthReport();

    res.json({
      success: true,
      health: healthReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/export
 * Export analytics data
 */
router.get('/export', (req, res) => {
  try {
    const analyticsService = req.app.locals.analyticsService;
    const { format = 'json' } = req.query;

    const data = analyticsService.exportData(format);

    if (format === 'json') {
      res.set('Content-Type', 'application/json');
      res.set('Content-Disposition', 'attachment; filename="analytics_export.json"');
      res.send(data);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
