/**
 * analytics.routes.js - Beneficiary Analytics & Reporting API Routes
 * Handles analytics, predictions, and comprehensive reporting
 *
 * @module api/routes/beneficiary/analytics
 */

const express = require('express');
const router = express.Router();
const AnalyticsService = require('../../../services/BeneficiaryManagement/AnalyticsService');

// Middleware
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  next();
};

// Initialize service
let analyticsService;

router.use((req, res, next) => {
  if (!analyticsService) {
    analyticsService = new AnalyticsService(global.db);
  }
  next();
});

/**
 * @route GET /api/analytics/:beneficiaryId/individual
 * @description Get individual beneficiary analytics
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} period - 'semester', 'year', 'all'
 * @returns {Object} Individual analytics
 */
router.get('/:beneficiaryId/individual', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      period: req.query.period || 'semester'
    };

    const result = await analyticsService.getIndividualAnalytics(beneficiaryId, options);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/analytics/group/comparison
 * @description Get group analytics for cohort comparison
 * @query {string} program - Program name (optional)
 * @query {string} academicYear - Academic year (optional)
 * @query {string} cohort - Cohort identifier (optional)
 * @returns {Object} Group analytics
 */
router.get('/group/comparison', authenticate, async (req, res) => {
  try {
    const criteria = {
      program: req.query.program,
      academicYear: req.query.academicYear,
      cohort: req.query.cohort
    };

    const result = await analyticsService.getGroupAnalytics(criteria);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/analytics/:beneficiaryId/report
 * @description Generate performance report
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} reportType - 'comprehensive', 'academic', 'behavioral', 'performance'
 * @returns {Object} Performance report
 */
router.get('/:beneficiaryId/report', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      reportType: req.query.reportType || 'comprehensive'
    };

    const result = await analyticsService.generatePerformanceReport(beneficiaryId, options);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/analytics/:beneficiaryId/predict-outcomes
 * @description Predict academic outcomes
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Object} Outcome predictions
 */
router.get('/:beneficiaryId/predict-outcomes', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await analyticsService.predictAcademicOutcomes(beneficiaryId);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route POST /api/analytics/export-report
 * @description Export analytics report
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {string} format - 'pdf', 'excel', 'json' (optional)
 * @returns {Object} Exported report
 */
router.post('/:beneficiaryId/export-report', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const { format = 'json' } = req.body;

    // Generate comprehensive report
    const reportResult = await analyticsService.generatePerformanceReport(beneficiaryId, {
      reportType: 'comprehensive'
    });

    if (reportResult.status !== 'success') {
      return res.status(404).json(reportResult);
    }

    // For now, return JSON format
    // TODO: Implement PDF and Excel export
    if (format === 'json') {
      return res.status(200).json({
        status: 'success',
        message: 'Report exported successfully',
        data: reportResult.data,
        timestamp: new Date()
      });
    }

    return res.status(400).json({
      status: 'error',
      message: `Format ${format} is not yet supported`,
      data: null,
      timestamp: new Date()
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/analytics/health
 * @description Check service health
 * @returns {Object} Service status
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Analytics service is healthy',
    service: 'AnalyticsService',
    timestamp: new Date()
  });
});

module.exports = router;
