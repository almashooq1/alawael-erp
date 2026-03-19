/* eslint-disable no-unused-vars */
/**
 * Report Controller
 * Handles HTTP requests for report operations
 * Maps requests to ReportService methods
 */

const ReportService = require('../services/reportService');

class ReportController {
  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * Create a new report
   * POST /api/v1/reports
   */
  async createReport(req, res, next) {
    try {
      const { name, type, format, filters, columns, sortBy } = req.body;

      // Validation
      if (!name || !type) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Report name and type are required',
          code: 'MISSING_FIELDS',
        });
      }

      const report = this.reportService.createReport(req.user.id, {
        name,
        type,
        format: format || 'pdf',
        filters: filters || {},
        columns: columns || [],
        sortBy: sortBy || {},
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   * GET /api/v1/reports/:id
   */
  async getReport(req, res, next) {
    try {
      const { id } = req.params;

      const report = this.reportService.getReport(id);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'REPORT_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * List user's reports
   * GET /api/v1/reports
   */
  async listReports(req, res, next) {
    try {
      const { type, limit = 10, offset = 0 } = req.query;

      const filters = {};
      if (type) {
        filters.type = type;
      }

      const reports = this.reportService.listReports(req.user.id, filters);

      const paginated = reports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.json({
        success: true,
        data: paginated,
        total: reports.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate report
   * POST /api/v1/reports/:id/generate
   */
  async generateReport(req, res, next) {
    try {
      const { id } = req.params;
      const { dataSource } = req.body;

      // Simulate data source (would come from database)
      const sampleData = this._getSampleData();

      const result = this.reportService.generateReport(id, sampleData);

      res.json({
        success: true,
        data: result,
        message: 'Report generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule report
   * POST /api/v1/reports/:id/schedule
   */
  async scheduleReport(req, res, next) {
    try {
      const { id } = req.params;
      const { frequency, dayOfMonth, time, recipients, emailSubject } = req.body;

      if (!frequency || !recipients) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Frequency and recipients are required',
          code: 'MISSING_SCHEDULE_FIELDS',
        });
      }

      const schedule = this.reportService.scheduleReport(id, {
        frequency,
        dayOfMonth,
        time: time || '09:00',
        recipients,
        emailSubject: emailSubject || `Scheduled Report`,
      });

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update report
   * PUT /api/v1/reports/:id
   */
  async updateReport(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = this.reportService.updateReport(id, {
        ...updates,
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'REPORT_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * Delete report
   * DELETE /api/v1/reports/:id
   */
  async deleteReport(req, res, next) {
    try {
      const { id } = req.params;

      this.reportService.deleteReport(id);

      res.status(204).send();
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'REPORT_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * Get report templates
   * GET /api/v1/reports/templates
   */
  async getTemplates(req, res, next) {
    try {
      const templates = this.reportService.getTemplates();

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report
   * GET /api/v1/reports/:id/export?format=excel
   */
  async exportReport(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;

      if (!['csv', 'excel', 'pdf', 'json'].includes(format)) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Invalid export format',
          code: 'INVALID_FORMAT',
        });
      }

      const result = this.reportService.exportReport(id, format);

      // Set appropriate content type
      const contentTypes = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        json: 'application/json',
      };

      res.setHeader('Content-Type', contentTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename="report.${format}"`);

      res.json({
        success: true,
        data: result,
        format,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Get sample data for report generation
   */
  _getSampleData() {
    return [
      { product: 'Product A', quantity: 100, revenue: 10000, region: 'US', date: '2026-02-18' },
      { product: 'Product B', quantity: 150, revenue: 22500, region: 'EU', date: '2026-02-18' },
      { product: 'Product C', quantity: 75, revenue: 11250, region: 'ASIA', date: '2026-02-18' },
      { product: 'Product D', quantity: 200, revenue: 40000, region: 'US', date: '2026-02-17' },
      { product: 'Product A', quantity: 120, revenue: 12000, region: 'EU', date: '2026-02-17' },
    ];
  }
}

module.exports = ReportController;
