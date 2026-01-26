const express = require('express');
const router = express.Router();
const SmartDashboardService = require('../services/smartDashboard.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/dashboard/overview
 * @desc Get Unified Executive Summary (Ops + HR + Finance)
 */
router.get('/overview', async (req, res) => {
  try {
    const summary = await SmartDashboardService.getExecutiveSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/dashboard/forecast
 * @desc Get AI Financial Predictions
 */
router.get('/forecast', async (req, res) => {
  try {
    const forecast = await SmartDashboardService.getFinancialForecast();
    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

