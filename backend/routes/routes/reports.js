const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// Generate Report
router.post('/generate', async (req, res, next) => {
  try {
    const report = await ReportService.generateReport(req.body);
    return res.json(new ApiResponse(200, report, 'Report generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate report', [err.message]));
  }
});

// Get All Reports
router.get('/all', async (req, res, next) => {
  try {
    const limit = req.query.limit || 50;
    const reports = await ReportService.getAllReports(parseInt(limit));
    return res.json(new ApiResponse(200, reports, 'Reports fetched'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to fetch reports', [err.message]));
  }
});

// Export to CSV
router.post('/export/csv', async (req, res, next) => {
  try {
    const result = ReportService.exportToCSV(req.body.report);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.content);
  } catch (err) {
    return next(new ApiError(400, 'Failed to export to CSV', [err.message]));
  }
});

// Export to JSON
router.post('/export/json', async (req, res, next) => {
  try {
    const result = ReportService.exportToJSON(req.body.report);
    return res.json(new ApiResponse(200, result, 'Report exported to JSON'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to export to JSON', [err.message]));
  }
});

// Export to Excel
router.post('/export/excel', async (req, res, next) => {
  try {
    const result = ReportService.exportToExcel(req.body.report);
    return res.json(new ApiResponse(200, result, 'Report exported to Excel'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to export to Excel', [err.message]));
  }
});

// Delete Report
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await ReportService.deleteReport(req.params.id);
    return res.json(new ApiResponse(200, result, 'Report deleted'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to delete report', [err.message]));
  }
});

module.exports = router;
