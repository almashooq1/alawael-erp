const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { ReportService } = require('../services/reportService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const reportService = new ReportService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!reportService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Report service not initialized',
    });
  }
  next();
});

/**
 * @route   GET /api/v1/reports
 * @desc    Get all available reports
 * @access  Private
 */
router.get(
  '/',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const reports = await reportService.getAvailableReports(req.query);
      res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      safeError(res, error, 'fetching reports');
    }
  }
);

/**
 * @route   POST /api/v1/reports/generate
 * @desc    Generate new report
 * @access  Private
 */
router.post(
  '/generate',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const { reportType, filters, format } = req.body;

      if (!reportType) {
        return res.status(400).json({
          success: false,
          error: 'Report type is required',
        });
      }

      const report = await reportService.generateReport({
        reportType,
        filters: filters || {},
        format: format || 'json',
        requestedBy: req.user.id,
        requestedAt: new Date(),
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'generating report');
    }
  }
);

/**
 * @route   GET /api/v1/reports/type/disability-summary
 * @desc    Get disability rehabilitation summary report
 * @access  Private
 */
router.get(
  '/type/disability-summary',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const report = await reportService.getDisabilitySummary(req.query);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'fetching disability summary');
    }
  }
);

/**
 * @route   GET /api/v1/reports/type/maintenance-schedule
 * @desc    Get maintenance schedule report
 * @access  Private
 */
router.get(
  '/type/maintenance-schedule',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const report = await reportService.getMaintenanceSchedule(req.query);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'fetching maintenance report');
    }
  }
);

/**
 * @route   GET /api/v1/reports/:reportId
 * @desc    Get specific report
 * @access  Private
 */
router.get(
  '/:reportId',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const report = await reportService.getReportById(req.params.reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'fetching report');
    }
  }
);

/**
 * @route   GET /api/v1/reports/:reportId/download
 * @desc    Download report
 * @access  Private
 */
router.get(
  '/:reportId/download',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const file = await reportService.downloadReport(req.params.reportId, req.query.format);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.setHeader('Content-Type', file.mimeType);
      const safeName = (file.filename || 'report').replace(/[\r\n"]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.send(file.data);
    } catch (error) {
      safeError(res, error, 'downloading report');
    }
  }
);

/**
 * @route   DELETE /api/v1/reports/:reportId
 * @desc    Delete report
 * @access  Private/Admin
 */
router.delete(
  '/:reportId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await reportService.deleteReport(req.params.reportId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'deleting report');
    }
  }
);

/**
 * @route   POST /api/v1/reports/export-batch
 * @desc    Export multiple reports in batch
 * @access  Private
 */
router.post(
  '/export-batch',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const { reportIds, format } = req.body;

      if (!reportIds || !Array.isArray(reportIds)) {
        return res.status(400).json({
          success: false,
          error: 'Report IDs array is required',
        });
      }

      const batch = await reportService.exportBatch(reportIds, format || 'zip');

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Could not export batch',
        });
      }

      res.status(200).json({
        success: true,
        data: batch,
      });
    } catch (error) {
      safeError(res, error, 'exporting batch');
    }
  }
);

/**
 * @route   GET /api/v1/reports/schedule/:reportId
 * @desc    Get scheduled report
 * @access  Private
 */
router.get(
  '/schedule/:reportId',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const schedule = await reportService.getReportSchedule(req.params.reportId);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      safeError(res, error, 'fetching schedule');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, error, 'Router error');

module.exports = router;
