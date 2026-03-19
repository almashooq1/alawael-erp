/**
 * AI Recommendations Routes
 * مسارات توصيات الذكاء الاصطناعي
 * 
 * API Routes for AI-powered recommendation system
 * مسارات API لنظام الذكاء الاصطناعي
 */

const aiController = require('../controllers/aiRecommendations.controller');

// Export the controller routes directly if it's a Router
// Otherwise wrap in error handling
if (aiController && typeof aiController === 'object') {
  module.exports = aiController;
} else {
  // Fallback
  const express = require('express');
  const router = express.Router();
  router.all('*', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'AI Recommendations routes not fully initialized',
      status: 'NOT_IMPLEMENTED'
    });
  });
  module.exports = router;
}

/**
 * GET /api/ai/recommendations/:userId/history
 * Get recommendation history for specific user
 * 
 * Query params: limit, startDate, endDate
 * Auth: Required
 */
router.get('/:userId/history', authenticateToken, aiController.get('/:userId/history'));

// ==================== USER FEEDBACK ====================

/**
 * POST /api/ai/feedback
 * Record user feedback on recommendation
 * 
 * Body:
 * {
 *   "tenantId": "tenant-123",
 *   "userId": "user-456",
 *   "recommendationId": "rec-789",
 *   "rating": 5,
 *   "helpful": true,
 *   "comment": "Very useful",
 *   "action": "clicked"
 * }
 * 
 * Auth: Required
 */
router.post('/feedback/record', authenticateToken, aiController.post('/feedback/record'));

/**
 * GET /api/ai/feedback/:userId
 * Get all feedback given by user
 * 
 * Auth: Required
 */
router.get('/feedback/:userId', authenticateToken, aiController.get('/feedback/:userId'));

// ==================== USER PREFERENCES ====================

/**
 * GET /api/ai/preferences/:userId
 * Get user's recommendation preferences
 * 
 * Response includes:
 * {
 *   "categories": ["rehabilitation", "education"],
 *   "excludeCategories": [],
 *   "topics": [],
 *   "maxRecommendations": 10,
 *   "diversity": 0.5,
 *   "freshness": 0.3
 * }
 * 
 * Auth: Required
 */
router.get('/preferences/:userId', authenticateToken, aiController.get('/preferences/:userId'));

/**
 * PUT /api/ai/preferences/:userId
 * Update user's recommendation preferences
 * 
 * Body can include:
 * {
 *   "categories": ["education", "performance"],
 *   "excludeCategories": ["advanced"],
 *   "topics": ["mathematics", "science"],
 *   "maxRecommendations": 15,
 *   "diversity": 0.7,
 *   "freshness": 0.4
 * }
 * 
 * Auth: Required
 */
router.put('/preferences/:userId', authenticateToken, aiController.put('/preferences/:userId'));

// ==================== AI MODELS ====================

/**
 * POST /api/ai/models/register
 * Register new AI model
 * 
 * Body:
 * {
 *   "name": "Custom Recommendation Model",
 *   "type": "recommendation|prediction|classification|anomaly_detection",
 *   "description": "Model description",
 *   "algorithm": "collaborative_filtering|random_forest|gradient_boosting",
 *   "inputs": ["user_profile", "historical_data"],
 *   "outputs": ["recommendations"],
 *   "accuracy": 0.87,
 *   "precision": 0.85,
 *   "recall": 0.86,
 *   "trainingDataSize": 10000
 * }
 * 
 * Auth: Required (Admin)
 */
router.post('/models/register', authenticateToken, aiController.post('/models/register'));

/**
 * GET /api/ai/models/all
 * Get all registered AI models
 * 
 * Auth: Required
 */
router.get('/models/all', authenticateToken, aiController.get('/models/all'));

/**
 * GET /api/ai/models/:modelId
 * Get specific model details
 * 
 * Auth: Required
 */
router.get('/models/:modelId', authenticateToken, aiController.get('/models/:modelId'));

/**
 * GET /api/ai/models/type/:type
 * Get all models of specific type
 * 
 * Types: recommendation, prediction, classification, anomaly_detection
 * Auth: Required
 */
router.get('/models/type/:type', authenticateToken, aiController.get('/models/type/:type'));

/**
 * POST /api/ai/models/:modelId/deploy
 * Deploy model to production
 * 
 * Auth: Required (Admin)
 */
router.post('/models/:modelId/deploy', authenticateToken, aiController.post('/models/:modelId/deploy'));

/**
 * POST /api/ai/models/:modelId/undeploy
 * Remove model from production
 * 
 * Auth: Required (Admin)
 */
router.post('/models/:modelId/undeploy', authenticateToken, aiController.post('/models/:modelId/undeploy'));

/**
 * GET /api/ai/models/:modelId/metrics
 * Get model performance metrics
 * 
 * Returns:
 * {
 *   "accuracy": 0.87,
 *   "precision": 0.85,
 *   "recall": 0.86,
 *   "f1Score": 0.855,
 *   "totalPredictions": 1000,
 *   "successfulPredictions": 870
 * }
 * 
 * Auth: Required
 */
router.get('/models/:modelId/metrics', authenticateToken, aiController.get('/models/:modelId/metrics'));

/**
 * POST /api/ai/models/:modelId/train
 * Start training job for model
 * 
 * Body:
 * {
 *   "size": 5000,
 *   "epochs": 30,
 *   "batchSize": 32,
 *   "learningRate": 0.001
 * }
 * 
 * Auth: Required (Admin)
 */
router.post('/models/:modelId/train', authenticateToken, aiController.post('/models/:modelId/train'));

/**
 * POST /api/ai/models/:modelId/predict
 * Make prediction using model
 * 
 * Body: Input data for model
 * {
 *   "user_id": "user-123",
 *   "historical_data": [...],
 *   ... other model inputs
 * }
 * 
 * Auth: Optional
 */
router.post('/models/:modelId/predict', aiController.post('/models/:modelId/predict'));

/**
 * GET /api/ai/models/active/list
 * Get all currently active (deployed) models
 * 
 * Auth: Required
 */
router.get('/models/active/list', authenticateToken, aiController.get('/models/active/list'));

// ==================== A/B TESTING ====================

/**
 * POST /api/ai/tests/create
 * Create new A/B test for recommendations
 * 
 * Body:
 * {
 *   "tenantId": "tenant-123",
 *   "name": "Test Name",
 *   "description": "Test description",
 *   "variants": ["control", "variant_a", "variant_b"],
 *   "startDate": "2026-02-17",
 *   "endDate": "2026-03-17"
 * }
 * 
 * Auth: Required (Admin)
 */
router.post('/tests/create', authenticateToken, aiController.post('/tests/create'));

/**
 * POST /api/ai/tests/:testId/event
 * Record event for A/B test
 * 
 * Body:
 * {
 *   "variant": "control",
 *   "eventType": "impression|click|conversion"
 * }
 * 
 * Auth: Optional
 */
router.post('/tests/:testId/event', aiController.post('/tests/:testId/event'));

/**
 * GET /api/ai/tests/:testId
 * Get A/B test results and statistics
 * 
 * Response includes:
 * {
 *   "id": "test-123",
 *   "name": "Test Name",
 *   "status": "active|completed",
 *   "results": {
 *     "control": { "clicks": 100, "conversions": 10 },
 *     "variant_a": { "clicks": 120, "conversions": 15 }
 *   }
 * }
 * 
 * Auth: Required
 */
router.get('/tests/:testId', authenticateToken, aiController.get('/tests/:testId'));

// ==================== STATISTICS ====================

/**
 * GET /api/ai/stats/all
 * Get comprehensive AI system statistics
 * 
 * Response includes:
 * {
 *   "recommendations": {
 *     "totalRecommendations": 1000,
 *     "totalFeedback": 500,
 *     "positiveRatings": 400,
 *     "averageRating": 4.2,
 *     "cacheHitRate": 75
 *   },
 *   "models": {
 *     "totalModels": 5,
 *     "activeModels": 4,
 *     "totalPredictions": 5000,
 *     "successRate": 92
 *   }
 * }
 * 
 * Auth: Required
 */
router.get('/stats/all', authenticateToken, aiController.get('/stats/all'));

module.exports = router;
