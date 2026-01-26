const express = require('express');
const router = express.Router();
const SmartWellbeingService = require('../services/smartWellbeing.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/wellbeing-smart/analyze-my-risk
 * @desc Staff checks their own burnout stats
 */
router.get('/analyze-my-risk', async (req, res) => {
  try {
    // Need to link User -> Employee
    const result = await SmartWellbeingService.calculateBurnoutRisk(req.user.id);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/wellbeing-smart/intervention
 * @desc System triggers intervention for high-risk staff
 */
router.post('/intervention', authorizeRole(['HR', 'CLINICAL_MANAGER']), async (req, res) => {
  try {
    const riskAnalysis = await SmartWellbeingService.calculateBurnoutRisk(req.body.therapistId);
    const action = await SmartWellbeingService.recommendWellbeingAction(req.body.therapistId, riskAnalysis);
    res.json({ success: true, recommendation: action });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

