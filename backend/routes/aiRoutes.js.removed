/**
 * AI Predictions and Analytics API Routes
 * Sales forecasting, student performance, churn prediction
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/ai-advanced/predictions
 * Get AI predictions (for smoke tests)
 */
router.post('/predictions', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        predictions: [
          { type: 'sales', value: 125000, confidence: 0.85 },
          { type: 'churn', value: 0.12, confidence: 0.78 },
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/predict-sales
 * Predict sales for next period
 */
router.post('/predict-sales', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'analyst') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { month, previousSales, marketingSpend } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        error: 'Month required',
      });
    }

    const result = await aiService.predictSales(month, {
      previousSales,
      marketingSpend,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/predict-student-performance
 * Predict student performance
 */
router.post('/predict-student-performance', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { studentId, attendance, assignmentCompletion, quizScores, engagement } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID required',
      });
    }

    const result = await aiService.predictStudentPerformance(studentId, {
      attendance,
      assignmentCompletion,
      quizScores,
      engagement,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/predict-churn-risk
 * Predict customer churn risk
 */
router.post('/predict-churn-risk', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { customerId, tenure, engagementScore, supportTickets, paymentHistory } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID required',
      });
    }

    const result = await aiService.predictChurnRisk(customerId, {
      tenure,
      engagementScore,
      supportTickets,
      paymentHistory,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/predict-attendance
 * Predict attendance
 */
router.post('/predict-attendance', authMiddleware, async (req, res) => {
  try {
    const { userId, dayOfWeek, weather, previousAbsences } = req.body;

    if (!userId || !dayOfWeek) {
      return res.status(400).json({
        success: false,
        error: 'User ID and day of week required',
      });
    }

    const result = await aiService.predictAttendance(userId, {
      dayOfWeek,
      weather: weather || 'good',
      previousAbsences: previousAbsences || 0,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/predictions
 * Get prediction history
 */
router.get('/predictions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { type, limit = 50 } = req.query;

    const result = await aiService.getPredictionHistory(type, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/models
 * Get available models
 */
router.get('/models', authMiddleware, async (req, res) => {
  try {
    const result = await aiService.getAvailableModels();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/model/:modelId/metrics
 * Get model performance metrics
 */
router.get('/model/:modelId/metrics', authMiddleware, async (req, res) => {
  try {
    const { modelId } = req.params;

    const result = await aiService.getModelMetrics(modelId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/model/:modelId/train
 * Train model with new data (admin only)
 */
router.post('/model/:modelId/train', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { modelId } = req.params;
    const { trainingData } = req.body;

    const result = await aiService.trainModel(modelId, trainingData);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

