const express = require('express');
const router = express.Router();
const SmartRetentionService = require('../services/smartRetention.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/retention-smart/analysis/:id
 * @desc Get Risk Score for specific patient
 */
router.get('/analysis/:id', async (req, res) => {
  try {
    const result = await SmartRetentionService.calculateRiskScore(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/retention-smart/run-scan
 * @desc Run AI Scan for all patients to find Churn Risks
 */
router.post('/run-scan', authorizeRole(['ADMIN', 'CARE_MANAGER', 'CRM_MANAGER']), async (req, res) => {
  try {
    const report = await SmartRetentionService.identifyAtRiskPatients(req.user.id);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
