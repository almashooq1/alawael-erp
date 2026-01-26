const express = require('express');
const router = express.Router();
const SmartBehaviorService = require('../services/smartBehavior.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/behavior-smart/incident
 * @route POST /api/behavior-smart/incident
 * @desc Log an incident and get immediate AI insights
 */
router.post('/incident', authorizeRole(['THERAPIST', 'TEACHER', 'PARENT']), async (req, res) => {
  try {
    const result = await SmartBehaviorService.logIncident(req.body.patientId, req.body.data);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/behavior-smart/predict-risk
 * @desc Check environment compliance for a sensitive child
 */
router.post('/predict-risk', async (req, res) => {
  try {
    const result = await SmartBehaviorService.predictMeltdownRisk(req.body.patientId, req.body.environment);
    res.json({ success: true, prediction: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

