const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

// Sales Prediction
router.post('/sales', async (req, res) => {
  try {
    const prediction = await AIService.predictSales(req.body.historicalData);
    res.json(prediction);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Performance Prediction
router.post('/performance', async (req, res) => {
  try {
    const prediction = await AIService.predictPerformance(req.body.metrics);
    res.json(prediction);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Attendance Prediction
router.post('/attendance', async (req, res) => {
  try {
    const prediction = await AIService.predictAttendance(req.body.dayData);
    res.json(prediction);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Churn Prediction
router.post('/churn', async (req, res) => {
  try {
    const prediction = await AIService.predictChurn(req.body.userData);
    res.json(prediction);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Inventory Prediction
router.post('/inventory', async (req, res) => {
  try {
    const prediction = await AIService.predictInventory(req.body.itemData);
    res.json(prediction);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
