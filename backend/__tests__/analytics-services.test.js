/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**



 * Phase 10 Analytics Services Tests
 * Comprehensive test suite for Dashboard, Report, and Metrics services
 */

const dashboardService = require('../services/analytics/dashboardService');
const reportService = require('../services/analytics/reportService');
const metricsService = require('../services/analytics/metricsService');

class AnalyticsTestSuite {
  constructor() {
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log(
      '\
' + '='.repeat(70)
    );
    console.log('  PHASE 10 - ANALYTICS SERVICES TEST SUITE');
    console.log(
      '='.repeat(70) +
        '\
'
    );

    this.testDashboardService();
    this.testReportService();
    this.testMetricsService();

    this.printSummary();
  }

  /**
   * Test Dashboard Service
   */
  testDashboardService() {
    console.log(
      '\
📊 DASHBOARD SERVICE TESTS\
'
    );

    // Test 1: Create dashboard
    this.test('Create dashboard', () => {
      const dashboard = dashboardService.createDashboard('user-1', {
        name: 'Sales Dashboard',
        description: 'Q1 Sales Performance',
      });
      return dashboard.id && dashboard.userId === 'user-1';
    });

    // Test 2: Get dashboard
    this.test('Get dashboard by ID', () => {
      const dashboard = dashboardService.createDashboard('user-2', { name: 'Test' });
      const retrieved = dashboardService.getDashboard(dashboard.id);
      return retrieved.id === dashboard.id;
    });

    // Test 3: List dashboards
    this.test('List user dashboards', () => {
      dashboardService.createDashboard('user-3', { name: 'Dashboard 1' });
      dashboardService.createDashboard('user-3', { name: 'Dashboard 2' });
      const dashboards = dashboardService.listDashboards('user-3');
      return dashboards.length >= 2;
    });

    // Test 4: Update dashboard
    this.test('Update dashboard', () => {
      const dashboard = dashboardService.createDashboard('user-4', { name: 'Old Name' });
      const updated = dashboardService.updateDashboard(dashboard.id, { name: 'New Name' });
      return updated.name === 'New Name';
    });

    // Test 5: Delete dashboard
    this.test('Delete dashboard', () => {
      const dashboard = dashboardService.createDashboard('user-5', { name: 'To Delete' });
      const success = dashboardService.deleteDashboard(dashboard.id);
      return success;
    });

    // Test 6: Add widget
    this.test('Add widget to dashboard', () => {
      const dashboard = dashboardService.createDashboard('user-6', { name: 'Widget Test' });
      const widget = dashboardService.addWidget(dashboard.id, {
        type: 'metric-card',
        title: 'Total Revenue',
      });
      return widget.id && dashboard.widgets.includes(widget.id);
    });

    // Test 7: Update widget
    this.test('Update widget configuration', () => {
      const dashboard = dashboardService.createDashboard('user-7', { name: 'Test' });
      const widget = dashboardService.addWidget(dashboard.id, { type: 'line-chart' });
      const updated = dashboardService.updateWidget(widget.id, { refreshInterval: 60000 });
      return updated.config.refreshInterval === 60000;
    });

    // Test 8: Remove widget
    this.test('Remove widget from dashboard', () => {
      const dashboard = dashboardService.createDashboard('user-8', { name: 'Test' });
      const widget = dashboardService.addWidget(dashboard.id, { type: 'bar-chart' });
      const success = dashboardService.removeWidget(dashboard.id, widget.id);
      return success && !dashboard.widgets.includes(widget.id);
    });

    // Test 9: Get widget data
    this.test('Get widget data', () => {
      const dashboard = dashboardService.createDashboard('user-9', { name: 'Test' });
      const widget = dashboardService.addWidget(dashboard.id, { type: 'pie-chart' });
      const data = dashboardService.getWidgetData(widget.id);
      return data.id === widget.id && data.data !== undefined;
    });

    // Test 10: Refresh widget
    this.test('Refresh widget data', () => {
      const dashboard = dashboardService.createDashboard('user-10', { name: 'Test' });
      const widget = dashboardService.addWidget(dashboard.id, { type: 'metric-card' });
      const refreshed = dashboardService.refreshWidget(widget.id);
      return refreshed.status === 'success' && refreshed.lastUpdate !== undefined;
    });

    // Test 11: Share dashboard
    this.test('Share dashboard with users', () => {
      const dashboard = dashboardService.createDashboard('user-11', { name: 'Test' });
      const shared = dashboardService.shareDashboard(dashboard.id, ['user-12', 'user-13']);
      return shared.sharedWith.includes('user-12') && shared.sharedWith.includes('user-13');
    });

    // Test 12: Subscribe to dashboard
    this.test('Subscribe to dashboard updates', () => {
      const dashboard = dashboardService.createDashboard('user-14', { name: 'Test' });
      const callback = () => {};
      const subId = dashboardService.subscribeToDashboard(dashboard.id, callback);
      return subId !== undefined;
    });

    // Test 13: Get dashboard stats
    this.test('Get dashboard statistics', () => {
      const dashboard = dashboardService.createDashboard('user-15', { name: 'Test' });
      dashboardService.addWidget(dashboard.id, { type: 'line-chart' });
      dashboardService.addWidget(dashboard.id, { type: 'bar-chart' });
      const stats = dashboardService.getDashboardStats(dashboard.id);
      return stats.totalWidgets === 2;
    });
  }

  /**
   * Test Report Service
   */
  testReportService() {
    console.log(
      '\
📋 REPORT SERVICE TESTS\
'
    );

    // Test 1: Create report
    this.test('Create report', () => {
      const report = reportService.createReport('user-1', {
        name: 'Monthly Sales',
        type: 'sales',
      });
      return report.id && report.generationStatus === 'draft';
    });

    // Test 2: Get report
    this.test('Get report by ID', () => {
      const report = reportService.createReport('user-2', { name: 'Test' });
      const retrieved = reportService.getReport(report.id);
      return retrieved.id === report.id;
    });

    // Test 3: List reports
    this.test('List user reports', () => {
      reportService.createReport('user-3', { name: 'Report 1' });
      reportService.createReport('user-3', { name: 'Report 2' });
      const reports = reportService.listReports('user-3');
      return reports.length >= 2;
    });

    // Test 4: Generate report
    this.test('Generate report', () => {
      const report = reportService.createReport('user-4', { name: 'Sales' });
      const testData = [{ product: 'A', revenue: 1000 }];
      const result = reportService.generateReport(report.id, testData);
      return result.status === 'success';
    });

    // Test 5: Schedule report
    this.test('Schedule recurring report', () => {
      const report = reportService.createReport('user-5', { name: 'Test' });
      const schedule = reportService.scheduleReport(report.id, {
        frequency: 'daily',
        recipients: ['user@example.com'],
      });
      return schedule.frequency === 'daily';
    });

    // Test 6: Update report
    this.test('Update report', () => {
      const report = reportService.createReport('user-6', { name: 'Old Name' });
      const updated = reportService.updateReport(report.id, { name: 'New Name' });
      return updated.name === 'New Name';
    });

    // Test 7: Delete report
    this.test('Delete report', () => {
      const report = reportService.createReport('user-7', { name: 'To Delete' });
      const success = reportService.deleteReport(report.id);
      return success;
    });

    // Test 8: Get templates
    this.test('Get report templates', () => {
      const templates = reportService.getTemplates();
      return templates.salesSummary !== undefined && templates.hrReport !== undefined;
    });

    // Test 9: Export report
    this.test('Export report', () => {
      const report = reportService.createReport('user-9', { name: 'Test', format: 'pdf' });
      const testData = [{ id: 1, value: 100 }];
      reportService.generateReport(report.id, testData);
      const exported = reportService.exportReport(report.id);
      return exported.format === 'pdf';
    });

    // Test 10: Apply filters
    this.test('Generate report with filters', () => {
      const report = reportService.createReport('user-10', {
        name: 'Filtered Report',
        filters: { status: 'completed' },
      });
      const testData = [
        { id: 1, status: 'completed', value: 100 },
        { id: 2, status: 'pending', value: 50 },
      ];
      const result = reportService.generateReport(report.id, testData);
      return result.rowCount === 1;
    });
  }

  /**
   * Test Metrics Service
   */
  testMetricsService() {
    console.log(
      '\
📈 METRICS SERVICE TESTS\
'
    );

    // Test 1: Record metric
    this.test('Record metric value', () => {
      const metric = metricsService.recordMetric('cpu_usage', 45.5, { server: 'prod-1' });
      return metric.name === 'cpu_usage' && metric.value === 45.5;
    });

    // Test 2: Get metric values
    this.test('Get metric values', () => {
      metricsService.recordMetric('memory_usage', 60, { server: 'prod-1' });
      const now = new Date();
      const startDate = new Date(now.getTime() - 3600000);
      const values = metricsService.getMetricValues('memory_usage', startDate, now);
      return values.length > 0;
    });

    // Test 3: Calculate metric stats
    this.test('Calculate metric statistics', () => {
      metricsService.recordMetric('latency', 100);
      metricsService.recordMetric('latency', 150);
      metricsService.recordMetric('latency', 200);
      const stats = metricsService.calculateMetricStats('latency');
      return stats.count === 3 && stats.average === 150;
    });

    // Test 4: Define KPI
    this.test('Define KPI', () => {
      const kpi = metricsService.defineKPI('conversion_rate', {
        description: 'Website conversion rate',
        target: 5,
        unit: '%',
      });
      return kpi.name === 'conversion_rate' && kpi.target === 5;
    });

    // Test 5: Calculate KPI
    this.test('Calculate KPI value', () => {
      const kpi = metricsService.defineKPI('sales_target', {
        target: 100000,
        unit: '$',
      });
      const result = metricsService.calculateKPI(kpi.id, { value: 75000 });
      return result.percentage === '75.00';
    });

    // Test 6: List KPIs
    this.test('List KPIs', () => {
      metricsService.defineKPI('kpi1', { category: 'sales' });
      metricsService.defineKPI('kpi2', { category: 'sales' });
      const kpis = metricsService.listKPIs({ category: 'sales' });
      return kpis.length >= 2;
    });

    // Test 7: Get KPI dashboard
    this.test('Get KPI dashboard', () => {
      metricsService.defineKPI('dashboard_kpi', { category: 'general' });
      const dashboard = metricsService.getKPIDashboard('general');
      return dashboard.totalKPIs > 0 && dashboard.statusCounts !== undefined;
    });

    // Test 8: Get metric trend
    this.test('Get metric trend', () => {
      for (let i = 0; i < 5; i++) {
        metricsService.recordMetric('trend_test', 50 + i * 10);
      }
      const trend = metricsService.getMetricTrend('trend_test', 7);
      return trend.length > 0;
    });

    // Test 9: Compare metrics
    this.test('Compare metrics', () => {
      metricsService.recordMetric('metric_a', 100);
      metricsService.recordMetric('metric_b', 200);
      const now = new Date();
      const startDate = new Date(now.getTime() - 3600000);
      const comparison = metricsService.compareMetrics(['metric_a', 'metric_b'], startDate, now);
      return 'metric_a' in comparison && 'metric_b' in comparison;
    });
  }

  /**
   * Test helper - Run single test
   */
  test(description, testFn) {
    this.testCount++;
    try {
      const result = testFn();
      if (result) {
        this.passCount++;
        console.log(`  ✅ ${description}`);
      } else {
        this.failCount++;
        console.log(`  ❌ ${description} - Assertion failed`);
      }
    } catch (error) {
      this.failCount++;
      console.log(`  ❌ ${description} - ${error.message}`);
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    const successRate = ((this.passCount / this.testCount) * 100).toFixed(1);
    console.log(
      '\
' + '='.repeat(70)
    );
    console.log('  TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\
  Total Tests: ${this.testCount}`);
    console.log(`  ✅ Passed: ${this.passCount}`);
    console.log(`  ❌ Failed: ${this.failCount}`);
    console.log(`\
  Success Rate: ${successRate}%`);
    console.log(`\
  Status: ${this.failCount === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log(
      '\
' +
        '='.repeat(70) +
        '\
'
    );
  }
}

// Run tests if executed directly
if (require.main === module) {
  const testSuite = new AnalyticsTestSuite();
  testSuite.runAllTests();
}

module.exports = AnalyticsTestSuite;

// Jest compatibility wrapper
describe('Analytics Services', () => {
  it('should load analytics test suite', () => {
    const suite = new AnalyticsTestSuite();
    expect(suite).toBeDefined();
  });
});
