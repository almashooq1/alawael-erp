const EventEmitter = require('events');
const Report = require('../models/Report');
const Dashboard = require('../models/Dashboard');
const ReportTemplate = require('../models/ReportTemplate');

class ReportingService extends EventEmitter {
  constructor() {
    super();
    this.processingQueue = [];
    this.cacheMap = new Map();
  }

  // Report Generation Methods

  async generateReport(templateCode, filters = {}, userId) {
    try {
      this.emit('report-generation-started', { templateCode, userId });

      const template = await ReportTemplate.getByCode(templateCode);
      if (!template) {
        throw new Error(`Template not found: ${templateCode}`);
      }

      // Create report instance
      const report = new Report({
        templateId: template._id,
        templateCode,
        reportType: template.reportConfiguration.reportType,
        reportName: `${template.templateName} - ${new Date().toLocaleDateString()}`,
        dataFilters: filters,
        generatedBy: userId,
        generationTime: null,
        executionStatus: 'generating',
      });

      const startTime = Date.now();

      // Simulate data generation
      const reportData = await this.generateReportData(template, filters);
      await report.updateData(reportData);

      const generationTime = Date.now() - startTime;
      report.generationTime = generationTime;

      // Record template usage
      await template.recordUsage(userId);

      await report.save();

      this.emit('report-generated', {
        reportId: report.reportId,
        templateCode,
        generationTime,
      });

      return report;
    } catch (error) {
      this.emit('report-generation-failed', { error: error.message });
      throw error;
    }
  }

  async generateReportData(template, filters) {
    // This would integrate with actual data sources
    // For now, returning simulated data structure
    const metrics = template.reportConfiguration.metrics || [];
    const dimensions = template.reportConfiguration.dimensions || [];

    const summary = metrics.reduce((acc, m) => {
      acc[m.metricCode] = Math.floor(Math.random() * 100000);
      return acc;
    }, {});

    const details = Array.from({ length: Math.min(filters.limit || 100, 100) }, (_, i) => {
      const row = { id: i + 1 };
      dimensions.forEach(d => {
        row[d.field] = `${d.field}-${i + 1}`;
      });
      metrics.forEach(m => {
        row[m.metricCode] = Math.floor(Math.random() * 10000);
      });
      return row;
    });

    const charts = template.visualizations.map(v => ({
      type: v.chartConfig?.chartType || 'bar',
      title: v.title,
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: metrics.slice(0, 2).map(m => ({
          label: m.label,
          data: [
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
          ],
        })),
      },
    }));

    return {
      summary,
      details,
      charts,
      totals: Object.keys(summary).reduce((acc, key) => {
        acc[key] = summary[key];
        return acc;
      }, {}),
      pageCount: Math.ceil(details.length / 100),
    };
  }

  async refreshReport(reportId) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      await report.regenerate();

      const template = await ReportTemplate.findById(report.templateId);
      const newData = await this.generateReportData(template, report.dataFilters);
      await report.updateData(newData);

      this.emit('report-refreshed', { reportId });
      return report;
    } catch (error) {
      this.emit('report-refresh-failed', { error: error.message });
      throw error;
    }
  }

  async scheduleReport(reportId, frequency, recipients = []) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      report.isScheduled = true;
      report.refreshFrequency = frequency;
      report.recipients = recipients.map(r => ({
        email: r.email,
        name: r.name,
        role: r.role,
        addedAt: new Date(),
      }));

      // Set next scheduled run based on frequency
      const now = new Date();
      switch (frequency) {
        case 'daily':
          report.nextScheduledRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          report.nextScheduledRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          report.nextScheduledRun = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }

      await report.save();

      this.emit('report-scheduled', { reportId, frequency });
      return report;
    } catch (error) {
      throw error;
    }
  }

  async exportReport(reportId, format) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      const fileName = `${report.reportId}-${Date.now()}.${format}`;
      const fileSize = JSON.stringify(report.reportData).length;

      await report.addExport(format, fileName, fileSize);

      this.emit('report-exported', { reportId, format, fileName });

      return {
        fileName,
        format,
        size: fileSize,
        downloadUrl: `/api/reports/${reportId}/exports/${format}`,
      };
    } catch (error) {
      throw error;
    }
  }

  async exportToPDF(reportId, options = {}) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // PDF generation logic would go here
      return this.exportReport(reportId, 'pdf');
    } catch (error) {
      throw error;
    }
  }

  async exportToExcel(reportId, options = {}) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Excel generation logic would go here
      return this.exportReport(reportId, 'excel');
    } catch (error) {
      throw error;
    }
  }

  async exportToCSV(reportId, options = {}) {
    try {
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // CSV generation logic would go here
      return this.exportReport(reportId, 'csv');
    } catch (error) {
      throw error;
    }
  }

  // Dashboard Methods

  async createDashboard(dashboardData, userId) {
    try {
      const dashboard = new Dashboard({
        ...dashboardData,
        owner: userId,
        status: 'active',
      });

      await dashboard.save();

      this.emit('dashboard-created', {
        dashboardId: dashboard.dashboardId,
        userId,
      });

      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  async updateDashboard(dashboardId, updates) {
    try {
      const dashboard = await Dashboard.findOne({ dashboardId });
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      Object.assign(dashboard, updates);
      await dashboard.save();

      this.emit('dashboard-updated', { dashboardId });
      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  async getDashboard(dashboardId, userId) {
    try {
      const dashboard = await Dashboard.findOne({ dashboardId });
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      // Record view
      await dashboard.recordView(userId);

      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  async deleteDashboard(dashboardId) {
    try {
      const dashboard = await Dashboard.findOne({ dashboardId });
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      dashboard.status = 'deleted';
      await dashboard.save();

      this.emit('dashboard-deleted', { dashboardId });
      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  async shareDashboard(dashboardId, userId, email, name, permission) {
    try {
      const dashboard = await Dashboard.findOne({ dashboardId });
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      await dashboard.shareWith(userId, email, name, permission);

      this.emit('dashboard-shared', { dashboardId, userId });
      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  async exportDashboard(dashboardId, format) {
    try {
      const dashboard = await Dashboard.findOne({ dashboardId });
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const fileName = `${dashboard.dashboardId}-${Date.now()}.${format}`;

      this.emit('dashboard-exported', { dashboardId, format });

      return {
        fileName,
        format,
        downloadUrl: `/api/dashboards/${dashboardId}/exports/${format}`,
      };
    } catch (error) {
      throw error;
    }
  }

  // Template Methods

  async createTemplate(templateData, userId) {
    try {
      const template = new ReportTemplate({
        ...templateData,
        author: userId,
        status: 'draft',
      });

      const validation = await template.validate();
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      await template.save();

      this.emit('template-created', {
        templateId: template.templateId,
        templateCode: template.templateCode,
        userId,
      });

      return template;
    } catch (error) {
      throw error;
    }
  }

  async updateTemplate(templateId, updates) {
    try {
      const template = await ReportTemplate.findById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      Object.assign(template, updates);

      const validation = await template.validate();
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      await template.save();

      this.emit('template-updated', { templateId });
      return template;
    } catch (error) {
      throw error;
    }
  }

  async approveTemplate(templateId, approverEmail) {
    try {
      const template = await ReportTemplate.findById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      await template.approve(approverEmail);

      this.emit('template-approved', { templateId });
      return template;
    } catch (error) {
      throw error;
    }
  }

  // Analytics Methods

  async getReportAnalytics(hours = 24) {
    try {
      const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const totalGenerated = await Report.countDocuments({
        generatedAt: { $gte: sinceTime },
      });

      const avgGenerationTime = await Report.aggregate([
        {
          $match: {
            generatedAt: { $gte: sinceTime },
            executionStatus: 'complete',
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$generationTime' },
            totalTime: { $sum: '$generationTime' },
          },
        },
      ]);

      const byType = await Report.aggregate([
        { $match: { generatedAt: { $gte: sinceTime } } },
        {
          $group: {
            _id: '$reportType',
            count: { $sum: 1 },
            avgTime: { $avg: '$generationTime' },
          },
        },
      ]);

      return {
        period: `${hours}h`,
        totalGenerated,
        avgGenerationTime: avgGenerationTime[0]?.avgTime || 0,
        byType,
        timestamp: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getDashboardAnalytics() {
    try {
      return await Dashboard.getUsageAnalytics();
    } catch (error) {
      throw error;
    }
  }

  async getTemplateAnalytics() {
    try {
      return await ReportTemplate.getAnalytics();
    } catch (error) {
      throw error;
    }
  }

  // Utility Methods

  async processScheduledReports() {
    try {
      const scheduledReports = await Report.getScheduledReports();

      for (const report of scheduledReports) {
        await this.refreshReport(report.reportId);
      }

      this.emit('scheduled-reports-processed', { count: scheduledReports.length });
      return scheduledReports.length;
    } catch (error) {
      this.emit('scheduled-reports-processing-failed', { error: error.message });
      throw error;
    }
  }

  async cleanupOldReports(daysOld = 90) {
    try {
      const oldDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Report.updateMany(
        {
          createdAt: { $lt: oldDate },
          status: { $ne: 'archived' },
        },
        { status: 'archived' }
      );

      this.emit('old-reports-archived', { count: result.modifiedCount });
      return result.modifiedCount;
    } catch (error) {
      throw error;
    }
  }

  async getReportSuggestions(category) {
    try {
      return await ReportTemplate.getByCategory(category);
    } catch (error) {
      throw error;
    }
  }

  async searchTemplates(keyword) {
    try {
      return await ReportTemplate.searchByKeyword(keyword);
    } catch (error) {
      throw error;
    }
  }

  async getSystemStats() {
    try {
      const reportCount = await Report.countDocuments({ status: 'active' });
      const dashboardCount = await Dashboard.countDocuments({ status: 'active' });
      const templateCount = await ReportTemplate.countDocuments({ status: 'published' });

      return {
        reports: reportCount,
        dashboards: dashboardCount,
        templates: templateCount,
        timestamp: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ReportingService();
