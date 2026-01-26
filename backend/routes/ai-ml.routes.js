/**
 * AI & ML API Routes
 * Phase 13: Intelligent Features & Machine Learning Endpoints
 */

const express = require('express');
const router = express.Router();
const {
  PredictiveAnalyticsEngine,
  RecommendationEngine,
  AnomalyDetectionEngine,
  NLPEngine,
  OptimizationEngine,
} = require('../utils/ai-ml-engine');

// Initialize AI engines
const predictive = new PredictiveAnalyticsEngine();
const recommender = new RecommendationEngine();
const anomalyDetector = new AnomalyDetectionEngine();
const nlp = new NLPEngine();
const optimizer = new OptimizationEngine();

// ============================================================================
// PREDICTIVE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * Train sales forecasting model
 * POST /api/ai/predictive/train-sales
 */
router.post('/predictive/train-sales', (req, res) => {
  try {
    const { historicalData } = req.body;

    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ error: 'Historical data required' });
    }

    const result = predictive.trainSalesModel(historicalData);

    res.json({
      success: result.success,
      message: result.message,
      accuracy: result.accuracy,
      model: result.success ? 'sales-forecast' : null,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get sales forecast
 * GET /api/ai/predictive/forecast-sales?days=30
 */
router.get('/predictive/forecast-sales', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }

    const result = predictive.forecastSales(days);

    res.json({
      success: result.success,
      forecasts: result.forecasts,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Train demand forecasting model
 * POST /api/ai/predictive/train-demand
 */
router.post('/predictive/train-demand', (req, res) => {
  try {
    const { historicalData } = req.body;

    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ error: 'Historical data required' });
    }

    const result = predictive.trainDemandModel(historicalData);

    res.json({
      success: result.success,
      message: result.message,
      accuracy: result.accuracy,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Predict customer churn risk
 * POST /api/ai/predictive/churn-risk
 */
router.post('/predictive/churn-risk', (req, res) => {
  try {
    const customerData = req.body;

    if (!customerData.lastActivityDays) {
      return res.status(400).json({ error: 'Customer data required' });
    }

    const result = predictive.predictChurn(customerData);

    res.json({
      success: result.success,
      churnProbability: result.churnProbability,
      riskLevel: result.riskLevel,
      recommendations: result.recommendations,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECOMMENDATION ENGINE ENDPOINTS
// ============================================================================

/**
 * Get personalized recommendations
 * POST /api/ai/recommendations/personalized
 */
router.post('/recommendations/personalized', (req, res) => {
  try {
    const { userId, items, topN } = req.body;

    if (!userId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'User ID and items array required' });
    }

    const result = recommender.getRecommendations(userId, items, topN || 5);

    res.json({
      success: result.success,
      recommendations: result.recommendations,
      count: result.recommendations?.length || 0,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get content-based recommendations (similar items)
 * GET /api/ai/recommendations/similar?itemId=xxx&topN=5
 */
router.get('/recommendations/similar', (req, res) => {
  try {
    const { itemId, topN } = req.query;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    // Mock items data (in real scenario, fetch from DB)
    const mockItems = [
      { id: 1, category: 'electronics', price: 100, rating: 4.5, purchases: 500 },
      { id: 2, category: 'electronics', price: 120, rating: 4.3, purchases: 450 },
      { id: 3, category: 'clothing', price: 50, rating: 4.2, purchases: 300 },
    ];

    const result = recommender.getContentBased(parseInt(itemId), mockItems, parseInt(topN) || 5);

    res.json({
      success: result.success,
      similarItems: result.similar,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user profile interaction
 * POST /api/ai/recommendations/update-profile
 */
router.post('/recommendations/update-profile', (req, res) => {
  try {
    const { userId, item, interactionType } = req.body;

    if (!userId || !item) {
      return res.status(400).json({ error: 'User ID and item required' });
    }

    const result = recommender.updateProfile(userId, item, interactionType || 'view');

    res.json({
      success: result.success,
      message: 'Profile updated',
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ANOMALY DETECTION ENDPOINTS
// ============================================================================

/**
 * Detect transaction anomalies (fraud detection)
 * POST /api/ai/anomaly/transaction
 */
router.post('/anomaly/transaction', (req, res) => {
  try {
    const { transaction, userHistory } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction required' });
    }

    const result = anomalyDetector.detectTransactionAnomaly(transaction, userHistory || []);

    res.json({
      success: result.success,
      isAnomaly: result.isAnomaly,
      anomalyScore: result.anomalyScore,
      riskLevel: result.riskLevel,
      reasons: result.reasons,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detect inventory anomalies
 * POST /api/ai/anomaly/inventory
 */
router.post('/anomaly/inventory', (req, res) => {
  try {
    const { productId, currentStock, historicalData } = req.body;

    if (!productId || currentStock === undefined) {
      return res.status(400).json({ error: 'Product ID and current stock required' });
    }

    const result = anomalyDetector.detectInventoryAnomaly(
      productId,
      currentStock,
      historicalData || []
    );

    res.json({
      success: result.success,
      isAnomaly: result.isAnomaly,
      anomalyScore: result.anomalyScore,
      zScore: result.zScore,
      mean: result.mean,
      stdDev: result.stdDev,
      trend: result.trend,
      reasons: result.reasons,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NATURAL LANGUAGE PROCESSING ENDPOINTS
// ============================================================================

/**
 * Analyze sentiment of text
 * POST /api/ai/nlp/sentiment
 */
router.post('/nlp/sentiment', (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const result = nlp.analyzeSentiment(text);

    res.json({
      success: result.success,
      sentiment: result.sentiment,
      sentimentLabel: result.sentiment_label,
      confidence: result.confidence,
      wordsMatched: result.wordsMatched,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Extract keywords from text
 * POST /api/ai/nlp/keywords
 */
router.post('/nlp/keywords', (req, res) => {
  try {
    const { text, topN } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const result = nlp.extractKeywords(text, topN || 10);

    res.json({
      success: result.success,
      keywords: result.keywords,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Classify text into categories
 * POST /api/ai/nlp/classify
 */
router.post('/nlp/classify', (req, res) => {
  try {
    const { text, categories } = req.body;

    if (!text || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Text and categories array required' });
    }

    const result = nlp.classifyText(text, categories);

    res.json({
      success: result.success,
      category: result.category,
      confidence: result.confidence,
      scores: result.scores,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// OPTIMIZATION ENDPOINTS
// ============================================================================

/**
 * Optimize product pricing
 * POST /api/ai/optimize/price
 */
router.post('/optimize/price', (req, res) => {
  try {
    const { currentPrice, demand, inventory, competitorPrice } = req.body;

    if (currentPrice === undefined || demand === undefined) {
      return res.status(400).json({ error: 'Current price and demand required' });
    }

    const result = optimizer.optimizePrice(currentPrice, demand, inventory, competitorPrice);

    res.json({
      success: result.success,
      currentPrice: result.currentPrice,
      optimalPrice: result.optimalPrice,
      change: result.change,
      recommendation: result.recommendation,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Optimize inventory levels
 * POST /api/ai/optimize/inventory
 */
router.post('/optimize/inventory', (req, res) => {
  try {
    const { averageDailySales, leadTimeDays, variance } = req.body;

    if (averageDailySales === undefined || leadTimeDays === undefined) {
      return res.status(400).json({ error: 'Average daily sales and lead time required' });
    }

    const result = optimizer.optimizeInventory(averageDailySales, leadTimeDays, variance);

    res.json({
      success: result.success,
      economicOrderQuantity: result.economicOrderQuantity,
      reorderPoint: result.reorderPoint,
      safetyStock: result.safetyStock,
      optimalMaxStock: result.optimalMaxStock,
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI DASHBOARD & INSIGHTS
// ============================================================================

/**
 * Get AI system health and statistics
 * GET /api/ai/status
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      aiSystem: {
        engines: {
          predictive: 'active',
          recommendations: 'active',
          anomalyDetection: 'active',
          nlp: 'active',
          optimization: 'active',
        },
        models: {
          salesForecast: predictive.models.has('sales-forecast'),
          demandForecast: predictive.models.has('demand-forecast'),
        },
        stats: {
          totalRecommendations: recommender.recommendations.length,
          totalAnomalies: anomalyDetector.anomalies.length,
          activeUsers: recommender.userProfiles.size,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
