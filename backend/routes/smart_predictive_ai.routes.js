const express = require('express');
const router = express.Router();
const SmartPredictiveAIService = require('../services/smartPredictiveAI.service');
const SmartClinicalCommandService = require('../services/smartClinicalCommand.service'); // Need inputs

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route GET /api/predictive-ai-smart/forecast/:patientId
 * @desc Generate recovery forecast using real-time data integration
 */
router.get('/forecast/:patientId', mockAuth, async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1. Get the Current Reality (Phase 101)
    const currentSnapshot = await SmartClinicalCommandService.getPatientCommandSnapshot(patientId);

    // 2. Predict the Future (Phase 102)
    const forecast = await SmartPredictiveAIService.generateForecast(patientId, currentSnapshot);

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('Predictive AI Error:', error);
    res.status(500).json({ success: false, message: 'Prediction Engine Malfunction' });
  }
});

module.exports = router;
