/**
 * Advanced GOSI Routes
 * مسارات التأمينات الاجتماعية المتقدمة
 *
 * Complete API endpoints for GOSI management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Import services
const advancedGOSIService = require('../services/gosi-advanced.service');
const gosiIntelligenceService = require('../services/gosi-intelligence.service');
const gosiNotificationService = require('../services/gosi-notifications.service');

// Middleware
router.use(authenticateToken);

/**
 * ============================================
 * GOSI REGISTRATION & MANAGEMENT
 * ============================================
 */

/**
 * POST /api/gosi-advanced/register
 * Register employee with GOSI
 */
router.post('/register', authorizeRole(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const result = await advancedGOSIService.registerEmployee(req.body);

    // Send notification
    if (result.success && req.user) {
      await gosiNotificationService.notifyGOSIRegistration(req.user, result);
    }

    res.status(201).json({
      success: true,
      message: 'Employee registered with GOSI successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/gosi-advanced/:gosiNumber/status
 * Get GOSI subscription status
 */
router.get('/:gosiNumber/status', async (req, res) => {
  try {
    const status = await advancedGOSIService.getSubscriptionStatus(req.params.gosiNumber);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gosi-advanced/:gosiNumber/wage
 * Update GOSI wage
 */
router.put('/:gosiNumber/wage', authorizeRole(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const { newSalary, effectiveDate } = req.body;
    const result = await advancedGOSIService.updateEmployeeWage(
      req.params.gosiNumber,
      newSalary,
      effectiveDate
    );

    res.json({
      success: true,
      message: 'GOSI wage updated successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/:gosiNumber/cancel
 * Cancel GOSI subscription
 */
router.post('/:gosiNumber/cancel', authorizeRole(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const { reason, effectiveDate } = req.body;
    const result = await advancedGOSIService.cancelSubscription(
      req.params.gosiNumber,
      reason,
      effectiveDate
    );

    res.json({
      success: true,
      message: 'GOSI subscription cancelled',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/:gosiNumber/certificate
 * Generate GOSI certificate
 */
router.post('/:gosiNumber/certificate', async (req, res) => {
  try {
    const { certificateType = 'standard' } = req.body;
    const result = await advancedGOSIService.generateCertificate(
      req.params.gosiNumber,
      certificateType
    );

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ============================================
 * GOSI CALCULATIONS
 * ============================================
 */

/**
 * POST /api/gosi-advanced/calculate
 * Calculate GOSI contributions
 */
router.post('/calculate', (req, res) => {
  try {
    const { baseSalary, additionalAllowances = 0, isSaudi = true } = req.body;

    if (!baseSalary || baseSalary <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid baseSalary is required'
      });
    }

    const result = advancedGOSIService.calculateGOSIContributions(
      baseSalary,
      additionalAllowances,
      isSaudi
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ============================================
 * COMPLIANCE & MONITORING
 * ============================================
 */

/**
 * POST /api/gosi-advanced/compliance/check
 * Predictive compliance check using AI
 */
router.post('/compliance/check', (req, res) => {
  try {
    const employeeData = req.body;
    const result = advancedGOSIService.predictComplianceIssues(employeeData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gosi-advanced/compliance/report
 * Get compliance report
 */
router.get('/compliance/report', authorizeRole(['ADMIN', 'HR_MANAGER', 'COMPLIANCE']), async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      includeWarnings: req.query.includeWarnings !== 'false'
    };

    const report = await advancedGOSIService.getComplianceReport(filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ============================================
 * AI & INTELLIGENCE
 * ============================================
 */

/**
 * POST /api/gosi-advanced/intelligence/eligibility
 * Predict GOSI eligibility using AI
 */
router.post('/intelligence/eligibility', (req, res) => {
  try {
    const employeeData = req.body;
    const prediction = gosiIntelligenceService.predictGOSIEligibility(employeeData);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/intelligence/risks
 * Predict compliance risks
 */
router.post('/intelligence/risks', (req, res) => {
  try {
    const employeeData = req.body;
    const riskAssessment = gosiIntelligenceService.predictComplianceRisks(employeeData);

    res.json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/intelligence/forecast
 * Forecast financial impact
 */
router.post('/intelligence/forecast', (req, res) => {
  try {
    const employeeData = req.body;
    const { forecastMonths = 12 } = req.query;

    const forecast = gosiIntelligenceService.forecastFinancialImpact(
      employeeData,
      parseInt(forecastMonths)
    );

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/intelligence/recommendations
 * Generate smart recommendations
 */
router.post('/intelligence/recommendations', (req, res) => {
  try {
    const employeeData = req.body;
    const recommendations = gosiIntelligenceService.generateRecommendations(employeeData);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ============================================
 * NOTIFICATIONS
 * ============================================
 */

/**
 * GET /api/gosi-advanced/notifications
 * Get user notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      status: req.query.status,
      types: req.query.types ? req.query.types.split(',') : null
    };

    const notifications = await gosiNotificationService.getNotifications(
      req.user._id,
      filters
    );

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gosi-advanced/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const result = await gosiNotificationService.markAsRead(
      req.params.notificationId,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gosi-advanced/notifications/stats
 * Get notification statistics
 */
router.get('/notifications/stats', async (req, res) => {
  try {
    const stats = await gosiNotificationService.getNotificationStats(req.user._id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/notifications/send
 * Send notification (Admin only)
 */
router.post('/notifications/send', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { recipientId, notificationData } = req.body;

    const result = await gosiNotificationService.sendNotification(
      { _id: recipientId },
      notificationData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ============================================
 * BULK OPERATIONS
 * ============================================
 */

/**
 * POST /api/gosi-advanced/bulk/register
 * Register multiple employees with GOSI
 */
router.post('/bulk/register', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'employees array is required'
      });
    }

    const results = [];
    for (const employee of employees) {
      try {
        const result = await advancedGOSIService.registerEmployee(employee);
        results.push({ employee: employee.nationalId, ...result });
      } catch (error) {
        results.push({ employee: employee.nationalId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} employees`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gosi-advanced/bulk/notifications
 * Send bulk notifications
 */
router.post('/bulk/notifications', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { recipientIds, notificationData } = req.body;

    const recipients = recipientIds.map(id => ({ _id: id }));
    const results = await gosiNotificationService.sendBulkNotifications(
      recipients,
      notificationData
    );

    res.json({
      success: true,
      message: `Notifications sent to ${recipientIds.length} recipients`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Export router
module.exports = router;
