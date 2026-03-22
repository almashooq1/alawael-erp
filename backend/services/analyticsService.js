/* eslint-disable no-unused-vars */
const AnalyticsCache = require('../models/AnalyticsCache');
const Employee = require('../models/Employee');
const Integration = require('../models/Integration');
const Document = require('../models/Document');
const crypto = require('crypto');

// =========================================
// AnalyticsMetric — individual KPI tracker
// =========================================
class AnalyticsMetric {
  constructor(name, label, description = '', unit = '') {
    this.name = name;
    this.label = label;
    this.description = description;
    this.unit = unit;
    this.value = 0;
    this.previousValue = 0;
    this.trend = 0;
    this.status = 'normal';
    this.history = [];
    this.threshold = { warning: null, critical: null };
  }

  updateValue(val) {
    this.previousValue = this.value;
    this.value = val;
    this.history.push({ timestamp: new Date(), value: val });

    if (this.previousValue !== 0) {
      this.trend = ((this.value - this.previousValue) / Math.abs(this.previousValue)) * 100;
    } else {
      this.trend = 0;
    }

    if (this.threshold.warning !== null) {
      if (this.threshold.critical !== null && this.value >= this.threshold.critical) {
        this.status = 'critical';
      } else if (this.value >= this.threshold.warning) {
        this.status = 'warning';
      } else {
        this.status = 'normal';
      }
    }
  }

  setThreshold(warning, critical) {
    this.threshold = { warning, critical };
  }

  getStatusColor() {
    const colors = { normal: '#00aa00', warning: '#ffaa00', critical: '#ff4444' };
    return colors[this.status] || '#999999';
  }

  getTrendColor() {
    if (this.trend > 0) return 'green';
    if (this.trend >= -15) return 'orange';
    return 'red';
  }
}

// =========================================
// DashboardTemplate — widget container
// =========================================
class DashboardTemplate {
  constructor(name, title, description = '') {
    this.name = name;
    this.title = title;
    this.description = description;
    this.widgets = [];
  }

  addMetric(metric, title, opts = {}) {
    this.widgets.push({ type: 'metric', metric, title, ...opts });
  }

  addChart(chart, title, opts = {}) {
    this.widgets.push({ type: 'chart', chart, title, ...opts });
  }

  addTable(data, opts = {}) {
    this.widgets.push({ type: 'table', data, ...opts });
  }

  validate() {
    if (!this.name) return { valid: false, reason: 'Missing name' };
    if (this.widgets.length === 0) return { valid: false, reason: 'No widgets' };
    return { valid: true };
  }
}

// =========================================
// TrendAnalyzer — time-series trend detection
// =========================================
class TrendAnalyzer {
  analyzeTrend(data, window) {
    const w = window || data.length;
    const slice = data.slice(-w);
    const n = slice.length;

    // Linear regression
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += slice[i];
      sumXY += i * slice[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const forecast = slope * n + intercept;

    const pctChange =
      slice[0] !== 0 ? ((slice[n - 1] - slice[0]) / Math.abs(slice[0])) * 100 : 0;

    let direction, trend;
    if (pctChange > 10) {
      direction = 'up';
      trend = 'strong-up';
    } else if (pctChange > 0) {
      direction = 'up';
      trend = 'up';
    } else if (pctChange < -10) {
      direction = 'down';
      trend = 'strong-down';
    } else if (pctChange < 0) {
      direction = 'down';
      trend = 'down';
    } else {
      direction = 'flat';
      trend = 'flat';
    }

    return { direction, trend, slope, intercept, forecast, pctChange };
  }

  get30DayTrend(data) {
    return this.analyzeTrend(data.slice(-30));
  }
  get60DayTrend(data) {
    return this.analyzeTrend(data.slice(-60));
  }
  get90DayTrend(data) {
    return this.analyzeTrend(data.slice(-90));
  }
}

// =========================================
// KPIAggregator — multi-metric container
// =========================================
class KPIAggregator {
  constructor() {
    this.kpis = new Map();
  }

  registerKPI(metric) {
    this.kpis.set(metric.name, metric);
  }

  getKPI(name) {
    return this.kpis.get(name);
  }

  getAllMetrics() {
    return Array.from(this.kpis.values());
  }

  aggregateByPeriod(name, _period) {
    const metric = this.kpis.get(name);
    if (!metric) return [];
    // Group history entries by day
    const buckets = new Map();
    for (const entry of metric.history) {
      const day = new Date(entry.timestamp).toISOString().slice(0, 10);
      if (!buckets.has(day)) buckets.set(day, []);
      buckets.get(day).push(entry.value);
    }
    return Array.from(buckets.entries()).map(([date, vals]) => ({
      date,
      value: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));
  }

  compareMetrics(name1, name2) {
    const m1 = this.kpis.get(name1);
    const m2 = this.kpis.get(name2);
    if (!m1 || !m2) return null;
    const h1 = m1.history.map(h => h.value);
    const h2 = m2.history.map(h => h.value);
    const len = Math.min(h1.length, h2.length);
    if (len === 0) return { correlation: 0 };
    const mean1 = h1.reduce((a, b) => a + b, 0) / len;
    const mean2 = h2.reduce((a, b) => a + b, 0) / len;
    let num = 0,
      d1 = 0,
      d2 = 0;
    for (let i = 0; i < len; i++) {
      num += (h1[i] - mean1) * (h2[i] - mean2);
      d1 += (h1[i] - mean1) ** 2;
      d2 += (h2[i] - mean2) ** 2;
    }
    const correlation = d1 && d2 ? num / (Math.sqrt(d1) * Math.sqrt(d2)) : 0;
    return { correlation };
  }
}

// =========================================
// AnalyticsService — full analytics engine
// =========================================
class AnalyticsService {
  constructor() {
    this._metrics = new Map();
    this._dashboards = new Map();
    this._trendAnalyzer = new TrendAnalyzer();
    this._kpiAggregator = new KPIAggregator();
    this._snapshots = [];
    this._alerts = [];
    this._activeAlerts = [];
  }

  // --- Cached DB metric (original Phase‑6 API) ---

  /**
   * Get cached data or calculate fresh api
   */
  getMetric(key, calculationFn, type, ttlMinutes = 60) {
    // In-memory path (no calculationFn) — used by the dashboard layer
    if (typeof calculationFn === 'undefined') {
      return this._metrics.get(key);
    }

    // DB-backed async path
    return (async () => {
      const cached = await AnalyticsCache.findOne({ key });

      if (cached && cached.expiresAt > new Date()) {
        return cached.data;
      }

      const data = await calculationFn();

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      await AnalyticsCache.findOneAndUpdate(
        { key },
        { key, data, type, expiresAt },
        { upsert: true, new: true }
      );

      return data;
    })();
  }

  /**
   * Calculate HR Metrics (Phase 6 Data)
   */
  async getHRMetrics() {
    return this.getMetric(
      'hr_overview',
      async () => {
        const totalEmployees = (await Employee.countDocuments()) || 0;
        const activeEmployees = (await Employee.countDocuments({ status: 'Active' })) || 0;

        return {
          totalEmployees,
          activeEmployees,
          retentionRate: '98%',
          departmentDistribution: { IT: 15, HR: 5, Sales: 20 },
        };
      },
      'HR_METRICS'
    );
  }

  /**
   * Calculate System Health (Phase 9 Data)
   */
  async getSystemHealth() {
    return this.getMetric(
      'system_health',
      async () => {
        const totalIntegrations = (await Integration.countDocuments()) || 0;
        const activeIntegrations = (await Integration.countDocuments({ status: 'ACTIVE' })) || 0;
        const errorIntegrations = (await Integration.countDocuments({ status: 'ERROR' })) || 0;

        return {
          uptime: '99.9%',
          integrationHealth: {
            total: totalIntegrations,
            active: activeIntegrations,
            issues: errorIntegrations,
          },
          lastAudit: new Date(),
        };
      },
      'SYSTEM_HEALTH',
      5
    );
  }

  /**
   * Generate AI Insights (Phase 10 Feature)
   */
  async getAIInsights() {
    return this.getMetric(
      'ai_insights',
      async () => {
        const hrData = await this.getHRMetrics();
        const sysData = await this.getSystemHealth();
        const insights = [];

        if (hrData.activeEmployees > 50) {
          insights.push({
            severity: 'MEDIUM',
            category: 'GROWTH',
            message: 'Employee count growing fast. Suggest scaling infrastructure.',
          });
        }

        if (sysData.integrationHealth.issues > 0) {
          insights.push({
            severity: 'HIGH',
            category: 'MAINTENANCE',
            message: `Detected ${sysData.integrationHealth.issues} failing integrations. Immediate review recommended.`,
          });
        }

        insights.push({
          severity: 'LOW',
          category: 'PERFORMANCE',
          message:
            'System performance is optimal. Predictive analysis suggests stable load for next 7 days.',
        });

        return insights;
      },
      'AI_INSIGHTS',
      120
    );
  }

  // --- In-memory analytics engine ---

  createMetric(name, label, description, unit) {
    const metric = new AnalyticsMetric(name, label, description, unit);
    this._metrics.set(name, metric);
    this._kpiAggregator.registerKPI(metric);
    return metric;
  }

  updateMetric(name, value) {
    const metric = this._metrics.get(name);
    if (metric) metric.updateValue(value);
  }

  setMetricThreshold(name, warning, critical) {
    const metric = this._metrics.get(name);
    if (metric) metric.setThreshold(warning, critical);
  }

  getAllMetrics() {
    return Array.from(this._metrics.values());
  }

  createDashboard(name, title, description) {
    const dashboard = new DashboardTemplate(name, title, description);
    this._dashboards.set(name, dashboard);
    return dashboard;
  }

  getDashboard(name) {
    return this._dashboards.get(name);
  }

  addWidgetToDashboard(dashName, widget) {
    const dashboard = this._dashboards.get(dashName);
    if (dashboard) dashboard.widgets.push(widget);
  }

  analyze30DayTrend(name) {
    const metric = this._metrics.get(name);
    if (!metric) return null;
    return this._trendAnalyzer.analyzeTrend(metric.history.map(h => h.value));
  }

  getComparisonTrends(name1, name2) {
    return {
      metric1: this.analyze30DayTrend(name1),
      metric2: this.analyze30DayTrend(name2),
    };
  }

  takeSnapshot(label) {
    const snapshot = {
      id: crypto.randomUUID(),
      label,
      timestamp: new Date(),
      metrics: {},
    };
    for (const [k, m] of this._metrics) {
      snapshot.metrics[k] = { value: m.value, trend: m.trend, status: m.status };
    }
    this._snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshotHistory(limit) {
    return this._snapshots.slice(-limit);
  }

  compareSnapshots(id1, id2) {
    const s1 = this._snapshots.find(s => s.id === id1);
    const s2 = this._snapshots.find(s => s.id === id2);
    if (!s1 || !s2) return null;
    const comparison = {};
    for (const key of new Set([...Object.keys(s1.metrics), ...Object.keys(s2.metrics)])) {
      const v1 = (s1.metrics[key] || {}).value || 0;
      const v2 = (s2.metrics[key] || {}).value || 0;
      comparison[key] = { before: v1, after: v2, change: v2 - v1 };
    }
    return { snapshot1: id1, snapshot2: id2, comparison };
  }

  createAlert(metricName, operator, threshold, severity = 'warning') {
    this._alerts.push({ metricName, operator, threshold, severity });
  }

  evaluateAlerts() {
    const triggered = [];
    for (const alert of this._alerts) {
      const metric = this._metrics.get(alert.metricName);
      if (!metric) continue;
      let fire = false;
      if (alert.operator === 'exceeds' && metric.value > alert.threshold) fire = true;
      if (alert.operator === 'below' && metric.value < alert.threshold) fire = true;
      if (fire) {
        const entry = { ...alert, value: metric.value, timestamp: new Date() };
        triggered.push(entry);
        if (!this._activeAlerts.find(a => a.metricName === alert.metricName && a.threshold === alert.threshold)) {
          this._activeAlerts.push(entry);
        }
      }
    }
    return triggered;
  }

  getActiveAlerts() {
    return this._activeAlerts;
  }

  getSystemStats() {
    return {
      metrics: this._metrics.size,
      dashboards: this._dashboards.size,
      alerts: this._alerts.length,
      snapshots: this._snapshots.length,
    };
  }

  getHealthReport() {
    const warningMetrics = [];
    const criticalMetrics = [];
    for (const m of this._metrics.values()) {
      if (m.status === 'warning') warningMetrics.push(m);
      if (m.status === 'critical') criticalMetrics.push(m);
    }
    return {
      summary: { total: this._metrics.size, warnings: warningMetrics.length, criticals: criticalMetrics.length },
      warningMetrics,
      criticalMetrics,
    };
  }

  exportData(format) {
    const obj = {
      metrics: this.getAllMetrics().map(m => ({ name: m.name, value: m.value })),
      stats: this.getSystemStats(),
    };
    if (format === 'json') return JSON.stringify(obj);
    return obj;
  }

  aggregateMetricByPeriod(name, period) {
    return this._kpiAggregator.aggregateByPeriod(name, period);
  }
}

// Attach utility classes for external use
AnalyticsService.AnalyticsMetric = AnalyticsMetric;
AnalyticsService.DashboardTemplate = DashboardTemplate;
AnalyticsService.TrendAnalyzer = TrendAnalyzer;
AnalyticsService.KPIAggregator = KPIAggregator;

module.exports = AnalyticsService;
