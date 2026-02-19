/**
 * scholarships.routes.js - Scholarship Management API Routes
 * Handles scholarship applications, approvals, and disbursements
 *
 * @module api/routes/beneficiary/scholarships
 */

const express = require('express');
const router = express.Router();
const ScholarshipService = require('../../../services/BeneficiaryManagement/ScholarshipService');

// Middleware
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  next();
};

// Initialize service
let scholarshipService;

router.use((req, res, next) => {
  if (!scholarshipService) {
    scholarshipService = new ScholarshipService(global.db);
  }
  next();
});

/**
 * @route POST /api/scholarships/apply
 * @description Submit scholarship application
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Application data
 * @returns {Object} Application result
 */
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      return res.status(400).json({
        status: 'error',
        message: 'beneficiaryId is required',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await scholarshipService.applyForScholarship(beneficiaryId, req.body);
    const statusCode = result.status === 'success' ? 201 : 400;
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
 * @route PUT /api/scholarships/:applicationId/approve
 * @description Approve scholarship application
 * @param {string} applicationId - Application ID
 * @param {Object} body - Approval data
 * @returns {Object} Approval result
 */
router.put('/:applicationId/approve', authenticate, async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'applicationId is required',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await scholarshipService.approveScholarship(applicationId, req.body);
    const statusCode = result.status === 'success' ? 200 : 400;
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
 * @route POST /api/scholarships/:applicationId/process-payment
 * @description Process scholarship payment/disbursement
 * @param {string} applicationId - Application ID
 * @param {Object} body - Payment data
 * @returns {Object} Payment result
 */
router.post('/:applicationId/process-payment', authenticate, async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'applicationId is required',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await scholarshipService.processScholarshipPayment(applicationId, req.body);
    const statusCode = result.status === 'success' ? 201 : 400;
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
 * @route GET /api/scholarships/:applicationId/performance
 * @description Monitor scholarship performance requirements
 * @param {string} applicationId - Application ID
 * @returns {Object} Performance report
 */
router.get('/:applicationId/performance', authenticate, async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        status: 'error',
        message: 'applicationId is required',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await scholarshipService.monitorScholarshipPerformance(applicationId);
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
 * @route GET /api/scholarships/statistics
 * @description Get scholarship statistics
 * @returns {Object} Scholarship statistics
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const result = await scholarshipService.getScholarshipStatistics();
    const statusCode = result.status === 'success' ? 200 : 400;
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
 * @route GET /api/scholarships/health
 * @description Check service health
 * @returns {Object} Service status
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Scholarship service is healthy',
    service: 'ScholarshipService',
    timestamp: new Date()
  });
});

module.exports = router;
