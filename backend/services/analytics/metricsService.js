/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**
 * Metrics Service - Phase 10 Analytics Metrics & KPI
 * Manages metrics collection, calculation, and analysis
 */

const crypto = require('crypto');

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.kpis = new Map();
    this.aggregations = new Map();
  }

  /**
   * Record metric value
   * @param {string} metricName - Metric name
   * @param {number|Object} value - Metric value
   * @param {Object} tags - Tag metadata
   * @returns {Object} Recorded metric
   */
  recordMetric(metricName, value, tags = {}) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricData = {
      id: crypto.randomUUID(),
      name: metricName,
      value,
      tags,
      timestamp: new Date(),
      _ttl: Date.now() + 86400000, // 24 hour TTL
    };

    this.metrics.get(metricName).push(metricData);
    return metricData;
  }

  /**
   * Get metric values within time range
   * @param {string} metricName - Metric name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Metric values
   */
  getMetricValues(metricName, startDate, endDate) {
    const values = this.metrics.get(metricName) || [];
    return values.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
  }

  /**
   * Calculate metric statistics
   * @param {string} metricName - Metric name
   * @param {Object} options - Options for calculation
   * @returns {Object} Statistics
   */
  calculateMetricStats(metricName, options = {}) {
    const values = this.metrics.get(metricName) || [];
    const numericValues = values.map(m => parseFloat(m.value)).filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      return { count: 0, error: 'No numeric values found' };
    }

    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = sum / numericValues.length;
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const variance =
      numericValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numericValues.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: numericValues.length,
      sum: parseFloat(sum.toFixed(2)),
      average: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      latest: values[values.length - 1]?.value || null,
    };
  }

  /**
   * Define KPI
   * @param {string} kpiName - KPI name
   * @param {Object} definition - KPI definition
   * @returns {Object} Created KPI
   */
  defineKPI(kpiName, definition) {
    const kpiId = crypto.randomUUID();
    const kpi = {
      id: kpiId,
      name: kpiName,
      description: definition.description || '',
      formula: definition.formula || null,
      target: definition.target || null,
      threshold: definition.threshold || { warning: 80, critical: 60 },
      unit: definition.unit || '',
      frequency: definition.frequency || 'daily', // daily, weekly, monthly
      category: definition.category || 'general',
      owner: definition.owner || null,
      lastCalculated: null,
      currentValue: null,
      status: 'unknown', // on-track, at-risk, off-track
      created_at: new Date(),
    };

    this.kpis.set(kpiId, kpi);
    return kpi;
  }

  /**
   * Calculate KPI value
   * @param {string} kpiId - KPI ID
   * @param {Object} dataContext - Data for calculation
   * @returns {Object} KPI result
   */
  calculateKPI(kpiId, dataContext) {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) throw new Error(`KPI ${kpiId} not found`);

    let currentValue = 0;
    let status = 'unknown';

    if (kpi.formula) {
      // Execute formula with data context
      currValue = this._evaluateFormula(kpi.formula, dataContext);
    } else if (dataContext.value !== undefined) {
      currentValue = dataContext.value;
    }

    // Determine status
    if (kpi.target) {
      const percentage = (currentValue / kpi.target) * 100;
      if (percentage >= kpi.threshold.warning) {
        status = 'on-track';
      } else if (percentage >= kpi.threshold.critical) {
        status = 'at-risk';
      } else {
        status = 'off-track';
      }
    }

    kpi.lastCalculated = new Date();
    kpi.currentValue = currentValue;
    kpi.status = status;

    return {
      kpiId,
      name: kpi.name,
      value: currentValue,
      target: kpi.target,
      percentage: kpi.target ? ((currentValue / kpi.target) * 100).toFixed(2) : null,
      status,
      unit: kpi.unit,
      calculatedAt: kpi.lastCalculated,
    };
  }

  /**
   * Get all KPIs
   * @param {Object} filters - Filter options
   * @returns {Array} List of KPIs
   */
  listKPIs(filters = {}) {
    let kpis = Array.from(this.kpis.values());

    if (filters.category) {
      kpis = kpis.filter(k => k.category === filters.category);
    }
    if (filters.status) {
      kpis = kpis.filter(k => k.status === filters.status);
    }

    return kpis.sort((a, b) => b.lastCalculated - a.lastCalculated);
  }

  /**
   * Get KPI dashboard
   * @param {string} category - Category filter
   * @returns {Object} KPI dashboard data
   */
  getKPIDashboard(category = null) {
    let kpis = Array.from(this.kpis.values());

    if (category) {
      kpis = kpis.filter(k => k.category === category);
    }

    const statusCounts = {
      'on-track': 0,
      'at-risk': 0,
      'off-track': 0,
      unknown: 0,
    };

    kpis.forEach(kpi => {
      statusCounts[kpi.status]++;
    });

    return {
      totalKPIs: kpis.length,
      statusCounts,
      kpis: kpis.map(k => ({
        id: k.id,
        name: k.name,
        value: k.currentValue,
        target: k.target,
        percentage: k.target ? ((k.currentValue / k.target) * 100).toFixed(2) : null,
        status: k.status,
        unit: k.unit,
        lastUpdated: k.lastCalculated,
      })),
      generatedAt: new Date(),
    };
  }

  /**
   * Get metric trend
   * @param {string} metricName - Metric name
   * @param {number} periods - Number of periods
   * @returns {Array} Trend data
   */
  getMetricTrend(metricName, periods = 30) {
    const values = this.metrics.get(metricName) || [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periods * 24 * 60 * 60 * 1000);

    return values
      .filter(m => m.timestamp >= startDate && m.timestamp <= endDate)
      .map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        tags: m.tags,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Compare metrics
   * @param {Array} metricNames - Metric names
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Comparison results
   */
  compareMetrics(metricNames, startDate, endDate) {
    const comparison = {};

    metricNames.forEach(name => {
      const values = this.getMetricValues(name, startDate, endDate);
      const stats = this.calculateMetricStats(name, { startDate, endDate });
      comparison[name] = {
        stats,
        trend: values.map(v => ({ timestamp: v.timestamp, value: v.value })),
      };
    });

    return comparison;
  }

  /**
   * Evaluate formula safely
   * تقييم المعادلة بطريقة آمنة
   * @private
   */
  _evaluateFormula(formula, context) {
    // Validate formula contains only safe math operations
    const safeFormulaPattern = /^[a-zA-Z0-9_\s+\-*/().,%<>=!&|?:]+$/;
    if (!safeFormulaPattern.test(formula)) {
      throw new Error('صيغة المعادلة غير صالحة');
    }
    // Block dangerous patterns
    const dangerousPatterns =
      /\b(require|import|eval|Function|constructor|prototype|__proto__|process|global|module|exports|this)\b/;
    if (dangerousPatterns.test(formula)) {
      throw new Error('صيغة المعادلة تحتوي على عمليات غير مسموحة');
    }
    // Replace variable names with their values safely
    let expression = formula;
    for (const [key, value] of Object.entries(context)) {
      const varPattern = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(varPattern, JSON.stringify(value));
    }
    // Evaluate simple math expression safely
    try {
      // Only allow numeric result from simple math
      const result = expression
        .split(/[+\-*/]/)
        .every(part => !isNaN(parseFloat(part.trim())) || part.trim() === '')
        ? Function('"use strict"; return (' + expression + ')')()
        : NaN;
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('نتيجة المعادلة غير رقمية');
      }
      return result;
    } catch (error) {
      throw new Error('فشل تقييم المعادلة');
    }
  }
}

module.exports = new MetricsService();
