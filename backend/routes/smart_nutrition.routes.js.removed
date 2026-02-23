const express = require('express');
const router = express.Router();
const SmartNutritionService = require('../services/smartNutrition.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route GET /api/nutrition-smart/plan/:patientId
 * @desc Get dynamic metabolic plan based on real-time wearable/IoT data
 */
router.get('/plan/:patientId', mockAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const plan = await SmartNutritionService.generateDailyPlan(patientId);
    res.json({ success: true, plan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @route POST /api/nutrition-smart/log-meal
 * @desc Log a meal
 */
router.post('/log-meal', mockAuth, async (req, res) => {
  try {
    const { patientId, mealData } = req.body;
    const result = await SmartNutritionService.logMeal(patientId, mealData);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

