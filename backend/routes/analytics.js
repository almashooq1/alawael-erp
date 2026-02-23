const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../middleware/auth');
const { PerformanceAnalyticsService } = require('../services/performanceAnalyticsService');
const logger = require('../utils/logger');

// Initialize service
const analyticsService = new PerformanceAnalyticsService();

// Middleware to verify service is ready
router.use((req, res, next) => {
  if (!analyticsService) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Performance analytics service not initialized'
    });
  }
  next();
});

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get performance overview
 * @access  Private
 */
router.get('/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const overview = await analyticsService.getOverview(req.query);
      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Error fetching analytics overview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch analytics'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get analytics dashboard
 * @access  Private
 */
router.get('/dashboard',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const dashboard = await analyticsService.getDashboard(req.query);
      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch dashboard'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/module/:moduleName
 * @desc    Get analytics for specific module
 * @access  Private
 */
router.get('/module/:moduleName',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const analytics = await analyticsService.getModuleAnalytics(
        req.params.moduleName,
        req.query
      );
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching module analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch analytics'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/user/:userId
 * @desc    Get analytics for specific user
 * @access  Private
 */
router.get('/user/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const analytics = await analyticsService.getUserAnalytics(
        req.params.userId
      );
      
      if (!analytics) {
        return res.status(404).json({
          success: false,
          error: 'User analytics not found'
        });
      }

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching user analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch analytics'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/performance-trends
 * @desc    Get performance trends
 * @access  Private
 */
router.get('/performance-trends',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const trends = await analyticsService.getPerformanceTrends(req.query);
      
      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error fetching trends:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trends'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/kpi
 * @desc    Get key performance indicators
 * @access  Private
 */
router.get('/kpi',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const kpis = await analyticsService.getKPIs(req.query);
      
      res.status(200).json({
        success: true,
        data: kpis
      });
    } catch (error) {
      logger.error('Error fetching KPIs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch KPIs'
      });
    }
  })
);

/**
 * @route   POST /api/v1/analytics/track-event
 * @desc    Track custom event
 * @access  Private
 */
router.post('/track-event',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const { eventName, eventData, metadata } = req.body;

      if (!eventName) {
        return res.status(400).json({
          success: false,
          error: 'Event name is required'
        });
      }

      const tracked = await analyticsService.trackEvent({
        eventName,
        eventData,
        metadata,
        userId: req.user.id,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: tracked
      });
    } catch (error) {
      logger.error('Error tracking event:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to track event'
      });
    }
  })
);

/**
 * @route   GET /api/v1/analytics/health-check
 * @desc    Get analytics service health
 * @access  Private
 */
router.get('/health-check',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const health = await analyticsService.getHealthStatus();
      
      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error checking health:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check health'
      });
    }
  })
);

// Error handling middleware
router.use((err, req, res, next) => {
  logger.error('Router error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    message: err.message
  });
});

module.exports = router;
