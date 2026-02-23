const Report = require('../models/Report');
const logger = require('../utils/logger');

class ReportService {
  /**
   * Get available reports
   */
  async getAvailableReports(query = {}) {
    try {
      let mongoQuery = {};

      // Filter by status
      if (query.status) {
        mongoQuery.status = query.status;
      }

      // Filter by type
      if (query.type) {
        mongoQuery.type = query.type;
      }

      // Search by title
      if (query.search) {
        mongoQuery.title = { $regex: query.search, $options: 'i' };
      }

      const reports = await Report.find(mongoQuery)
        .populate('requestedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return reports;
    } catch (error) {
      logger.error('Error in getAvailableReports:', error);
      throw error;
    }
  }

  /**
   * Generate new report
   */
  async generateReport(data) {
    try {
      const startTime = Date.now();

      const report = new Report({
        title: `${data.reportType} Report`,
        type: data.reportType,
        format: data.format,
        status: 'generating',
        requestedBy: data.requestedBy,
        requestedAt: data.requestedAt,
        filters: data.filters,
        content: this._generateReportContent(data.reportType, data.filters)
      });

      const saved = await report.save();

      // Update processing time and mark as completed
      const processingTime = Date.now() - startTime;
      saved.processingTime = processingTime;
      saved.fileSize = this._calculateFileSize(saved.content);
      saved.status = 'completed';
      saved.completedAt = new Date();

      await saved.save();

      logger.info(`Report generated: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error in generateReport:', error);
      throw error;
    }
  }

  /**
   * Generate report content
   */
  _generateReportContent(reportType, filters) {
    const baseContent = {
      reportType,
      generatedAt: new Date(),
      filters,
      sections: []
    };

    switch (reportType) {
      case 'disability-summary':
        baseContent.sections = [
          { title: 'Executive Summary', data: { programs: 5, beneficiaries: 150, completion: '85%' } },
          { title: 'Program Performance', data: { avgScore: 8.5, retention: '92%' } },
          { title: 'Goals Achievement', data: { completed: 245, inProgress: 187 } }
        ];
        break;

      case 'maintenance-schedule':
        baseContent.sections = [
          { title: 'Scheduled Maintenance', data: { total: 50, completed: 35, pending: 15 } },
          { title: 'Cost Analysis', data: { totalCost: 50000, avgCost: 1000 } },
          { title: 'Downtime', data: { hours: 120, percentage: 2.5 } }
        ];
        break;

      case 'performance':
        baseContent.sections = [
          { title: 'System Performance', data: { uptime: '99.9%', avgResponse: '75ms' } },
          { title: 'Module Statistics', data: { requests: 50000, errors: 500 } },
          { title: 'User Activity', data: { activeUsers: 250, sessions: 1200 } }
        ];
        break;

      default:
        baseContent.sections = [
          { title: 'Summary', data: { status: 'generated', timestamp: new Date() } }
        ];
    }

    return baseContent;
  }

  /**
   * Calculate simulated file size
   */
  _calculateFileSize(content) {
    const sizeEstimate = JSON.stringify(content).length;
    const sizeInKB = (sizeEstimate / 1024).toFixed(1);
    return `${sizeInKB}KB`;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId) {
    try {
      const report = await Report.findById(reportId)
        .populate('requestedBy', 'firstName lastName email');

      return report || null;
    } catch (error) {
      logger.error('Error in getReportById:', error);
      throw error;
    }
  }

  /**
   * Download report
   */
  async downloadReport(reportId, format = 'json') {
    try {
      const report = await Report.findById(reportId);

      if (!report) return null;

      let mimeType = 'application/json';
      let data = JSON.stringify(report.content, null, 2);
      let extension = 'json';

      if (format === 'csv') {
        mimeType = 'text/csv';
        data = this._convertToCSV(report.content);
        extension = 'csv';
      } else if (format === 'pdf') {
        mimeType = 'application/pdf';
        data = Buffer.from(`PDF Report: ${report.title}`);
        extension = 'pdf';
      }

      // Increment download count
      await Report.findByIdAndUpdate(reportId, { $inc: { downloadCount: 1 } });

      return {
        mimeType,
        data,
        filename: `${reportId}.${extension}`,
        size: data.length
      };
    } catch (error) {
      logger.error('Error in downloadReport:', error);
      throw error;
    }
  }

  /**
   * Convert to CSV format
   */
  _convertToCSV(content) {
    let csv = `Report Type,${content.reportType}\n`;
    csv += `Generated At,${content.generatedAt}\n\n`;

    content.sections.forEach(section => {
      csv += `${section.title}\n`;
      Object.entries(section.data).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += '\n';
    });

    return csv;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId) {
    try {
      const result = await Report.findByIdAndDelete(reportId);

      if (!result) return false;

      logger.info(`Report deleted: ${reportId}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteReport:', error);
      throw error;
    }
  }

  /**
   * Get disability summary report
   */
  async getDisabilitySummary(query = {}) {
    try {
      const report = {
        generatedAt: new Date(),
        type: 'disability-summary',
        summary: {
          totalPrograms: 5,
          totalBeneficiaries: 150,
          completionRate: '85%',
          averageScore: 8.5
        },
        breakdown: {
          byProgram: [
            { name: 'Physical Therapy', beneficiaries: 50, completion: '90%' },
            { name: 'Cognitive Training', beneficiaries: 40, completion: '75%' },
            { name: 'Occupational Therapy', beneficiaries: 60, completion: '85%' }
          ],
          byStatus: {
            active: 120,
            completed: 25,
            onHold: 5
          }
        }
      };

      return report;
    } catch (error) {
      logger.error('Error in getDisabilitySummary:', error);
      throw error;
    }
  }

  /**
   * Get maintenance schedule report
   */
  async getMaintenanceSchedule(query = {}) {
    try {
      const report = {
        generatedAt: new Date(),
        type: 'maintenance-schedule',
        summary: {
          totalSchedules: 50,
          completedThisMonth: 35,
          pendingSchedules: 15,
          dueThisWeek: 8
        },
        breakdown: {
          byType: [
            { type: 'Preventive', count: 30, cost: 30000 },
            { type: 'Corrective', count: 15, cost: 15000 },
            { type: 'Predictive', count: 5, cost: 5000 }
          ],
          costAnalysis: {
            totalCost: 50000,
            averageCost: 1000,
            performanceBudget: 45000,
            variance: 5000
          }
        }
      };

      return report;
    } catch (error) {
      logger.error('Error in getMaintenanceSchedule:', error);
      throw error;
    }
  }

  /**
   * Export batch of reports
   */
  async exportBatch(reportIds, format = 'zip') {
    try {
      const reports = await Report.find({ _id: { $in: reportIds } });

      const batch = {
        format,
        status: 'exporting',
        createdAt: new Date(),
        reports: reports.map(r => ({
          id: r._id,
          title: r.title,
          size: r.fileSize
        })),
        totalSize: 0
      };

      // Calculate total size
      batch.reports.forEach(r => {
        batch.totalSize += parseInt(r.size) || 0;
      });

      batch.status = 'completed';
      batch.totalSize = batch.totalSize + 'MB';

      logger.info(`Batch export created`);
      return batch;
    } catch (error) {
      logger.error('Error in exportBatch:', error);
      throw error;
    }
  }

  /**
   * Get report schedule
   */
  async getReportSchedule(reportId) {
    try {
      const report = await Report.findById(reportId);

      if (!report || !report.schedule) {
        return null;
      }

      return report.schedule;
    } catch (error) {
      logger.error('Error in getReportSchedule:', error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      const reportsCount = await Report.countDocuments();
      const scheduledCount = await Report.countDocuments({ isScheduled: true });

      return {
        status: 'healthy',
        reportsCount,
        scheduledReports: scheduledCount,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error in getHealthStatus:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton
const reportService = new ReportService();

module.exports = {
  ReportService,
  reportService
};
