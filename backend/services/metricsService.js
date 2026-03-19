/* eslint-disable no-unused-vars */
/**
 * Metrics Service
 * خدمة المقاييس والمؤشرات
 * In-memory metrics/KPI tracking service
 * Used by metricsController.js
 */

const logger = require('../utils/logger');

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.kpis = new Map();
    this.kpiCounter = 0;
  }

  /**
   * Record a metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {object} tags - Optional tags
   */
  recordMetric(name, value, tags = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({
      value,
      tags,
      timestamp: new Date(),
    });
    return { success: true, metric: name, value };
  }

  /**
   * Get metric values within a time range
   * @param {string} name - Metric name
   * @param {Date} startTime - Start of range
   * @param {Date} endTime - End of range
   */
  getMetricValues(name, startTime, endTime) {
    const entries = this.metrics.get(name) || [];
    const start = startTime ? new Date(startTime) : new Date(0);
    const end = endTime ? new Date(endTime) : new Date();
    return entries.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Calculate statistics for a metric
   * @param {string} name - Metric name
   * @param {object} opts - Options (startTime, endTime)
   */
  calculateMetricStats(name, opts = {}) {
    const values = this.getMetricValues(name, opts.startTime, opts.endTime).map(e => e.value);
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, sum: 0, median: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: +(sum / values.length).toFixed(2),
      sum: +sum.toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  /**
   * Define a KPI
   * @param {string} name - KPI name
   * @param {object} opts - KPI options (target, unit, category, description)
   */
  defineKPI(name, opts = {}) {
    const id = `kpi_${++this.kpiCounter}`;
    const kpi = {
      id,
      name,
      target: opts.target || 100,
      unit: opts.unit || 'unit',
      category: opts.category || 'general',
      description: opts.description || '',
      createdAt: new Date(),
    };
    this.kpis.set(id, kpi);
    return kpi;
  }

  /**
   * Calculate KPI performance
   * @param {string} id - KPI ID
   * @param {object} opts - Options
   */
  calculateKPI(id, opts = {}) {
    const kpi = this.kpis.get(id);
    if (!kpi) {
      return { error: 'KPI not found' };
    }
    const stats = this.calculateMetricStats(kpi.name, opts);
    const actual = stats.avg || 0;
    const achievement = kpi.target > 0 ? +((actual / kpi.target) * 100).toFixed(2) : 0;
    return {
      kpi,
      actual,
      target: kpi.target,
      achievement,
      status: achievement >= 100 ? 'achieved' : achievement >= 75 ? 'on-track' : 'behind',
      stats,
    };
  }

  /**
   * List KPIs with optional filters
   * @param {object} filters - { category }
   */
  listKPIs(filters = {}) {
    let kpis = Array.from(this.kpis.values());
    if (filters.category) {
      kpis = kpis.filter(k => k.category === filters.category);
    }
    return kpis;
  }

  /**
   * Get KPI dashboard for a category
   * @param {string} category
   */
  getKPIDashboard(category) {
    const kpis = this.listKPIs({ category });
    return kpis.map(kpi => this.calculateKPI(kpi.id));
  }

  /**
   * Get metric trend over time periods
   * @param {string} name - Metric name
   * @param {number} periods - Number of periods
   */
  getMetricTrend(name, periods = 7) {
    const entries = this.metrics.get(name) || [];
    const now = new Date();
    const trend = [];
    for (let i = periods - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayValues = entries
        .filter(e => e.timestamp >= dayStart && e.timestamp <= dayEnd)
        .map(e => e.value);
      trend.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayValues.length,
        avg:
          dayValues.length > 0
            ? +(dayValues.reduce((a, b) => a + b, 0) / dayValues.length).toFixed(2)
            : 0,
        sum: dayValues.reduce((a, b) => a + b, 0),
      });
    }
    return trend;
  }

  /**
   * Compare multiple metrics
   * @param {string[]} names - Metric names to compare
   * @param {Date} startTime
   * @param {Date} endTime
   */
  compareMetrics(names, startTime, endTime) {
    return names.map(name => ({
      name,
      stats: this.calculateMetricStats(name, { startTime, endTime }),
    }));
  }
}

module.exports = MetricsService;
