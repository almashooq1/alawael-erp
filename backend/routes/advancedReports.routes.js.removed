/**
 * ===================================================================
 * ADVANCED REPORTS ROUTES - مسارات التقارير المالية المتقدمة
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const AdvancedFinancialReportsService = require('../services/advancedFinancialReports.service');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const asyncHandler = require('express-async-handler');

// ===================================================================
// FINANCIAL STATEMENTS
// ===================================================================

/**
 * @route   GET /api/accounting/reports/balance-sheet
 * @desc    Generate Balance Sheet
 * @access  Private
 */
router.get(
  '/balance-sheet',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { asOfDate, companyName, currency } = req.query;

    const report = await AdvancedFinancialReportsService.generateBalanceSheet(
      asOfDate ? new Date(asOfDate) : new Date(),
      { companyName, currency }
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * @route   GET /api/accounting/reports/income-statement
 * @desc    Generate Income Statement
 * @access  Private
 */
router.get(
  '/income-statement',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, companyName, currency } = req.query;

    const report = await AdvancedFinancialReportsService.generateIncomeStatement(
      new Date(startDate),
      new Date(endDate),
      { companyName, currency }
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * @route   GET /api/accounting/reports/cash-flow
 * @desc    Generate Cash Flow Statement
 * @access  Private
 */
router.get(
  '/cash-flow',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, companyName, currency } = req.query;

    const report = await AdvancedFinancialReportsService.generateCashFlowStatement(
      new Date(startDate),
      new Date(endDate),
      { companyName, currency }
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

// ===================================================================
// ANALYTICAL REPORTS
// ===================================================================

/**
 * @route   GET /api/accounting/reports/aged-receivables
 * @desc    Generate Aged Receivables Report
 * @access  Private
 */
router.get(
  '/aged-receivables',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;

    const report = await AdvancedFinancialReportsService.generateAgedReceivablesReport(
      asOfDate ? new Date(asOfDate) : new Date()
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * @route   GET /api/accounting/reports/profitability
 * @desc    Generate Profitability by Cost Center Report
 * @access  Private
 */
router.get(
  '/profitability',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const report = await AdvancedFinancialReportsService.generateProfitabilityByCoastCenter(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * @route   GET /api/accounting/reports/variance-analysis
 * @desc    Generate Variance Analysis Report
 * @access  Private
 */
router.get(
  '/variance-analysis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { year, month } = req.query;

    // Implementation needed
    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        message: 'Variance analysis coming soon',
      },
    });
  })
);

// ===================================================================
// EXPORT OPERATIONS
// ===================================================================

/**
 * @route   GET /api/accounting/reports/:reportType/pdf
 * @desc    Export report to PDF
 * @access  Private
 */
router.get(
  '/:reportType/pdf',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const reportData = req.query; // Contains report parameters

    // Generate report based on type
    let report;
    switch (reportType) {
      case 'balance-sheet':
        report = await AdvancedFinancialReportsService.generateBalanceSheet(new Date());
        break;
      case 'income-statement':
        report = await AdvancedFinancialReportsService.generateIncomeStatement(
          new Date(reportData.startDate),
          new Date(reportData.endDate)
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type',
        });
    }

    // Export to PDF
    const outputPath = `./reports/${reportType}-${Date.now()}.pdf`;
    const pdfPath = await AdvancedFinancialReportsService.exportToPDF(
      report,
      reportType,
      outputPath
    );

    res.download(pdfPath);
  })
);

/**
 * @route   GET /api/accounting/reports/:reportType/excel
 * @desc    Export report to Excel
 * @access  Private
 */
router.get(
  '/:reportType/excel',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const reportData = req.query;

    // Generate report based on type
    let report;
    switch (reportType) {
      case 'balance-sheet':
        report = await AdvancedFinancialReportsService.generateBalanceSheet(new Date());
        break;
      case 'income-statement':
        report = await AdvancedFinancialReportsService.generateIncomeStatement(
          new Date(reportData.startDate),
          new Date(reportData.endDate)
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type',
        });
    }

    // Export to Excel
    const outputPath = `./reports/${reportType}-${Date.now()}.xlsx`;
    const excelPath = await AdvancedFinancialReportsService.exportToExcel(
      report,
      reportType,
      outputPath
    );

    res.download(excelPath);
  })
);

/**
 * @route   GET /api/accounting/reports/:reportType/csv
 * @desc    Export report to CSV
 * @access  Private
 */
router.get(
  '/:reportType/csv',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      success: false,
      message: 'CSV export coming soon',
    });
  })
);

// ===================================================================
// CUSTOM REPORTS
// ===================================================================

/**
 * @route   POST /api/accounting/reports/custom
 * @desc    Generate custom report
 * @access  Private
 */
router.post(
  '/custom',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { reportConfig } = req.body;

    // Custom report logic here
    res.json({
      success: true,
      message: 'Custom report generation coming soon',
      config: reportConfig,
    });
  })
);

module.exports = router;
