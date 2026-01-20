const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');

// Generate Report
router.post('/generate', async (req, res) => {
  try {
    const report = await ReportService.generateReport(req.body);
    res.json({ success: true, report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get All Reports
router.get('/all', async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const reports = await ReportService.getAllReports(parseInt(limit));
    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Export to CSV
router.post('/export/csv', async (req, res) => {
  try {
    const result = ReportService.exportToCSV(req.body.report);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.content);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Export to JSON
router.post('/export/json', async (req, res) => {
  try {
    const result = ReportService.exportToJSON(req.body.report);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Export to Excel
router.post('/export/excel', async (req, res) => {
  try {
    const result = ReportService.exportToExcel(req.body.report);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Report
router.delete('/:id', async (req, res) => {
  try {
    const result = await ReportService.deleteReport(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
