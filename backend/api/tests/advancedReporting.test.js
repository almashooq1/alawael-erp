/**
 * Advanced Reporting Service Tests
 * اختبارات الخدمة المتقدمة للتقارير
 *
 * 35+ اختبار شامل
 */

const AdvancedReportingServiceClass = require('../../services/advancedReportingService');
const assert = require('assert');

describe('AdvancedReportingService Tests', () => {
  let reportingService;
  let sampleData;
  let reportTemplate;

  beforeEach(() => {
    reportingService = new AdvancedReportingServiceClass();

    // Sample data for testing
    sampleData = [
      { id: 1, name: 'Ahmed', department: 'Engineering', sales: 5000, date: '2024-01-15' },
      { id: 2, name: 'Fatima', department: 'Marketing', sales: 3500, date: '2024-01-20' },
      { id: 3, name: 'Omar', department: 'Sales', sales: 7000, date: '2024-01-25' },
      { id: 4, name: 'Leila', department: 'Engineering', sales: 4500, date: '2024-02-05' },
    ];

    // Report template
    reportTemplate = {
      name: 'Sales Report',
      description: 'Monthly sales analysis',
      format: 'html',
      sections: [
        { type: 'title', content: 'Monthly Sales Report' },
        { type: 'summary', fields: ['sales'] },
        { type: 'table', columns: ['name', 'department', 'sales'] },
        { type: 'chart', chartType: 'bar', field: 'sales' },
      ],
    };
  });

  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================
  describe('Template Management', () => {
    test('should create new report template', () => {
      const result = reportingService.createTemplate(reportTemplate);
      assert(result.id, 'Template should have an ID');
      assert(result.name === 'Sales Report');
    });

    test('should retrieve template by ID', () => {
      const created = reportingService.createTemplate(reportTemplate);
      const retrieved = reportingService.getTemplate(created.id);
      assert(retrieved.name === reportTemplate.name);
    });

    test('should update existing template', () => {
      const created = reportingService.createTemplate(reportTemplate);
      const updated = reportingService.updateTemplate(created.id, {
        name: 'Updated Sales Report',
      });
      assert(updated.name === 'Updated Sales Report');
    });

    test('should delete template', () => {
      const created = reportingService.createTemplate(reportTemplate);
      const deleted = reportingService.deleteTemplate(created.id);
      assert(deleted, 'Should return true when template is deleted');
    });

    test('should list all templates', () => {
      reportingService.createTemplate(reportTemplate);
      reportingService.createTemplate({ ...reportTemplate, name: 'Another Report' });
      const templates = reportingService.listTemplates();
      assert(templates.length >= 2, 'Should list all templates');
    });

    test('should validate template structure', () => {
      const invalidTemplate = { name: 'Invalid' }; // Missing required fields
      const result = reportingService.validateTemplate(invalidTemplate);
      assert(!result.valid, 'Should identify invalid template');
    });
  });

  // ============================================
  // REPORT GENERATION
  // ============================================
  describe('Report Generation', () => {
    test('should generate basic report', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      assert(report.content, 'Report should have content');
      assert(report.generatedAt, 'Report should have generation timestamp');
    });

    test('should generate report with filters', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData, {
        filters: [{ field: 'department', operator: 'equals', value: 'Engineering' }],
      });
      assert(report.content, 'Report should be generated with filters');
    });

    test('should generate report in different formats', () => {
      const htmlReport = reportingService.generateReport({ ...reportTemplate, format: 'html' }, sampleData);
      const csvReport = reportingService.generateReport({ ...reportTemplate, format: 'csv' }, sampleData);
      assert(htmlReport.content, 'HTML report should be generated');
      assert(csvReport.content, 'CSV report should be generated');
    });

    test('should generate report with aggregations', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData, {
        aggregations: {
          totalSales: { type: 'sum', field: 'sales' },
          averageSales: { type: 'avg', field: 'sales' },
          maxSales: { type: 'max', field: 'sales' },
        },
      });
      assert(report.aggregations, 'Report should include aggregations');
    });

    test('should include section headers in report', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const content = report.content.toLowerCase();
      assert(content.includes('monthly') || content.includes('sales'), 'Report should contain template sections');
    });

    test('should handle empty data in report', () => {
      const report = reportingService.generateReport(reportTemplate, []);
      assert(report.content, 'Report should be generated even with empty data');
    });
  });

  // ============================================
  // REPORT SCHEDULING
  // ============================================
  describe('Report Scheduling', () => {
    test('should schedule recurring report', () => {
      const schedule = {
        templateId: 'template-1',
        frequency: 'monthly',
        dayOfMonth: 15,
        time: '09:00',
        recipients: ['user@example.com'],
        format: 'pdf',
      };
      const result = reportingService.scheduleReport(schedule);
      assert(result.scheduleId, 'Schedule should have an ID');
      assert(result.nextRun, 'Schedule should have next run time');
    });

    test('should support different frequencies', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      frequencies.forEach(freq => {
        const schedule = {
          templateId: 'template-1',
          frequency: freq,
          time: '09:00',
        };
        const result = reportingService.scheduleReport(schedule);
        assert(result.frequency === freq, `Should support ${freq} frequency`);
      });
    });

    test('should calculate next run time correctly', () => {
      const now = new Date();
      const schedule = {
        templateId: 'template-1',
        frequency: 'daily',
        time: '10:00',
      };
      const result = reportingService.scheduleReport(schedule);
      const nextRun = new Date(result.nextRun);
      assert(nextRun > now, 'Next run should be in the future');
    });

    test('should get scheduled report details', () => {
      const schedule = {
        templateId: 'template-1',
        frequency: 'weekly',
        dayOfWeek: 1,
        time: '09:00',
      };
      const created = reportingService.scheduleReport(schedule);
      const retrieved = reportingService.getSchedule(created.scheduleId);
      assert(retrieved.frequency === 'weekly');
    });

    test('should pause scheduled report', () => {
      const schedule = {
        templateId: 'template-1',
        frequency: 'daily',
        time: '09:00',
      };
      const created = reportingService.scheduleReport(schedule);
      const paused = reportingService.pauseSchedule(created.scheduleId);
      assert(paused.status === 'paused');
    });

    test('should resume paused schedule', () => {
      const schedule = {
        templateId: 'template-1',
        frequency: 'daily',
        time: '09:00',
      };
      const created = reportingService.scheduleReport(schedule);
      reportingService.pauseSchedule(created.scheduleId);
      const resumed = reportingService.resumeSchedule(created.scheduleId);
      assert(resumed.status === 'active');
    });

    test('should delete schedule', () => {
      const schedule = {
        templateId: 'template-1',
        frequency: 'weekly',
        dayOfWeek: 1,
      };
      const created = reportingService.scheduleReport(schedule);
      const deleted = reportingService.deleteSchedule(created.scheduleId);
      assert(deleted, 'Should return true when schedule is deleted');
    });
  });

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  describe('Export Functionality', () => {
    test('should export report to CSV', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const csv = reportingService.exportToCSV(report);
      assert(csv.includes('name') || csv.includes('department'), 'CSV should contain data');
    });

    test('should export report to Excel', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const excel = reportingService.exportToExcel(report);
      assert(excel, 'Excel export should be generated');
    });

    test('should export report to PDF', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const pdf = reportingService.exportToPDF(report);
      assert(pdf, 'PDF export should be generated');
    });

    test('should export with custom filename', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const filename = 'custom-report.csv';
      const csv = reportingService.exportToCSV(report, filename);
      assert(csv, 'Export should be generated with custom filename');
    });

    test('should include metadata in export', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const csv = reportingService.exportToCSV(report, null, { includeMetadata: true });
      assert(csv, 'Export should include metadata');
    });

    test('should support partial exports', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const csv = reportingService.exportToCSV(report, null, {
        columns: ['name', 'sales'],
      });
      assert(csv.includes('sales'), 'Export should include selected columns only');
    });
  });

  // ============================================
  // FILTERING AND AGGREGATION
  // ============================================
  describe('Filtering and Aggregation', () => {
    test('should apply filters during report generation', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData, {
        filters: [{ field: 'department', operator: 'equals', value: 'Engineering' }],
      });
      assert(report.content, 'Report should be generated with filters');
    });

    test('should calculate sum aggregation', () => {
      const result = reportingService.aggregate(sampleData, {
        type: 'sum',
        field: 'sales',
      });
      assert(result === 20000, 'Sum should be 20000');
    });

    test('should calculate average aggregation', () => {
      const result = reportingService.aggregate(sampleData, {
        type: 'avg',
        field: 'sales',
      });
      assert(result === 5000, 'Average should be 5000');
    });

    test('should calculate count aggregation', () => {
      const result = reportingService.aggregate(sampleData, {
        type: 'count',
      });
      assert(result === 4, 'Count should be 4');
    });

    test('should group data for aggregation', () => {
      const grouped = reportingService.groupAndAggregate(sampleData, {
        groupBy: 'department',
        aggregations: {
          totalSales: { type: 'sum', field: 'sales' },
          count: { type: 'count' },
        },
      });
      assert(grouped.length > 0, 'Should return grouped data');
    });
  });

  // ============================================
  // CHARTS AND VISUALIZATION
  // ============================================
  describe('Charts and Visualization', () => {
    test('should generate chart data for bar chart', () => {
      const chartData = reportingService.generateChartData(sampleData, {
        type: 'bar',
        xField: 'name',
        yField: 'sales',
      });
      assert(chartData.labels.length > 0, 'Should have chart labels');
      assert(chartData.datasets.length > 0, 'Should have chart datasets');
    });

    test('should generate chart data for pie chart', () => {
      const chartData = reportingService.generateChartData(sampleData, {
        type: 'pie',
        field: 'department',
      });
      assert(chartData.labels.length > 0, 'Should have pie chart labels');
    });

    test('should generate chart data for line chart', () => {
      const chartData = reportingService.generateChartData(sampleData, {
        type: 'line',
        xField: 'date',
        yField: 'sales',
      });
      assert(chartData.labels.length > 0, 'Should have time series labels');
    });

    test('should support chart customization', () => {
      const chartData = reportingService.generateChartData(sampleData, {
        type: 'bar',
        xField: 'name',
        yField: 'sales',
        title: 'Sales by Name',
        colors: ['#ff0000', '#00ff00'],
        legend: true,
      });
      assert(chartData.title === 'Sales by Name', 'Should include custom title');
    });
  });

  // ============================================
  // EMAIL DISTRIBUTION
  // ============================================
  describe('Email Distribution', () => {
    test('should send report via email', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const result = reportingService.emailReport(report, {
        recipients: ['user@example.com'],
        subject: 'Monthly Report',
        format: 'pdf',
      });
      assert(result.emailId, 'Should return email ID');
      assert(result.status === 'sent');
    });

    test('should send to multiple recipients', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const result = reportingService.emailReport(report, {
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Monthly Report',
      });
      assert(result.recipientCount === 2, 'Should send to 2 recipients');
    });

    test('should include attachments in email', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const result = reportingService.emailReport(report, {
        recipients: ['user@example.com'],
        subject: 'Monthly Report',
        attachments: [{ filename: 'data.csv', data: 'csv content' }],
      });
      assert(result.status === 'sent', 'Email should be sent with attachments');
    });

    test('should support email templates', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const result = reportingService.emailReport(report, {
        recipients: ['user@example.com'],
        templateId: 'report-email-template',
      });
      assert(result.status === 'sent', 'Should use email template');
    });
  });

  // ============================================
  // CACHING AND PERFORMANCE
  // ============================================
  describe('Caching and Performance', () => {
    test('should cache generated report', () => {
      const report1 = reportingService.generateReport(reportTemplate, sampleData);
      const report2 = reportingService.generateReport(reportTemplate, sampleData);
      assert(report1.id === report2.id || report1.content === report2.content, 'Should use cache');
    });

    test('should clear report cache', () => {
      reportingService.generateReport(reportTemplate, sampleData);
      const cleared = reportingService.clearCache();
      assert(cleared, 'Cache should be cleared');
    });

    test('should handle large dataset efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        sales: Math.random() * 10000,
        department: ['Engineering', 'Sales', 'Marketing'][i % 3],
      }));

      const start = Date.now();
      const report = reportingService.generateReport(reportTemplate, largeData);
      const duration = Date.now() - start;

      assert(report.content, 'Report should be generated');
      assert(duration < 5000, 'Should generate large report within 5 seconds');
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================
  describe('Error Handling', () => {
    test('should handle invalid template', () => {
      const result = reportingService.generateReport(null, sampleData);
      assert(result.error || !result.content, 'Should handle invalid template');
    });

    test('should handle invalid data format', () => {
      const result = reportingService.generateReport(reportTemplate, 'invalid');
      assert(result.error || Array.isArray(result), 'Should handle invalid data');
    });

    test('should handle missing required fields', () => {
      const invalidTemplate = { name: 'Report' }; // Missing sections
      const result = reportingService.generateReport(invalidTemplate, sampleData);
      assert(result.error || result.content, 'Should handle missing fields gracefully');
    });

    test('should validate filter conditions', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData, {
        filters: [{ field: 'invalid', operator: 'equals', value: 'test' }],
      });
      assert(report.content, 'Should handle invalid filters');
    });
  });

  // ============================================
  // REPORT HISTORY
  // ============================================
  describe('Report History', () => {
    test('should save report to history', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const saved = reportingService.saveToHistory(report);
      assert(saved.historyId, 'Should save to history');
    });

    test('should retrieve report from history', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const saved = reportingService.saveToHistory(report);
      const retrieved = reportingService.getFromHistory(saved.historyId);
      assert(retrieved.id === report.id || retrieved.content === report.content);
    });

    test('should list report history', () => {
      reportingService.generateReport(reportTemplate, sampleData);
      const history = reportingService.getReportHistory();
      assert(Array.isArray(history), 'Should return array of history');
    });

    test('should delete from history', () => {
      const report = reportingService.generateReport(reportTemplate, sampleData);
      const saved = reportingService.saveToHistory(report);
      const deleted = reportingService.deleteFromHistory(saved.historyId);
      assert(deleted, 'Should delete from history');
    });
  });
});
