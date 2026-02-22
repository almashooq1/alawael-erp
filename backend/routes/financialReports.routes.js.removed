/**
 * financialReports.routes.js - Financial Reports API Routes
 * Endpoints for Balance Sheet, Income Statement, Cash Flow, Ratios, and Export
 */

const express = require('express');
const router = express.Router();
const financialReportsController = require('../controllers/financialReportsController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Middleware to ensure user is authenticated and has finance access
router.use(authenticateToken);
router.use(authorize(['finance_admin', 'finance_manager', 'finance_analyst']));

// Get Balance Sheet Report
router.get('/balance-sheet', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const report = await financialReportsController.getBalanceSheet(organizationId, from, to);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Income Statement Report
router.get('/income-statement', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const report = await financialReportsController.getIncomeStatement(organizationId, from, to);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Cash Flow Statement Report
router.get('/cash-flow', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const report = await financialReportsController.getCashFlowStatement(organizationId, from, to);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Financial Ratios Report
router.get('/ratios', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const report = await financialReportsController.getFinancialRatios(organizationId, from, to);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Consolidated Report
router.get('/consolidated', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const report = await financialReportsController.getConsolidatedReport(organizationId, from, to);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export Report (PDF, Excel, etc.)
router.post('/:reportType/export', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format } = req.query;
    const reportData = req.body;

    const exportedFile = await financialReportsController.exportReport(
      reportType,
      format,
      reportData,
      req.user.id
    );

    res.download(exportedFile.path, exportedFile.filename);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Report Comparison (Period-over-Period)
router.post('/comparison/period', async (req, res) => {
  try {
    const { organizationId, reportType, period1From, period1To, period2From, period2To } = req.body;

    const comparison = await financialReportsController.generateComparison(
      organizationId,
      reportType,
      { from: period1From, to: period1To },
      { from: period2From, to: period2To }
    );

    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Key Metrics Summary
router.get('/metrics/summary', async (req, res) => {
  try {
    const { organizationId, from, to } = req.query;
    const metrics = await financialReportsController.getMetricsSummary(organizationId, from, to);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Audit Report
router.post('/audit/generate', async (req, res) => {
  try {
    const { organizationId, from, to, includeDetails } = req.body;
    const auditReport = await financialReportsController.generateAuditReport(
      organizationId,
      from,
      to,
      includeDetails
    );

    res.json({ success: true, data: auditReport });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Trend Analysis
router.get('/trends/analysis', async (req, res) => {
  try {
    const { organizationId, months = 12 } = req.query;
    const trends = await financialReportsController.getTrendAnalysis(organizationId, parseInt(months));
    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
