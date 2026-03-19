/* eslint-disable no-unused-vars */
/**
 * Metrics Controller
 * Handles HTTP requests for metrics and KPI operations
 * Maps requests to MetricsService methods
 */

const MetricsService = require('../services/metricsService');

class MetricsController {
  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * Record a metric
   * POST /api/v1/metrics
   */
  async recordMetric(req, res, next) {
    try {
      const { name, value, tags } = req.body;

      if (!name || value === undefined) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Metric name and value are required',
          code: 'MISSING_FIELDS',
        });
      }

      const metric = this.metricsService.recordMetric(name, parseFloat(value), tags || {});

      res.status(201).json({
        success: true,
        data: metric,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get metric values
   * GET /api/v1/metrics/:name
   */
  async getMetricValues(req, res, next) {
    try {
      const { name } = req.params;
      const { start, end } = req.query;

      if (!name) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Metric name is required',
          code: 'MISSING_NAME',
        });
      }

      const startDate = start ? new Date(start) : new Date(Date.now() - 3600000);
      const endDate = end ? new Date(end) : new Date();

      const values = this.metricsService.getMetricValues(name, startDate, endDate);

      res.json({
        success: true,
        data: values,
        metric: name,
        dateRange: { start: startDate, end: endDate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate metric statistics
   * GET /api/v1/metrics/:name/stats
   */
  async getMetricStats(req, res, next) {
    try {
      const { name } = req.params;

      const stats = this.metricsService.calculateMetricStats(name, {});

      res.json({
        success: true,
        data: stats,
        metric: name,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Define a KPI
   * POST /api/v1/kpis
   */
  async defineKPI(req, res, next) {
    try {
      const { name, description, formula, target, unit, category } = req.body;

      if (!name || !formula) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'KPI name and formula are required',
          code: 'MISSING_FIELDS',
        });
      }

      const kpi = this.metricsService.defineKPI(name, {
        description: description || '',
        formula,
        target: target || 0,
        unit: unit || '',
        category: category || 'general',
      });

      res.status(201).json({
        success: true,
        data: kpi,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate KPI status
   * POST /api/v1/kpis/:id/calculate
   */
  async calculateKPI(req, res, next) {
    try {
      const { id } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'KPI value is required',
          code: 'MISSING_VALUE',
        });
      }

      const result = this.metricsService.calculateKPI(id, { value: parseFloat(value) });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List KPIs
   * GET /api/v1/kpis
   */
  async listKPIs(req, res, next) {
    try {
      const { category, status } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;

      const kpis = this.metricsService.listKPIs(filters);

      res.json({
        success: true,
        data: kpis,
        count: kpis.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get KPI dashboard for a category
   * GET /api/v1/kpis/dashboard/:category
   */
  async getKPIDashboard(req, res, next) {
    try {
      const { category } = req.params;

      const dashboard = this.metricsService.getKPIDashboard(category);

      res.json({
        success: true,
        data: dashboard,
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get metric trend
   * GET /api/v1/metrics/:name/trend
   */
  async getMetricTrend(req, res, next) {
    try {
      const { name } = req.params;
      const { periods = 12 } = req.query;

      const trend = this.metricsService.getMetricTrend(name, parseInt(periods));

      res.json({
        success: true,
        data: trend,
        metric: name,
        periods: parseInt(periods),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare multiple metrics
   * POST /api/v1/metrics/compare
   */
  async compareMetrics(req, res, next) {
    try {
      const { metricNames, start, end } = req.body;

      if (!metricNames || !Array.isArray(metricNames)) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Metric names array is required',
          code: 'INVALID_METRICS',
        });
      }

      const startDate = start ? new Date(start) : new Date(Date.now() - 86400000);
      const endDate = end ? new Date(end) : new Date();

      const comparison = this.metricsService.compareMetrics(metricNames, startDate, endDate);

      res.json({
        success: true,
        data: comparison,
        metricsCount: metricNames.length,
        dateRange: { start: startDate, end: endDate },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MetricsController;
