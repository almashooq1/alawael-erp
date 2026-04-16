const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { PerformanceAnalyticsService } = require('../services/performanceAnalyticsService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const analyticsService = new PerformanceAnalyticsService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!analyticsService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Performance analytics service not initialized',
    });
  }
  next();
});

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get performance overview
 * @access  Private
 */
router.get(
  '/overview',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const overview = await analyticsService.getOverview(req.query);
      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      safeError(res, error, 'fetching analytics overview');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get analytics dashboard
 * @access  Private
 */
router.get(
  '/dashboard',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const dashboard = await analyticsService.getDashboard(req.query);
      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      safeError(res, error, 'fetching dashboard');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/module/:moduleName
 * @desc    Get analytics for specific module
 * @access  Private
 */
router.get(
  '/module/:moduleName',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const analytics = await analyticsService.getModuleAnalytics(req.params.moduleName, req.query);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      safeError(res, error, 'fetching module analytics');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/user/:userId
 * @desc    Get analytics for specific user
 * @access  Private
 */
router.get(
  '/user/:userId',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const analytics = await analyticsService.getUserAnalytics(req.params.userId);

      if (!analytics) {
        return res.status(404).json({
          success: false,
          error: 'User analytics not found',
        });
      }

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      safeError(res, error, 'fetching user analytics');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/performance-trends
 * @desc    Get performance trends
 * @access  Private
 */
router.get(
  '/performance-trends',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const trends = await analyticsService.getPerformanceTrends(req.query);

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      safeError(res, error, 'fetching trends');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/kpi
 * @desc    Get key performance indicators
 * @access  Private
 */
router.get(
  '/kpi',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const kpis = await analyticsService.getKPIs(req.query);

      res.status(200).json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      safeError(res, error, 'fetching KPIs');
    }
  }
);

/**
 * @route   POST /api/v1/analytics/track-event
 * @desc    Track custom event
 * @access  Private
 */
router.post(
  '/track-event',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const { eventName, eventData, metadata } = req.body;

      if (!eventName) {
        return res.status(400).json({
          success: false,
          error: 'Event name is required',
        });
      }

      const tracked = await analyticsService.trackEvent({
        eventName,
        eventData,
        metadata,
        userId: req.user.id,
        timestamp: new Date(),
      });

      res.status(201).json({
        success: true,
        data: tracked,
      });
    } catch (error) {
      safeError(res, error, 'tracking event');
    }
  }
);

/**
 * @route   GET /api/v1/analytics/health-check
 * @desc    Get analytics service health
 * @access  Private
 */
router.get(
  '/health-check',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const health = await analyticsService.getHealthStatus();

      res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      safeError(res, error, 'checking health');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, error, 'Router error');

module.exports = router;
