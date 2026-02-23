/**
 * Advanced Analytics Routes
 * API endpoints for advanced analytics and insights
 */

const express = require('express');
const router = express.Router();
const advancedAnalyticsController = require('../controllers/advanced-analytics.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Dashboard analytics - accessible to managers and admins
router.get('/dashboard', advancedAnalyticsController.getDashboardAnalytics);

// Program performance metrics - accessible to all authenticated users
router.get('/program/:id/performance', advancedAnalyticsController.getProgramPerformanceMetrics);

// Comparative analysis - accessible to managers and admins
router.post('/compare', advancedAnalyticsController.getComparativeAnalysis);

// Predictive insights - accessible to managers and admins
router.get('/predictive/:disabilityType', advancedAnalyticsController.getPredictiveInsights);

// Beneficiary journey analytics - accessible to all authenticated users
router.get(
  '/beneficiary/:beneficiaryId/journey',
  advancedAnalyticsController.getBeneficiaryJourneyAnalytics
);

// Monthly trends - accessible to managers and admins
router.get('/trends/monthly', advancedAnalyticsController.getMonthlyTrends);

// Export analytics report - accessible to managers and admins
router.get('/export', advancedAnalyticsController.exportAnalyticsReport);

// Info endpoint - public
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Advanced Analytics API',
    version: '1.0.0',
    endpoints: [
      'GET /dashboard - Comprehensive dashboard analytics',
      'GET /program/:id/performance - Program performance metrics',
      'POST /compare - Comparative analysis across programs',
      'GET /predictive/:disabilityType - Predictive insights',
      'GET /beneficiary/:beneficiaryId/journey - Beneficiary journey analytics',
      'GET /trends/monthly - Monthly trends analysis',
      'GET /export - Export analytics reports',
    ],
  });
});

module.exports = router;
