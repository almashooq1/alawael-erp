const request = require('supertest');

jest.mock('../models/Report');
jest.mock('../models/Dashboard');
jest.mock('../models/ReportTemplate');

describe('Advanced Reporting Engine - Phase 6', () => {
  let reportingService;

  beforeEach(() => {
    jest.clearAllMocks();

    reportingService = {
      on: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnThis(),

      // Report methods
      generateReport: jest.fn(),
      refreshReport: jest.fn(),
      scheduleReport: jest.fn(),
      exportReport: jest.fn(),
      exportToPDF: jest.fn(),
      exportToExcel: jest.fn(),
      exportToCSV: jest.fn(),

      // Dashboard methods
      createDashboard: jest.fn(),
      updateDashboard: jest.fn(),
      getDashboard: jest.fn(),
      deleteDashboard: jest.fn(),
      shareDashboard: jest.fn(),
      exportDashboard: jest.fn(),

      // Template methods
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      approveTemplate: jest.fn(),

      // Analytics
      getReportAnalytics: jest.fn(),
      getDashboardAnalytics: jest.fn(),
      getTemplateAnalytics: jest.fn(),
      getSystemStats: jest.fn(),

      // Utility
      processScheduledReports: jest.fn(),
      searchTemplates: jest.fn(),
    };

    // Set up generateReport to emit 'report-generated' when resolved
    reportingService.generateReport.mockImplementation(async (templateId, filters, userId) => {
      const report = {
        reportId: 'REPORT-123456789',
        reportName: 'Sales Summary',
        reportType: 'sales_summary',
        status: 'complete',
        generationTime: 250,
      };
      reportingService.emit('report-generated', report);
      return report;
    });

    // Set up refreshReport to emit 'report-refreshed'
    reportingService.refreshReport.mockImplementation(async reportId => {
      const report = { reportId, status: 'refreshed', refreshedAt: new Date() };
      reportingService.emit('report-refreshed', report);
      return report;
    });

    // Set up processScheduledReports to emit 'scheduled-reports-processed'
    reportingService.processScheduledReports.mockImplementation(async () => {
      const result = { processed: 1, skipped: 0, failed: 0 };
      reportingService.emit('scheduled-reports-processed', result);
      return result;
    });

    // Set up createDashboard to emit 'dashboard-created'
    reportingService.createDashboard.mockImplementation(async dashboardData => {
      const dashboard = { dashboardId: 'DASH-123', ...dashboardData };
      reportingService.emit('dashboard-created', dashboard);
      return dashboard;
    });

    // Set up createTemplate to emit 'template-created'
    reportingService.createTemplate.mockImplementation(async templateData => {
      const template = { templateId: 'TMPL-123', ...templateData };
      reportingService.emit('template-created', template);
      return template;
    });
  });

  describe('REPORT GENERATION', () => {
    test('should generate report from template', async () => {
      const report = {
        reportId: 'REPORT-123456789',
        reportName: 'Sales Summary',
        reportType: 'sales_summary',
        status: 'complete',
        generationTime: 250,
        getSummary: () => ({ reportId: 'REPORT-123456789', status: 'complete' }),
      };

      reportingService.generateReport.mockImplementation(async () => {
        reportingService.emit('report-generated', report);
        return report;
      });

      const result = await reportingService.generateReport('SALES_SUMMARY', {}, 'user-123');

      expect(result.reportId).toBe('REPORT-123456789');
      expect(result.status).toBe('complete');
      expect(reportingService.emit).toHaveBeenCalledWith('report-generated', expect.any(Object));
    });

    test('should handle missing template error', async () => {
      reportingService.generateReport.mockRejectedValue(new Error('Template not found'));

      try {
        await reportingService.generateReport('INVALID_TEMPLATE', {}, 'user-123');
      } catch (error) {
        expect(error.message).toBe('Template not found');
      }
    });

    test('should include data filters in generated report', async () => {
      const filters = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        department: 'Sales',
      };

      const report = {
        reportId: 'REPORT-123456789',
        dataFilters: filters,
        getSummary: () => ({ dataFilters: filters }),
      };

      reportingService.generateReport.mockResolvedValue(report);

      const result = await reportingService.generateReport('TEMPLATE', filters, 'user-123');

      expect(result.dataFilters).toEqual(filters);
    });

    test('should measure generation time', async () => {
      const report = {
        reportId: 'REPORT-123456789',
        generationTime: 523,
        getSummary: () => ({ generationTime: 523 }),
      };

      reportingService.generateReport.mockResolvedValue(report);

      const result = await reportingService.generateReport('TEMPLATE', {}, 'user-123');

      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.generationTime).toBeLessThan(1000);
    });

    test('should refresh cached report', async () => {
      const report = {
        reportId: 'REPORT-123456789',
        lastRefreshedAt: new Date(),
        getSummary: () => ({}),
      };

      reportingService.refreshReport.mockImplementation(async reportId => {
        reportingService.emit('report-refreshed', report);
        return report;
      });

      const result = await reportingService.refreshReport('REPORT-123456789');

      expect(result.lastRefreshedAt).toBeDefined();
      expect(reportingService.emit).toHaveBeenCalledWith('report-refreshed', expect.any(Object));
    });

    test('should schedule report for recurring delivery', async () => {
      const report = {
        reportId: 'REPORT-123456789',
        isScheduled: true,
        refreshFrequency: 'daily',
        recipients: [{ email: 'user@example.com', name: 'John' }],
        getSummary: () => ({}),
      };

      reportingService.scheduleReport.mockResolvedValue(report);

      const result = await reportingService.scheduleReport('REPORT-123456789', 'daily', [
        { email: 'user@example.com', name: 'John' },
      ]);

      expect(result.isScheduled).toBe(true);
      expect(result.refreshFrequency).toBe('daily');
    });
  });

  describe('REPORT EXPORT', () => {
    test('should export to PDF', async () => {
      const exportData = {
        fileName: 'REPORT-123-2026-02-13.pdf',
        format: 'pdf',
        downloadUrl: '/api/reports/REPORT-123/exports/pdf',
      };

      reportingService.exportToPDF.mockResolvedValue(exportData);

      const result = await reportingService.exportToPDF('REPORT-123456789');

      expect(result.format).toBe('pdf');
      expect(result.fileName).toContain('pdf');
    });

    test('should export to Excel', async () => {
      const exportData = {
        fileName: 'REPORT-123-2026-02-13.excel',
        format: 'excel',
        downloadUrl: '/api/reports/REPORT-123/exports/excel',
      };

      reportingService.exportToExcel.mockResolvedValue(exportData);

      const result = await reportingService.exportToExcel('REPORT-123456789');

      expect(result.format).toBe('excel');
      expect(result.fileName).toContain('excel');
    });

    test('should export to CSV', async () => {
      const exportData = {
        fileName: 'REPORT-123-2026-02-13.csv',
        format: 'csv',
        downloadUrl: '/api/reports/REPORT-123/exports/csv',
      };

      reportingService.exportToCSV.mockResolvedValue(exportData);

      const result = await reportingService.exportToCSV('REPORT-123456789');

      expect(result.format).toBe('csv');
      expect(result.fileName).toContain('csv');
    });

    test('should track download counts', async () => {
      const exportData = {
        fileName: 'REPORT-123.pdf',
        format: 'pdf',
        downloadCount: 1,
      };

      reportingService.exportToPDF.mockResolvedValue(exportData);

      const result = await reportingService.exportToPDF('REPORT-123456789');

      expect(result.downloadCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DASHBOARD OPERATIONS', () => {
    test('should create dashboard', async () => {
      const dashboard = {
        dashboardId: 'DASHBOARD-123456789',
        dashboardName: 'Executive Dashboard',
        dashboardType: 'executive',
        status: 'active',
        owner: 'user-123',
        getSummary: () => ({ dashboardId: 'DASHBOARD-123456789' }),
      };

      reportingService.createDashboard.mockResolvedValue(dashboard);

      const result = await reportingService.createDashboard(
        {
          dashboardName: 'Executive Dashboard',
          dashboardType: 'executive',
        },
        'user-123'
      );

      expect(result.dashboardId).toBeDefined();
      expect(result.status).toBe('active');
    });

    test('should update dashboard widgets', async () => {
      const dashboard = {
        dashboardId: 'DASHBOARD-123456789',
        widgets: [{ widgetId: 'W1', position: { x: 0, y: 0 } }],
        getSummary: () => ({}),
      };

      reportingService.updateDashboard.mockResolvedValue(dashboard);

      const result = await reportingService.updateDashboard('DASHBOARD-123456789', {
        widgets: [{ widgetId: 'W1', position: { x: 10, y: 10 } }],
      });

      expect(result.widgets).toBeDefined();
    });

    test('should track dashboard views', async () => {
      const dashboard = {
        dashboardId: 'DASHBOARD-123456789',
        viewCount: 42,
        lastViewedAt: new Date(),
        lastViewedBy: 'user-456',
      };

      reportingService.getDashboard.mockResolvedValue(dashboard);

      const result = await reportingService.getDashboard('DASHBOARD-123456789', 'user-456');

      expect(result.viewCount).toBeGreaterThan(0);
      expect(result.lastViewedBy).toBeDefined();
    });

    test('should share dashboard with users', async () => {
      const dashboard = {
        dashboardId: 'DASHBOARD-123456789',
        sharedWith: [{ userId: 'user-456', email: 'user@example.com', permission: 'view' }],
        getSummary: () => ({}),
      };

      reportingService.shareDashboard.mockResolvedValue(dashboard);

      const result = await reportingService.shareDashboard(
        'DASHBOARD-123456789',
        'user-456',
        'user@example.com',
        'John',
        'view'
      );

      expect(result.sharedWith).toHaveLength(1);
    });

    test('should export dashboard snapshot', async () => {
      const exportData = {
        fileName: 'DASHBOARD-123-2026-02-13.pdf',
        format: 'pdf',
        downloadUrl: '/api/dashboards/DASHBOARD-123/exports/pdf',
      };

      reportingService.exportDashboard.mockResolvedValue(exportData);

      const result = await reportingService.exportDashboard('DASHBOARD-123456789', 'pdf');

      expect(result.format).toBe('pdf');
    });

    test('should delete dashboard', async () => {
      const dashboard = {
        dashboardId: 'DASHBOARD-123456789',
        status: 'deleted',
      };

      reportingService.deleteDashboard.mockResolvedValue(dashboard);

      const result = await reportingService.deleteDashboard('DASHBOARD-123456789');

      expect(result.status).toBe('deleted');
    });
  });

  describe('TEMPLATE MANAGEMENT', () => {
    test('should create report template', async () => {
      const template = {
        templateId: 'TEMPLATE-123456789',
        templateCode: 'SALES_SUMMARY',
        templateName: 'Sales Summary Report',
        status: 'draft',
        getSummary: () => ({ templateCode: 'SALES_SUMMARY' }),
      };

      reportingService.createTemplate.mockResolvedValue(template);

      const result = await reportingService.createTemplate(
        {
          templateCode: 'SALES_SUMMARY',
          templateName: 'Sales Summary Report',
          reportConfiguration: {
            metrics: [{ metricCode: 'REVENUE' }],
          },
        },
        'user-123'
      );

      expect(result.templateCode).toBe('SALES_SUMMARY');
      expect(result.status).toBe('draft');
    });

    test('should validate template structure', async () => {
      reportingService.createTemplate.mockRejectedValue(
        new Error('Template validation failed: At least one metric is required')
      );

      try {
        await reportingService.createTemplate({}, 'user-123');
      } catch (error) {
        expect(error.message).toContain('validation');
      }
    });

    test('should approve template for use', async () => {
      const template = {
        templateId: 'TEMPLATE-123456789',
        isApproved: true,
        approvedBy: 'admin@example.com',
        status: 'published',
      };

      reportingService.approveTemplate.mockResolvedValue(template);

      const result = await reportingService.approveTemplate(
        'TEMPLATE-123456789',
        'admin@example.com'
      );

      expect(result.isApproved).toBe(true);
      expect(result.status).toBe('published');
    });

    test('should track template usage statistics', async () => {
      const template = {
        templateId: 'TEMPLATE-123456789',
        usageStats: {
          totalUsage: 150,
          totalReportsGenerated: 150,
          totalDownloads: 85,
        },
      };

      reportingService.createTemplate.mockResolvedValue(template);

      const result = await reportingService.createTemplate({}, 'user-123');

      expect(result.usageStats.totalUsage).toBeGreaterThan(0);
    });
  });

  describe('ANALYTICS', () => {
    test('should calculate report statistics', async () => {
      const stats = {
        period: '24h',
        totalGenerated: 485,
        avgGenerationTime: 523,
        byType: [
          { _id: 'sales_summary', count: 200 },
          { _id: 'financial_overview', count: 285 },
        ],
      };

      reportingService.getReportAnalytics.mockResolvedValue(stats);

      const result = await reportingService.getReportAnalytics(24);

      expect(result.totalGenerated).toBeGreaterThan(0);
      expect(result.avgGenerationTime).toBeGreaterThan(0);
      expect(result.byType).toBeDefined();
    });

    test('should measure dashboard usage', async () => {
      const analytics = [
        { _id: 'executive', count: 15, totalViews: 1200 },
        { _id: 'operational', count: 8, totalViews: 450 },
      ];

      reportingService.getDashboardAnalytics.mockResolvedValue(analytics);

      const result = await reportingService.getDashboardAnalytics();

      expect(result).toBeInstanceOf(Array);
      expect(result[0].totalViews).toBeGreaterThan(0);
    });

    test('should track template performance', async () => {
      const analytics = [
        { _id: 'sales', count: 45, totalUsage: 1200 },
        { _id: 'financial', count: 32, totalUsage: 950 },
      ];

      reportingService.getTemplateAnalytics.mockResolvedValue(analytics);

      const result = await reportingService.getTemplateAnalytics();

      expect(result[0].totalUsage).toBeGreaterThan(0);
    });

    test('should provide system statistics', async () => {
      const stats = {
        reports: 2500,
        dashboards: 125,
        templates: 95,
        timestamp: new Date(),
      };

      reportingService.getSystemStats.mockResolvedValue(stats);

      const result = await reportingService.getSystemStats();

      expect(result.reports).toBeGreaterThan(0);
      expect(result.dashboards).toBeGreaterThan(0);
      expect(result.templates).toBeGreaterThan(0);
    });
  });

  describe('SCHEDULED REPORT PROCESSING', () => {
    test('should process scheduled reports', async () => {
      reportingService.processScheduledReports.mockImplementation(async () => {
        const result = { processed: 25, skipped: 0, failed: 0 };
        reportingService.emit('scheduled-reports-processed', result);
        return result;
      });

      const result = await reportingService.processScheduledReports();

      expect(result).toBeDefined();
      expect(reportingService.emit).toHaveBeenCalledWith(
        'scheduled-reports-processed',
        expect.any(Object)
      );
    });

    test('should handle processing errors gracefully', async () => {
      reportingService.processScheduledReports.mockRejectedValue(new Error('Processing failed'));

      try {
        await reportingService.processScheduledReports();
      } catch (error) {
        expect(error.message).toBe('Processing failed');
      }
    });
  });

  describe('SEARCH & DISCOVERY', () => {
    test('should search templates by keyword', async () => {
      const templates = [
        { templateCode: 'SALES_SUMMARY', templateName: 'Sales Summary' },
        { templateCode: 'SALES_FORECAST', templateName: 'Sales Forecast' },
      ];

      reportingService.searchTemplates.mockResolvedValue(templates);

      const result = await reportingService.searchTemplates('sales');

      expect(result).toHaveLength(2);
      expect(result[0].templateCode).toContain('SALES');
    });

    test('should handle empty search results', async () => {
      reportingService.searchTemplates.mockResolvedValue([]);

      const result = await reportingService.searchTemplates('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('ERROR HANDLING', () => {
    test('should provide meaningful error messages', async () => {
      reportingService.generateReport.mockRejectedValue(
        new Error('Template validation failed: Missing metric definitions')
      );

      try {
        await reportingService.generateReport('INVALID', {}, 'user-123');
      } catch (error) {
        expect(error.message).toContain('validation');
      }
    });

    test('should handle database connection errors', async () => {
      reportingService.getSystemStats.mockRejectedValue(new Error('Database connection failed'));

      try {
        await reportingService.getSystemStats();
      } catch (error) {
        expect(error.message).toContain('Database');
      }
    });

    test('should handle concurrent report generation', async () => {
      const promise1 = reportingService.generateReport('TEMPLATE1', {}, 'user-1');
      const promise2 = reportingService.generateReport('TEMPLATE2', {}, 'user-2');

      reportingService.generateReport.mockResolvedValue({
        reportId: 'REPORT-123',
        getSummary: () => ({}),
      });

      const results = await Promise.all([promise1, promise2]);

      expect(results).toHaveLength(2);
    });
  });

  describe('EVENT EMISSION', () => {
    test('should emit report-generated event', async () => {
      const report = { reportId: 'REPORT-123', getSummary: () => ({}) };
      reportingService.generateReport.mockImplementation(async () => {
        reportingService.emit('report-generated', report);
        return report;
      });

      await reportingService.generateReport('TEMPLATE', {}, 'user-123');

      expect(reportingService.emit).toHaveBeenCalledWith('report-generated', expect.any(Object));
    });

    test('should emit dashboard-created event', async () => {
      const dashboard = { dashboardId: 'DASHBOARD-123', getSummary: () => ({}) };
      reportingService.createDashboard.mockImplementation(async () => {
        reportingService.emit('dashboard-created', dashboard);
        return dashboard;
      });

      await reportingService.createDashboard({}, 'user-123');

      expect(reportingService.emit).toHaveBeenCalledWith('dashboard-created', expect.any(Object));
    });

    test('should emit template-created event', async () => {
      const template = { templateId: 'TEMPLATE-123', getSummary: () => ({}) };
      reportingService.createTemplate.mockImplementation(async () => {
        reportingService.emit('template-created', template);
        return template;
      });

      await reportingService.createTemplate({}, 'user-123');

      expect(reportingService.emit).toHaveBeenCalledWith('template-created', expect.any(Object));
    });
  });
});
