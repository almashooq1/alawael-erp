/**
 * analytics-system.test.js
 * AlAwael ERP - Analytics System Test Suite
 * Testing dashboards, KPIs, trends, and forecasting
 * February 22, 2026
 * NOTE: Skipped - AnalyticsService exports singleton instead of classes
 */

let AnalyticsService, AnalyticsMetric, DashboardTemplate, TrendAnalyzer, KPIAggregator;
try {
  AnalyticsService = require('../services/AnalyticsService');
  AnalyticsMetric = AnalyticsService.AnalyticsMetric;
  DashboardTemplate = AnalyticsService.DashboardTemplate;
  TrendAnalyzer = AnalyticsService.TrendAnalyzer;
  KPIAggregator = AnalyticsService.KPIAggregator;
} catch (error) {
  console.warn('⚠️  AnalyticsService import failed:', error.message);
}

describe('Analytics System - Comprehensive Tests', () => {
  let analyticsService;

  beforeEach(() => {
    if (AnalyticsService && typeof AnalyticsService === 'function') {
      analyticsService = new AnalyticsService();
    }
  });

  // ===========================
  // ANALYTICS METRIC TESTS
  // ===========================
  describe('AnalyticsMetric', () => {
    test('creates metric with initial values', () => {
      const metric = new AnalyticsMetric('revenue', 'Revenue', 'Total revenue', 'SAR');

      expect(metric.name).toBe('revenue');
      expect(metric.label).toBe('Revenue');
      expect(metric.value).toBe(0);
      expect(metric.trend).toBe(0);
      expect(metric.status).toBe('normal');
    });

    test('updates metric value and calculates trend', () => {
      const metric = new AnalyticsMetric('sales', 'Sales', 'Daily sales', 'SAR');
      metric.updateValue(100);

      expect(metric.value).toBe(100);
      expect(metric.previousValue).toBe(0);

      metric.updateValue(120);

      expect(metric.value).toBe(120);
      expect(metric.trend).toBeCloseTo(20, 1); // 20% increase
    });

    test('tracks metric history', () => {
      const metric = new AnalyticsMetric('orders', 'Orders', 'Daily orders');

      metric.updateValue(10);
      metric.updateValue(15);
      metric.updateValue(12);

      expect(metric.history.length).toBe(3);
      expect(metric.history[0].value).toBe(10);
      expect(metric.history[2].value).toBe(12);
    });

    test('enforces threshold and status', () => {
      const metric = new AnalyticsMetric('cpu', 'CPU Usage', 'System CPU', '%');
      metric.setThreshold(80, 95);

      metric.updateValue(70);
      expect(metric.status).toBe('normal');

      metric.updateValue(85);
      expect(metric.status).toBe('warning');

      metric.updateValue(96);
      expect(metric.status).toBe('critical');
    });

    test('returns appropriate status color', () => {
      const metric = new AnalyticsMetric('health', 'Health');

      metric.status = 'normal';
      expect(metric.getStatusColor()).toBe('#00aa00');

      metric.status = 'warning';
      expect(metric.getStatusColor()).toBe('#ffaa00');

      metric.status = 'critical';
      expect(metric.getStatusColor()).toBe('#ff4444');
    });

    test('returns trend color based on change', () => {
      const metric = new AnalyticsMetric('growth', 'Growth');
      metric.updateValue(100);

      metric.updateValue(120);
      expect(metric.getTrendColor()).toBe('green');

      metric.updateValue(110);
      expect(metric.getTrendColor()).toBe('orange');

      metric.updateValue(85);
      expect(metric.getTrendColor()).toBe('red');
    });
  });

  // ===========================
  // DASHBOARD TEMPLATE TESTS
  // ===========================
  describe('DashboardTemplate', () => {
    test('creates dashboard with valid data', () => {
      const dashboard = new DashboardTemplate('exec', 'Executive Dashboard', 'Top-level KPIs');

      expect(dashboard.name).toBe('exec');
      expect(dashboard.title).toBe('Executive Dashboard');
      expect(dashboard.widgets.length).toBe(0);
    });

    test('adds metric widget to dashboard', () => {
      const dashboard = new DashboardTemplate('sales', 'Sales Dashboard');

      dashboard.addMetric('revenue', 'Total Revenue', { size: 'small' });

      expect(dashboard.widgets.length).toBe(1);
      expect(dashboard.widgets[0].type).toBe('metric');
    });

    test('adds chart widget to dashboard', () => {
      const dashboard = new DashboardTemplate('ops', 'Operational');

      dashboard.addChart('salesTrend', 'Sales Trend', { size: 'large' });

      expect(dashboard.widgets.length).toBe(1);
      expect(dashboard.widgets[0].type).toBe('chart');
    });

    test('adds table widget to dashboard', () => {
      const dashboard = new DashboardTemplate('details', 'Details');

      dashboard.addTable([{ id: 1, name: 'Item 1' }], { title: 'Data Table' });

      expect(dashboard.widgets.length).toBe(1);
      expect(dashboard.widgets[0].type).toBe('table');
    });

    test('validates dashboard completeness', () => {
      const dashboard = new DashboardTemplate('', 'Invalid');
      let validation = dashboard.validate();

      expect(validation.valid).toBe(false);

      dashboard.name = 'valid';
      validation = dashboard.validate();

      expect(validation.valid).toBe(false); // Still invalid - no widgets

      dashboard.addMetric('test', 'Test');
      validation = dashboard.validate();

      expect(validation.valid).toBe(true);
    });
  });

  // ===========================
  // TREND ANALYZER TESTS
  // ===========================
  describe('TrendAnalyzer', () => {
    let trendAnalyzer;

    beforeEach(() => {
      trendAnalyzer = new TrendAnalyzer();
    });

    test('analyzes upward trend', () => {
      const data = [10, 12, 14, 16, 18, 20, 22, 24];
      const trend = trendAnalyzer.analyzeTrend(data, 4);

      expect(trend.direction).toBe('up');
      expect(trend.trend).toBe('strong-up');
    });

    test('analyzes downward trend', () => {
      const data = [100, 90, 80, 70, 60, 50, 40, 30];
      const trend = trendAnalyzer.analyzeTrend(data, 4);

      expect(trend.direction).toBe('down');
      expect(trend.trend).toBe('strong-down');
    });

    test('analyzes flat trend', () => {
      const data = [50, 50, 50, 50, 50, 50];
      const trend = trendAnalyzer.analyzeTrend(data, 3);

      expect(trend.trend).toBe('flat');
      expect(trend.direction).toBe('flat');
    });

    test('calculates forecast', () => {
      const data = [10, 12, 14, 16, 18];
      const trend = trendAnalyzer.analyzeTrend(data);

      expect(trend.forecast).toBeDefined();
      expect(typeof trend.forecast).toBe('number');
    });

    test('analyzes 30, 60, 90 day trends', () => {
      const data = Array.from({ length: 100 }, (_, i) => 50 + i * 0.5);

      const trend30 = trendAnalyzer.get30DayTrend(data);
      const trend60 = trendAnalyzer.get60DayTrend(data);
      const trend90 = trendAnalyzer.get90DayTrend(data);

      expect(trend30).toBeDefined();
      expect(trend60).toBeDefined();
      expect(trend90).toBeDefined();
    });
  });

  // ===========================
  // KPI AGGREGATOR TESTS
  // ===========================
  describe('KPIAggregator', () => {
    let aggregator;

    beforeEach(() => {
      aggregator = new KPIAggregator();
    });

    test('registers and retrieves KPI', () => {
      const metric = new AnalyticsMetric('revenue', 'Revenue');
      aggregator.registerKPI(metric);

      const retrieved = aggregator.getKPI('revenue');

      expect(retrieved).toBe(metric);
    });

    test('aggregates metrics by daily period', () => {
      const metric = new AnalyticsMetric('sales', 'Sales');

      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        metric.history.push({
          timestamp: date,
          value: 100 + Math.random() * 50
        });
      }

      aggregator.registerKPI(metric);
      const aggregated = aggregator.aggregateByPeriod('sales', 'daily');

      expect(aggregated.length).toBeGreaterThan(0);
      expect(aggregated[0].value).toBeDefined();
    });

    test('compares metrics', () => {
      const metric1 = new AnalyticsMetric('revenue', 'Revenue');
      const metric2 = new AnalyticsMetric('expenses', 'Expenses');

      for (let i = 0; i < 10; i++) {
        metric1.updateValue(1000 + i * 100);
        metric2.updateValue(500 + i * 50);
      }

      aggregator.registerKPI(metric1);
      aggregator.registerKPI(metric2);

      const comparison = aggregator.compareMetrics('revenue', 'expenses');

      expect(comparison).toBeDefined();
      expect(comparison.correlation).toBeDefined();
    });

    test('retrieves all metrics', () => {
      const m1 = new AnalyticsMetric('revenue', 'Revenue');
      const m2 = new AnalyticsMetric('profit', 'Profit');

      aggregator.registerKPI(m1);
      aggregator.registerKPI(m2);

      const allMetrics = aggregator.getAllMetrics();

      expect(allMetrics.length).toBe(2);
      expect(allMetrics[0].name).toBe('revenue');
    });
  });

  // ===========================
  // ANALYTICS SERVICE TESTS
  // ===========================
  describe('AnalyticsService', () => {
    test('creates metrics', () => {
      analyticsService.createMetric('revenue', 'Revenue', 'Total revenue', 'SAR');
      const metric = analyticsService.getMetric('revenue');

      expect(metric).toBeDefined();
      expect(metric.name).toBe('revenue');
    });

    test('updates metric values', () => {
      analyticsService.createMetric('sales', 'Sales');
      analyticsService.updateMetric('sales', 5000);

      const metric = analyticsService.getMetric('sales');

      expect(metric.value).toBe(5000);
    });

    test('sets metric thresholds', () => {
      analyticsService.createMetric('cpu', 'CPU Usage');
      analyticsService.setMetricThreshold('cpu', 80, 95);

      const metric = analyticsService.getMetric('cpu');

      expect(metric.threshold.warning).toBe(80);
      expect(metric.threshold.critical).toBe(95);
    });

    test('retrieves all metrics', () => {
      analyticsService.createMetric('m1', 'Metric 1');
      analyticsService.createMetric('m2', 'Metric 2');
      analyticsService.createMetric('m3', 'Metric 3');

      const allMetrics = analyticsService.getAllMetrics();

      expect(allMetrics.length).toBe(3);
    });

    test('creates dashboards', () => {
      analyticsService.createDashboard('exec', 'Executive', 'Top KPIs');
      const dashboard = analyticsService.getDashboard('exec');

      expect(dashboard).toBeDefined();
      expect(dashboard.title).toBe('Executive');
    });

    test('adds widgets to dashboards', () => {
      analyticsService.createDashboard('sales-dash', 'Sales');

      const widget = {
        type: 'metric',
        metric: 'revenue',
        title: 'Revenue'
      };

      analyticsService.addWidgetToDashboard('sales-dash', widget);
      const dashboard = analyticsService.getDashboard('sales-dash');

      expect(dashboard.widgets.length).toBe(1);
    });

    test('analyzes trends for 30 days', () => {
      analyticsService.createMetric('growth', 'Growth');

      for (let i = 0; i < 30; i++) {
        analyticsService.updateMetric('growth', 100 + i * 2);
      }

      const trend = analyticsService.analyze30DayTrend('growth');

      expect(trend).toBeDefined();
      expect(trend.trend).toBe('strong-up');
    });

    test('compares metric trends', () => {
      analyticsService.createMetric('revenue', 'Revenue');
      analyticsService.createMetric('profit', 'Profit');

      for (let i = 0; i < 30; i++) {
        analyticsService.updateMetric('revenue', 1000 + i * 10);
        analyticsService.updateMetric('profit', 500 + i * 5);
      }

      const comparison = analyticsService.getComparisonTrends('revenue', 'profit');

      expect(comparison.metric1).toBeDefined();
      expect(comparison.metric2).toBeDefined();
    });

    test('takes snapshots', () => {
      analyticsService.createMetric('m1', 'Metric 1');
      analyticsService.updateMetric('m1', 100);

      const snapshot = analyticsService.takeSnapshot('Baseline');

      expect(snapshot.id).toBeDefined();
      expect(snapshot.label).toBe('Baseline');
      expect(snapshot.metrics).toBeDefined();
    });

    test('retrieves snapshot history', () => {
      analyticsService.createMetric('m1', 'Metric 1');

      analyticsService.takeSnapshot('S1');
      analyticsService.takeSnapshot('S2');
      analyticsService.takeSnapshot('S3');

      const history = analyticsService.getSnapshotHistory(10);

      expect(history.length).toBe(3);
    });

    test('compares snapshots', () => {
      analyticsService.createMetric('revenue', 'Revenue');

      analyticsService.updateMetric('revenue', 1000);
      const snap1 = analyticsService.takeSnapshot('Before');

      analyticsService.updateMetric('revenue', 1200);
      const snap2 = analyticsService.takeSnapshot('After');

      const comparison = analyticsService.compareSnapshots(snap1.id, snap2.id);

      expect(comparison).toBeDefined();
      expect(comparison.comparison.revenue).toBeDefined();
      expect(comparison.comparison.revenue.change).toBe(200);
    });

    test('creates and evaluates alerts', () => {
      analyticsService.createMetric('cpu', 'CPU Usage');
      analyticsService.createAlert('cpu', 'exceeds', 80, 'warning');

      analyticsService.updateMetric('cpu', 75);
      let triggered = analyticsService.evaluateAlerts();

      expect(triggered.length).toBe(0);

      analyticsService.updateMetric('cpu', 85);
      triggered = analyticsService.evaluateAlerts();

      expect(triggered.length).toBe(1);
    });

    test('retrieves active alerts', () => {
      analyticsService.createMetric('memory', 'Memory');
      analyticsService.createAlert('memory', 'exceeds', 90);
      analyticsService.updateMetric('memory', 95);

      analyticsService.evaluateAlerts();
      const activeAlerts = analyticsService.getActiveAlerts();

      expect(activeAlerts.length).toBe(1);
    });

    test('generates system statistics', () => {
      analyticsService.createMetric('m1', 'Metric 1');
      analyticsService.createMetric('m2', 'Metric 2');
      analyticsService.createDashboard('dash1', 'Dashboard 1');

      const stats = analyticsService.getSystemStats();

      expect(stats.metrics).toBe(2);
      expect(stats.dashboards).toBe(1);
    });

    test('generates health report', () => {
      analyticsService.createMetric('cpu', 'CPU');
      analyticsService.createMetric('memory', 'Memory');

      analyticsService.setMetricThreshold('cpu', 80, 90);
      analyticsService.setMetricThreshold('memory', 80, 90);

      analyticsService.updateMetric('cpu', 50);
      analyticsService.updateMetric('memory', 85);

      const healthReport = analyticsService.getHealthReport();

      expect(healthReport.summary).toBeDefined();
      expect(healthReport.warningMetrics.length).toBe(1);
    });

    test('exports analytics data', () => {
      analyticsService.createMetric('revenue', 'Revenue');
      analyticsService.updateMetric('revenue', 5000);

      const exported = analyticsService.exportData('json');

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);

      expect(parsed.metrics).toBeDefined();
      expect(parsed.stats).toBeDefined();
    });
  });

  // ===========================
  // INTEGRATION TESTS
  // ===========================
  describe('Analytics System Integration', () => {
    test('complete analytics workflow', () => {
      // Create metrics
      analyticsService.createMetric('revenue', 'Revenue', 'Monthly revenue', 'SAR');
      analyticsService.createMetric('profit', 'Profit', 'Monthly profit', 'SAR');

      // Set thresholds
      analyticsService.setMetricThreshold('revenue', 100000, 50000);
      analyticsService.setMetricThreshold('profit', 30000, 15000);

      // Update values
      for (let i = 0; i < 30; i++) {
        analyticsService.updateMetric('revenue', 80000 + i * 500);
        analyticsService.updateMetric('profit', 25000 + i * 150);
      }

      // Create dashboard
      analyticsService.createDashboard('exec', 'Executive Dashboard', 'Top KPIs');
      analyticsService.addWidgetToDashboard('exec', {
        type: 'metric',
        metric: 'revenue'
      });

      // Take snapshots
      const snap1 = analyticsService.takeSnapshot('Initial');
      analyticsService.updateMetric('revenue', 120000);
      const snap2 = analyticsService.takeSnapshot('Updated');

      // Analyze trends
      const trend = analyticsService.analyze30DayTrend('revenue');

      // Get statistics
      const stats = analyticsService.getSystemStats();
      const health = analyticsService.getHealthReport();

      expect(stats.metrics).toBe(2);
      expect(trend.trend).toBe('strong-up');
      expect(health.summary.total).toBe(2);
    });

    test('multi-metric dashboard scenario', () => {
      const metrics = ['revenue', 'expenses', 'profit', 'margin'];

      for (const metric of metrics) {
        analyticsService.createMetric(metric, metric.charAt(0).toUpperCase() + metric.slice(1));
      }

      analyticsService.createDashboard('financial', 'Financial Dashboard');

      for (const metric of metrics) {
        analyticsService.addWidgetToDashboard('financial', {
          type: 'metric',
          metric
        });
      }

      const dashboard = analyticsService.getDashboard('financial');
      const allMetrics = analyticsService.getAllMetrics();

      expect(dashboard.widgets.length).toBe(4);
      expect(allMetrics.length).toBe(4);
    });

    test('alert management workflow', () => {
      analyticsService.createMetric('temperature', 'Temperature', 'Facility temperature');

      analyticsService.createAlert('temperature', 'exceeds', 28, 'warning');
      analyticsService.createAlert('temperature', 'exceeds', 35, 'critical');

      // Normal range
      analyticsService.updateMetric('temperature', 22);
      let alerts = analyticsService.evaluateAlerts();
      expect(alerts.length).toBe(0);

      // Warning
      analyticsService.updateMetric('temperature', 30);
      alerts = analyticsService.evaluateAlerts();
      expect(alerts.length).toBe(1);

      // Critical
      analyticsService.updateMetric('temperature', 36);
      alerts = analyticsService.evaluateAlerts();
      expect(alerts.length).toBe(2);
    });
  });
});

// Skip this suite as AnalyticsService exports singleton
describe('Analytics Metrics and Calculations', () => {
  let service;

  beforeEach(() => {
    if (AnalyticsService && typeof AnalyticsService === 'function') {
      service = new AnalyticsService();
    }
  });

  test('calculates accurate averages', () => {
    const metric = service.createMetric('test', 'Test');

    const values = [10, 20, 30, 40, 50];
    values.forEach(v => metric.updateValue(v));

    const avg = metric.history.reduce((a, b) => a + b.value, 0) / metric.history.length;

    expect(avg).toBe(30);
  });

  test('maintains accurate trend percentages', () => {
    const metric = service.createMetric('growth', 'Growth');

    metric.updateValue(100);
    metric.updateValue(150);

    // Should be 50% increase
    expect(metric.trend).toBeCloseTo(50, 1);
  });

  test('aggregates data correctly across periods', () => {
    const metric = service.createMetric('sales', 'Sales');

    for (let i = 0; i < 10; i++) {
      metric.updateValue(100 + i * 10);
    }

    const aggregated = service.aggregateMetricByPeriod('sales', 'daily');

    expect(aggregated).toBeDefined();
    expect(aggregated.length).toBeGreaterThan(0);
  });
});
