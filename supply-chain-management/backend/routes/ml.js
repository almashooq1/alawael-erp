/**
 * ML & Advanced Analytics Routes - Phase 7
 * RESTful API endpoints for ML models, analytics, and insights
 */

const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');
const Analytics = require('../models/Analytics');
const Prediction = require('../models/Prediction');
const Insight = require('../models/Insight');

// Async handler wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * POST /analytics/generate
 * Generate comprehensive analytics report
 */
router.post(
  '/analytics/generate',
  asyncHandler(async (req, res) => {
    const { analyticsType, filters } = req.body;

    if (!analyticsType) {
      return res.status(400).json({
        success: false,
        message: 'analyticsType is required',
      });
    }

    const analytics = await mlService.generateAnalytics(analyticsType, {
      ...filters,
      userId: req.user?.id || 'system',
    });

    res.status(201).json({
      success: true,
      data: analytics,
      message: 'Analytics generated successfully',
    });
  })
);

/**
 * GET /analytics/:analyticsId
 * Get specific analytics report
 */
router.get(
  '/analytics/:analyticsId',
  asyncHandler(async (req, res) => {
    const analytics = await Analytics.findOne({ analyticsId: req.params.analyticsId });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Analytics report not found',
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * GET /analytics
 * List analytics reports with filters
 */
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const { analyticsType, status, limit = 10, skip = 0 } = req.query;

    const filter = { status: status || 'published' };
    if (analyticsType) filter.analyticsType = analyticsType;

    const analytics = await Analytics.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Analytics.countDocuments(filter);

    res.json({
      success: true,
      data: analytics,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  })
);

/**
 * PUT /analytics/:analyticsId/publish
 * Publish analytics report
 */
router.put(
  '/analytics/:analyticsId/publish',
  asyncHandler(async (req, res) => {
    const analytics = await Analytics.findOne({ analyticsId: req.params.analyticsId });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Analytics report not found',
      });
    }

    await analytics.publishAnalytics();

    res.json({
      success: true,
      data: analytics,
      message: 'Analytics published successfully',
    });
  })
);

// ==================== PREDICTION ENDPOINTS ====================

/**
 * POST /predictions/models
 * Create new prediction model
 */
router.post(
  '/predictions/models',
  asyncHandler(async (req, res) => {
    const { name, type, algorithm, features, target, datasetSize } = req.body;

    if (!name || !type || !algorithm) {
      return res.status(400).json({
        success: false,
        message: 'name, type, and algorithm are required',
      });
    }

    const model = await mlService.createPredictionModel({
      name,
      type,
      algorithm,
      features: features || [],
      target,
      datasetSize: datasetSize || 1000,
      userId: req.user?.id || 'system',
    });

    res.status(201).json({
      success: true,
      data: model,
      message: 'Prediction model created successfully',
    });
  })
);

/**
 * GET /predictions/models
 * List prediction models
 */
router.get(
  '/predictions/models',
  asyncHandler(async (req, res) => {
    const { status = 'production', modelType, limit = 10, skip = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (modelType) filter.modelType = modelType;

    const models = await Prediction.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ 'performance.f1Score': -1 });

    const total = await Prediction.countDocuments(filter);

    res.json({
      success: true,
      data: models,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  })
);

/**
 * POST /predictions/models/:modelId/predict
 * Make prediction using model
 */
router.post(
  '/predictions/models/:modelId/predict',
  asyncHandler(async (req, res) => {
    const { features } = req.body;

    if (!features) {
      return res.status(400).json({
        success: false,
        message: 'features object is required',
      });
    }

    const prediction = await mlService.makePrediction(req.params.modelId, features);

    res.json({
      success: true,
      data: prediction,
      message: 'Prediction generated successfully',
    });
  })
);

/**
 * PUT /predictions/models/:modelId/deploy
 * Deploy model to production
 */
router.put(
  '/predictions/models/:modelId/deploy',
  asyncHandler(async (req, res) => {
    const model = await mlService.deployModel(req.params.modelId);

    res.json({
      success: true,
      data: model,
      message: 'Model deployed to production successfully',
    });
  })
);

/**
 * GET /predictions/models/:modelId/health
 * Check model health
 */
router.get(
  '/predictions/models/:modelId/health',
  asyncHandler(async (req, res) => {
    const health = await mlService.monitorModelPerformance(req.params.modelId);

    res.json({
      success: true,
      data: health,
    });
  })
);

/**
 * POST /predictions/retrain
 * Trigger retraining for models needing it
 */
router.post(
  '/predictions/retrain',
  asyncHandler(async (req, res) => {
    const retrainedCount = await mlService.checkAndRetrain();

    res.json({
      success: true,
      data: { retrainedCount },
      message: `${retrainedCount} model(s) retrained successfully`,
    });
  })
);

// ==================== INSIGHTS ENDPOINTS ====================

/**
 * GET /insights
 * Get insights with filtering
 */
router.get(
  '/insights',
  asyncHandler(async (req, res) => {
    const {
      insightType,
      category,
      status = 'published',
      priority,
      limit = 10,
      skip = 0,
    } = req.query;

    const filter = { status };
    if (insightType) filter.insightType = insightType;
    if (category) filter.category = category;
    if (priority) {
      filter.$or = filter.$or || [];
      filter.$or.push({ 'actionItems.priority': priority });
    }

    const insights = await Insight.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ confidence: -1, createdAt: -1 });

    const total = await Insight.countDocuments(filter);

    res.json({
      success: true,
      data: insights,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  })
);

/**
 * GET /insights/high-impact
 * Get high impact insights requiring immediate action
 */
router.get(
  '/insights/high-impact',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const insights = await mlService.getHighImpactInsights(limit);

    res.json({
      success: true,
      data: insights,
      message: `Retrieved ${insights.length} high-impact insights`,
    });
  })
);

/**
 * GET /insights/:insightId
 * Get specific insight
 */
router.get(
  '/insights/:insightId',
  asyncHandler(async (req, res) => {
    const insight = await Insight.findOne({ insightId: req.params.insightId });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      });
    }

    res.json({
      success: true,
      data: insight,
    });
  })
);

/**
 * POST /insights/:insightId/approve
 * Approve insight
 */
router.post(
  '/insights/:insightId/approve',
  asyncHandler(async (req, res) => {
    const { comments } = req.body;
    const insight = await Insight.findOne({ insightId: req.params.insightId });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      });
    }

    await insight.approve(req.user?.id || 'system', comments);

    res.json({
      success: true,
      data: insight,
      message: 'Insight approved successfully',
    });
  })
);

/**
 * POST /insights/:insightId/publish
 * Publish insight
 */
router.post(
  '/insights/:insightId/publish',
  asyncHandler(async (req, res) => {
    const insight = await Insight.findOne({ insightId: req.params.insightId });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      });
    }

    await insight.publish();

    res.json({
      success: true,
      data: insight,
      message: 'Insight published successfully',
    });
  })
);

/**
 * POST /insights/:insightId/implement
 * Start implementing insight
 */
router.post(
  '/insights/:insightId/implement',
  asyncHandler(async (req, res) => {
    const { startDate } = req.body;
    const insight = await Insight.findOne({ insightId: req.params.insightId });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      });
    }

    await insight.startImplementation(startDate);

    res.json({
      success: true,
      data: insight,
      message: 'Implementation started successfully',
    });
  })
);

// ==================== ANOMALY DETECTION ====================

/**
 * GET /anomalies
 * Get detected anomalies
 */
router.get(
  '/anomalies',
  asyncHandler(async (req, res) => {
    const { severity = 'critical', limit = 10 } = req.query;

    const anomalies = await Analytics.find({
      'anomalies.severity': severity,
      status: 'published',
    })
      .limit(parseInt(limit))
      .sort({ 'anomalies.detectedAt': -1 });

    res.json({
      success: true,
      data: anomalies,
      filter: { severity },
    });
  })
);

// ==================== SYSTEM HEALTH ====================

/**
 * GET /health
 * Get ML system health
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const health = await mlService.getSystemHealth();
    const stats = await mlService.getStatistics();

    res.json({
      success: true,
      data: {
        ...health,
        ...stats,
      },
    });
  })
);

/**
 * GET /stats
 * Get ML service statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await mlService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Error Handling Middleware
router.use((err, req, res, next) => {
  console.error('ML Route Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

module.exports = router;
