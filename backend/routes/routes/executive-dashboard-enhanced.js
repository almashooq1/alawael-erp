/**
 * Enhanced Executive Dashboard Routes
 * Integrates search, alerts, and performance monitoring
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const executiveAnalyticsService = require('../services/executiveAnalyticsService');
const aiInsightsService = require('../services/aiInsightsService');
const kpiAlertService = require('../services/kpiAlertService');
const dashboardSearchService = require('../services/dashboardSearchService');
const dashboardPerformanceService = require('../services/dashboardPerformanceService');
const dashboardExportService = require('../services/dashboardExportService');
const logger = require('../utils/logger');

// ============================================================================
// KPI Management Routes
// ============================================================================

/**
 * GET /api/executive-dashboard
 * Get executive dashboard overview with cache
 */
router.get('/', auth, (req, res) => {
  try {
    const startTime = Date.now();

    // Check cache first
    let dashboard = dashboardPerformanceService.getCachedQuery('dashboard_overview');
    if (!dashboard) {
      dashboard = executiveAnalyticsService.getExecutiveDashboard();
      dashboardPerformanceService.cacheQuery('dashboard_overview', dashboard, 600000);
    }

    const duration = Date.now() - startTime;
    dashboardPerformanceService.recordMetric('GET_dashboard_overview', duration);

    res.json({
      ...dashboard,
      cached: Boolean(dashboard),
      responseTime: duration,
    });
  } catch (error) {
    logger.error('Error getting dashboard overview:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

/**
 * GET /api/executive-dashboard/kpis
 * Get all KPIs with optional filters
 */
router.get('/kpis', auth, (req, res) => {
  try {
    const startTime = Date.now();
    const { category, owner, frequency, status } = req.query;

    let kpis = executiveAnalyticsService.getAllKPIs();

    // Apply filters
    if (category) {
      kpis = kpis.filter(k => k.category === category);
    }
    if (owner) {
      kpis = kpis.filter(k => k.owner === owner);
    }
    if (frequency) {
      kpis = kpis.filter(k => k.frequency === frequency);
    }
    if (status) {
      kpis = kpis.filter(k => k.status === status);
    }

    const duration = Date.now() - startTime;
    dashboardPerformanceService.recordMetric('GET_all_kpis', duration);

    res.json(kpis);
  } catch (error) {
    logger.error('Error getting KPIs:', error);
    res.status(500).json({ error: 'Failed to get KPIs' });
  }
});

/**
 * POST /api/executive-dashboard/kpis
 * Create new KPI
 */
router.post('/kpis', auth, (req, res) => {
  try {
    const { name, name_ar, category, target, unit, owner, frequency } = req.body;

    if (!name || !target) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const kpi = executiveAnalyticsService.createKPI({
      name,
      name_ar,
      category: category || 'General',
      target,
      current: 0,
      unit: unit || '%',
      owner: owner || 'Admin',
      frequency: frequency || 'Daily',
    });

    // Invalidate cache
    dashboardPerformanceService.invalidateRelated('kpi');

    res.status(201).json(kpi);
  } catch (error) {
    logger.error('Error creating KPI:', error);
    res.status(500).json({ error: 'Failed to create KPI' });
  }
});

/**
 * GET /api/executive-dashboard/kpis/:kpiId
 * Get detailed KPI information with analytics
 */
router.get('/kpis/:kpiId', auth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const startTime = Date.now();

    // Check cache
    let details = dashboardPerformanceService.get(`kpi_${kpiId}_details`);
    if (!details) {
      details = executiveAnalyticsService.getKPIDetails(kpiId);
      dashboardPerformanceService.set(`kpi_${kpiId}_details`, details, 300000);
    }

    const duration = Date.now() - startTime;
    dashboardPerformanceService.recordMetric('GET_kpi_details', duration);

    if (!details) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json(details);
  } catch (error) {
    logger.error('Error getting KPI details:', error);
    res.status(500).json({ error: 'Failed to get KPI details' });
  }
});

/**
 * POST /api/executive-dashboard/kpis/:kpiId/update
 * Update KPI value and trigger alerts
 */
router.post('/kpis/:kpiId/update', auth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const kpi = executiveAnalyticsService.getKPIDetails(kpiId);
    if (!kpi) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    // Update KPI
    const updated = executiveAnalyticsService.updateKPIValue(kpiId, value);

    // Check for triggered alerts
    const alerts = kpiAlertService.evaluateKPI(kpiId, value, kpi.target);

    // Invalidate caches
    dashboardPerformanceService.invalidateRelated(kpiId);

    res.json({
      ...updated,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    logger.error('Error updating KPI:', error);
    res.status(500).json({ error: 'Failed to update KPI' });
  }
});

// ============================================================================
// AI Insights Routes
// ============================================================================

/**
 * GET /api/executive-dashboard/ai-insights
 * Get AI-generated insights
 */
router.get('/ai-insights', auth, (req, res) => {
  try {
    const startTime = Date.now();

    let insights = dashboardPerformanceService.getCachedQuery('ai_insights');
    if (!insights) {
      const kpis = executiveAnalyticsService.getAllKPIs();
      insights = aiInsightsService.generateInsights(kpis);
      dashboardPerformanceService.cacheQuery('ai_insights', insights, 600000);
    }

    const duration = Date.now() - startTime;
    dashboardPerformanceService.recordMetric('GET_ai_insights', duration);

    res.json(insights);
  } catch (error) {
    logger.error('Error getting AI insights:', error);
    res.status(500).json({ error: 'Failed to get AI insights' });
  }
});

/**
 * GET /api/executive-dashboard/ai-briefing
 * Get executive AI-powered briefing
 */
router.get('/ai-briefing', auth, (req, res) => {
  try {
    const kpis = executiveAnalyticsService.getAllKPIs();
    const insights = aiInsightsService.generateInsights(kpis);
    const alerts = kpiAlertService.getActiveAlerts();

    const briefing = {
      summary: `Executive Briefing - ${new Date().toLocaleDateString()}`,
      totalKPIs: kpis.length,
      healthyKPIs: kpis.filter(k => k.status === 'on-track').length,
      atRiskKPIs: kpis.filter(k => k.status === 'at-risk').length,
      criticalKPIs: kpis.filter(k => k.status === 'critical').length,
      insights: insights.slice(0, 10),
      alerts: alerts.slice(0, 10),
      recommendations: aiInsightsService.generateRecommendations(kpis),
      timestamp: new Date(),
    };

    res.json(briefing);
  } catch (error) {
    logger.error('Error getting AI briefing:', error);
    res.status(500).json({ error: 'Failed to get AI briefing' });
  }
});

// ============================================================================
// Search Routes
// ============================================================================

/**
 * GET /api/executive-dashboard/search
 * Search KPIs with full-text search
 */
router.get('/search', auth, (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const kpis = executiveAnalyticsService.getAllKPIs();
    dashboardSearchService.buildIndex(kpis);

    const results = dashboardSearchService.search(query, { limit });

    res.json(results);
  } catch (error) {
    logger.error('Error searching KPIs:', error);
    res.status(500).json({ error: 'Failed to search KPIs' });
  }
});

/**
 * GET /api/executive-dashboard/search/suggestions
 * Get search suggestions
 */
router.get('/search/suggestions', auth, (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const suggestions = dashboardSearchService.getSuggestions(query, limit);

    res.json(suggestions);
  } catch (error) {
    logger.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * POST /api/executive-dashboard/search/filter
 * Apply filters to KPIs
 */
router.post('/search/filter', auth, (req, res) => {
  try {
    const filters = req.body;

    const kpis = executiveAnalyticsService.getAllKPIs();
    const filtered = dashboardSearchService.applyFilters(kpis, filters);

    res.json(filtered);
  } catch (error) {
    logger.error('Error applying filters:', error);
    res.status(500).json({ error: 'Failed to apply filters' });
  }
});

/**
 * POST /api/executive-dashboard/search/save
 * Save search query
 */
router.post('/search/save', auth, (req, res) => {
  try {
    const { name, query, filters } = req.body;

    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }

    const savedSearch = dashboardSearchService.saveSearch(name, query, filters);

    res.status(201).json(savedSearch);
  } catch (error) {
    logger.error('Error saving search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// ============================================================================
// Alert Routes
// ============================================================================

/**
 * POST /api/executive-dashboard/kpis/:kpiId/alerts
 * Create alert rule for KPI
 */
router.post('/kpis/:kpiId/alerts', auth, (req, res) => {
  try {
    const { kpiId } = req.params;
    const rule = req.body;

    const alertRule = kpiAlertService.createAlertRule(kpiId, rule);

    res.status(201).json(alertRule);
  } catch (error) {
    logger.error('Error creating alert rule:', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

/**
 * GET /api/executive-dashboard/kpis/:kpiId/alerts
 * Get alert rules for KPI
 */
router.get('/kpis/:kpiId/alerts', auth, (req, res) => {
  try {
    const { kpiId } = req.params;

    const rules = kpiAlertService.getAlertRules(kpiId);

    res.json(rules);
  } catch (error) {
    logger.error('Error getting alert rules:', error);
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

/**
 * GET /api/executive-dashboard/alerts
 * Get all active alerts
 */
router.get('/alerts', auth, (req, res) => {
  try {
    const { severity } = req.query;

    const alerts = kpiAlertService.getActiveAlerts(null, severity);

    res.json(alerts);
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// ============================================================================
// Export Routes
// ============================================================================

/**
 * GET /api/executive-dashboard/export/pdf
 * Export dashboard as PDF
 */
router.get('/export/pdf', auth, async (req, res) => {
  try {
    const kpis = executiveAnalyticsService.getAllKPIs();
    const dashboard = executiveAnalyticsService.getExecutiveDashboard();

    const pdf = await dashboardExportService.exportToPDF({
      dashboard,
      kpis,
    });

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    logger.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

/**
 * GET /api/executive-dashboard/export/excel
 * Export dashboard as Excel
 */
router.get('/export/excel', auth, async (req, res) => {
  try {
    const kpis = executiveAnalyticsService.getAllKPIs();
    const dashboard = executiveAnalyticsService.getExecutiveDashboard();

    const excel = await dashboardExportService.exportToExcel({
      dashboard,
      kpis,
    });

    res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excel);
  } catch (error) {
    logger.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

/**
 * GET /api/executive-dashboard/export/csv
 * Export dashboard as CSV
 */
router.get('/export/csv', auth, async (req, res) => {
  try {
    const kpis = executiveAnalyticsService.getAllKPIs();

    const csv = await dashboardExportService.exportToCSV(kpis);

    res.contentType('text/csv');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting to CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * POST /api/executive-dashboard/export/email
 * Send dashboard report via email
 */
router.post('/export/email', auth, async (req, res) => {
  try {
    const { recipients, format = 'pdf' } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients are required' });
    }

    const kpis = executiveAnalyticsService.getAllKPIs();
    const dashboard = executiveAnalyticsService.getExecutiveDashboard();

    const report = await dashboardExportService.generateEmailReport({
      dashboard,
      kpis,
      format,
      recipients,
    });

    res.json({
      status: 'success',
      message: `Report sent to ${recipients.length} recipient(s)`,
      id: report.id,
    });
  } catch (error) {
    logger.error('Error sending email report:', error);
    res.status(500).json({ error: 'Failed to send email report' });
  }
});

// ============================================================================
// Performance Routes
// ============================================================================

/**
 * GET /api/executive-dashboard/performance/health
 * Get dashboard health report
 */
router.get('/performance/health', auth, (req, res) => {
  try {
    const health = dashboardPerformanceService.getDashboardHealth();

    res.json(health);
  } catch (error) {
    logger.error('Error getting health report:', error);
    res.status(500).json({ error: 'Failed to get health report' });
  }
});

/**
 * GET /api/executive-dashboard/performance/cache
 * Get cache statistics
 */
router.get('/performance/cache', auth, (req, res) => {
  try {
    const stats = dashboardPerformanceService.getCacheStats();

    res.json(stats);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * POST /api/executive-dashboard/performance/cache/clear
 * Clear cache
 */
router.post('/performance/cache/clear', auth, (req, res) => {
  try {
    dashboardPerformanceService.clearCache();

    res.json({ status: 'success', message: 'Cache cleared' });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ============================================================================
// Department Comparison Route
// ============================================================================

/**
 * GET /api/executive-dashboard/departments
 * Get department-wise KPI comparison
 */
router.get('/departments', auth, (req, res) => {
  try {
    const comparison = executiveAnalyticsService.getDepartmentComparison();

    res.json(comparison);
  } catch (error) {
    logger.error('Error getting department comparison:', error);
    res.status(500).json({ error: 'Failed to get department comparison' });
  }
});

// ============================================================================
// Report Route
// ============================================================================

/**
 * GET /api/executive-dashboard/report
 * Generate comprehensive executive report
 */
router.get('/report', auth, (req, res) => {
  try {
    const report = executiveAnalyticsService.generateExecutiveReport();

    res.json(report);
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
