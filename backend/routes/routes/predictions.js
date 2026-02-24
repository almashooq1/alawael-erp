const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// Sales Prediction
router.post('/sales', async (req, res, next) => {
  try {
    const prediction = await AIService.predictSales(req.body.historicalData);
    return res.json(new ApiResponse(200, prediction, 'Sales prediction generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate sales prediction', [err.message]));
  }
});

// Performance Prediction
router.post('/performance', async (req, res, next) => {
  try {
    const prediction = await AIService.predictPerformance(req.body.metrics);
    return res.json(new ApiResponse(200, prediction, 'Performance prediction generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate performance prediction', [err.message]));
  }
});

// Attendance Prediction
router.post('/attendance', async (req, res, next) => {
  try {
    const prediction = await AIService.predictAttendance(req.body.dayData);
    return res.json(new ApiResponse(200, prediction, 'Attendance prediction generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate attendance prediction', [err.message]));
  }
});

// Churn Prediction
router.post('/churn', async (req, res, next) => {
  try {
    const prediction = await AIService.predictChurn(req.body.userData);
    return res.json(new ApiResponse(200, prediction, 'Churn prediction generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate churn prediction', [err.message]));
  }
});

// Inventory Prediction
router.post('/inventory', async (req, res, next) => {
  try {
    const prediction = await AIService.predictInventory(req.body.itemData);
    return res.json(new ApiResponse(200, prediction, 'Inventory prediction generated'));
  } catch (err) {
    return next(new ApiError(400, 'Failed to generate inventory prediction', [err.message]));
  }
});

module.exports = router;
