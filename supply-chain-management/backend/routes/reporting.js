const express = require('express');
const reportingService = require('../services/reportingService');
const Report = require('../models/Report');
const Dashboard = require('../models/Dashboard');
const ReportTemplate = require('../models/ReportTemplate');

const router = express.Router();

// Error handling wrapper
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// REPORT ENDPOINTS
// ============================================

// Generate new report
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    try {
      const { templateCode, filters } = req.body;
      const userId = req.user?.id || 'system';

      if (!templateCode) {
        return res.status(400).json({
          success: false,
          error: 'templateCode is required',
        });
      }

      const report = await reportingService.generateReport(templateCode, filters, userId);

      res.status(201).json({
        success: true,
        data: report.getSummary(),
        message: 'Report generated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Get report by ID
router.get(
  '/:reportId',
  asyncHandler(async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await Report.findOne({ reportId });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Refresh report
router.post(
  '/:reportId/refresh',
  asyncHandler(async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await reportingService.refreshReport(reportId);

      res.json({
        success: true,
        data: report.getSummary(),
        message: 'Report refreshed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Schedule report
router.post(
  '/:reportId/schedule',
  asyncHandler(async (req, res) => {
    try {
      const { reportId } = req.params;
      const { frequency, recipients } = req.body;

      if (!frequency) {
        return res.status(400).json({
          success: false,
          error: 'frequency is required',
        });
      }

      const report = await reportingService.scheduleReport(reportId, frequency, recipients);

      res.json({
        success: true,
        data: report.getSummary(),
        message: 'Report scheduled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Export report
router.post(
  '/:reportId/export',
  asyncHandler(async (req, res) => {
    try {
      const { reportId } = req.params;
      const { format } = req.body;

      if (!format) {
        return res.status(400).json({
          success: false,
          error: 'format is required (pdf, excel, csv, json)',
        });
      }

      let exportData;
      if (format === 'pdf') {
        exportData = await reportingService.exportToPDF(reportId);
      } else if (format === 'excel') {
        exportData = await reportingService.exportToExcel(reportId);
      } else if (format === 'csv') {
        exportData = await reportingService.exportToCSV(reportId);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Supported: pdf, excel, csv, json',
        });
      }

      res.json({
        success: true,
        data: exportData,
        message: `Report exported to ${format} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Delete report
router.delete(
  '/:reportId',
  asyncHandler(async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await Report.findOne({ reportId });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      report.status = 'deleted';
      await report.save();

      res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

// Create dashboard
router.post(
  '/dashboards/create',
  asyncHandler(async (req, res) => {
    try {
      const dashboardData = req.body;
      const userId = req.user?.id || 'system';

      const dashboard = await reportingService.createDashboard(dashboardData, userId);

      res.status(201).json({
        success: true,
        data: dashboard.getSummary(),
        message: 'Dashboard created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Get dashboard
router.get(
  '/dashboards/:dashboardId',
  asyncHandler(async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const userId = req.user?.id || 'system';

      const dashboard = await reportingService.getDashboard(dashboardId, userId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Update dashboard
router.put(
  '/dashboards/:dashboardId',
  asyncHandler(async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const updates = req.body;

      const dashboard = await reportingService.updateDashboard(dashboardId, updates);

      res.json({
        success: true,
        data: dashboard.getSummary(),
        message: 'Dashboard updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Share dashboard
router.post(
  '/dashboards/:dashboardId/share',
  asyncHandler(async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const { userId, email, name, permission } = req.body;

      if (!userId || !email || !permission) {
        return res.status(400).json({
          success: false,
          error: 'userId, email, and permission are required',
        });
      }

      const dashboard = await reportingService.shareDashboard(
        dashboardId,
        userId,
        email,
        name,
        permission
      );

      res.json({
        success: true,
        data: dashboard.getSummary(),
        message: 'Dashboard shared successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Export dashboard
router.post(
  '/dashboards/:dashboardId/export',
  asyncHandler(async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const { format } = req.body;

      if (!format) {
        return res.status(400).json({
          success: false,
          error: 'format is required (pdf, excel, png, json)',
        });
      }

      const exportData = await reportingService.exportDashboard(dashboardId, format);

      res.json({
        success: true,
        data: exportData,
        message: `Dashboard exported to ${format} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Delete dashboard
router.delete(
  '/dashboards/:dashboardId',
  asyncHandler(async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const dashboard = await reportingService.deleteDashboard(dashboardId);

      res.json({
        success: true,
        message: 'Dashboard deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================================
// TEMPLATE ENDPOINTS
// ============================================

// Create template
router.post(
  '/templates/create',
  asyncHandler(async (req, res) => {
    try {
      const templateData = req.body;
      const userId = req.user?.id || 'system';

      const template = await reportingService.createTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        data: template.getSummary(),
        message: 'Template created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Get template
router.get(
  '/templates/:templateCode',
  asyncHandler(async (req, res) => {
    try {
      const { templateCode } = req.params;
      const template = await ReportTemplate.getByCode(templateCode);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// List templates
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    try {
      const { category, limit = 20, offset = 0 } = req.query;

      let query = { status: 'published' };
      if (category) {
        query.category = category;
      }

      const templates = await ReportTemplate.find(query)
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      const total = await ReportTemplate.countDocuments(query);

      res.json({
        success: true,
        data: templates,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Approve template
router.post(
  '/templates/:templateId/approve',
  asyncHandler(async (req, res) => {
    try {
      const { templateId } = req.params;
      const { approverEmail } = req.body;

      if (!approverEmail) {
        return res.status(400).json({
          success: false,
          error: 'approverEmail is required',
        });
      }

      const template = await reportingService.approveTemplate(templateId, approverEmail);

      res.json({
        success: true,
        data: template.getSummary(),
        message: 'Template approved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Get report analytics
router.get(
  '/analytics/reports',
  asyncHandler(async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const analytics = await reportingService.getReportAnalytics(parseInt(hours));

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Get dashboard analytics
router.get(
  '/analytics/dashboards',
  asyncHandler(async (req, res) => {
    try {
      const analytics = await reportingService.getDashboardAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Get template analytics
router.get(
  '/analytics/templates',
  asyncHandler(async (req, res) => {
    try {
      const analytics = await reportingService.getTemplateAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// System statistics
router.get(
  '/system/stats',
  asyncHandler(async (req, res) => {
    try {
      const stats = await reportingService.getSystemStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Process scheduled reports
router.post(
  '/process-scheduled',
  asyncHandler(async (req, res) => {
    try {
      const count = await reportingService.processScheduledReports();

      res.json({
        success: true,
        data: { processedCount: count },
        message: `${count} scheduled reports processed`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Search templates
router.get(
  '/search/templates',
  asyncHandler(async (req, res) => {
    try {
      const { keyword } = req.query;

      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: 'keyword is required',
        });
      }

      const results = await reportingService.searchTemplates(keyword);

      res.json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Reporting Route Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

module.exports = router;
