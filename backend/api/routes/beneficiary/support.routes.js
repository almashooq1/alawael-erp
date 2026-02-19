/**
 * support.routes.js - Beneficiary Support & Counseling API Routes
 * Handles support plans, counseling sessions, and psychosocial support
 *
 * @module api/routes/beneficiary/support
 */

const express = require('express');
const router = express.Router();
const SupportService = require('../../../services/BeneficiaryManagement/SupportService');

// Middleware
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  next();
};

// Initialize service
let supportService;

router.use((req, res, next) => {
  if (!supportService) {
    supportService = new SupportService(global.db);
  }
  next();
});

/**
 * @route POST /api/support/plan/create
 * @description Create comprehensive support plan
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Plan data
 * @returns {Object} Support plan
 */
router.post('/plan/create', authenticate, async (req, res) => {
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

    const result = await supportService.createSupportPlan(beneficiaryId, req.body);
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
 * @route POST /api/support/counseling/schedule
 * @description Schedule counseling session
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Session data
 * @returns {Object} Session scheduling
 */
router.post('/counseling/schedule', authenticate, async (req, res) => {
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

    const result = await supportService.scheduleCounselingSession(beneficiaryId, req.body);
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
 * @route POST /api/support/financial/request
 * @description Request financial support
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Support data
 * @returns {Object} Support request
 */
router.post('/financial/request', authenticate, async (req, res) => {
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

    const result = await supportService.manageFinancialSupport(beneficiaryId, req.body);
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
 * @route GET /api/support/:beneficiaryId/resources
 * @description Get psychosocial support resources
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} concern - Area of concern (optional)
 * @returns {Object} Support resources
 */
router.get('/:beneficiaryId/resources', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      concern: req.query.concern
    };

    const result = await supportService.providePsychosocialSupport(beneficiaryId, options);
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
 * @route GET /api/support/:beneficiaryId/summary
 * @description Get support summary for beneficiary
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Object} Support summary
 */
router.get('/:beneficiaryId/summary', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await supportService.getSupportSummary(beneficiaryId);
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
 * @route GET /api/support/health
 * @description Check service health
 * @returns {Object} Service status
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Support service is healthy',
    service: 'SupportService',
    timestamp: new Date()
  });
});

module.exports = router;
