/**
 * ALAWAEL ERP - ML & PREDICTIVE ANALYTICS ROUTES
 * Phase 14 - Advanced ML & Predictive Analytics
 *
 * Endpoints:
 * - POST/GET /ml/demand-forecast - Demand forecasting
 * - POST/GET /ml/trends - Trend prediction
 * - GET /ml/recommendations - Product recommendations
 * - POST/GET /ml/anomalies - Anomaly detection
 * - POST/GET /ml/churn - Churn prediction
 * - POST/GET /ml/pricing - Price optimization
 * - POST/GET /ml/inventory - Inventory optimization
 * - GET /ml/models - List trained models
 */

const express = require('express');
const router = express.Router();
const mlService = require('../services/ml.service');
const authMiddleware = require('../middleware/auth').authenticateToken;

/**
 * DEMAND FORECASTING ROUTES
 */

/**
 * POST /ml/demand-forecast
 * Train demand forecasting model
 */
router.post('/demand-forecast', authMiddleware, async (req, res) => {
  try {
    const {
      productId,
      historicalData,
      method = 'arima',
      periods = 30,
      confidence = 0.95,
    } = req.body;

    if (!productId || !historicalData) {
      return res.status(400).json({ error: 'productId and historicalData required' });
    }

    const model = await mlService.trainDemandForecast(productId, historicalData, {
      method,
      periods,
      confidence,
    });

    res.status(201).json({
      message: 'Demand forecast model trained successfully',
      model,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /ml/demand-forecast/:productId
 * Get demand forecast for product
 */
router.get('/demand-forecast/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { periods = 30 } = req.query;

    const forecast = await mlService.getDemandForecast(productId, parseInt(periods));

    res.json(forecast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * TREND PREDICTION ROUTES
 */

/**
 * POST /ml/trends
 * Analyze and predict trends
 */
router.post('/trends', authMiddleware, async (req, res) => {
  try {
    const {
      metricName,
      timeSeries,
      windowSize = 7,
      forecastPeriods = 14,
      sensitivity = 0.8,
    } = req.body;

    if (!metricName || !timeSeries) {
      return res.status(400).json({ error: 'metricName and timeSeries required' });
    }

    const trendAnalysis = await mlService.predictTrends(metricName, timeSeries, {
      windowSize,
      forecastPeriods,
      sensitivity,
    });

    res.json({
      message: 'Trend analysis completed',
      analysis: trendAnalysis,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /ml/trends/trending
 * Get trending metrics
 */
router.get('/trends/trending', authMiddleware, async (req, res) => {
  try {
    const { category = 'all', limit = 10 } = req.query;

    const trending = await mlService.getTrendingMetrics(category, parseInt(limit));

    res.json(trending);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * RECOMMENDATION ENGINE ROUTES
 */

/**
 * GET /ml/recommendations
 * Get product recommendations for user
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5, method = 'collaborative', minScore = 0.6 } = req.query;

    const recommendations = await mlService.getProductRecommendations(userId, {
      limit: parseInt(limit),
      method,
      minScore: parseFloat(minScore),
    });

    res.json(recommendations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /ml/recommendations/batch
 * Get recommendations for multiple users
 */
router.post('/recommendations/batch', authMiddleware, async (req, res) => {
  try {
    const { userIds, limit = 5 } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    const batch = await mlService.getRecommendationsBatch(userIds, parseInt(limit));

    res.json(batch);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * ANOMALY DETECTION ROUTES
 */

/**
 * POST /ml/anomalies
 * Detect anomalies in metric data
 */
router.post('/anomalies', authMiddleware, async (req, res) => {
  try {
    const {
      metricName,
      data,
      method = 'isolation_forest',
      sensitivity = 0.95,
      windowSize = 30,
    } = req.body;

    if (!metricName || !data) {
      return res.status(400).json({ error: 'metricName and data required' });
    }

    const detection = await mlService.detectAnomalies(metricName, data, {
      method,
      sensitivity: parseFloat(sensitivity),
      windowSize: parseInt(windowSize),
    });

    res.json(detection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /ml/anomalies/{metricName}
 * Get detected anomalies for metric
 */
router.get('/anomalies/:metricName', authMiddleware, async (req, res) => {
  try {
    const { metricName } = req.params;
    const { method = 'isolation_forest', sensitivity = 0.95 } = req.query;

    // In production, would retrieve from database
    res.json({
      metricName,
      message: 'Anomalies retrieved',
      method,
      sensitivity,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CHURN PREDICTION ROUTES
 */

/**
 * GET /ml/churn/:customerId
 * Predict customer churn
 */
router.get('/churn/:customerId', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { threshold = 0.7 } = req.query;

    const prediction = await mlService.predictCustomerChurn(customerId, {
      threshold: parseFloat(threshold),
    });

    res.json({
      message: 'Churn prediction completed',
      prediction,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /ml/churn/at-risk
 * Get at-risk customers
 */
router.get('/churn/at-risk/list', authMiddleware, async (req, res) => {
  try {
    const { threshold = 0.7, limit = 50 } = req.query;

    const atRisk = await mlService.getAtRiskCustomers(parseFloat(threshold), parseInt(limit));

    res.json(atRisk);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PRICE OPTIMIZATION ROUTES
 */

/**
 * POST /ml/pricing
 * Calculate optimal price
 */
router.post('/pricing', authMiddleware, async (req, res) => {
  try {
    const {
      productId,
      currentPrice,
      costPrice,
      demandElasticity,
      competitorPrices,
      seasonalFactor,
    } = req.body;

    if (!currentPrice || !costPrice) {
      return res.status(400).json({ error: 'currentPrice and costPrice required' });
    }

    const optimization = await mlService.optimizePrice(productId, {
      currentPrice: parseFloat(currentPrice),
      costPrice: parseFloat(costPrice),
      demandElasticity: parseFloat(demandElasticity || 1.5),
      competitorPrices: competitorPrices || [],
      seasonalFactor: parseFloat(seasonalFactor || 1.0),
    });

    res.json({
      message: 'Price optimization completed',
      optimization,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * INVENTORY OPTIMIZATION ROUTES
 */

/**
 * POST /ml/inventory
 * Calculate optimal inventory levels
 */
router.post('/inventory', authMiddleware, async (req, res) => {
  try {
    const {
      productId,
      demandForecast,
      leadTime = 7,
      holdingCostPerUnit = 1.5,
      stockoutCostPerUnit = 25,
      serviceLevel = 0.95,
    } = req.body;

    if (!productId || !demandForecast) {
      return res.status(400).json({ error: 'productId and demandForecast required' });
    }

    const optimization = await mlService.optimizeInventory(productId, demandForecast, {
      leadTime: parseInt(leadTime),
      holdingCostPerUnit: parseFloat(holdingCostPerUnit),
      stockoutCostPerUnit: parseFloat(stockoutCostPerUnit),
      serviceLevel: parseFloat(serviceLevel),
    });

    res.json({
      message: 'Inventory optimization completed',
      optimization,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * MODEL MANAGEMENT ROUTES
 */

/**
 * GET /ml/models
 * List all trained models
 */
router.get('/models', authMiddleware, async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;

    // In production, would retrieve from database
    const models = Array.from(mlService.models.values())
      .filter(m => !type || m.type === type)
      .slice(0, parseInt(limit));

    res.json({
      totalModels: models.length,
      models: models.map(m => ({
        id: m.id,
        type: m.type,
        productId: m.productId,
        trainedAt: m.trainedAt,
        status: m.status,
        accuracy: m.accuracy || 'N/A',
        rmse: m.rmse || 'N/A',
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /ml/models/:modelId
 * Retrain or remove model
 */
router.delete('/models/:modelId', authMiddleware, async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!mlService.models.has(modelId)) {
      return res.status(404).json({ error: 'Model not found' });
    }

    mlService.models.delete(modelId);

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /ml/health
 * ML service health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ML & Predictive Analytics',
    models: mlService.models.size,
    predictions: mlService.predictions.length,
    timestamp: new Date(),
  });
});

module.exports = router;
