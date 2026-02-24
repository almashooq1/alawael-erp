/**
 * Executive Dashboard Routes
 * Advanced KPI monitoring, analytics, and AI insights
 * Phase: Executive Intelligence
 */

const express = require('express');
const router = express.Router();
const executiveAnalyticsService = require('../services/executiveAnalyticsService');
const aiInsightsService = require('../services/aiInsightsService');
const realtimeDashboardService = require('../services/realtimeDashboardService');
const responseFormatter = require('../services/responseFormatter');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * Initialize services on startup
 */
(async () => {
  await executiveAnalyticsService.initialize();
  await realtimeDashboardService.initialize();
})();

/**
 * GET /api/executive-dashboard
 * Get executive dashboard overview
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const dashboard = executiveAnalyticsService.getExecutiveDashboard();
    const aggregatedData = realtimeDashboardService.getAggregatedDashboardData();

    res.json(responseFormatter.success({
      executive: dashboard,
      realtime: aggregatedData,
      timestamp: new Date(),
    }, 'Executive dashboard data'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch executive dashboard', error));
  }
});

/**
 * GET /api/executive-dashboard/kpis
 * Get all KPIs
 */
router.get('/kpis', requireAuth, (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      owner: req.query.owner,
      frequency: req.query.frequency,
    };

    const kpis = executiveAnalyticsService.getAllKPIs(filters);
    
    res.json(responseFormatter.list(kpis, 'KPIs', {
      total: kpis.length,
      onTrack: kpis.filter(k => k.status === 'on_track').length,
      atRisk: kpis.filter(k => k.status === 'at_risk').length,
      critical: kpis.filter(k => k.status === 'critical').length,
    }));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch KPIs', error));
  }
});

/**
 * GET /api/executive-dashboard/kpis/:kpiId
 * Get KPI details with analytics
 */
router.get('/kpis/:kpiId', requireAuth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const kpiData = executiveAnalyticsService.getKPIDetails(kpiId);

    if (!kpiData) {
      return res.status(404).json(responseFormatter.notFound(`KPI ${kpiId}`));
    }

    res.json(responseFormatter.success(kpiData, `KPI ${kpiId} details`));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch KPI details', error));
  }
});

/**
 * POST /api/executive-dashboard/kpis
 * Create new KPI
 */
router.post('/kpis', requireAdmin, (req, res) => {
  try {
    const {
      name,
      name_ar,
      category,
      target,
      current,
      unit,
      frequency,
      owner,
      description,
    } = req.body;

    // Validation
    if (!name || !category || !target || !unit) {
      return res.status(400).json(responseFormatter.validation('Missing required KPI fields'));
    }

    const kpiId = `kpi_${Date.now()}`;
    const kpi = {
      id: kpiId,
      name,
      name_ar,
      category,
      target,
      current: current || 0,
      unit,
      frequency: frequency || 'monthly',
      owner: owner || 'Admin',
      description,
      trend: 'stable',
      changePercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [{
        timestamp: new Date(),
        value: current || 0,
        target,
      }],
      alerts: [],
      insights: [],
    };

    executiveAnalyticsService.kpis.set(kpiId, kpi);

    res.status(201).json(responseFormatter.created(
      executiveAnalyticsService.formatKPIResponse(kpi),
      'KPI created successfully'
    ));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to create KPI', error));
  }
});

/**
 * PUT /api/executive-dashboard/kpis/:kpiId
 * Update KPI value
 */
router.put('/kpis/:kpiId', requireAuth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const { value, timestamp } = req.body;

    if (!value && value !== 0) {
      return res.status(400).json(responseFormatter.validation('Value is required'));
    }

    const result = executiveAnalyticsService.updateKPIValue(
      kpiId,
      parseFloat(value),
      timestamp ? new Date(timestamp) : new Date()
    );

    if (!result.success) {
      return res.status(404).json(responseFormatter.notFound(`KPI ${kpiId}`));
    }

    res.json(responseFormatter.success(result.kpi, 'KPI updated successfully'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to update KPI', error));
  }
});

/**
 * GET /api/executive-dashboard/ai-insights
 * Get AI-powered insights for all KPIs
 */
router.get('/ai-insights', requireAuth, (req, res) => {
  try {
    const kpis = Array.from(executiveAnalyticsService.kpis.values());
    const aiSummary = aiInsightsService.generateAISummary(kpis);

    res.json(responseFormatter.success(aiSummary, 'AI insights generated'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to generate AI insights', error));
  }
});

/**
 * GET /api/executive-dashboard/ai-briefing
 * Get AI-generated executive briefing
 */
router.get('/ai-briefing', requireAuth, (req, res) => {
  try {
    const kpis = Array.from(executiveAnalyticsService.kpis.values());
    const briefing = aiInsightsService.generateExecutiveBriefing(kpis);

    res.json(responseFormatter.success(briefing, 'Executive briefing generated'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to generate briefing', error));
  }
});

/**
 * GET /api/executive-dashboard/kpis/:kpiId/insights
 * Get AI insights for specific KPI
 */
router.get('/kpis/:kpiId/insights', requireAuth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const kpi = executiveAnalyticsService.kpis.get(kpiId);

    if (!kpi) {
      return res.status(404).json(responseFormatter.notFound(`KPI ${kpiId}`));
    }

    const insights = aiInsightsService.generateInsights(kpiId, kpi, kpi.history || []);
    const trend = aiInsightsService.analyzeTrend(kpi.history || []);
    const recommendations = aiInsightsService.generateRecommendations(kpi, insights, trend);

    res.json(responseFormatter.success({
      kpi: executiveAnalyticsService.formatKPIResponse(kpi),
      insights,
      trend,
      recommendations,
      anomalies: aiInsightsService.detectAnomalies(kpi, kpi.history || []),
      forecast: aiInsightsService.predictFutureValue(kpi.history),
    }, 'AI insights for KPI'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to generate insights', error));
  }
});

/**
 * GET /api/executive-dashboard/departments
 * Get department comparison
 */
router.get('/departments', requireAuth, (req, res) => {
  try {
    const departments = executiveAnalyticsService.getDepartmentComparison();

    res.json(responseFormatter.list(departments, 'Department performance'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch department comparison', error));
  }
});

/**
 * GET /api/executive-dashboard/report
 * Generate executive report
 */
router.get('/report', requireAuth, (req, res) => {
  try {
    const { period } = req.query;
    const report = executiveAnalyticsService.generateExecutiveReport(period || 'monthly');

    res.json(responseFormatter.success(report, 'Executive report generated'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to generate report', error));
  }
});

/**
 * GET /api/executive-dashboard/realtime
 * Get real-time aggregated data
 */
router.get('/realtime', requireAuth, (req, res) => {
  try {
    const realtimeData = realtimeDashboardService.getAggregatedDashboardData();

    res.json(responseFormatter.success(realtimeData, 'Real-time dashboard data'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch real-time data', error));
  }
});

/**
 * GET /api/executive-dashboard/data-quality
 * Get data quality metrics
 */
router.get('/data-quality', requireAuth, (req, res) => {
  try {
    const metrics = realtimeDashboardService.getDataQualityMetrics();

    res.json(responseFormatter.success(metrics, 'Data quality metrics'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch data quality metrics', error));
  }
});

/**
 * GET /api/executive-dashboard/connection-stats
 * Get connection statistics
 */
router.get('/connection-stats', requireAuth, (req, res) => {
  try {
    const stats = realtimeDashboardService.getConnectionStats();

    res.json(responseFormatter.success(stats, 'Connection statistics'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch connection stats', error));
  }
});

/**
 * POST /api/executive-dashboard/refresh
 * Force refresh all data
 */
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const results = await realtimeDashboardService.refreshAllData();

    res.json(responseFormatter.success(results, 'Data refresh completed'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to refresh data', error));
  }
});

/**
 * POST /api/executive-dashboard/dashboards
 * Create custom dashboard
 */
router.post('/dashboards', requireAuth, (req, res) => {
  try {
    const { name, name_ar, description, isDefault, isPublic, refreshInterval } = req.body;

    if (!name) {
      return res.status(400).json(responseFormatter.validation('Dashboard name is required'));
    }

    const dashboard = executiveAnalyticsService.createCustomDashboard({
      name,
      name_ar,
      description,
      owner: req.user?.email || 'system',
      isDefault: isDefault || false,
      isPublic: isPublic || false,
      refreshInterval: refreshInterval || 300000,
    });

    res.status(201).json(responseFormatter.created(dashboard, 'Dashboard created successfully'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to create dashboard', error));
  }
});

/**
 * GET /api/executive-dashboard/dashboards/:dashboardId
 * Get custom dashboard
 */
router.get('/dashboards/:dashboardId', requireAuth, (req, res) => {
  try {
    const { dashboardId } = req.params;
    const dashboard = executiveAnalyticsService.getCustomDashboard(dashboardId);

    if (!dashboard) {
      return res.status(404).json(responseFormatter.notFound(`Dashboard ${dashboardId}`));
    }

    res.json(responseFormatter.success(dashboard, 'Dashboard data'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to fetch dashboard', error));
  }
});

/**
 * POST /api/executive-dashboard/dashboards/:dashboardId/widgets
 * Add widget to dashboard
 */
router.post('/dashboards/:dashboardId/widgets', requireAuth, (req, res) => {
  try {
    const { dashboardId } = req.params;
    const widget = req.body;

    const result = executiveAnalyticsService.addWidgetToDashboard(dashboardId, widget);

    if (!result.success) {
      return res.status(404).json(responseFormatter.notFound(`Dashboard ${dashboardId}`));
    }

    res.status(201).json(responseFormatter.created(result.widget, 'Widget added successfully'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Failed to add widget', error));
  }
});

module.exports = router;
