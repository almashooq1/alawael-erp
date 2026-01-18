const express = require('express');
const router = express.Router();
const SmartJourneyService = require('../services/smartJourney.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/journey-smart/timeline/:patientId
 * @desc Visualize patient experience journey
 */
router.get('/timeline/:patientId', authorizeRole(['ADMIN', 'QUALITY_MANAGER', 'MARKETING']), async (req, res) => {
  try {
    const result = await SmartJourneyService.getPatientJourney(req.params.patientId);
    res.json({ success: true, journey: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/journey-smart/churn-analysis
 * @desc Why are patients leaving?
 */
router.get('/churn-analysis', authorizeRole(['ADMIN', 'MARKETING']), async (req, res) => {
  try {
    const result = await SmartJourneyService.analyzeChurnPoints();
    res.json({ success: true, analytics: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
